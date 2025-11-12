// buf.writeBigInt64BE/LE - Deep Edge Cases and Missing Scenarios
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

// NaN 和 Infinity 作为 offset
test('writeBigInt64BE - offset 为 NaN（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, NaN);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('writeBigInt64BE - offset 为 Infinity（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, Infinity);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('Infinity');
  }
});

test('writeBigInt64BE - offset 为 -Infinity（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, -Infinity);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('Infinity');
  }
});

test('writeBigInt64LE - offset 为 NaN（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, NaN);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('writeBigInt64LE - offset 为 Infinity（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, Infinity);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('Infinity');
  }
});

test('writeBigInt64LE - offset 为 -Infinity（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, -Infinity);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('Infinity');
  }
});

// 对象和数组作为 offset
test('writeBigInt64BE - offset 为对象（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64BE(123n, { valueOf: () => 0 });
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('Object');
  }
});

test('writeBigInt64BE - offset 为数组（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64BE(123n, [0]);
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('Array');
  }
});

test('writeBigInt64LE - offset 为对象（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64LE(123n, { valueOf: () => 0 });
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('Object');
  }
});

test('writeBigInt64LE - offset 为数组（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64LE(123n, [0]);
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('Array');
  }
});

// 特殊类型作为 value
test('writeBigInt64BE - value 为 Symbol（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('convert');
  }
});

test('writeBigInt64BE - value 为 Boolean（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(true, 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('writeBigInt64LE - value 为 Symbol（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('convert');
  }
});

test('writeBigInt64LE - value 为 Boolean（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(false, 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

// BigInt 对象包装器
test('writeBigInt64BE - value 为 BigInt 对象包装器', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(Object(123n), 0);
  return buf.readBigInt64BE(0) === 123n;
});

test('writeBigInt64LE - value 为 BigInt 对象包装器', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(Object(456n), 0);
  return buf.readBigInt64LE(0) === 456n;
});

// 有 valueOf 返回 BigInt 的对象
test('writeBigInt64BE - 对象 valueOf 返回 BigInt', () => {
  const buf = Buffer.alloc(8);
  const obj = { valueOf: () => 789n };
  buf.writeBigInt64BE(obj, 0);
  return buf.readBigInt64BE(0) === 789n;
});

test('writeBigInt64LE - 对象 valueOf 返回 BigInt', () => {
  const buf = Buffer.alloc(8);
  const obj = { valueOf: () => 321n };
  buf.writeBigInt64LE(obj, 0);
  return buf.readBigInt64LE(0) === 321n;
});

// 空 Buffer（0长度）
test('writeBigInt64BE - 在空Buffer写入（应抛错）', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeBigInt64BE(123n, 0);
    return false;
  } catch (e) {
    return e.message.includes('bounds') || e.message.includes('range');
  }
});

test('writeBigInt64LE - 在空Buffer写入（应抛错）', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeBigInt64LE(123n, 0);
    return false;
  } catch (e) {
    return e.message.includes('bounds') || e.message.includes('range');
  }
});

// 负浮点数 offset
test('writeBigInt64BE - offset 为负浮点数（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, -0.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('writeBigInt64LE - offset 为负浮点数（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, -0.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

// 各种 BigInt 创建方式
test('writeBigInt64BE - BigInt 字面量', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(123n, 0);
  return buf[7] === 123;
});

test('writeBigInt64BE - BigInt() 从数字创建', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(456), 0);
  return buf.readBigInt64BE(0) === 456n;
});

test('writeBigInt64BE - BigInt() 从字符串创建', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt('789'), 0);
  return buf.readBigInt64BE(0) === 789n;
});

test('writeBigInt64BE - BigInt() 从十六进制字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt('0xFF'), 0);
  return buf.readBigInt64BE(0) === 255n;
});

test('writeBigInt64BE - BigInt() 从二进制字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt('0b11111111'), 0);
  return buf.readBigInt64BE(0) === 255n;
});

test('writeBigInt64BE - BigInt() 从八进制字面量', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0o777n, 0);
  return buf.readBigInt64BE(0) === 511n;
});

test('writeBigInt64BE - BigInt() 从科学计数法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(1e10), 0);
  return buf.readBigInt64BE(0) === 10000000000n;
});

test('writeBigInt64LE - BigInt 字面量', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(123n, 0);
  return buf[0] === 123;
});

test('writeBigInt64LE - BigInt() 从数字创建', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(456), 0);
  return buf.readBigInt64LE(0) === 456n;
});

test('writeBigInt64LE - BigInt() 从字符串创建', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt('789'), 0);
  return buf.readBigInt64LE(0) === 789n;
});

