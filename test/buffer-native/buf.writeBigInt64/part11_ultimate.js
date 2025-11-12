// buf.writeBigInt64BE/LE - Ultimate Deep Edge Cases
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

// offset 精确浮点数边界测试
test('writeBigInt64BE - offset=8.0（精确整数浮点）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(123n, 8.0);
  return buf.readBigInt64BE(8) === 123n;
});

test('writeBigInt64BE - offset=0.1（非整数应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64BE(123n, 0.1);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('writeBigInt64BE - offset=Number.EPSILON（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64BE(123n, Number.EPSILON);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('writeBigInt64LE - offset=8.0（精确整数浮点）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(123n, 8.0);
  return buf.readBigInt64LE(8) === 123n;
});

test('writeBigInt64LE - offset=0.1（非整数应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64LE(123n, 0.1);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

// BigInt 特殊构造方式
test('writeBigInt64BE - BigInt(-0) 等于 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(-0), 0);
  return buf.readBigInt64BE(0) === 0n;
});

test('writeBigInt64BE - BigInt("00000123") 前导零', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt('00000123'), 0);
  return buf.readBigInt64BE(0) === 123n;
});

test('writeBigInt64BE - BigInt("+123") 显式正号', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt('+123'), 0);
  return buf.readBigInt64BE(0) === 123n;
});

test('writeBigInt64BE - BigInt() 从浮点数（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(BigInt(123.456), 0);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('convert');
  }
});

test('writeBigInt64LE - BigInt(-0) 等于 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(-0), 0);
  return buf.readBigInt64LE(0) === 0n;
});

test('writeBigInt64LE - BigInt("00000456") 前导零', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt('00000456'), 0);
  return buf.readBigInt64LE(0) === 456n;
});

// Buffer poolSize 影响
test('writeBigInt64BE - poolSize=0 不影响写入', () => {
  const original = Buffer.poolSize;
  Buffer.poolSize = 0;
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64BE(111n, 0);
  const result = buf.readBigInt64BE(0) === 111n;
  Buffer.poolSize = original;
  return result;
});

test('writeBigInt64LE - poolSize=0 不影响写入', () => {
  const original = Buffer.poolSize;
  Buffer.poolSize = 0;
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64LE(222n, 0);
  const result = buf.readBigInt64LE(0) === 222n;
  Buffer.poolSize = original;
  return result;
});

// 超大 Buffer
test('writeBigInt64BE - 100KB Buffer 起始位置', () => {
  const buf = Buffer.alloc(100000);
  buf.writeBigInt64BE(999n, 0);
  return buf.readBigInt64BE(0) === 999n;
});

test('writeBigInt64BE - 100KB Buffer 末尾位置', () => {
  const buf = Buffer.alloc(100000);
  buf.writeBigInt64BE(888n, 99992);
  return buf.readBigInt64BE(99992) === 888n;
});

test('writeBigInt64LE - 100KB Buffer 起始位置', () => {
  const buf = Buffer.alloc(100000);
  buf.writeBigInt64LE(777n, 0);
  return buf.readBigInt64LE(0) === 777n;
});

test('writeBigInt64LE - 100KB Buffer 末尾位置', () => {
  const buf = Buffer.alloc(100000);
  buf.writeBigInt64LE(666n, 99992);
  return buf.readBigInt64LE(99992) === 666n;
});

// Buffer length 不变性
test('writeBigInt64BE - 写入不改变 Buffer length', () => {
  const buf = Buffer.alloc(8);
  const lenBefore = buf.length;
  buf.writeBigInt64BE(123n, 0);
  return buf.length === lenBefore && buf.length === 8;
});

test('writeBigInt64LE - 写入不改变 Buffer byteLength', () => {
  const buf = Buffer.alloc(8);
  const byteLenBefore = buf.byteLength;
  buf.writeBigInt64LE(456n, 0);
  return buf.byteLength === byteLenBefore && buf.byteLength === 8;
});

// 原子性（写入是否可以部分完成）
test('writeBigInt64BE - 写入是原子的', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  return buf[0] === 0x01 && buf[7] === 0x08;
});

test('writeBigInt64LE - 写入是原子的', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  return buf[0] === 0x08 && buf[7] === 0x01;
});

