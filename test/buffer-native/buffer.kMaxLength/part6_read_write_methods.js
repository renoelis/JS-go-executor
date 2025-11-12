// buffer.kMaxLength - Part 6: Read Methods and Index Access
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

// indexOf / lastIndexOf 边界测试
test('buffer.indexOf 使用超大 offset', () => {
  const buf = Buffer.from('hello world');
  const result = buf.indexOf('world', kMaxLength);
  return result === -1;
});

test('buffer.indexOf 正常使用', () => {
  const buf = Buffer.from('hello world');
  const result = buf.indexOf('world');
  return result === 6;
});

test('buffer.lastIndexOf 使用超大 offset', () => {
  const buf = Buffer.from('hello world');
  const result = buf.lastIndexOf('world', kMaxLength);
  return result === 6;
});

test('buffer.lastIndexOf 正常使用', () => {
  const buf = Buffer.from('hello world');
  const result = buf.lastIndexOf('o');
  return result === 7;
});

test('buffer.includes 使用超大 offset', () => {
  const buf = Buffer.from('hello world');
  const result = buf.includes('hello', kMaxLength);
  return result === false;
});

test('buffer.includes 正常使用', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world');
});

// 数值读取方法
test('buffer.readInt8 在有效范围内工作', () => {
  const buf = Buffer.from([0xFF]);
  const result = buf.readInt8(0);
  return result === -1;
});

test('buffer.readInt8 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.from([0xFF]);
    buf.readInt8(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.readUInt8 在有效范围内工作', () => {
  const buf = Buffer.from([0xFF]);
  const result = buf.readUInt8(0);
  return result === 255;
});

test('buffer.readUInt8 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.from([0xFF]);
    buf.readUInt8(kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

// writeInt 方法测试
test('buffer.writeInt8 在有效范围内工作', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(-1, 0);
  return buf[0] === 0xFF;
});

test('buffer.writeInt8 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt8(1, kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.writeUInt8 在有效范围内工作', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(255, 0);
  return buf[0] === 255;
});

test('buffer.writeUInt8 使用超大 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeUInt8(1, kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

// swap 方法测试
test('buffer.swap16 正常工作', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return buf[0] === 0x02 && buf[1] === 0x01;
});

test('buffer.swap32 正常工作', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();
  return buf[0] === 0x04 && buf[3] === 0x01;
});

test('buffer.swap64 正常工作', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  return buf[0] === 0x08 && buf[7] === 0x01;
});

// compare 方法测试
test('buffer.compare 正常工作', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  return buf1.compare(buf2) < 0;
});

test('buffer.compare 使用超大 targetStart 返回 1', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  const result = buf1.compare(buf2, kMaxLength);
  return result === 1;
});

test('Buffer.compare 静态方法', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  return Buffer.compare(buf1, buf2) === 0;
});

// equals 方法测试
test('buffer.equals 相同内容返回 true', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  return buf1.equals(buf2);
});

test('buffer.equals 不同内容返回 false', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  return !buf1.equals(buf2);
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
