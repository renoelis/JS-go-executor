// buf.readFloatBE() - 最终边界场景测试
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

// ============ 原型链和方法绑定 ============

test('在原型链上调用方法', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(789.012, 0);
  const method = Buffer.prototype.readFloatBE;
  const result = method.call(buf, 0);
  return Math.abs(result - 789.012) < 0.001;
});

test('bind 绑定 this 后调用', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(345.678, 0);
  const boundMethod = buf.readFloatBE.bind(buf);
  const result = boundMethod(0);
  return Math.abs(result - 345.678) < 0.001;
});

test('bind 绑定错误的 this 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    const wrongThis = { length: 4 };
    const boundMethod = buf.readFloatBE.bind(wrongThis);
    boundMethod(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// ============ 空值和边界 offset ============

test('offset = 0n (BigInt 零) 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(0n);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = -0 (负零) 应等同于 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(999.999, 0);
  const result = buf.readFloatBE(-0);
  return Math.abs(result - 999.999) < 0.001;
});

test('offset = +0 (正零) 应等同于 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(888.888, 0);
  const result = buf.readFloatBE(+0);
  return Math.abs(result - 888.888) < 0.001;
});

test('offset = 0x0 (十六进制零) 应等同于 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(777.777, 0);
  const result = buf.readFloatBE(0x0);
  return Math.abs(result - 777.777) < 0.001;
});

test('offset = 0o0 (八进制零) 应等同于 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(666.666, 0);
  const result = buf.readFloatBE(0o0);
  return Math.abs(result - 666.666) < 0.001;
});

test('offset = 0b0 (二进制零) 应等同于 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(555.555, 0);
  const result = buf.readFloatBE(0b0);
  return Math.abs(result - 555.555) < 0.001;
});

test('offset = 0x4 (十六进制 4)', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(444.444, 4);
  const result = buf.readFloatBE(0x4);
  return Math.abs(result - 444.444) < 0.001;
});

test('offset = 0o4 (八进制 4)', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(333.333, 4);
  const result = buf.readFloatBE(0o4);
  return Math.abs(result - 333.333) < 0.001;
});

test('offset = 0b100 (二进制 4)', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(222.222, 4);
  const result = buf.readFloatBE(0b100);
  return Math.abs(result - 222.222) < 0.001;
});

// ============ Buffer 创建方式的差异 ============

test('Buffer.alloc 创建的 Buffer 可读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(111.111, 0);
  return Math.abs(buf.readFloatBE(0) - 111.111) < 0.001;
});

test('Buffer.allocUnsafe 创建的 Buffer 可读取', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(222.222, 0);
  return Math.abs(buf.readFloatBE(0) - 222.222) < 0.001;
});

test('Buffer.allocUnsafeSlow 创建的 Buffer 可读取', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatBE(333.333, 0);
  return Math.abs(buf.readFloatBE(0) - 333.333) < 0.001;
});

test('Buffer.from(ArrayBuffer) 可读取', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeFloatBE(444.444, 0);
  return Math.abs(buf.readFloatBE(0) - 444.444) < 0.001;
});

test('Buffer.from(Array) 可读取', () => {
  const buf = Buffer.from([0x40, 0x49, 0x0F, 0xDB]);
  return Math.abs(buf.readFloatBE(0) - Math.PI) < 0.00001;
});

test('Buffer.from(Buffer) 可读取', () => {
  const buf1 = Buffer.alloc(4);
  buf1.writeFloatBE(555.555, 0);
  const buf2 = Buffer.from(buf1);
  return Math.abs(buf2.readFloatBE(0) - 555.555) < 0.001;
});

test('Buffer.from(string, encoding) 可读取', () => {
  const buf = Buffer.from('40490fdb', 'hex');
  return Math.abs(buf.readFloatBE(0) - Math.PI) < 0.00001;
});

// ============ 极端大小的 Buffer ============

test('4 字节 Buffer 正好可以读取一个 float', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123.456, 0);
  return Math.abs(buf.readFloatBE(0) - 123.456) < 0.001;
});

test('3 字节 Buffer 无法读取 float', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('非常大的 Buffer (10MB) 可以在任意有效位置读取', () => {
  const size = 10 * 1024 * 1024;
  const buf = Buffer.alloc(size);
  const offset = size - 4;
  buf.writeFloatBE(999.999, offset);
  return Math.abs(buf.readFloatBE(offset) - 999.999) < 0.001;
});

// ============ 数值精度边界 (Float32) ============

test('读取 Float32 最大值', () => {
  const buf = Buffer.alloc(4);
  const max = 3.4028234663852886e+38;
  buf.writeFloatBE(max, 0);
  const read = buf.readFloatBE(0);
  return Math.abs((read - max) / max) < 0.0001;
});

test('读取 Float32 最小正值', () => {
  const buf = Buffer.alloc(4);
  const min = 1.175494e-38;
  buf.writeFloatBE(min, 0);
  const read = buf.readFloatBE(0);
  return Math.abs((read - min) / min) < 0.01;
});

test('读取接近零的极小值', () => {
  const buf = Buffer.alloc(4);
  const tiny = 1.4e-45;
  buf.writeFloatBE(tiny, 0);
  const read = buf.readFloatBE(0);
  return read === tiny || Math.abs(read - tiny) < 1e-45;
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
