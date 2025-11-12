// buf.writeBigUInt64BE/LE - 第四轮深度补充1：跨方法交互与副作用
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

// ===== 跨方法交互：writeBigUInt64 后调用其他 write 方法 =====

test('writeBigUInt64BE 后调用 writeUInt32BE（紧邻）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 0);
  buf.writeUInt32BE(0xFFFFFFFF, 8);
  return buf.toString('hex') === '1234567890abcdefffffffff00000000';
});

test('writeBigUInt64LE 后调用 writeUInt32LE（紧邻）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 0);
  buf.writeUInt32LE(0xFFFFFFFF, 8);
  return buf.toString('hex') === 'efcdab9078563412ffffffff00000000';
});

test('writeInt32BE 后调用 writeBigUInt64LE（部分覆盖）', () => {
  const buf = Buffer.alloc(16);
  buf.writeInt32BE(-1, 0);
  buf.writeBigUInt64LE(0xAAAAAAAAAAAAAAAAn, 4);
  return buf.toString('hex') === 'ffffffffaaaaaaaaaaaaaaaa00000000';
});

test('writeInt32LE 后调用 writeBigUInt64BE（部分覆盖）', () => {
  const buf = Buffer.alloc(16);
  buf.writeInt32LE(-1, 0);
  buf.writeBigUInt64BE(0xBBBBBBBBBBBBBBBBn, 4);
  return buf.toString('hex') === 'ffffffffbbbbbbbbbbbbbbbb00000000';
});

test('writeBigUInt64BE 后调用 writeUInt8（覆盖单字节）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 0);
  buf.writeUInt8(0xFF, 0); // 覆盖第1个字节
  return buf.toString('hex') === 'ff34567890abcdef0000000000000000';
});

test('writeBigUInt64LE 后调用 writeUInt8（覆盖单字节）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 0);
  buf.writeUInt8(0xFF, 7); // 覆盖第8个字节（index 7）
  return buf.toString('hex') === 'efcdab90785634ff0000000000000000';
});

test('writeBigUInt64BE 后调用 writeUInt16BE（覆盖2字节）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 0);
  buf.writeUInt16BE(0xFFFF, 0);
  return buf.toString('hex') === 'ffff567890abcdef0000000000000000';
});

test('writeBigUInt64LE 后调用 writeUInt16LE（覆盖2字节）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 0);
  buf.writeUInt16LE(0xFFFF, 6); // 覆盖第7-8字节
  return buf.toString('hex') === 'efcdab907856ffff0000000000000000';
});

// ===== 返回值连续性（链式调用）=====

test('writeBigUInt64BE - 返回值链式调用（3次）', () => {
  const buf = Buffer.alloc(24);
  const ret1 = buf.writeBigUInt64BE(0x11n, 0);
  const ret2 = buf.writeBigUInt64BE(0x22n, ret1);
  const ret3 = buf.writeBigUInt64BE(0x33n, ret2);
  return ret1 === 8 && ret2 === 16 && ret3 === 24 &&
         buf.slice(0, 8).toString('hex') === '0000000000000011' &&
         buf.slice(8, 16).toString('hex') === '0000000000000022' &&
         buf.slice(16, 24).toString('hex') === '0000000000000033';
});

test('writeBigUInt64LE - 返回值链式调用（3次）', () => {
  const buf = Buffer.alloc(24);
  const ret1 = buf.writeBigUInt64LE(0x11n, 0);
  const ret2 = buf.writeBigUInt64LE(0x22n, ret1);
  const ret3 = buf.writeBigUInt64LE(0x33n, ret2);
  return ret1 === 8 && ret2 === 16 && ret3 === 24 &&
         buf.slice(0, 8).toString('hex') === '1100000000000000' &&
         buf.slice(8, 16).toString('hex') === '2200000000000000' &&
         buf.slice(16, 24).toString('hex') === '3300000000000000';
});

test('writeBigUInt64BE - 返回值链式调用（5次）', () => {
  const buf = Buffer.alloc(40);
  let offset = 0;
  for (let i = 1; i <= 5; i++) {
    offset = buf.writeBigUInt64BE(BigInt(i * 0x11), offset);
  }
  return offset === 40 &&
         buf.readBigUInt64BE(0) === 0x11n &&
         buf.readBigUInt64BE(32) === 0x55n;
});

test('writeBigUInt64LE - 返回值链式调用（5次）', () => {
  const buf = Buffer.alloc(40);
  let offset = 0;
  for (let i = 1; i <= 5; i++) {
    offset = buf.writeBigUInt64LE(BigInt(i * 0x11), offset);
  }
  return offset === 40 &&
         buf.readBigUInt64LE(0) === 0x11n &&
         buf.readBigUInt64LE(32) === 0x55n;
});

// ===== 同一 buffer 的多个重叠视图 =====

test('writeBigUInt64BE - 两个重叠视图写入', () => {
  const base = Buffer.alloc(32, 0xAA);
  const view1 = base.subarray(0, 16);
  const view2 = base.subarray(8, 24);

  view1.writeBigUInt64BE(0x1111111111111111n, 0);
  view2.writeBigUInt64BE(0x2222222222222222n, 0);

  // view1 写入 [0-7], view2 写入 [8-15]
  return base[0] === 0x11 && base[7] === 0x11 &&
         base[8] === 0x22 && base[15] === 0x22;
});

