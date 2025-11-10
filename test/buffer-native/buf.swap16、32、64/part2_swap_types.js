// buf.swap16/swap32/swap64 - Part 2: Different Input Types Tests
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

// ==================== Buffer 类型 ====================

test('swap16 - 从 Buffer.alloc 创建', () => {
  const buf = Buffer.alloc(4);
  buf[0] = 0x01;
  buf[1] = 0x02;
  buf[2] = 0x03;
  buf[3] = 0x04;

  buf.swap16();

  if (buf[0] !== 0x02) throw new Error(`Expected 0x02, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[1].toString(16)}`);
});

test('swap16 - 从 Buffer.allocUnsafe 创建', () => {
  const buf = Buffer.allocUnsafe(4);
  buf[0] = 0xAA;
  buf[1] = 0xBB;
  buf[2] = 0xCC;
  buf[3] = 0xDD;

  const result = buf.swap16();

  if (buf[0] !== 0xBB) throw new Error(`Expected 0xBB, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0xAA) throw new Error(`Expected 0xAA, got 0x${buf[1].toString(16)}`);
  if (result !== buf) throw new Error('Should return same buffer');
});

test('swap32 - 从 Buffer.alloc 创建', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    buf[i] = i + 1;
  }

  buf.swap32();

  if (buf[0] !== 0x04) throw new Error(`Expected 0x04, got 0x${buf[0].toString(16)}`);
  if (buf[3] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[3].toString(16)}`);
  if (buf[4] !== 0x08) throw new Error(`Expected 0x08, got 0x${buf[4].toString(16)}`);
});

test('swap64 - 从 Buffer.allocUnsafe 创建', () => {
  const buf = Buffer.allocUnsafe(16);
  for (let i = 0; i < 16; i++) {
    buf[i] = i + 1;
  }

  buf.swap64();

  if (buf[0] !== 0x08) throw new Error(`Expected 0x08, got 0x${buf[0].toString(16)}`);
  if (buf[7] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[7].toString(16)}`);
});

// ==================== Buffer.from 各种来源 ====================

test('swap16 - 从 Array 创建', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  buf.swap16();

  if (buf[0] !== 0x34) throw new Error(`Expected 0x34, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0x12) throw new Error(`Expected 0x12, got 0x${buf[1].toString(16)}`);
});

test('swap32 - 从 Array 创建', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  if (buf[0] !== 0x04) throw new Error(`Expected 0x04, got 0x${buf[0].toString(16)}`);
  if (buf[3] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[3].toString(16)}`);
});

test('swap16 - 从 Uint8Array 创建', () => {
  const arr = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]);
  const buf = Buffer.from(arr);
  buf.swap16();

  if (buf[0] !== 0xBB) throw new Error(`Expected 0xBB, got 0x${buf[0].toString(16)}`);
  if (buf[2] !== 0xDD) throw new Error(`Expected 0xDD, got 0x${buf[2].toString(16)}`);
});

test('swap32 - 从 Uint8Array 创建', () => {
  const arr = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const buf = Buffer.from(arr);
  buf.swap32();

  if (buf[0] !== 0x04) throw new Error(`Expected 0x04, got 0x${buf[0].toString(16)}`);
  if (buf[4] !== 0x08) throw new Error(`Expected 0x08, got 0x${buf[4].toString(16)}`);
});

test('swap64 - 从 Uint8Array 创建', () => {
  const arr = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const buf = Buffer.from(arr);
  buf.swap64();

  if (buf[0] !== 0x08) throw new Error(`Expected 0x08, got 0x${buf[0].toString(16)}`);
  if (buf[7] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[7].toString(16)}`);
});

