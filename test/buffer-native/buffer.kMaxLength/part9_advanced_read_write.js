// buffer.kMaxLength - Part 9: Advanced Buffer Methods
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// readInt16/readInt32/readBigInt64 系列
test('buffer.readInt16LE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.from([0, 1, 2, 3]);
    buf.readInt16LE(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.readInt16BE 正常工作', () => {
  const buf = Buffer.from([0x01, 0x02]);
  const result = buf.readInt16BE(0);
  return result === 0x0102;
});

test('buffer.readInt32LE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.from([0, 1, 2, 3, 4]);
    buf.readInt32LE(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.readInt32BE 正常工作', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const result = buf.readInt32BE(0);
  return result === 0x01020304;
  });

test('buffer.readUInt16LE 正常工作', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  const result = buf.readUInt16LE(0);
  return result === 0xFFFF;
});

test('buffer.readUInt32LE 正常工作', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const result = buf.readUInt32LE(0);
  return result === 0xFFFFFFFF;
});

test('buffer.readFloatLE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.readDoubleLE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.readBigInt64LE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.readBigUInt64LE 正常工作', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const result = buf.readBigUInt64LE(0);
  return result === 18446744073709551615n;
});

// writeInt16/writeInt32/writeBigInt64 系列
test('buffer.writeInt16LE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16LE(1, kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.writeInt16BE 正常工作', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(0x0102, 0);
  return buf[0] === 0x01 && buf[1] === 0x02;
});

test('buffer.writeInt32LE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt32LE(1, kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.writeInt32BE 正常工作', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(0x01020304, 0);
  return buf[0] === 0x01 && buf[3] === 0x04;
});

test('buffer.writeFloatLE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeFloatLE(1.5, kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.writeDoubleLE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeDoubleLE(1.5, kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.writeBigInt64LE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeBigInt64LE(123n, kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.writeBigUInt64LE 正常工作', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(18446744073709551615n, 0);
  return buf[0] === 0xFF && buf[7] === 0xFF;
});

// readIntLE/readUIntLE 动态长度版本
test('buffer.readIntLE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.readIntLE(kMaxLength, 6);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.readIntLE 正常工作', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  const result = buf.readIntLE(0, 3);
  return result === 0x030201;
});

test('buffer.readUIntLE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.readUIntLE(kMaxLength, 6);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.readUIntBE 正常工作', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  const result = buf.readUIntBE(0, 3);
  return result === 0x010203;
});

// writeIntLE/writeUIntLE 动态长度版本
test('buffer.writeIntLE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeIntLE(123, kMaxLength, 6);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.writeUIntLE 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeUIntLE(123, kMaxLength, 6);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.writeUIntBE 正常工作', () => {
  const buf = Buffer.alloc(3);
  buf.writeUIntBE(0x010203, 0, 3);
  return buf[0] === 0x01 && buf[2] === 0x03;
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
