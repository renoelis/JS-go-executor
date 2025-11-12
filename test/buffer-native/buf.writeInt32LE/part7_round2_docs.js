// buf.writeInt32LE() - 第2轮补充：对照官方文档补漏
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

// 官方文档：签名为 buf.writeInt32LE(value[, offset])
test('文档：默认 offset 为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32LE(123);
  return result === 4 && buf[0] === 123;
});

// 官方文档：value 解释为有符号 32 位整数
test('文档：有符号整数范围内的值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(2147483647, 0);
  const val = buf.readInt32LE(0);
  return val === 2147483647;
});

test('文档：负数使用补码表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(-100, 0);
  return buf[0] === 0x9C && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

// 官方文档：offset 必须满足 0 <= offset <= buf.length - 4
test('文档：offset 边界检查 - 最小值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(123, 0);
  return buf[0] === 123;
});

test('文档：offset 边界检查 - 最大值', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeInt32LE(123, 4);
  return buf[4] === 123;
});

test('文档：offset 超出范围抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

// 官方文档：返回值为 offset + 字节数
test('文档：返回值为 offset + 4', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeInt32LE(123, 2);
  return result === 6;
});

test('文档：返回值可用于链式调用', () => {
  const buf = Buffer.allocUnsafe(12);
  let off = 0;
  off = buf.writeInt32LE(111, off);
  off = buf.writeInt32LE(222, off);
  off = buf.writeInt32LE(333, off);
  return off === 12 && buf.readInt32LE(0) === 111 && buf.readInt32LE(4) === 222 && buf.readInt32LE(8) === 333;
});

// 官方文档：value 应为有效整数
test('文档：非整数转换为整数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(123.99, 0);
  const val = buf.readInt32LE(0);
  return val === 123;
});

// 官方文档：LE 表示低位字节在前
test('文档：Little-Endian 字节顺序', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x12345678, 0);
  return buf[0] === 0x78 && buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12;
});

test('文档：LE 与内存顺序一致性', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(1, 0);
  return buf[0] === 0x01 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

// 官方文档：支持在 Uint8Array 上调用
test('文档：可在 Uint8Array 上工作', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(0x12345678, 0);
  return arr[0] === 0x78 && arr[3] === 0x12;
});

// 官方文档：范围检查
test('文档：严格的范围检查', () => {
  try {
    const buf = Buffer.allocUnsafe(3);
    buf.writeInt32LE(123, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 官方文档：负 offset 无效
test('文档：负 offset 抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

// 官方文档：值范围检查
test('文档：超出范围的值会抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(2147483648, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('文档：负数超出范围会抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(-2147483649, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

// 官方文档：Buffer 实例方法
test('文档：实例方法而非静态方法', () => {
  const buf = Buffer.allocUnsafe(4);
  return typeof buf.writeInt32LE === 'function' && typeof Buffer.writeInt32LE !== 'function';
});

// 官方文档：字节数固定为 4
test('文档：总是写入 4 个字节', () => {
  const buf = Buffer.alloc(8, 0xFF);
  buf.writeInt32LE(0, 2);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0x00 && buf[3] === 0x00 && buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0xFF && buf[7] === 0xFF;
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
