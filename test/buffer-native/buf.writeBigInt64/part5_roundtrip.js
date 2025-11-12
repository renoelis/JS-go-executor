// buf.writeBigInt64BE/LE - Read/Write Round-trip Tests
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

// 基本往返测试
test('writeBigInt64BE - 写入后读取相同值', () => {
  const buf = Buffer.alloc(8);
  const value = 0x0102030405060708n;
  buf.writeBigInt64BE(value, 0);
  const read = buf.readBigInt64BE(0);
  return read === value;
});

test('writeBigInt64LE - 写入后读取相同值', () => {
  const buf = Buffer.alloc(8);
  const value = 0x0102030405060708n;
  buf.writeBigInt64LE(value, 0);
  const read = buf.readBigInt64LE(0);
  return read === value;
});

// 多个值往返
test('writeBigInt64BE - 多个不同位置的值往返', () => {
  const buf = Buffer.alloc(32);
  const values = [123n, -456n, 0n, 0x7FFFFFFFFFFFFFFFn];

  for (let i = 0; i < values.length; i++) {
    buf.writeBigInt64BE(values[i], i * 8);
  }

  for (let i = 0; i < values.length; i++) {
    const read = buf.readBigInt64BE(i * 8);
    if (read !== values[i]) return false;
  }

  return true;
});

test('writeBigInt64LE - 多个不同位置的值往返', () => {
  const buf = Buffer.alloc(32);
  const values = [123n, -456n, 0n, 0x7FFFFFFFFFFFFFFFn];

  for (let i = 0; i < values.length; i++) {
    buf.writeBigInt64LE(values[i], i * 8);
  }

  for (let i = 0; i < values.length; i++) {
    const read = buf.readBigInt64LE(i * 8);
    if (read !== values[i]) return false;
  }

  return true;
});

// 边界值往返
test('writeBigInt64BE - 最大正数往返', () => {
  const buf = Buffer.alloc(8);
  const value = 0x7FFFFFFFFFFFFFFFn;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64BE - 最小负数往返', () => {
  const buf = Buffer.alloc(8);
  const value = -0x8000000000000000n;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64LE - 最大正数往返', () => {
  const buf = Buffer.alloc(8);
  const value = 0x7FFFFFFFFFFFFFFFn;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
});

test('writeBigInt64LE - 最小负数往返', () => {
  const buf = Buffer.alloc(8);
  const value = -0x8000000000000000n;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
});

// 交叉测试 BE/LE
test('writeBigInt64BE 写入，readBigInt64LE 读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  const read = buf.readBigInt64LE(0);
  return read === 0x0807060504030201n;
});

test('writeBigInt64LE 写入，readBigInt64BE 读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  const read = buf.readBigInt64BE(0);
  return read === 0x0807060504030201n;
});

// 覆盖写入往返
test('writeBigInt64BE - 覆盖写入后往返', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  buf.writeBigInt64BE(0x2222222222222222n, 0);
  const read = buf.readBigInt64BE(0);
  return read === 0x2222222222222222n;
});

test('writeBigInt64LE - 覆盖写入后往返', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x1111111111111111n, 0);
  buf.writeBigInt64LE(0x2222222222222222n, 0);
  const read = buf.readBigInt64LE(0);
  return read === 0x2222222222222222n;
});

// 特殊值模式往返
test('writeBigInt64BE - 全0往返', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0n, 0);
  return buf.readBigInt64BE(0) === 0n;
});

test('writeBigInt64BE - 全1（-1）往返', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-1n, 0);
  return buf.readBigInt64BE(0) === -1n;
});

test('writeBigInt64BE - 交替位往返', () => {
  const buf = Buffer.alloc(8);
  const value = 0x5555555555555555n;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64LE - 全0往返', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0n, 0);
  return buf.readBigInt64LE(0) === 0n;
});

test('writeBigInt64LE - 全1（-1）往返', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-1n, 0);
  return buf.readBigInt64LE(0) === -1n;
});

test('writeBigInt64LE - 交替位往返', () => {
  const buf = Buffer.alloc(8);
  const value = 0x5555555555555555n;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
});

// 视图上的往返测试
test('writeBigInt64BE - slice视图往返', () => {
  const original = Buffer.alloc(16);
  const view = original.slice(4, 12);
  const value = 0x7ABBCCDDEEFF0011n;
  view.writeBigInt64BE(value, 0);
  return view.readBigInt64BE(0) === value;
});

test('writeBigInt64LE - slice视图往返', () => {
  const original = Buffer.alloc(16);
  const view = original.slice(4, 12);
  const value = 0x7ABBCCDDEEFF0011n;
  view.writeBigInt64LE(value, 0);
  return view.readBigInt64LE(0) === value;
});

// 大量随机值往返测试
test('writeBigInt64BE - 100个随机值往返', () => {
  const buf = Buffer.alloc(800);
  const values = [];

  for (let i = 0; i < 100; i++) {
    const high = BigInt(Math.floor(Math.random() * 0x100000000));
    const low = BigInt(Math.floor(Math.random() * 0x100000000));
    const value = BigInt.asIntN(64, (high << 32n) | low);
    values.push(value);
    buf.writeBigInt64BE(value, i * 8);
  }

  for (let i = 0; i < 100; i++) {
    const read = buf.readBigInt64BE(i * 8);
    if (read !== values[i]) return false;
  }

  return true;
});

test('writeBigInt64LE - 100个随机值往返', () => {
  const buf = Buffer.alloc(800);
  const values = [];

  for (let i = 0; i < 100; i++) {
    const high = BigInt(Math.floor(Math.random() * 0x100000000));
    const low = BigInt(Math.floor(Math.random() * 0x100000000));
    const value = BigInt.asIntN(64, (high << 32n) | low);
    values.push(value);
    buf.writeBigInt64LE(value, i * 8);
  }

  for (let i = 0; i < 100; i++) {
    const read = buf.readBigInt64LE(i * 8);
    if (read !== values[i]) return false;
  }

  return true;
});

// 同时混合 BE 和 LE 写入往返
test('混合 BE/LE 写入不同位置往返', () => {
  const buf = Buffer.alloc(32);

  buf.writeBigInt64BE(0x1111111111111111n, 0);
  buf.writeBigInt64LE(0x2222222222222222n, 8);
  buf.writeBigInt64BE(0x3333333333333333n, 16);
  buf.writeBigInt64LE(0x4444444444444444n, 24);

  const r1 = buf.readBigInt64BE(0);
  const r2 = buf.readBigInt64LE(8);
  const r3 = buf.readBigInt64BE(16);
  const r4 = buf.readBigInt64LE(24);

  return r1 === 0x1111111111111111n &&
         r2 === 0x2222222222222222n &&
         r3 === 0x3333333333333333n &&
         r4 === 0x4444444444444444n;
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
