// buf.readDoubleBE() - 最终边界场景测试
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

// ============ offset 对象的 toString/valueOf 转换 ============
// Node.js v25 对 offset 进行严格类型检查，对象会直接抛出 TypeError

test('offset 对象（即使有 valueOf）应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeDoubleBE(123.456, 0);
    const offset = {
      valueOf: function() { return 0; }
    };
    buf.readDoubleBE(offset);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 对象（即使有 toString）应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeDoubleBE(456.789, 0);
    const offset = {
      toString: function() { return '0'; }
    };
    buf.readDoubleBE(offset);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 对象（有 valueOf 和 toString）应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeDoubleBE(111.111, 0);
    buf.writeDoubleBE(222.222, 8);
    const offset = {
      valueOf: function() { return 0; },
      toString: function() { return '8'; }
    };
    buf.readDoubleBE(offset);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 对象（valueOf 返回浮点数）应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    const offset = {
      valueOf: function() { return 1.5; }
    };
    buf.readDoubleBE(offset);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 对象（valueOf 返回负数）应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    const offset = {
      valueOf: function() { return -1; }
    };
    buf.readDoubleBE(offset);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// ============ 原型链和方法绑定 ============

test('在原型链上调用方法', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(789.012, 0);
  const method = Buffer.prototype.readDoubleBE;
  const result = method.call(buf, 0);
  return Math.abs(result - 789.012) < 0.001;
});

test('bind 绑定 this 后调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(345.678, 0);
  const boundMethod = buf.readDoubleBE.bind(buf);
  const result = boundMethod(0);
  return Math.abs(result - 345.678) < 0.001;
});

test('bind 绑定错误的 this 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    const wrongThis = { length: 8 };
    const boundMethod = buf.readDoubleBE.bind(wrongThis);
    boundMethod(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// ============ 空值和边界 offset ============

test('offset = 0n (BigInt 零) 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleBE(0n);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = -0 (负零) 应等同于 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(999.999, 0);
  const result = buf.readDoubleBE(-0);
  return Math.abs(result - 999.999) < 0.001;
});

test('offset = +0 (正零) 应等同于 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(888.888, 0);
  const result = buf.readDoubleBE(+0);
  return Math.abs(result - 888.888) < 0.001;
});

test('offset = 0x0 (十六进制零) 应等同于 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(777.777, 0);
  const result = buf.readDoubleBE(0x0);
  return Math.abs(result - 777.777) < 0.001;
});

test('offset = 0o0 (八进制零) 应等同于 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(666.666, 0);
  const result = buf.readDoubleBE(0o0);
  return Math.abs(result - 666.666) < 0.001;
});

test('offset = 0b0 (二进制零) 应等同于 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(555.555, 0);
  const result = buf.readDoubleBE(0b0);
  return Math.abs(result - 555.555) < 0.001;
});

// ============ Buffer 创建方式的差异 ============

test('Buffer.alloc 创建的 Buffer 可读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(111.111, 0);
  return Math.abs(buf.readDoubleBE(0) - 111.111) < 0.001;
});

test('Buffer.allocUnsafe 创建的 Buffer 可读取', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleBE(222.222, 0);
  return Math.abs(buf.readDoubleBE(0) - 222.222) < 0.001;
});

test('Buffer.allocUnsafeSlow 创建的 Buffer 可读取', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeDoubleBE(333.333, 0);
  return Math.abs(buf.readDoubleBE(0) - 333.333) < 0.001;
});

test('Buffer.from(ArrayBuffer) 可读取', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  buf.writeDoubleBE(444.444, 0);
  return Math.abs(buf.readDoubleBE(0) - 444.444) < 0.001;
});

test('Buffer.from(Array) 可读取', () => {
  const buf = Buffer.from([0x40, 0x09, 0x21, 0xFB, 0x54, 0x44, 0x2D, 0x18]);
  return Math.abs(buf.readDoubleBE(0) - Math.PI) < 1e-15;
});

test('Buffer.from(Buffer) 可读取', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeDoubleBE(555.555, 0);
  const buf2 = Buffer.from(buf1);
  return Math.abs(buf2.readDoubleBE(0) - 555.555) < 0.001;
});

test('Buffer.from(string, encoding) 可读取', () => {
  const buf = Buffer.from('400921fb54442d18', 'hex');
  return Math.abs(buf.readDoubleBE(0) - Math.PI) < 1e-15;
});

// ============ 极端大小的 Buffer ============

test('8 字节 Buffer 正好可以读取一个 double', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456, 0);
  return Math.abs(buf.readDoubleBE(0) - 123.456) < 0.001;
});

