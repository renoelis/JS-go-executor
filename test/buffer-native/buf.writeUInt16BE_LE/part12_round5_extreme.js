// buf.writeUInt16BE/LE() - Round 5: 极端场景与兼容性挑刺
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

// 极端 offset 边界
test('writeUInt16BE: offset 负数小值 -1', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 负数小值 -1', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: offset 负数大值 -100', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, -100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 负数大值 -100', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, -100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 极端值边界
test('writeUInt16BE: 值为 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16BE(Number.MAX_SAFE_INTEGER, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 值为 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16LE(Number.MAX_SAFE_INTEGER, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: 值为 Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16BE(Number.MAX_VALUE, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 值为 Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16LE(Number.MAX_VALUE, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊编码场景
test('writeUInt16BE: ASCII 可见字符范围', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0x4142, 0);
  return buf.toString('ascii', 0, 2) === 'AB';
});

test('writeUInt16LE: ASCII 可见字符范围', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0x4241, 0);
  return buf.toString('ascii', 0, 2) === 'AB';
});

// Unicode 范围值
test('writeUInt16BE: UTF-16 BOM 字节序标记 0xFEFF', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xFEFF, 0);
  return buf[0] === 0xFE && buf[1] === 0xFF;
});

test('writeUInt16LE: UTF-16 BOM 字节序标记 0xFFFE', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xFEFF, 0);
  return buf[0] === 0xFF && buf[1] === 0xFE;
});

// 特殊位模式验证
test('writeUInt16BE: 奇偶位交替 0x5AA5', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0x5AA5, 0);
  return buf[0] === 0x5A && buf[1] === 0xA5;
});

test('writeUInt16LE: 奇偶位交替 0x5AA5', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0x5AA5, 0);
  return buf[0] === 0xA5 && buf[1] === 0x5A;
});

// 幂次值精确性
test('writeUInt16BE: 2^0 到 2^15 所有幂次', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i <= 15; i++) {
    const val = Math.pow(2, i);
    buf.writeUInt16BE(val, 0);
    if (buf.readUInt16BE(0) !== val) return false;
  }
  return true;
});

test('writeUInt16LE: 2^0 到 2^15 所有幂次', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i <= 15; i++) {
    const val = Math.pow(2, i);
    buf.writeUInt16LE(val, 0);
    if (buf.readUInt16LE(0) !== val) return false;
  }
  return true;
});

// 位掩码场景
test('writeUInt16BE: 位掩码 0x00FF', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0x00FF, 0);
  return buf[0] === 0x00 && buf[1] === 0xFF;
});

test('writeUInt16LE: 位掩码 0x00FF', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0x00FF, 0);
  return buf[0] === 0xFF && buf[1] === 0x00;
});

test('writeUInt16BE: 位掩码 0xFF00', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xFF00, 0);
  return buf[0] === 0xFF && buf[1] === 0x00;
});

test('writeUInt16LE: 位掩码 0xFF00', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xFF00, 0);
  return buf[0] === 0x00 && buf[1] === 0xFF;
});

// 循环边界值
test('writeUInt16BE: 值 256 的倍数', () => {
  const buf = Buffer.alloc(2);
  const values = [0, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  for (const val of values) {
    buf.writeUInt16BE(val, 0);
    if (buf.readUInt16BE(0) !== val) return false;
  }
  return true;
});

test('writeUInt16LE: 值 256 的倍数', () => {
  const buf = Buffer.alloc(2);
  const values = [0, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  for (const val of values) {
    buf.writeUInt16LE(val, 0);
    if (buf.readUInt16LE(0) !== val) return false;
  }
  return true;
});

// offset 为浮点数的各种情况
test('writeUInt16BE: offset 为 0.5 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, 0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 为 0.5 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, 0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE: offset 为 -0.5 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, -0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: offset 为 -0.5 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, -0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 值为特殊字符串
test('writeUInt16BE: 值为空格字符串转为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE('   ', 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 值为空格字符串转为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE('   ', 0);
  return buf.readUInt16LE(0) === 0;
});

test('writeUInt16BE: 值为换行符字符串转为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE('\n', 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 值为换行符字符串转为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE('\n', 0);
  return buf.readUInt16LE(0) === 0;
});

// 极大 buffer 边界写入
test('writeUInt16BE: 10MB buffer 末尾写入', () => {
  const size = 10 * 1024 * 1024;
  const buf = Buffer.alloc(size);
  buf.writeUInt16BE(0xABCD, size - 2);
  return buf[size - 2] === 0xAB && buf[size - 1] === 0xCD;
});

test('writeUInt16LE: 10MB buffer 末尾写入', () => {
  const size = 10 * 1024 * 1024;
  const buf = Buffer.alloc(size);
  buf.writeUInt16LE(0xABCD, size - 2);
  return buf[size - 2] === 0xCD && buf[size - 1] === 0xAB;
});

// 历史兼容性：确保行为一致
test('writeUInt16BE: 与 readUInt16BE 完全对称', () => {
  const buf = Buffer.alloc(2);
  const testValues = [0, 1, 255, 256, 32767, 32768, 65534, 65535];
  for (const val of testValues) {
    buf.writeUInt16BE(val, 0);
    if (buf.readUInt16BE(0) !== val) return false;
  }
  return true;
});

test('writeUInt16LE: 与 readUInt16LE 完全对称', () => {
  const buf = Buffer.alloc(2);
  const testValues = [0, 1, 255, 256, 32767, 32768, 65534, 65535];
  for (const val of testValues) {
    buf.writeUInt16LE(val, 0);
    if (buf.readUInt16LE(0) !== val) return false;
  }
  return true;
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
