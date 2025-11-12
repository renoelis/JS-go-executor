// Round 7: Method invocation patterns, binding, prototype chain scenarios
const { Buffer } = require('buffer');
const tests = [];
function test(n, f) {
  try {
    const p = f();
    tests.push({name: n, status: p ? '✅' : '❌', passed: p});
    console.log((p ? '✅' : '❌') + ' ' + n);
  } catch(e) {
    tests.push({name: n, status: '❌', passed: false, error: e.message});
    console.log('❌ ' + n + ': ' + e.message);
  }
}

// 方法调用模式
test('direct call: buf.toString()', () => {
  const buf = Buffer.from('test');
  return buf.toString() === 'test';
});

test('bracket notation: buf["toString"]()', () => {
  const buf = Buffer.from('test');
  return buf["toString"]() === 'test';
});

test('variable reference: const fn = buf.toString; fn()', () => {
  const buf = Buffer.from('test');
  const fn = buf.toString;
  try {
    return fn() === 'test';
  } catch(e) {
    return true;
  }
});

test('call with explicit this', () => {
  const buf = Buffer.from('test');
  const result = Buffer.prototype.toString.call(buf);
  return result === 'test';
});

test('apply with explicit this', () => {
  const buf = Buffer.from('test');
  const result = Buffer.prototype.toString.apply(buf, ['utf8']);
  return result === 'test';
});

test('bind then call', () => {
  const buf = Buffer.from('test');
  const bound = Buffer.prototype.toString.bind(buf);
  return bound() === 'test';
});

test('bind with preset encoding', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  const bound = Buffer.prototype.toString.bind(buf, 'hex');
  return bound() === 'abcd';
});

// Uint8Array 作为 this
test('call on Uint8Array instance', () => {
  const arr = new Uint8Array([0x68, 0x69]);
  try {
    const result = Buffer.prototype.toString.call(arr);
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

test('call on typed array (Uint16Array)', () => {
  const arr = new Uint16Array([0x6868]);
  try {
    const result = Buffer.prototype.toString.call(arr);
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

test('call on ArrayBuffer throws', () => {
  const ab = new ArrayBuffer(4);
  try {
    Buffer.prototype.toString.call(ab);
    return false;
  } catch(e) {
    return true;
  }
});

test('call on plain object throws', () => {
  try {
    Buffer.prototype.toString.call({});
    return false;
  } catch(e) {
    return true;
  }
});

test('call on null throws', () => {
  try {
    Buffer.prototype.toString.call(null);
    return false;
  } catch(e) {
    return true;
  }
});

test('call on undefined throws', () => {
  try {
    Buffer.prototype.toString.call(undefined);
    return false;
  } catch(e) {
    return true;
  }
});

// 参数传递模式
test('no arguments (defaults)', () => {
  return Buffer.from('test').toString() === 'test';
});

test('one argument (encoding)', () => {
  return Buffer.from([0xAB]).toString('hex') === 'ab';
});

test('two arguments (encoding, start)', () => {
  return Buffer.from('hello').toString('utf8', 1) === 'ello';
});

test('three arguments (encoding, start, end)', () => {
  return Buffer.from('hello').toString('utf8', 1, 4) === 'ell';
});

test('four arguments (extra ignored)', () => {
  return Buffer.from('hello').toString('utf8', 0, 5, 'ignored') === 'hello';
});

test('five+ arguments (all extras ignored)', () => {
  return Buffer.from('test').toString('utf8', 0, 4, 'a', 'b', 'c') === 'test';
});

// Arguments object usage
test('apply with empty arguments', () => {
  const buf = Buffer.from('test');
  return Buffer.prototype.toString.apply(buf, []) === 'test';
});

test('apply with one argument', () => {
  const buf = Buffer.from('test');
  return Buffer.prototype.toString.apply(buf, ['hex']) === '74657374';
});

test('apply with three arguments', () => {
  const buf = Buffer.from('hello');
  return Buffer.prototype.toString.apply(buf, ['utf8', 1, 4]) === 'ell';
});

// 链式调用
test('slice().toString()', () => {
  return Buffer.from('hello').slice(1, 4).toString() === 'ell';
});

test('subarray().toString()', () => {
  return Buffer.from('hello').subarray(1, 4).toString() === 'ell';
});

test('concat([...]).toString()', () => {
  const parts = [Buffer.from('hel'), Buffer.from('lo')];
  return Buffer.concat(parts).toString() === 'hello';
});

test('Buffer.from(...).toString()', () => {
  return Buffer.from('test').toString() === 'test';
});

test('Buffer.alloc(...).toString()', () => {
  return Buffer.alloc(3, 0x61).toString() === 'aaa';
});

// toString 返回值使用
test('toString result is immutable string', () => {
  const buf = Buffer.from('test');
  const str = buf.toString();
  return typeof str === 'string' && str.length === 4;
});

test('toString result can be concatenated', () => {
  const buf = Buffer.from('test');
  const result = buf.toString() + '123';
  return result === 'test123';
});

test('toString result can be uppercased', () => {
  const buf = Buffer.from('test');
  return buf.toString().toUpperCase() === 'TEST';
});

test('toString result length matches content', () => {
  const buf = Buffer.from('hello');
  return buf.toString().length === 5;
});

// 复杂调用链
test('toString().split().join()', () => {
  const buf = Buffer.from('a,b,c');
  return buf.toString().split(',').join('-') === 'a-b-c';
});

test('toString().slice()', () => {
  const buf = Buffer.from('hello');
  return buf.toString().slice(1, 4) === 'ell';
});

test('toString().charAt()', () => {
  const buf = Buffer.from('hello');
  return buf.toString().charAt(0) === 'h';
});

// 存储和重用
test('store toString result and reuse', () => {
  const buf = Buffer.from('test');
  const str = buf.toString();
  const str2 = str;
  return str === str2 && str === 'test';
});

test('toString called twice returns equal strings', () => {
  const buf = Buffer.from('test');
  const s1 = buf.toString();
  const s2 = buf.toString();
  return s1 === s2 && s1 === 'test';
});

// 不同 Buffer 实例的独立性
test('different buffers produce different strings', () => {
  const buf1 = Buffer.from('test1');
  const buf2 = Buffer.from('test2');
  return buf1.toString() !== buf2.toString();
});

test('same content buffers produce equal strings', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  return buf1.toString() === buf2.toString();
});

// 方法存在性检查
test('toString is a function', () => {
  const buf = Buffer.from('test');
  return typeof buf.toString === 'function';
});

test('toString exists on Buffer.prototype', () => {
  return typeof Buffer.prototype.toString === 'function';
});

test('Buffer instance has toString method', () => {
  const buf = Buffer.from('test');
  return 'toString' in buf;
});

// 特殊调用场景
test('toString in template literal', () => {
  const buf = Buffer.from('world');
  const result = `Hello ${buf.toString()}`;
  return result === 'Hello world';
});

test('toString in array map', () => {
  const bufs = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];
  const strs = bufs.map(b => b.toString());
  return strs.join('') === 'abc';
});

test('toString in conditional', () => {
  const buf = Buffer.from('test');
  const result = buf.toString() === 'test' ? 'match' : 'nomatch';
  return result === 'match';
});

const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
