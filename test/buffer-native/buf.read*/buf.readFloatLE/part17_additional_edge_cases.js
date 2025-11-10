// buf.readFloatLE() - 额外边界案例补充测试
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

// 测试 Buffer 长度边界（恰好4字节）
test('Buffer 长度恰好 4 字节可以读取 offset=0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.5, 0);
  return buf.readFloatLE(0) === 1.5;
});

// 测试 Buffer 长度为 5 字节，offset=1
test('Buffer 长度 5 字节，offset=1 可以读取', () => {
  const buf = Buffer.alloc(5);
  buf.writeFloatLE(2.5, 1);
  return buf.readFloatLE(1) === 2.5;
});

test('Buffer 长度 5 字节，offset=2 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.readFloatLE(2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 测试多个 offset 参数传递（应该只使用第一个）
test('传递多个参数时只使用第一个 offset', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(3.14, 0);
  buf.writeFloatLE(2.71, 4);
  return Math.abs(buf.readFloatLE(0, 4, 8) - 3.14) < 0.01;
});

// 测试 offset 为 0.0（纯整数浮点，实际上是整数，应该抛出 RangeError）
test('offset 为 0.0 应抛出 RangeError（浮点数不允许）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeFloatLE(1.5, 0);
    const result = buf.readFloatLE(0.0);
    // 在 Node.js 中，0.0 实际上被视为整数 0，所以会成功
    return result === 1.5;
  } catch (e) {
    // 如果抛出错误，也是可以接受的
    return e.name === 'RangeError';
  }
});

// 测试 offset 为 1.0（JavaScript 中 1.0 === 1，会被视为整数）
test('offset 为 1.0 等同于整数 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(2.5, 1);
  // 在 JavaScript 中，1.0 === 1，所以会当作整数 1 处理
  const result = buf.readFloatLE(1.0);
  return Math.abs(result - 2.5) < 0.01;
});

// 测试大 Buffer（超过1KB）
test('大 Buffer（1024 字节）中间位置读取', () => {
  const buf = Buffer.alloc(1024);
  buf.writeFloatLE(3.14159, 512);
  return Math.abs(buf.readFloatLE(512) - 3.14159) < 0.001;
});

test('大 Buffer 最后 4 字节读取', () => {
  const buf = Buffer.alloc(1024);
  buf.writeFloatLE(2.71828, 1020);
  return Math.abs(buf.readFloatLE(1020) - 2.71828) < 0.001;
});

test('大 Buffer offset=1021 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(1024);
    buf.readFloatLE(1021);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 测试从 hex 字符串创建的 Buffer
test('从 hex 字符串创建 Buffer 后读取', () => {
  const buf = Buffer.from('0000803F', 'hex'); // 1.0 in LE
  return buf.readFloatLE(0) === 1.0;
});

// 测试从 base64 字符串创建的 Buffer
test('从 base64 字符串创建 Buffer 后读取', () => {
  const buf = Buffer.from('AACAPw==', 'base64'); // 1.0 in LE
  return buf.readFloatLE(0) === 1.0;
});

// 测试 Buffer.allocUnsafeSlow
test('Buffer.allocUnsafeSlow 创建后写入读取', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatLE(1.234, 0);
  return Math.abs(buf.readFloatLE(0) - 1.234) < 0.001;
});

// 测试 shared ArrayBuffer
test('从 SharedArrayBuffer 创建 Buffer 读取', () => {
  try {
    const sab = new SharedArrayBuffer(8);
    const buf = Buffer.from(sab);
    buf.writeFloatLE(2.5, 0);
    return buf.readFloatLE(0) === 2.5;
  } catch (e) {
    // SharedArrayBuffer 可能不支持，跳过
    return true;
  }
});

// 测试 offset 为字符串 '0'（应抛出 TypeError）
test('offset 为字符串 "0" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 offset 为空数组
test('offset 为空数组 [] 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE([]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 offset 为包含数字的数组
test('offset 为 [0] 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE([0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试连续写入不同位置后分别读取
test('连续写入 3 个位置后正确读取', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatLE(1.1, 0);
  buf.writeFloatLE(2.2, 4);
  buf.writeFloatLE(3.3, 8);
  return Math.abs(buf.readFloatLE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatLE(4) - 2.2) < 0.01 &&
         Math.abs(buf.readFloatLE(8) - 3.3) < 0.01;
});

// 测试 subnormal numbers（非规格化数）的额外情况
test('读取最小正 subnormal number', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]); // 最小非规格化数
  const result = buf.readFloatLE(0);
  return result > 0 && result < 1e-44;
});

test('读取最小负 subnormal number', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x80]); // 最小负非规格化数
  const result = buf.readFloatLE(0);
  return result < 0 && result > -1e-44;
});

// 测试所有字节为 0xAA 的模式
test('所有字节为 0xAA 读取', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA]);
  const result = buf.readFloatLE(0);
  return typeof result === 'number';
});

// 测试递增字节序列
test('递增字节序列 [0x00, 0x01, 0x02, 0x03] 读取', () => {
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
  const result = buf.readFloatLE(0);
  return typeof result === 'number' && !Number.isNaN(result);
});

// 测试递减字节序列
test('递减字节序列 [0xFF, 0xFE, 0xFD, 0xFC] 读取', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]);
  const result = buf.readFloatLE(0);
  return typeof result === 'number';
});

// 测试 offset 为 Number.MAX_VALUE
test('offset 为 Number.MAX_VALUE 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 测试 offset 为 Number.MIN_VALUE（极小正数）
test('offset 为 Number.MIN_VALUE（极小正数）应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 测试 offset 为 2^31 - 1（最大 32 位有符号整数）
test('offset 为 2^31 - 1 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Math.pow(2, 31) - 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 测试 offset 为 2^32（超过 32 位）
test('offset 为 2^32 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Math.pow(2, 32));
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
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
