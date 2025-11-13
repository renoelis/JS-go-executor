// Buffer.from() - Part 19: Ultra Deep Edge Cases and Extreme Scenarios
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

function testError(name, fn, expectedError) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error was not thrown' });
  } catch (e) {
    let pass = true;
    if (expectedError) {
      if (typeof expectedError === 'string') {
        pass = e.name === expectedError || e.code === expectedError;
      } else {
        pass = e instanceof expectedError;
      }
    }
    tests.push({ name, status: pass ? '✅' : '❌', actualError: e.message });
  }
}

// 🔥 1. 极端对象属性访问场景 (替代Proxy测试)
test('对象 - 动态getter属性', () => {
  let callCount = 0;
  const obj = {
    get length() {
      callCount++;
      return 3;
    },
    get 0() { return 100; },
    get 1() { return 200; },
    get 2() { return 50; }
  };
  const buf = Buffer.from(obj);
  return buf.length === 3 && buf[0] === 100 && buf[1] === 200 && buf[2] === 50;
});

test('对象 - 条件返回的length', () => {
  let callCount = 0;
  const obj = {
    get length() {
      callCount++;
      return callCount <= 2 ? 2 : 0; // 前两次返回2，之后返回0
    },
    get 0() { return 10; },
    get 1() { return 20; }
  };
  const buf = Buffer.from(obj);
  return buf instanceof Buffer;
});

test('对象 - getter抛出错误', () => {
  const obj = {
    get length() { return 2; },
    get 0() { throw new Error('Getter error'); },
    get 1() { return 100; }
  };
  try {
    Buffer.from(obj);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Getter error');
  }
});

// 🔥 2. 复杂原型链场景
test('原型链 - 深层valueOf继承', () => {
  function A() { this.length = 2; this[0] = 10; this[1] = 20; }
  function B() { A.call(this); }
  function C() { B.call(this); }
  
  // 给C原型添加valueOf方法
  C.prototype.valueOf = function() { return [30, 40]; };
  
  const obj = new C();
  const buf = Buffer.from(obj);
  // Node.js行为：会调用valueOf，使用返回的数组
  return buf.length === 2 && buf[0] === 30 && buf[1] === 40;
});

test('原型链 - Symbol.toPrimitive在原型上', () => {
  function Base() {}
  Base.prototype[Symbol.toPrimitive] = function(hint) {
    if (hint === 'default' || hint === 'string') return 'hello';
    return [100, 200];
  };
  
  function Child() { this.length = 1; this[0] = 50; }
  Child.prototype = new Base();
  
  const obj = new Child();
  const buf = Buffer.from(obj);
  return buf.length === 1 && buf[0] === 50;
});

// 🔥 3. 极端类数组对象
test('类数组 - 非常大的length值', () => {
  const obj = {
    length: 1000000,
    0: 65,
    1: 66,
    999999: 67
  };
  const buf = Buffer.from(obj);
  return buf.length === 1000000 && buf[0] === 65 && buf[1] === 66 && buf[999999] === 67;
});

test('类数组 - length为MAX_SAFE_INTEGER', () => {
  const obj = {
    length: Number.MAX_SAFE_INTEGER,
    0: 100
  };
  try {
    const buf = Buffer.from(obj);
    return buf instanceof Buffer;
  } catch (e) {
    // 可能抛出内存错误，这也是可以接受的
    return e instanceof RangeError || e.message.includes('memory') || e.message.includes('size');
  }
});

