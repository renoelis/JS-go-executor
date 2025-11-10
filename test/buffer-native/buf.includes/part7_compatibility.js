// buf.includes() - Compatibility and Equivalence Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Equivalence with indexOf
test('includes 等价于 indexOf !== -1 (找到)', () => {
  const buf = Buffer.from('hello world');
  const includesResult = buf.includes('world');
  const indexOfResult = buf.indexOf('world') !== -1;
  return includesResult === indexOfResult && includesResult === true;
});

test('includes 等价于 indexOf !== -1 (未找到)', () => {
  const buf = Buffer.from('hello world');
  const includesResult = buf.includes('foo');
  const indexOfResult = buf.indexOf('foo') !== -1;
  return includesResult === indexOfResult && includesResult === false;
});

test('includes 与 indexOf 使用 byteOffset', () => {
  const buf = Buffer.from('hello world');
  const includesResult = buf.includes('world', 6);
  const indexOfResult = buf.indexOf('world', 6) !== -1;
  return includesResult === indexOfResult;
});

test('includes 与 indexOf 使用 encoding', () => {
  const buf = Buffer.from('hello world');
  const includesResult = buf.includes('world', 0, 'utf8');
  const indexOfResult = buf.indexOf('world', 0, 'utf8') !== -1;
  return includesResult === indexOfResult;
});

test('includes 与 indexOf 查找数字', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const includesResult = buf.includes(3);
  const indexOfResult = buf.indexOf(3) !== -1;
  return includesResult === indexOfResult;
});

test('includes 与 indexOf 查找 Buffer', () => {
  const buf = Buffer.from('hello world');
  const search = Buffer.from('world');
  const includesResult = buf.includes(search);
  const indexOfResult = buf.indexOf(search) !== -1;
  return includesResult === indexOfResult;
});

test('includes 与 indexOf 空字符串', () => {
  const buf = Buffer.from('hello');
  const includesResult = buf.includes('');
  const indexOfResult = buf.indexOf('') !== -1;
  return includesResult === indexOfResult;
});

// Buffer vs Uint8Array behavior
test('Buffer 和 Uint8Array 互操作', () => {
  const buf = Buffer.from('hello world');
  const uint8 = new Uint8Array([119, 111, 114, 108, 100]); // 'world'
  return buf.includes(uint8) === true;
});

test('Uint8Array 包含 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const uint8 = new Uint8Array([2, 3]);
  return buf.includes(uint8) === true;
});

test('Buffer 子类行为一致', () => {
  const buf = Buffer.from('hello world');
  const subBuf = buf.slice(6, 11); // 'world'
  return buf.includes(subBuf) === true;
});

// Consistency across different creation methods
test('Buffer.from 创建的 Buffer', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world') === true;
});

test('Buffer.alloc 创建的 Buffer', () => {
  const buf = Buffer.alloc(11);
  buf.write('hello world');
  return buf.includes('world') === true;
});

test('Buffer.allocUnsafe 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafe(11);
  buf.write('hello world');
  return buf.includes('world') === true;
});

test('Buffer.concat 创建的 Buffer', () => {
  const buf1 = Buffer.from('hello ');
  const buf2 = Buffer.from('world');
  const buf = Buffer.concat([buf1, buf2]);
  return buf.includes('world') === true;
});

// Immutability - includes should not modify buffer
test('includes 不修改原 Buffer', () => {
  const original = Buffer.from('hello world');
  const copy = Buffer.from(original);
  original.includes('world');
  return original.equals(copy);
});

test('includes 多次调用结果一致', () => {
  const buf = Buffer.from('hello world');
  const r1 = buf.includes('world');
  const r2 = buf.includes('world');
  const r3 = buf.includes('world');
  return r1 === r2 && r2 === r3 && r1 === true;
});

// Different encodings produce consistent results
test('utf8 和 ascii 对纯 ASCII 文本一致', () => {
  const buf = Buffer.from('hello', 'utf8');
  const r1 = buf.includes('ell', 0, 'utf8');
  const r2 = buf.includes('ell', 0, 'ascii');
  return r1 === r2 && r1 === true;
});

test('hex 编码一致性', () => {
  const buf = Buffer.from('68656c6c6f', 'hex'); // 'hello'
  const search1 = Buffer.from('6c6c', 'hex'); // 'll'
  const search2 = Buffer.from([0x6c, 0x6c]);
  return buf.includes(search1) === buf.includes(search2);
});

// Comparison with String.prototype.includes
test('与 String includes 行为对比 - 基本', () => {
  const str = 'hello world';
  const buf = Buffer.from(str);
  return buf.includes('world') === str.includes('world');
});

test('与 String includes 行为对比 - 空字符串', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return buf.includes('') === str.includes('');
});

test('与 String includes 行为对比 - 不存在', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return buf.includes('xyz') === str.includes('xyz');
});

// Buffer length preservation
test('includes 不改变 Buffer 长度', () => {
  const buf = Buffer.from('hello world');
  const originalLength = buf.length;
  buf.includes('world');
  return buf.length === originalLength;
});

test('includes 不改变 Buffer 内容', () => {
  const buf = Buffer.from('hello world');
  const originalContent = buf.toString();
  buf.includes('world');
  return buf.toString() === originalContent;
});

// Performance consistency (basic check)
test('重复查找性能一致性', () => {
  const buf = Buffer.alloc(1000);
  buf.write('test', 500);
  let allFound = true;
  for (let i = 0; i < 100; i++) {
    if (!buf.includes('test')) {
      allFound = false;
      break;
    }
  }
  return allFound === true;
});

// Cross-encoding searches
test('utf8 Buffer 查找 latin1 字符串', () => {
  const buf = Buffer.from('hello', 'utf8');
  return buf.includes('ell', 0, 'latin1') === true;
});

test('base64 编码查找', () => {
  const buf = Buffer.from('aGVsbG8=', 'base64'); // 'hello'
  const search = Buffer.from('ZWxs', 'base64'); // 'ell'
  return buf.includes(search) === true;
});

// Return type consistency
test('返回值始终是布尔值 - true 情况', () => {
  const buf = Buffer.from('hello');
  const result = buf.includes('hello');
  return result === true && typeof result === 'boolean';
});

test('返回值始终是布尔值 - false 情况', () => {
  const buf = Buffer.from('hello');
  const result = buf.includes('world');
  return result === false && typeof result === 'boolean';
});

test('返回值不是 truthy/falsy 而是严格布尔值', () => {
  const buf = Buffer.from('hello');
  const result = buf.includes('hello');
  return result === true && result !== 1 && result !== 'true';
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