// 部分重叠区域
test('writeBigInt64BE - 部分重叠写入验证', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  buf.writeBigInt64BE(0x2222222222222222n, 4);

  return buf[4] === 0x22 && buf[7] === 0x22;
});

test('writeBigInt64LE - 部分重叠写入验证', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(0x1111111111111111n, 0);
  buf.writeBigInt64LE(0x2222222222222222n, 4);

  // LE模式: 0-3被第一次写入覆盖，4-11被第二次写入覆盖
  return buf[4] === 0x22 && buf[7] === 0x22;
});

// 特殊数值模式 - 全字节相同
test('writeBigInt64BE - 全字节为0x01', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0101010101010101n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0x01) return false;
  }
  return true;
});

test('writeBigInt64BE - 全字节为0x07', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0707070707070707n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0x07) return false;
  }
  return true;
});

test('writeBigInt64LE - 全字节为0x01', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0101010101010101n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0x01) return false;
  }
  return true;
});

// 单字节非零测试
test('writeBigInt64LE - 只有 byte[0] 为1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(1n, 0);

  if (buf[0] !== 1) return false;
  for (let i = 1; i < 8; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('writeBigInt64LE - 只有 byte[7] 为1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(1n << 56n, 0);

  if (buf[7] !== 1) return false;
  for (let i = 0; i < 7; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('writeBigInt64BE - 只有 byte[0] 为1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(1n << 56n, 0);

  if (buf[0] !== 1) return false;
  for (let i = 1; i < 8; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('writeBigInt64BE - 只有 byte[7] 为1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(1n, 0);

  if (buf[7] !== 1) return false;
  for (let i = 0; i < 7; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

// 符号位测试
test('writeBigInt64BE - 符号位差异', () => {
  const positive = 0x7FFFFFFFFFFFFFFFn;
  const negative = -0x8000000000000000n;
  const bufPos = Buffer.alloc(8);
  const bufNeg = Buffer.alloc(8);

  bufPos.writeBigInt64BE(positive, 0);
  bufNeg.writeBigInt64BE(negative, 0);

  return (bufPos[0] ^ bufNeg[0]) === 0xFF;
});

test('writeBigInt64LE - 符号位差异', () => {
  const positive = 0x7FFFFFFFFFFFFFFFn;
  const negative = -0x8000000000000000n;
  const bufPos = Buffer.alloc(8);
  const bufNeg = Buffer.alloc(8);

  bufPos.writeBigInt64LE(positive, 0);
  bufNeg.writeBigInt64LE(negative, 0);

  return (bufPos[7] ^ bufNeg[7]) === 0xFF;
});

// 奇数长度 Buffer 的最大 offset
test('writeBigInt64BE - 9字节Buffer offset=1', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigInt64BE(123n, 1);
  return buf.readBigInt64BE(1) === 123n;
});

test('writeBigInt64BE - 15字节Buffer offset=7', () => {
  const buf = Buffer.alloc(15);
  buf.writeBigInt64BE(456n, 7);
  return buf.readBigInt64BE(7) === 456n;
});

test('writeBigInt64LE - 11字节Buffer offset=3', () => {
  const buf = Buffer.alloc(11);
  buf.writeBigInt64LE(789n, 3);
  return buf.readBigInt64LE(3) === 789n;
});

test('writeBigInt64LE - 13字节Buffer offset=5', () => {
  const buf = Buffer.alloc(13);
  buf.writeBigInt64LE(321n, 5);
  return buf.readBigInt64LE(5) === 321n;
});

// 负整数 offset
test('writeBigInt64BE - offset=-1（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, -1);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('offset');
  }
});

test('writeBigInt64BE - offset=-100（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, -100);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('offset');
  }
});

test('writeBigInt64LE - offset=-1（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, -1);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('offset');
  }
});

test('writeBigInt64LE - offset=-100（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, -100);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('offset');
  }
});

// 原型链和方法属性
test('writeBigInt64BE - hasOwnProperty 返回 false', () => {
  const buf = Buffer.alloc(8);
  return buf.hasOwnProperty('writeBigInt64BE') === false;
});

