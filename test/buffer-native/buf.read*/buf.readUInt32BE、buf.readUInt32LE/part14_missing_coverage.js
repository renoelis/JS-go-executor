// 深度查缺补漏测试 - 32位无符号整数
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

// 多参数测试
test('BE: 传入多个参数（应只使用第一个）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  const result = buf.readUInt32BE(1, 999, 'extra');
  return result === 0x3456789A;
});

test('LE: 传入多个参数（应只使用第一个）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  const result = buf.readUInt32LE(1, 999, 'extra');
  return result === 0x9A785634;
});

test('BE: 传入 0 个参数（应使用默认值 0）', () => {
  const buf = Buffer.from([0xAB, 0xCD, 0xEF, 0x12]);
  return buf.readUInt32BE() === 0xABCDEF12;
});

test('LE: 传入 0 个参数（应使用默认值 0）', () => {
  const buf = Buffer.from([0xAB, 0xCD, 0xEF, 0x12]);
  return buf.readUInt32LE() === 0x12EFCDAB;
});

// 对象转换测试
test('BE: offset 为对象且有 toString 方法', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
    const obj = { toString: () => '1' };
    buf.readUInt32BE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset 为对象且有 toString 方法', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
    const obj = { toString: () => '1' };
    buf.readUInt32LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BE: offset 为对象且有 valueOf 返回非数字', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
    const obj = { valueOf: () => 'not a number' };
    buf.readUInt32BE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('LE: offset 为对象且有 valueOf 返回非数字', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
    const obj = { valueOf: () => 'not a number' };
    buf.readUInt32LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 负零测试
test('BE: offset 为 -0（应等同于 0）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(-0) === 0xFFFFFFFF;
});

test('LE: offset 为 -0（应等同于 0）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32LE(-0) === 0xFFFFFFFF;
});

test('BE: offset 为 -0.0（应等同于 0）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32BE(-0.0) === 0x12345678;
});

test('LE: offset 为 -0.0（应等同于 0）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32LE(-0.0) === 0x78563412;
});

// 与数组索引对比
test('BE: 字节与数组索引对比', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const val = buf.readUInt32BE(0);
  const b1 = buf[0];
  const b2 = buf[1];
  const b3 = buf[2];
  const b4 = buf[3];
  return val === ((b1 << 24) | (b2 << 16) | (b3 << 8) | b4);
});

test('LE: 字节与数组索引对比', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const val = buf.readUInt32LE(0);
  const b1 = buf[0];
  const b2 = buf[1];
  const b3 = buf[2];
  const b4 = buf[3];
  return val === (b1 | (b2 << 8) | (b3 << 16) | (b4 << 24));
});

// 连续读取模式测试
test('BE: 从头到尾连续读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);
  const expected = [0x12345678, 0x3456789A, 0x56789ABC, 0x789ABCDE, 0x9ABCDEF0];
  for (let i = 0; i < expected.length; i++) {
    if (buf.readUInt32BE(i) !== expected[i]) return false;
  }
  return true;
});

test('LE: 从头到尾连续读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);
  const expected = [0x78563412, 0x9A785634, 0xBC9A7856, 0xDEBC9A78, 0xF0DEBC9A];
  for (let i = 0; i < expected.length; i++) {
    if (buf.readUInt32LE(i) !== expected[i]) return false;
  }
  return true;
});

test('BE: 从尾到头倒序读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  const values = [];
  for (let i = 2; i >= 0; i--) {
    values.push(buf.readUInt32BE(i));
  }
  return values[0] === 0x56789ABC && values[1] === 0x3456789A && values[2] === 0x12345678;
});

test('LE: 从尾到头倒序读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  const values = [];
  for (let i = 2; i >= 0; i--) {
    values.push(buf.readUInt32LE(i));
  }
  return values[0] === 0xBC9A7856 && values[1] === 0x9A785634 && values[2] === 0x78563412;
});

// offset 精确边界测试
test('BE: offset = buf.length - 4（精确边界）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  return buf.readUInt32BE(2) === 0x56789ABC;
});

test('LE: offset = buf.length - 4（精确边界）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  return buf.readUInt32LE(2) === 0xBC9A7856;
});