test('7 字节 Buffer 无法读取 double', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readDoubleBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('非常大的 Buffer (10MB) 可以在任意有效位置读取', () => {
  const size = 10 * 1024 * 1024;
  const buf = Buffer.alloc(size);
  const offset = size - 8;
  buf.writeDoubleBE(999.999, offset);
  return Math.abs(buf.readDoubleBE(offset) - 999.999) < 0.001;
});

// ============ 数值精度边界 ============

test('读取 Number.MIN_VALUE (最小正数)', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.MIN_VALUE, 0);
  return buf.readDoubleBE(0) === Number.MIN_VALUE;
});

test('读取 Number.MAX_VALUE (最大正数)', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.MAX_VALUE, 0);
  return buf.readDoubleBE(0) === Number.MAX_VALUE;
});

test('读取 -Number.MAX_VALUE (最大负数)', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-Number.MAX_VALUE, 0);
  return buf.readDoubleBE(0) === -Number.MAX_VALUE;
});

test('读取 Number.EPSILON', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.EPSILON, 0);
  return buf.readDoubleBE(0) === Number.EPSILON;
});

test('读取 1 + Number.EPSILON', () => {
  const buf = Buffer.alloc(8);
  const value = 1 + Number.EPSILON;
  buf.writeDoubleBE(value, 0);
  return buf.readDoubleBE(0) === value;
});

// ============ 特殊浮点数模式 ============

test('读取次正规数 (subnormal)', () => {
  const buf = Buffer.alloc(8);
  const subnormal = 5e-324; // 最小次正规数
  buf.writeDoubleBE(subnormal, 0);
  return buf.readDoubleBE(0) === subnormal;
});

test('读取最大次正规数', () => {
  const buf = Buffer.alloc(8);
  // 0x000FFFFFFFFFFFFF (最大次正规数)
  const bytes = [0x00, 0x0F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
  const testBuf = Buffer.from(bytes);
  const value = testBuf.readDoubleBE(0);
  return value > 0 && value < 2.2250738585072014e-308;
});

test('读取最小正规数', () => {
  const buf = Buffer.alloc(8);
  const minNormal = 2.2250738585072014e-308;
  buf.writeDoubleBE(minNormal, 0);
  const result = buf.readDoubleBE(0);
  return Math.abs(result - minNormal) / minNormal < 1e-15;
});

// ============ 并发和多次调用 ============

test('同一 offset 并发读取 1000 次一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.PI, 0);
  const results = new Set();
  for (let i = 0; i < 1000; i++) {
    results.add(buf.readDoubleBE(0));
  }
  return results.size === 1 && Math.abs(Array.from(results)[0] - Math.PI) < 1e-15;
});

test('不同 offset 交替读取不互相干扰', () => {
  const buf = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    buf.writeDoubleBE(i * 111.111, i * 8);
  }
  const results = [];
  for (let j = 0; j < 100; j++) {
    for (let i = 0; i < 4; i++) {
      results.push(buf.readDoubleBE(i * 8));
    }
  }
  return results.every((v, idx) => {
    const expected = (idx % 4) * 111.111;
    return Math.abs(v - expected) < 0.001;
  });
});

// ============ 方法属性检查 ============

test('readDoubleBE 的 length 属性为 0（参数可选）', () => {
  return Buffer.prototype.readDoubleBE.length === 0;
});

test('readDoubleBE 的 name 属性存在', () => {
  // Node.js: 'readDoubleBackwards'
  // Go/goja: 可能是完整函数签名
  const name = Buffer.prototype.readDoubleBE.name;
  return typeof name === 'string' && name.length > 0;
});

test('readDoubleBE 是函数类型', () => {
  return typeof Buffer.prototype.readDoubleBE === 'function';
});

// ============ 数组索引语法 ============

test('使用数组索引语法访问字节不影响 readDoubleBE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456, 0);
  const byte0 = buf[0]; // 访问单个字节
  const result = buf.readDoubleBE(0);
  return typeof byte0 === 'number' && Math.abs(result - 123.456) < 0.001;
});

// ============ offset 为字符串数字 ============

test('offset = "0" (字符串) 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleBE("0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = "8" (字符串) 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readDoubleBE("8");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// ============ 科学计数法的有效 offset ============

test('offset = 1e1 (10.0) 在 18 字节 Buffer 中有效', () => {
  const buf = Buffer.alloc(18);
  buf.writeDoubleBE(123.456, 10);
  const result = buf.readDoubleBE(1e1);
  return Math.abs(result - 123.456) < 0.001;
});

test('offset = 8e0 (8.0) 在 16 字节 Buffer 中有效', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(456.789, 8);
  const result = buf.readDoubleBE(8e0);
  return Math.abs(result - 456.789) < 0.001;
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
