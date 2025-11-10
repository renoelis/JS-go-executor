// buf.swap16/swap32/swap64 - Part 1: Basic Functionality Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅' });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

function bufferEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ==================== swap16 基本功能 ====================

test('swap16 - 基本2字节交换', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const result = buf.swap16();

  // swap16 应该交换每对字节
  if (buf[0] !== 0x02) throw new Error(`Expected buf[0] to be 0x02, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0x01) throw new Error(`Expected buf[1] to be 0x01, got 0x${buf[1].toString(16)}`);
  if (buf[2] !== 0x04) throw new Error(`Expected buf[2] to be 0x04, got 0x${buf[2].toString(16)}`);
  if (buf[3] !== 0x03) throw new Error(`Expected buf[3] to be 0x03, got 0x${buf[3].toString(16)}`);

  // swap16 返回原 buffer 的引用
  if (result !== buf) throw new Error('swap16 should return the same buffer reference');
});

test('swap16 - 单对字节', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  buf.swap16();

  if (buf[0] !== 0xCD) throw new Error(`Expected buf[0] to be 0xCD, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0xAB) throw new Error(`Expected buf[1] to be 0xAB, got 0x${buf[1].toString(16)}`);
});

test('swap16 - 多对字节', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap16();

  const expected = [0x02, 0x01, 0x04, 0x03, 0x06, 0x05, 0x08, 0x07];
  for (let i = 0; i < expected.length; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Expected buf[${i}] to be 0x${expected[i].toString(16)}, got 0x${buf[i].toString(16)}`);
    }
  }
});

test('swap16 - 零值字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF, 0xFF]);
  buf.swap16();

  if (buf[0] !== 0x00) throw new Error(`Expected buf[0] to be 0x00, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0x00) throw new Error(`Expected buf[1] to be 0x00, got 0x${buf[1].toString(16)}`);
  if (buf[2] !== 0xFF) throw new Error(`Expected buf[2] to be 0xFF, got 0x${buf[2].toString(16)}`);
  if (buf[3] !== 0xFF) throw new Error(`Expected buf[3] to be 0xFF, got 0x${buf[3].toString(16)}`);
});

test('swap16 - 返回值是原buffer', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.swap16();

  if (result !== buf) throw new Error('swap16 should return the same buffer instance');
  if (buf[0] !== 0x34) throw new Error('Original buffer should be modified');
});

// ==================== swap32 基本功能 ====================

test('swap32 - 基本4字节交换', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  // swap32 应该反转4字节顺序
  if (buf[0] !== 0x04) throw new Error(`Expected buf[0] to be 0x04, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0x03) throw new Error(`Expected buf[1] to be 0x03, got 0x${buf[1].toString(16)}`);
  if (buf[2] !== 0x02) throw new Error(`Expected buf[2] to be 0x02, got 0x${buf[2].toString(16)}`);
  if (buf[3] !== 0x01) throw new Error(`Expected buf[3] to be 0x01, got 0x${buf[3].toString(16)}`);
});

test('swap32 - 单个4字节组', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const result = buf.swap32();

  const expected = [0x04, 0x03, 0x02, 0x01];
  for (let i = 0; i < expected.length; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Expected buf[${i}] to be 0x${expected[i].toString(16)}, got 0x${buf[i].toString(16)}`);
    }
  }

  if (result !== buf) throw new Error('swap32 should return the same buffer reference');
});

test('swap32 - 多个4字节组', () => {
  const buf = Buffer.from([
    0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0x0C
  ]);
  buf.swap32();

  const expected = [
    0x04, 0x03, 0x02, 0x01,
    0x08, 0x07, 0x06, 0x05,
    0x0C, 0x0B, 0x0A, 0x09
  ];

  for (let i = 0; i < expected.length; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Expected buf[${i}] to be 0x${expected[i].toString(16)}, got 0x${buf[i].toString(16)}`);
    }
  }
});

test('swap32 - 零值和最大值', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF]);
  buf.swap32();

  if (buf[0] !== 0x00) throw new Error(`Expected buf[0] to be 0x00, got 0x${buf[0].toString(16)}`);
  if (buf[3] !== 0x00) throw new Error(`Expected buf[3] to be 0x00, got 0x${buf[3].toString(16)}`);
  if (buf[4] !== 0xFF) throw new Error(`Expected buf[4] to be 0xFF, got 0x${buf[4].toString(16)}`);
  if (buf[7] !== 0xFF) throw new Error(`Expected buf[7] to be 0xFF, got 0x${buf[7].toString(16)}`);
});

// ==================== swap64 基本功能 ====================

test('swap64 - 基本8字节交换', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  const expected = [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01];
  for (let i = 0; i < expected.length; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Expected buf[${i}] to be 0x${expected[i].toString(16)}, got 0x${buf[i].toString(16)}`);
    }
  }
});

test('swap64 - 单个8字节组', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]);
  const result = buf.swap64();

  if (buf[0] !== 0x88) throw new Error(`Expected buf[0] to be 0x88, got 0x${buf[0].toString(16)}`);
  if (buf[7] !== 0x11) throw new Error(`Expected buf[7] to be 0x11, got 0x${buf[7].toString(16)}`);

  if (result !== buf) throw new Error('swap64 should return the same buffer reference');
});

test('swap64 - 多个8字节组', () => {
  const buf = Buffer.from([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10
  ]);
  buf.swap64();

  const expected = [
    0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01,
    0x10, 0x0F, 0x0E, 0x0D, 0x0C, 0x0B, 0x0A, 0x09
  ];

  for (let i = 0; i < expected.length; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Expected buf[${i}] to be 0x${expected[i].toString(16)}, got 0x${buf[i].toString(16)}`);
    }
  }
});

test('swap64 - 零值和最大值', () => {
  const buf = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF
  ]);
  buf.swap64();

  if (buf[0] !== 0x00) throw new Error(`Expected buf[0] to be 0x00, got 0x${buf[0].toString(16)}`);
  if (buf[7] !== 0x00) throw new Error(`Expected buf[7] to be 0x00, got 0x${buf[7].toString(16)}`);
  if (buf[8] !== 0xFF) throw new Error(`Expected buf[8] to be 0xFF, got 0x${buf[8].toString(16)}`);
  if (buf[15] !== 0xFF) throw new Error(`Expected buf[15] to be 0xFF, got 0x${buf[15].toString(16)}`);
});

// ==================== 可逆性测试 ====================

test('swap16 - 两次swap恢复原值', () => {
  const original = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const copy = Buffer.from(original);

  original.swap16();
  original.swap16();

  if (!bufferEqual(original, copy)) {
    throw new Error('Double swap16 should restore original values');
  }
});

test('swap32 - 两次swap恢复原值', () => {
  const original = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);
  const copy = Buffer.from(original);

  original.swap32();
  original.swap32();

  if (!bufferEqual(original, copy)) {
    throw new Error('Double swap32 should restore original values');
  }
});

test('swap64 - 两次swap恢复原值', () => {
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const copy = Buffer.from(original);

  original.swap64();
  original.swap64();

  if (!bufferEqual(original, copy)) {
    throw new Error('Double swap64 should restore original values');
  }
});

// ==================== 总结 ====================

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
