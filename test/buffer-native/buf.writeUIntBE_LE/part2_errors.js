// buf.writeUIntBE/LE() - 错误处理测试
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

// byteLength 超出范围
test('writeUIntBE byteLength 为 0 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, 0, 0);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') || e.message.includes('range');
  }
});

test('writeUIntBE byteLength 为 7 应该报错', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeUIntBE(0x12, 0, 7);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') || e.message.includes('range') || e.message.includes('must be');
  }
});

test('writeUIntLE byteLength 为 0 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x12, 0, 0);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') || e.message.includes('range');
  }
});

test('writeUIntLE byteLength 为 7 应该报错', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeUIntLE(0x12, 0, 7);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') || e.message.includes('range') || e.message.includes('must be');
  }
});

// offset 越界
test('writeUIntBE offset 为负数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, -1, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('writeUIntBE offset 超出 buffer 长度应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, 5, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeUIntLE offset 为负数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x12, -1, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('writeUIntLE offset 超出 buffer 长度应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x12, 5, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// offset + byteLength 越界
test('writeUIntBE offset + byteLength 超出 buffer 长度应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x1234, 3, 2);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeUIntLE offset + byteLength 超出 buffer 长度应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x1234, 3, 2);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// 边界情况 - offset + byteLength 刚好等于 buffer 长度（应该成功）
test('writeUIntBE offset + byteLength 等于 buffer 长度应该成功', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(0x1234, 2, 2);
  return result === 4 && buf[2] === 0x12 && buf[3] === 0x34;
});

test('writeUIntLE offset + byteLength 等于 buffer 长度应该成功', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(0x1234, 2, 2);
  return result === 4 && buf[2] === 0x34 && buf[3] === 0x12;
});

// value 超出 byteLength 能表示的范围
test('writeUIntBE 1字节时 value 超过 0xff', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x100, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range') || e.message.includes('out of');
  }
});

test('writeUIntBE 2字节时 value 超过 0xffff', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x10000, 0, 2);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range') || e.message.includes('out of');
  }
});

test('writeUIntLE 1字节时 value 超过 0xff', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x100, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range') || e.message.includes('out of');
  }
});

test('writeUIntLE 2字节时 value 超过 0xffff', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x10000, 0, 2);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range') || e.message.includes('out of');
  }
});

// 负数值
test('writeUIntBE 传入负数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(-1, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('negative') || e.message.includes('unsigned');
  }
});

test('writeUIntLE 传入负数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(-1, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('negative') || e.message.includes('unsigned');
  }
});

// 参数类型错误 - "abc" 会被转为 NaN 再转为 0
test('writeUIntBE value 为非数字字符串转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntBE('abc', 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntBE offset 为非数字', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, 'abc', 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('number') || e.message.includes('type');
  }
});

test('writeUIntBE byteLength 为非数字', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, 0, 'abc');
    return false;
  } catch (e) {
    return e.message.includes('byteLength') || e.message.includes('number') || e.message.includes('type');
  }
});

test('writeUIntLE value 为非数字字符串转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntLE('abc', 0, 1);
  return r === 1 && buf[0] === 0;
});

// 空 buffer
test('writeUIntBE 在空 buffer 上应该报错', () => {
  const buf = Buffer.allocUnsafe(0);
  try {
    buf.writeUIntBE(0x12, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeUIntLE 在空 buffer 上应该报错', () => {
  const buf = Buffer.allocUnsafe(0);
  try {
    buf.writeUIntLE(0x12, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
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
