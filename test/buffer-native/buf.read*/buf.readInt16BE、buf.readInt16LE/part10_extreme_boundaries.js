// 极端边界和特殊数值测试
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

// === Number常量边界测试 ===

test('offset = Number.EPSILON 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(Number.EPSILON);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.MIN_VALUE 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readInt16LE(Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -Number.MIN_VALUE 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(-Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 所有可能的符号边界组合 ===

test('0x7FFF到0x8000边界 - BE', () => {
  const buf7FFF = Buffer.from([0x7F, 0xFF]);
  const buf8000 = Buffer.from([0x80, 0x00]);
  return buf7FFF.readInt16BE(0) === 32767 &&
         buf8000.readInt16BE(0) === -32768;
});

test('0x7FFF到0x8000边界 - LE', () => {
  const buf7FFF = Buffer.from([0xFF, 0x7F]);
  const buf8000 = Buffer.from([0x00, 0x80]);
  return buf7FFF.readInt16LE(0) === 32767 &&
         buf8000.readInt16LE(0) === -32768;
});

test('0xFFFF到0x0000边界 - BE', () => {
  const bufFFFF = Buffer.from([0xFF, 0xFF]);
  const buf0000 = Buffer.from([0x00, 0x00]);
  return bufFFFF.readInt16BE(0) === -1 &&
         buf0000.readInt16BE(0) === 0;
});

test('0xFFFF到0x0000边界 - LE', () => {
  const bufFFFF = Buffer.from([0xFF, 0xFF]);
  const buf0000 = Buffer.from([0x00, 0x00]);
  return bufFFFF.readInt16LE(0) === -1 &&
         buf0000.readInt16LE(0) === 0;
});

// === 位模式边界测试 ===

test('符号位切换 0x7FFF -> 0x8000 - BE', () => {
  const testCases = [
    [0x7F, 0xFE, 32766],
    [0x7F, 0xFF, 32767],
    [0x80, 0x00, -32768],
    [0x80, 0x01, -32767],
  ];
  
  let pass = true;
  for (const [b1, b2, expected] of testCases) {
    const buf = Buffer.from([b1, b2]);
    if (buf.readInt16BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('符号位切换 0x7FFF -> 0x8000 - LE', () => {
  const testCases = [
    [0xFE, 0x7F, 32766],
    [0xFF, 0x7F, 32767],
    [0x00, 0x80, -32768],
    [0x01, 0x80, -32767],
  ];
  
  let pass = true;
  for (const [b1, b2, expected] of testCases) {
    const buf = Buffer.from([b1, b2]);
    if (buf.readInt16LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 每个字节位的测试 ===

test('高字节每一位测试 - BE', () => {
  const bits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];
  let pass = true;
  for (const bit of bits) {
    const buf = Buffer.from([bit, 0x00]);
    const result = buf.readInt16BE(0);
    const expected = bit >= 0x80 ? (bit << 8) - 0x10000 : bit << 8;
    if (result !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('低字节每一位测试 - LE', () => {
  const bits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];
  let pass = true;
  for (const bit of bits) {
    const buf = Buffer.from([0x00, bit]);
    const result = buf.readInt16LE(0);
    const expected = bit >= 0x80 ? (bit << 8) - 0x10000 : bit << 8;
    if (result !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 错误后的恢复测试 ===

test('抛出错误后Buffer仍可正常读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  try {
    buf.readInt16BE(10); // 触发错误
  } catch (e) {
    // 忽略错误
  }
  // 错误后应该仍能正常读取
  return buf.readInt16BE(0) === 0x1234;
});

test('抛出错误后Buffer仍可正常读取 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  try {
    buf.readInt16LE(10); // 触发错误
  } catch (e) {
    // 忽略错误
  }
  // 错误后应该仍能正常读取
  return buf.readInt16LE(0) === 0x1234;
});

test('多次错误后仍能恢复 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  let errorCount = 0;
  
  for (let i = 0; i < 5; i++) {
    try {
      buf.readInt16BE(10);
    } catch (e) {
      errorCount++;
    }
  }
  
  return errorCount === 5 && buf.readInt16BE(0) === 0x1234;
});

// === 读取和写入交互测试 ===

test('读取、写入、再读取 - BE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x1234, 0);
  const read1 = buf.readInt16BE(0);
  buf.writeInt16BE(0x5678, 2);
  const read2 = buf.readInt16BE(0);
  const read3 = buf.readInt16BE(2);
  return read1 === 0x1234 && read2 === 0x1234 && read3 === 0x5678;
});

test('读取、写入、再读取 - LE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(0x1234, 0);
  const read1 = buf.readInt16LE(0);
  buf.writeInt16LE(0x5678, 2);
  const read2 = buf.readInt16LE(0);
  const read3 = buf.readInt16LE(2);
  return read1 === 0x1234 && read2 === 0x1234 && read3 === 0x5678;
});

test('覆盖写入后读取 - BE', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(0x1234, 0);
  buf.writeInt16BE(0x5678, 0);
  return buf.readInt16BE(0) === 0x5678;
});

test('覆盖写入后读取 - LE', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16LE(0x1234, 0);
  buf.writeInt16LE(0x5678, 0);
  return buf.readInt16LE(0) === 0x5678;
});

// === 极端大小Buffer测试 ===

test('2字节Buffer（最小有效大小）- BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE(0) === 0x1234;
});

test('2字节Buffer（最小有效大小）- LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readInt16LE(0) === 0x1234;
});

test('10KB Buffer 末尾读取 - BE', () => {
  const size = 10240;
  const buf = Buffer.alloc(size);
  buf[size - 2] = 0x12;
  buf[size - 1] = 0x34;
  return buf.readInt16BE(size - 2) === 0x1234;
});

test('10KB Buffer 末尾读取 - LE', () => {
  const size = 10240;
  const buf = Buffer.alloc(size);
  buf[size - 2] = 0x34;
  buf[size - 1] = 0x12;
  return buf.readInt16LE(size - 2) === 0x1234;
});

// === 特殊模式组合 ===

test('交替字节模式 0xAA55 - BE', () => {
  const buf = Buffer.from([0xAA, 0x55]);
  return buf.readInt16BE(0) === -21931; // 0xAA55 as signed
});

test('交替字节模式 0xAA55 - LE', () => {
  const buf = Buffer.from([0x55, 0xAA]);
  return buf.readInt16LE(0) === -21931; // 0xAA55 as signed
});

test('全1后半字节 0x0FFF - BE', () => {
  const buf = Buffer.from([0x0F, 0xFF]);
  return buf.readInt16BE(0) === 4095;
});

test('全1后半字节 0x0FFF - LE', () => {
  const buf = Buffer.from([0xFF, 0x0F]);
  return buf.readInt16LE(0) === 4095;
});

// === 负数边界精确测试 ===

test('所有256个负数高字节 - BE', () => {
  let pass = true;
  for (let high = 0x80; high <= 0xFF; high++) {
    const buf = Buffer.from([high, 0x00]);
    const result = buf.readInt16BE(0);
    const expected = (high << 8) - 0x10000;
    if (result !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('所有256个负数高字节 - LE', () => {
  let pass = true;
  for (let high = 0x80; high <= 0xFF; high++) {
    const buf = Buffer.from([0x00, high]);
    const result = buf.readInt16LE(0);
    const expected = (high << 8) - 0x10000;
    if (result !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
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