// 方法调用方式
test('writeBigInt64BE - 使用 call() 调用', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeBigInt64BE.call(buf, 111n, 0);
  return buf.readBigInt64BE(0) === 111n;
});

test('writeBigInt64BE - 使用 apply() 调用', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeBigInt64BE.apply(buf, [222n, 0]);
  return buf.readBigInt64BE(0) === 222n;
});

test('writeBigInt64BE - 使用 bind() 调用', () => {
  const buf = Buffer.alloc(8);
  const boundWrite = buf.writeBigInt64BE.bind(buf);
  boundWrite(333n, 0);
  return buf.readBigInt64BE(0) === 333n;
});

test('writeBigInt64BE - 分离的方法调用（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const writeBE = buf.writeBigInt64BE;
  try {
    writeBE(123n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigInt64LE - 使用 call() 调用', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeBigInt64LE.call(buf, 111n, 0);
  return buf.readBigInt64LE(0) === 111n;
});

test('writeBigInt64LE - 使用 apply() 调用', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeBigInt64LE.apply(buf, [222n, 0]);
  return buf.readBigInt64LE(0) === 222n;
});

test('writeBigInt64LE - 使用 bind() 调用', () => {
  const buf = Buffer.alloc(8);
  const boundWrite = buf.writeBigInt64LE.bind(buf);
  boundWrite(333n, 0);
  return buf.readBigInt64LE(0) === 333n;
});

test('writeBigInt64LE - 分离的方法调用（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const writeLE = buf.writeBigInt64LE;
  try {
    writeLE(123n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

// 字节序对称性验证
test('writeBigInt64BE/LE - 字节序对称性', () => {
  const bufBE = Buffer.alloc(8);
  const bufLE = Buffer.alloc(8);
  const value = 0x0102030405060708n;

  bufBE.writeBigInt64BE(value, 0);
  bufLE.writeBigInt64LE(value, 0);

  for (let i = 0; i < 8; i++) {
    if (bufBE[i] !== bufLE[7 - i]) return false;
  }
  return true;
});

test('writeBigInt64BE 写入 + readBigInt64LE 读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  const value = buf.readBigInt64LE(0);
  return value === 0x0807060504030201n;
});

test('writeBigInt64LE 写入 + readBigInt64BE 读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  const value = buf.readBigInt64BE(0);
  return value === 0x0807060504030201n;
});

// offset 边界精确测试
test('writeBigInt64BE - 9字节Buffer offset=1 成功', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigInt64BE(123n, 1);
  return buf.readBigInt64BE(1) === 123n;
});

test('writeBigInt64BE - 9字节Buffer offset=2 失败', () => {
  const buf = Buffer.alloc(9);
  try {
    buf.writeBigInt64BE(123n, 2);
    return false;
  } catch (e) {
    return e.message.includes('bounds') || e.message.includes('range');
  }
});

test('writeBigInt64LE - 9字节Buffer offset=1 成功', () => {
  const buf = Buffer.alloc(9);
  buf.writeBigInt64LE(123n, 1);
  return buf.readBigInt64LE(1) === 123n;
});

test('writeBigInt64LE - 9字节Buffer offset=2 失败', () => {
  const buf = Buffer.alloc(9);
  try {
    buf.writeBigInt64LE(123n, 2);
    return false;
  } catch (e) {
    return e.message.includes('bounds') || e.message.includes('range');
  }
});

// 特殊负数的字节表示
test('writeBigInt64BE - 负128的字节表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-128n, 0);

  for (let i = 0; i < 7; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return buf[7] === 0x80;
});

test('writeBigInt64BE - 负256的字节表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-256n, 0);

  for (let i = 0; i < 6; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return buf[6] === 0xFF && buf[7] === 0x00;
});

test('writeBigInt64LE - 负128的字节表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-128n, 0);

  for (let i = 1; i < 8; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return buf[0] === 0x80;
});

test('writeBigInt64LE - 负256的字节表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-256n, 0);

  for (let i = 2; i < 8; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return buf[0] === 0x00 && buf[1] === 0xFF;
});

// 重复模式的字节
test('writeBigInt64BE - 重复0F模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0F0F0F0F0F0F0F0Fn, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0x0F) return false;
  }
  return true;
});

test('writeBigInt64LE - 重复0F模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0F0F0F0F0F0F0F0Fn, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0x0F) return false;
  }
  return true;
});

// 大十进制数
test('writeBigInt64BE - 大十进制数 1234567890123456n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(1234567890123456n, 0);
  return buf.readBigInt64BE(0) === 1234567890123456n;
});

test('writeBigInt64LE - 大十进制数 1234567890123456n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(1234567890123456n, 0);
  return buf.readBigInt64LE(0) === 1234567890123456n;
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
