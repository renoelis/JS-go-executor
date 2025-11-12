// buf.writeUIntBE/LE() - 边界情况测试
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

// 各 byteLength 的最大值精确测试
test('writeUIntBE 1字节最大值 0xff', () => {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUIntBE(0xff, 0, 1);
  return buf[0] === 0xff;
});

test('writeUIntBE 2字节最大值 0xffff', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.writeUIntBE(0xffff, 0, 2);
  return buf[0] === 0xff && buf[1] === 0xff;
});

test('writeUIntBE 3字节最大值 0xffffff', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0xffffff, 0, 3);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff;
});

test('writeUIntBE 4字节最大值 0xffffffff', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.writeUIntBE(0xffffffff, 0, 4);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff;
});

test('writeUIntBE 5字节最大值 0xffffffffff', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(0xffffffffff, 0, 5);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff && buf[4] === 0xff;
});

test('writeUIntBE 6字节最大值 0xffffffffffff', () => {
  const buf = Buffer.allocUnsafe(7);
  buf.writeUIntBE(0xffffffffffff, 0, 6);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff && buf[4] === 0xff && buf[5] === 0xff;
});

test('writeUIntLE 1字节最大值 0xff', () => {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUIntLE(0xff, 0, 1);
  return buf[0] === 0xff;
});

test('writeUIntLE 2字节最大值 0xffff', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.writeUIntLE(0xffff, 0, 2);
  return buf[0] === 0xff && buf[1] === 0xff;
});

test('writeUIntLE 3字节最大值 0xffffff', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0xffffff, 0, 3);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff;
});

test('writeUIntLE 4字节最大值 0xffffffff', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.writeUIntLE(0xffffffff, 0, 4);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff;
});

test('writeUIntLE 5字节最大值 0xffffffffff', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntLE(0xffffffffff, 0, 5);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff && buf[4] === 0xff;
});

test('writeUIntLE 6字节最大值 0xffffffffffff', () => {
  const buf = Buffer.allocUnsafe(7);
  buf.writeUIntLE(0xffffffffffff, 0, 6);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff && buf[4] === 0xff && buf[5] === 0xff;
});

// 精确边界：超出最大值 1
test('writeUIntBE 1字节超出 1 应该报错', () => {
  const buf = Buffer.allocUnsafe(2);
  try {
    buf.writeUIntBE(0x100, 0, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntBE 2字节超出 1 应该报错', () => {
  const buf = Buffer.allocUnsafe(3);
  try {
    buf.writeUIntBE(0x10000, 0, 2);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE 1字节超出 1 应该报错', () => {
  const buf = Buffer.allocUnsafe(2);
  try {
    buf.writeUIntLE(0x100, 0, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE 2字节超出 1 应该报错', () => {
  const buf = Buffer.allocUnsafe(3);
  try {
    buf.writeUIntLE(0x10000, 0, 2);
    return false;
  } catch (e) {
    return true;
  }
});

// 大端小端对比测试
test('writeUIntBE 和 writeUIntLE 字节序对比', () => {
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeUIntBE(0x12345678, 0, 4);
  bufLE.writeUIntLE(0x12345678, 0, 4);
  return bufBE[0] === 0x12 && bufBE[3] === 0x78 && bufLE[0] === 0x78 && bufLE[3] === 0x12;
});

// offset 为 buffer 末尾（应该越界）
test('writeUIntBE offset 为 buffer 长度应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, 4, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE offset 为 buffer 长度应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x12, 4, 1);
    return false;
  } catch (e) {
    return true;
  }
});

// 在 buffer 最后一个字节写入
test('writeUIntBE 在最后一个字节写入 1 字节', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(0x99, 3, 1);
  return result === 4 && buf[3] === 0x99;
});

test('writeUIntLE 在最后一个字节写入 1 字节', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(0x99, 3, 1);
  return result === 4 && buf[3] === 0x99;
});

// 覆盖测试
test('writeUIntBE 覆盖已有数据', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff]);
  buf.writeUIntBE(0x1234, 1, 2);
  return buf[0] === 0xff && buf[1] === 0x12 && buf[2] === 0x34 && buf[3] === 0xff;
});

test('writeUIntLE 覆盖已有数据', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff]);
  buf.writeUIntLE(0x1234, 1, 2);
  return buf[0] === 0xff && buf[1] === 0x34 && buf[2] === 0x12 && buf[3] === 0xff;
});

// 部分覆盖
test('writeUIntBE 部分覆盖之前写入的数据', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(0x112233, 0, 3);
  buf.writeUIntBE(0x4455, 1, 2);
  return buf[0] === 0x11 && buf[1] === 0x44 && buf[2] === 0x55;
});

test('writeUIntLE 部分覆盖之前写入的数据', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntLE(0x112233, 0, 3);
  buf.writeUIntLE(0x4455, 1, 2);
  return buf[0] === 0x33 && buf[1] === 0x55 && buf[2] === 0x44;
});

// 长 buffer 测试
test('writeUIntBE 在大 buffer 中间写入', () => {
  const buf = Buffer.allocUnsafe(1024);
  const result = buf.writeUIntBE(0x123456, 500, 3);
  return result === 503 && buf[500] === 0x12 && buf[501] === 0x34 && buf[502] === 0x56;
});

test('writeUIntLE 在大 buffer 中间写入', () => {
  const buf = Buffer.allocUnsafe(1024);
  const result = buf.writeUIntLE(0x123456, 500, 3);
  return result === 503 && buf[500] === 0x56 && buf[501] === 0x34 && buf[502] === 0x12;
});

// 特殊数值模式
test('writeUIntBE 交替位模式 0xaa', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0xaa, 0, 1);
  return buf[0] === 0xaa;
});

test('writeUIntBE 交替位模式 0x55', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0x55, 0, 1);
  return buf[0] === 0x55;
});

test('writeUIntLE 交替位模式 0xaa', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0xaa, 0, 1);
  return buf[0] === 0xaa;
});

test('writeUIntLE 交替位模式 0x55', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0x55, 0, 1);
  return buf[0] === 0x55;
});

// 递增序列
test('writeUIntBE 递增序列', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(0x010203, 0, 3);
  return buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03;
});

test('writeUIntLE 递增序列', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntLE(0x010203, 0, 3);
  return buf[0] === 0x03 && buf[1] === 0x02 && buf[2] === 0x01;
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