test('writeBigUInt64LE - 两个重叠视图写入', () => {
  const base = Buffer.alloc(32, 0xAA);
  const view1 = base.subarray(0, 16);
  const view2 = base.subarray(8, 24);

  view1.writeBigUInt64LE(0x1111111111111111n, 0);
  view2.writeBigUInt64LE(0x2222222222222222n, 0);

  return base[0] === 0x11 && base[7] === 0x11 &&
         base[8] === 0x22 && base[15] === 0x22;
});

test('writeBigUInt64BE - 三个重叠视图写入', () => {
  const base = Buffer.alloc(32, 0xAA);
  const view1 = base.subarray(0, 16);
  const view2 = base.subarray(8, 24);
  const view3 = base.subarray(16, 32);

  view1.writeBigUInt64BE(0x1111111111111111n, 0);
  view2.writeBigUInt64BE(0x2222222222222222n, 0);
  view3.writeBigUInt64BE(0x3333333333333333n, 0);

  return base[0] === 0x11 && base[8] === 0x22 && base[16] === 0x33;
});

test('writeBigUInt64LE - 三个重叠视图写入', () => {
  const base = Buffer.alloc(32, 0xAA);
  const view1 = base.subarray(0, 16);
  const view2 = base.subarray(8, 24);
  const view3 = base.subarray(16, 32);

  view1.writeBigUInt64LE(0x1111111111111111n, 0);
  view2.writeBigUInt64LE(0x2222222222222222n, 0);
  view3.writeBigUInt64LE(0x3333333333333333n, 0);

  return base[0] === 0x11 && base[8] === 0x22 && base[16] === 0x33;
});

// ===== TypedArray 视图的写入同步 =====

test('writeBigUInt64BE - TypedArray 视图同步', () => {
  const arrBuf = new ArrayBuffer(16);
  const u8 = new Uint8Array(arrBuf);
  const buf = Buffer.from(arrBuf);

  buf.writeBigUInt64BE(0xABCDEF0123456789n, 0);

  return u8[0] === 0xAB && u8[7] === 0x89;
});

test('writeBigUInt64LE - TypedArray 视图同步', () => {
  const arrBuf = new ArrayBuffer(16);
  const u8 = new Uint8Array(arrBuf);
  const buf = Buffer.from(arrBuf);

  buf.writeBigUInt64LE(0xABCDEF0123456789n, 0);

  return u8[0] === 0x89 && u8[7] === 0xAB;
});

test('writeBigUInt64BE - Uint32Array 视图同步', () => {
  const arrBuf = new ArrayBuffer(16);
  const u32 = new Uint32Array(arrBuf);
  const buf = Buffer.from(arrBuf);

  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 0);

  // BE写入: 12 34 56 78 90 AB CD EF
  // Uint32Array 是小端读取
  // u32[0] 读取前4字节: 12 34 56 78 -> 0x78563412 (LE)
  // u32[1] 读取后4字节: 90 AB CD EF -> 0xEFCDAB90 (LE)
  return u32[0] === 0x78563412 && u32[1] === 0xEFCDAB90;
});

test('writeBigUInt64LE - Uint32Array 视图同步', () => {
  const arrBuf = new ArrayBuffer(16);
  const u32 = new Uint32Array(arrBuf);
  const buf = Buffer.from(arrBuf);

  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 0);

  // LE: EF CD AB 90 78 56 34 12
  // u32[0] (LE) = 90 AB CD EF 的小端 = 0x90ABCDEF
  // u32[1] (LE) = 12 34 56 78 的小端 = 0x12345678
  return u32[0] === 0x90ABCDEF && u32[1] === 0x12345678;
});

// ===== 写入的原子性（错误时是否部分写入）=====

test('writeBigUInt64BE - 类型错误后 buffer 保持原值', () => {
  const buf = Buffer.alloc(8, 0xFF);
  try {
    buf.writeBigUInt64BE(123, 0); // 类型错误
  } catch (e) {}
  return buf.every(b => b === 0xFF);
});

test('writeBigUInt64LE - 类型错误后 buffer 保持原值', () => {
  const buf = Buffer.alloc(8, 0xFF);
  try {
    buf.writeBigUInt64LE(123, 0); // 类型错误
  } catch (e) {}
  return buf.every(b => b === 0xFF);
});

test('writeBigUInt64BE - 范围错误后 buffer 保持原值', () => {
  const buf = Buffer.alloc(8, 0xAA);
  try {
    buf.writeBigUInt64BE(-1n, 0); // 范围错误
  } catch (e) {}
  return buf.every(b => b === 0xAA);
});

test('writeBigUInt64LE - 范围错误后 buffer 保持原值', () => {
  const buf = Buffer.alloc(8, 0xAA);
  try {
    buf.writeBigUInt64LE(-1n, 0); // 范围错误
  } catch (e) {}
  return buf.every(b => b === 0xAA);
});

test('writeBigUInt64BE - offset 错误后 buffer 保持原值', () => {
  const buf = Buffer.alloc(8, 0xBB);
  try {
    buf.writeBigUInt64BE(0n, 10); // offset 越界
  } catch (e) {}
  return buf.every(b => b === 0xBB);
});

test('writeBigUInt64LE - offset 错误后 buffer 保持原值', () => {
  const buf = Buffer.alloc(8, 0xBB);
  try {
    buf.writeBigUInt64LE(0n, 10); // offset 越界
  } catch (e) {}
  return buf.every(b => b === 0xBB);
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