test('BE: offset = buf.length - 4 + 1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
    buf.readUInt32BE(3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = buf.length - 4 + 1（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
    buf.readUInt32LE(3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊数值序列测试
test('BE: 递增序列', () => {
  const buf = Buffer.alloc(40);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt32BE(i * 100000, i * 4);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32BE(i * 4) !== i * 100000) return false;
  }
  return true;
});

test('LE: 递增序列', () => {
  const buf = Buffer.alloc(40);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt32LE(i * 100000, i * 4);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32LE(i * 4) !== i * 100000) return false;
  }
  return true;
});

test('BE: 递减序列', () => {
  const buf = Buffer.alloc(40);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt32BE(4294967295 - i * 100000, i * 4);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32BE(i * 4) !== 4294967295 - i * 100000) return false;
  }
  return true;
});

test('LE: 递减序列', () => {
  const buf = Buffer.alloc(40);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt32LE(4294967295 - i * 100000, i * 4);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32LE(i * 4) !== 4294967295 - i * 100000) return false;
  }
  return true;
});

// 重复值测试
test('BE: 重复值读取', () => {
  const buf = Buffer.alloc(20);
  buf.fill(0xAB);
  return buf.readUInt32BE(0) === 0xABABABAB &&
         buf.readUInt32BE(4) === 0xABABABAB &&
         buf.readUInt32BE(8) === 0xABABABAB;
});

test('LE: 重复值读取', () => {
  const buf = Buffer.alloc(20);
  buf.fill(0xAB);
  return buf.readUInt32LE(0) === 0xABABABAB &&
         buf.readUInt32LE(4) === 0xABABABAB &&
         buf.readUInt32LE(8) === 0xABABABAB;
});

// 性能测试（同位置读取多次）
test('BE: 同位置读取 1000 次', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32BE(0) !== 0x12345678) return false;
  }
  return true;
});

test('LE: 同位置读取 1000 次', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32LE(0) !== 0x78563412) return false;
  }
  return true;
});

// 整数边界值
test('BE: 整数最大安全值附近', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(4294967295, 0);
  return buf.readUInt32BE(0) === 4294967295;
});

test('LE: 整数最大安全值附近', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(4294967295, 0);
  return buf.readUInt32LE(0) === 4294967295;
});

// offset 为整数边界
test('BE: offset 为 Number.MAX_SAFE_INTEGER（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32BE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset 为 Number.MAX_SAFE_INTEGER（应抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readUInt32LE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 位运算验证
test('BE: 位运算验证（高16位）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readUInt32BE(0);
  const high16 = (val >>> 16);
  return high16 === 0x1234;
});

test('LE: 位运算验证（高16位）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readUInt32LE(0);
  const high16 = (val >>> 16);
  return high16 === 0x7856;
});

test('BE: 位运算验证（低16位）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readUInt32BE(0);
  const low16 = (val & 0xFFFF);
  return low16 === 0x5678;
});

test('LE: 位运算验证（低16位）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readUInt32LE(0);
  const low16 = (val & 0xFFFF);
  return low16 === 0x3412;
});

// 位掩码测试
test('BE: 位掩码提取（最高字节）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readUInt32BE(0);
  const highByte = (val >>> 24) & 0xFF;
  return highByte === 0x12;
});

test('LE: 位掩码提取（最高字节）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readUInt32LE(0);
  const highByte = (val >>> 24) & 0xFF;
  return highByte === 0x78;
});

// 符号位测试（虽然是无符号，但测试最高位）
test('BE: 最高位为1（大于2^31）', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  const val = buf.readUInt32BE(0);
  return val === 2147483648 && val > 0;
});

test('LE: 最高位为1（大于2^31）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  const val = buf.readUInt32LE(0);
  return val === 2147483648 && val > 0;
});

// 交叉验证
test('BE/LE: 同一数据不同字节序结果不同', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const be = buf.readUInt32BE(0);
  const le = buf.readUInt32LE(0);
  return be !== le && be === 0x12345678 && le === 0x78563412;
});

// 边界组合测试
test('BE: 最小offset + 最大值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(0) === 4294967295;
});

test('LE: 最小offset + 最大值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32LE(0) === 4294967295;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