test('swap16 - 从 ArrayBuffer 创建', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 0x11;
  view[1] = 0x22;
  view[2] = 0x33;
  view[3] = 0x44;

  const buf = Buffer.from(ab);
  buf.swap16();

  if (buf[0] !== 0x22) throw new Error(`Expected 0x22, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0x11) throw new Error(`Expected 0x11, got 0x${buf[1].toString(16)}`);
});

test('swap32 - 从 ArrayBuffer 创建', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 8; i++) {
    view[i] = i + 1;
  }

  const buf = Buffer.from(ab);
  buf.swap32();

  if (buf[0] !== 0x04) throw new Error(`Expected 0x04, got 0x${buf[0].toString(16)}`);
  if (buf[4] !== 0x08) throw new Error(`Expected 0x08, got 0x${buf[4].toString(16)}`);
});

test('swap64 - 从 ArrayBuffer 创建', () => {
  const ab = new ArrayBuffer(16);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 16; i++) {
    view[i] = i + 1;
  }

  const buf = Buffer.from(ab);
  buf.swap64();

  if (buf[0] !== 0x08) throw new Error(`Expected 0x08, got 0x${buf[0].toString(16)}`);
  if (buf[8] !== 0x10) throw new Error(`Expected 0x10, got 0x${buf[8].toString(16)}`);
});

// ==================== Buffer.from 不同编码字符串 ====================

test('swap16 - 从 hex 字符串创建', () => {
  const buf = Buffer.from('01020304', 'hex');
  buf.swap16();

  if (buf[0] !== 0x02) throw new Error(`Expected 0x02, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[1].toString(16)}`);
  if (buf[2] !== 0x04) throw new Error(`Expected 0x04, got 0x${buf[2].toString(16)}`);
  if (buf[3] !== 0x03) throw new Error(`Expected 0x03, got 0x${buf[3].toString(16)}`);
});

test('swap32 - 从 hex 字符串创建', () => {
  const buf = Buffer.from('0102030405060708', 'hex');
  buf.swap32();

  if (buf[0] !== 0x04) throw new Error(`Expected 0x04, got 0x${buf[0].toString(16)}`);
  if (buf[3] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[3].toString(16)}`);
  if (buf[4] !== 0x08) throw new Error(`Expected 0x08, got 0x${buf[4].toString(16)}`);
  if (buf[7] !== 0x05) throw new Error(`Expected 0x05, got 0x${buf[7].toString(16)}`);
});

test('swap64 - 从 hex 字符串创建', () => {
  const buf = Buffer.from('0102030405060708', 'hex');
  buf.swap64();

  if (buf[0] !== 0x08) throw new Error(`Expected 0x08, got 0x${buf[0].toString(16)}`);
  if (buf[7] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[7].toString(16)}`);
});

test('swap16 - 从 base64 字符串创建', () => {
  // 'AQIDBA==' 解码为 [0x01, 0x02, 0x03, 0x04]
  const buf = Buffer.from('AQIDBA==', 'base64');
  buf.swap16();

  if (buf[0] !== 0x02) throw new Error(`Expected 0x02, got 0x${buf[0].toString(16)}`);
  if (buf[1] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[1].toString(16)}`);
});

test('swap32 - 从 base64 字符串创建', () => {
  // 'AQIDBAUGBwg=' 解码为 [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]
  const buf = Buffer.from('AQIDBAUGBwg=', 'base64');
  buf.swap32();

  if (buf[0] !== 0x04) throw new Error(`Expected 0x04, got 0x${buf[0].toString(16)}`);
  if (buf[3] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[3].toString(16)}`);
});

test('swap64 - 从 base64 字符串创建', () => {
  const buf = Buffer.from('AQIDBAUGBwg=', 'base64');
  buf.swap64();

  if (buf[0] !== 0x08) throw new Error(`Expected 0x08, got 0x${buf[0].toString(16)}`);
  if (buf[7] !== 0x01) throw new Error(`Expected 0x01, got 0x${buf[7].toString(16)}`);
});

// ==================== 不同 TypedArray 视图 ====================

test('swap16 - Uint16Array 底层共享内存', () => {
  const ab = new ArrayBuffer(4);
  const u16 = new Uint16Array(ab);
  u16[0] = 0x0102;
  u16[1] = 0x0304;

  const buf = Buffer.from(ab);
  buf.swap16();

  // 小端序系统：0x0102 存储为 [0x02, 0x01]
  // swap16 后变为 [0x01, 0x02]
  // 这会影响 u16 的值
  const u8 = new Uint8Array(ab);
  // 验证底层内存被修改
  if (u8[0] === 0x02 && u8[1] === 0x01) {
    // 原始小端序
    if (buf[0] !== 0x01 || buf[1] !== 0x02) {
      throw new Error('swap16 should modify shared memory');
    }
  }
});

test('swap32 - Uint32Array 底层共享内存', () => {
  const ab = new ArrayBuffer(8);
  const u32 = new Uint32Array(ab);
  u32[0] = 0x01020304;
  u32[1] = 0x05060708;

  const buf = Buffer.from(ab);
  buf.swap32();

  // 验证内存被交换
  const u8 = new Uint8Array(ab);
  // swap32 会反转每4字节
  if (buf[0] !== u8[0]) {
    throw new Error('Buffer should reference same memory');
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
