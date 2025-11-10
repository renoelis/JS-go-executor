// 极端边界测试 - Number常量和位模式
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

// === Number 常量作为 offset ===

test('offset = Number.EPSILON 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(Number.EPSILON);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.MIN_VALUE 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 符号位边界 ===

test('符号位边界: 0x7FFFFFFF -> 0x80000000 - BE', () => {
  const buf1 = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  const buf2 = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf1.readInt32BE(0) === 2147483647 &&
         buf2.readInt32BE(0) === -2147483648;
});

test('符号位边界: 0x7FFFFFFF -> 0x80000000 - LE', () => {
  const buf1 = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf1.readInt32LE(0) === 2147483647 &&
         buf2.readInt32LE(0) === -2147483648;
});

// === 零边界 ===

test('零边界: 0xFFFFFFFF -> 0x00000000 - BE', () => {
  const buf1 = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf1.readInt32BE(0) === -1 &&
         buf2.readInt32BE(0) === 0;
});

test('零边界: 0xFFFFFFFF -> 0x00000000 - LE', () => {
  const buf1 = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf1.readInt32LE(0) === -1 &&
         buf2.readInt32LE(0) === 0;
});

// === 符号位切换序列 ===

test('符号位切换完整序列 - BE', () => {
  const values = [
    [0x7F, 0xFF, 0xFF, 0xFE, 2147483646],
    [0x7F, 0xFF, 0xFF, 0xFF, 2147483647],
    [0x80, 0x00, 0x00, 0x00, -2147483648],
    [0x80, 0x00, 0x00, 0x01, -2147483647],
  ];
  
  let pass = true;
  for (const [b0, b1, b2, b3, expected] of values) {
    const buf = Buffer.from([b0, b1, b2, b3]);
    if (buf.readInt32BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('符号位切换完整序列 - LE', () => {
  const values = [
    [0xFE, 0xFF, 0xFF, 0x7F, 2147483646],
    [0xFF, 0xFF, 0xFF, 0x7F, 2147483647],
    [0x00, 0x00, 0x00, 0x80, -2147483648],
    [0x01, 0x00, 0x00, 0x80, -2147483647],
  ];
  
  let pass = true;
  for (const [b0, b1, b2, b3, expected] of values) {
    const buf = Buffer.from([b0, b1, b2, b3]);
    if (buf.readInt32LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 位模式测试 ===

test('每个字节的每一位 - 高字节位7设置 - BE', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readInt32BE(0) === -2147483648;
});

test('每个字节的每一位 - 低字节位0设置 - LE', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  return buf.readInt32LE(0) === 1;
});

test('所有位设置模式 - 交替位 0xAAAAAAAA - BE', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readInt32BE(0) === -1431655766;
});

test('所有位设置模式 - 交替位 0x55555555 - LE', () => {
  const buf = Buffer.from([0x55, 0x55, 0x55, 0x55]);
  return buf.readInt32LE(0) === 0x55555555;
});

// === 错误后Buffer状态恢复 ===

test('错误后Buffer状态不变 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const before = buf.toString('hex');
  
  try {
    buf.readInt32BE(10); // 应该失败
  } catch (e) {
    // 预期错误
  }
  
  const after = buf.toString('hex');
  const value = buf.readInt32BE(0);
  
  return before === after && value === 0x12345678;
});

test('错误后Buffer状态不变 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const before = buf.toString('hex');
  
  try {
    buf.readInt32LE(10); // 应该失败
  } catch (e) {
    // 预期错误
  }
  
  const after = buf.toString('hex');
  const value = buf.readInt32LE(0);
  
  return before === after && value === 0x12345678;
});

// === 多次错误后恢复 ===

test('多次错误后仍可正常读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  
  for (let i = 0; i < 10; i++) {
    try {
      buf.readInt32BE(100);
    } catch (e) {
      // 预期错误
    }
  }
  
  return buf.readInt32BE(0) === 0x12345678;
});

test('多次错误后仍可正常读取 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  
  for (let i = 0; i < 10; i++) {
    try {
      buf.readInt32LE(100);
    } catch (e) {
      // 预期错误
    }
  }
  
  return buf.readInt32LE(0) === 0x12345678;
});

// === 读写交互测试 ===

test('读-写-读 序列一致性 - BE', () => {
  const buf = Buffer.alloc(4);
  const testValues = [0, -1, 2147483647, -2147483648, 12345];
  
  let pass = true;
  for (const val of testValues) {
    buf.writeInt32BE(val, 0);
    const read = buf.readInt32BE(0);
    if (read !== val) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('读-写-读 序列一致性 - LE', () => {
  const buf = Buffer.alloc(4);
  const testValues = [0, -1, 2147483647, -2147483648, 12345];
  
  let pass = true;
  for (const val of testValues) {
    buf.writeInt32LE(val, 0);
    const read = buf.readInt32LE(0);
    if (read !== val) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 覆盖写入后读取 ===

test('覆盖写入后读取正确 - BE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x12345678, 0);
  return buf.readInt32BE(0) === 0x12345678;
});

test('覆盖写入后读取正确 - LE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(0x11111111, 0);
  buf.writeInt32LE(0x12345678, 0);
  return buf.readInt32LE(0) === 0x12345678;
});

// === 10KB 大Buffer末尾测试 ===

test('10KB Buffer 末尾读取 - BE', () => {
  const buf = Buffer.alloc(10240);
  buf[10236] = 0x12;
  buf[10237] = 0x34;
  buf[10238] = 0x56;
  buf[10239] = 0x78;
  return buf.readInt32BE(10236) === 0x12345678;
});

test('10KB Buffer 末尾读取 - LE', () => {
  const buf = Buffer.alloc(10240);
  buf[10236] = 0x78;
  buf[10237] = 0x56;
  buf[10238] = 0x34;
  buf[10239] = 0x12;
  return buf.readInt32LE(10236) === 0x12345678;
});

// === 特殊位模式 ===

test('位模式: 0xDEADBEEF - BE', () => {
  const buf = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]);
  return buf.readInt32BE(0) === -559038737;
});

test('位模式: 0xCAFEBABE - LE', () => {
  const buf = Buffer.from([0xBE, 0xBA, 0xFE, 0xCA]);
  return buf.readInt32LE(0) === -889275714;
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