test('writeBigInt64BE - 在原型链上', () => {
  const buf = Buffer.alloc(8);
  return 'writeBigInt64BE' in buf;
});

test('writeBigInt64BE - typeof 为 function', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.writeBigInt64BE === 'function';
});

test('writeBigInt64BE - name 属性', () => {
  const buf = Buffer.alloc(8);
  return buf.writeBigInt64BE.name === 'writeBigInt64BE';
});

test('writeBigInt64LE - hasOwnProperty 返回 false', () => {
  const buf = Buffer.alloc(8);
  return buf.hasOwnProperty('writeBigInt64LE') === false;
});

test('writeBigInt64LE - 在原型链上', () => {
  const buf = Buffer.alloc(8);
  return 'writeBigInt64LE' in buf;
});

test('writeBigInt64LE - typeof 为 function', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.writeBigInt64LE === 'function';
});

test('writeBigInt64LE - name 属性', () => {
  const buf = Buffer.alloc(8);
  return buf.writeBigInt64LE.name === 'writeBigInt64LE';
});

// 内存对齐测试
test('writeBigInt64BE - 各种未对齐 offset（0-7）', () => {
  const buf = Buffer.alloc(24);
  for (let offset = 0; offset <= 7; offset++) {
    buf.fill(0);
    buf.writeBigInt64BE(BigInt(offset + 1), offset);
    if (buf.readBigInt64BE(offset) !== BigInt(offset + 1)) {
      return false;
    }
  }
  return true;
});

test('writeBigInt64LE - 各种未对齐 offset（0-7）', () => {
  const buf = Buffer.alloc(24);
  for (let offset = 0; offset <= 7; offset++) {
    buf.fill(0);
    buf.writeBigInt64LE(BigInt(offset + 1), offset);
    if (buf.readBigInt64LE(offset) !== BigInt(offset + 1)) {
      return false;
    }
  }
  return true;
});

// 跨页边界（4KB）
test('writeBigInt64BE - 跨4KB页边界', () => {
  const buf = Buffer.alloc(8192);
  const offset = 4096 - 4;
  buf.writeBigInt64BE(0x1122334455667788n, offset);
  return buf.readBigInt64BE(offset) === 0x1122334455667788n;
});

test('writeBigInt64LE - 跨4KB页边界', () => {
  const buf = Buffer.alloc(8192);
  const offset = 4096 - 4;
  buf.writeBigInt64LE(0x1122334455667788n, offset);
  return buf.readBigInt64LE(offset) === 0x1122334455667788n;
});

// Buffer 组合操作
test('writeBigInt64BE - 与 concat 配合', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.alloc(8);
  const combined = Buffer.concat([buf1, buf2]);
  combined.writeBigInt64BE(999n, 4);
  return combined.readBigInt64BE(4) === 999n;
});

test('writeBigInt64LE - 与 concat 配合', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.alloc(8);
  const combined = Buffer.concat([buf1, buf2]);
  combined.writeBigInt64LE(888n, 4);
  return combined.readBigInt64LE(4) === 888n;
});

test('writeBigInt64BE - 与 copy 配合', () => {
  const src = Buffer.alloc(8);
  src.writeBigInt64BE(123n, 0);
  const dst = Buffer.alloc(8);
  src.copy(dst);
  return dst.readBigInt64BE(0) === 123n;
});

test('writeBigInt64LE - 与 copy 配合', () => {
  const src = Buffer.alloc(8);
  src.writeBigInt64LE(456n, 0);
  const dst = Buffer.alloc(8);
  src.copy(dst);
  return dst.readBigInt64LE(0) === 456n;
});

test('writeBigInt64BE - 与 compare 配合', () => {
  const bufA = Buffer.alloc(8);
  const bufB = Buffer.alloc(8);
  bufA.writeBigInt64BE(100n, 0);
  bufB.writeBigInt64BE(200n, 0);
  return bufA.compare(bufB) < 0;
});

test('writeBigInt64LE - 与 compare 配合', () => {
  const bufA = Buffer.alloc(8);
  const bufB = Buffer.alloc(8);
  bufA.writeBigInt64LE(300n, 0);
  bufB.writeBigInt64LE(400n, 0);
  return bufA.compare(bufB) < 0;
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