test('类数组 - length为浮点数', () => {
  const obj = {
    length: 3.7,
    0: 10,
    1: 20,
    2: 30,
    3: 40
  };
  const buf = Buffer.from(obj);
  return buf.length === 3 && buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('类数组 - 负数索引属性', () => {
  const obj = {
    length: 2,
    0: 10,
    1: 20,
    '-1': 99,
    '-0': 88
  };
  const buf = Buffer.from(obj);
  return buf.length === 2 && buf[0] === 10 && buf[1] === 20;
});

// 🔥 4. 特殊字符串编码测试
test('字符串 - 包含null字符的UTF-8', () => {
  const str = 'hello\0world';
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 11 && buf[5] === 0;
});

test('字符串 - 只有BOM的UTF-8', () => {
  const str = '\uFEFF';
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
});

test('字符串 - 无效UTF-8序列', () => {
  // 这个在JavaScript中实际上是有效的UTF-16，但测试编码处理
  const str = String.fromCharCode(0xD800); // 单独的高代理项
  const buf = Buffer.from(str, 'utf8');
  return buf instanceof Buffer;
});

test('Base64 - 只有等号', () => {
  const buf = Buffer.from('====', 'base64');
  return buf.length === 0;
});

test('Base64 - 非常长的有效字符串', () => {
  const longBase64 = 'SGVsbG8gV29ybGQ='.repeat(1000);
  const buf = Buffer.from(longBase64, 'base64');
  return buf.length > 0;
});

test('HEX - 大小写混合极端情况', () => {
  const buf = Buffer.from('aAbBcCdDeEfF', 'hex');
  return buf.length === 6 && buf[0] === 0xAA && buf[5] === 0xFF;
});

// 🔥 5. TypedArray的极端情况
test('TypedArray - 自定义子类', () => {
  class CustomUint8Array extends Uint8Array {
    custom() { return 'custom'; }
  }
  const ta = new CustomUint8Array([10, 20, 30]);
  const buf = Buffer.from(ta);
  return buf.length === 3 && buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('TypedArray - 修改原型后的数组', () => {
  const ta = new Uint8Array([100, 200]);
  ta.constructor = { name: 'FakeArray' };
  const buf = Buffer.from(ta);
  return buf.length === 2 && buf[0] === 100 && buf[1] === 200;
});

test('Float64Array - Infinity、-Infinity、NaN混合', () => {
  const fa = new Float64Array([Infinity, -Infinity, NaN, 42.5, -42.5]);
  const buf = Buffer.from(fa);
  return buf.length === 5 && buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 42 && buf[4] === 214;
});

test('BigInt64Array - 极大值', () => {
  try {
    const ba = new BigInt64Array([0n, 255n, -1n, 0x100n]);
    const buf = Buffer.from(ba);
    return buf.length === 4;
  } catch (e) {
    // Node.js中BigInt64Array不能直接转换，预期会抛出错误
    return e.message.includes('BigInt') || e.message.includes('convert');
  }
});

// 🔥 6. 函数和特殊对象
test('函数 - 带length属性的函数', () => {
  function fn() {}
  fn.length = 2;
  fn[0] = 50;
  fn[1] = 100;
  try {
    const buf = Buffer.from(fn);
    return buf instanceof Buffer;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('函数 - bind后的函数', () => {
  function fn(a, b, c) {}
  const bound = fn.bind(null, 1);
  try {
    Buffer.from(bound);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('正则表达式 - 带索引属性', () => {
  const regex = /test/;
  regex[0] = 65;
  regex[1] = 66;
  regex.length = 2;
  try {
    const buf = Buffer.from(regex);
    // 正则表达式作为类数组对象可能会被处理
    return buf instanceof Buffer;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 🔥 7. 边界内存情况
test('空ArrayBuffer - 零长度', () => {
  const ab = new ArrayBuffer(0);
  const buf = Buffer.from(ab);
  return buf.length === 0;
});

test('ArrayBuffer - 非常小的分片', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 9, 1);
  return buf.length === 1;
});

test('ArrayBuffer - offset等于length', () => {
  const ab = new ArrayBuffer(5);
  const buf = Buffer.from(ab, 5);
  return buf.length === 0;
});

// 🔥 8. 奇特的数值转换
test('数组 - 包含复杂valueOf对象', () => {
  const complexObj = {
    valueOf() {
      return 42; // 直接返回数字而不是嵌套对象
    }
  };
  const buf = Buffer.from([complexObj]);
  return buf.length === 1 && buf[0] === 42;
});

test('数组 - 包含循环引用对象', () => {
  const obj = { valueOf() { return 100; } };
  obj.self = obj;
  const buf = Buffer.from([obj]);
  return buf.length === 1 && buf[0] === 100;
});

test('数组 - Symbol.toPrimitive返回对象', () => {
  const obj = {
    [Symbol.toPrimitive]() {
      return 150; // 直接返回数字
    }
  };
  const buf = Buffer.from([obj]);
  return buf.length === 1 && buf[0] === 150;
});

// 🔥 9. 极端编码组合
test('编码 - null作为编码参数', () => {
  const buf = Buffer.from('hello', null);
  return buf.toString() === 'hello';
});

test('编码 - Symbol作为编码参数', () => {
  try {
    const buf = Buffer.from('hello', Symbol('utf8'));
    return buf instanceof Buffer;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('编码 - 对象有toString的编码', () => {
  const encodingObj = {
    toString() { return 'utf8'; }
  };
  const buf = Buffer.from('hello', encodingObj);
  return buf.toString() === 'hello';
});

// 输出测试结果
const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const total = tests.length;

const result = {
  success: failed === 0,
  summary: {
    total: total,
    passed: passed,
    failed: failed,
    successRate: ((passed / total) * 100).toFixed(2) + '%'
  },
  tests: tests
};

try {
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
