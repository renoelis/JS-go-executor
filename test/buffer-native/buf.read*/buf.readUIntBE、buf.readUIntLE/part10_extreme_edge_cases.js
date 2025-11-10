// 极端边界场景测试
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

// === 负零测试 ===

test('BE: offset = -0', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUIntBE(-0, 2) === 0x1234;
});

test('LE: offset = -0', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUIntLE(-0, 2) === 0x3412;
});

test('BE: offset = -0.0', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUIntBE(-0.0, 2) === 0x1234;
});

test('LE: offset = -0.0', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUIntLE(-0.0, 2) === 0x3412;
});

// === 精确边界测试 ===

test('BE: offset = buf.length - byteLength (精确边界)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readUIntBE(1, 2) === 0x3456;
});

test('LE: offset = buf.length - byteLength (精确边界)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readUIntLE(1, 2) === 0x5634;
});

test('BE: offset = buf.length - byteLength + 1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntBE(2, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: offset = buf.length - byteLength + 1 (应抛出错误)', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readUIntLE(2, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 连续读取模式 ===

test('BE: 从头到尾连续读取 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntBE(0, 2);
  const r2 = buf.readUIntBE(2, 2);
  return r1 === 0x1234 && r2 === 0x5678;
});

test('LE: 从头到尾连续读取 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntLE(0, 2);
  const r2 = buf.readUIntLE(2, 2);
  return r1 === 0x3412 && r2 === 0x7856;
});

test('BE: 从尾到头倒序读取 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntBE(2, 2);
  const r2 = buf.readUIntBE(0, 2);
  return r1 === 0x5678 && r2 === 0x1234;
});

test('LE: 从尾到头倒序读取 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntLE(2, 2);
  const r2 = buf.readUIntLE(0, 2);
  return r1 === 0x7856 && r2 === 0x3412;
});

// === 特殊数值序列 ===

test('BE: 递增序列 - 3字节', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  return buf.readUIntBE(0, 3) === 0x010203 &&
         buf.readUIntBE(1, 3) === 0x020304 &&
         buf.readUIntBE(2, 3) === 0x030405;
});

test('LE: 递增序列 - 3字节', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  return buf.readUIntLE(0, 3) === 0x030201 &&
         buf.readUIntLE(1, 3) === 0x040302 &&
         buf.readUIntLE(2, 3) === 0x050403;
});

test('BE: 递减序列 - 3字节', () => {
  const buf = Buffer.from([0x05, 0x04, 0x03, 0x02, 0x01]);
  return buf.readUIntBE(0, 3) === 0x050403 &&
         buf.readUIntBE(1, 3) === 0x040302 &&
         buf.readUIntBE(2, 3) === 0x030201;
});

test('LE: 递减序列 - 3字节', () => {
  const buf = Buffer.from([0x05, 0x04, 0x03, 0x02, 0x01]);
  return buf.readUIntLE(0, 3) === 0x030405 &&
         buf.readUIntLE(1, 3) === 0x020304 &&
         buf.readUIntLE(2, 3) === 0x010203;
});

// === 重复值测试 ===

test('BE: 重复值读取 - 全部相同', () => {
  const buf = Buffer.from([0x11, 0x11, 0x11, 0x11]);
  return buf.readUIntBE(0, 2) === 0x1111 &&
         buf.readUIntBE(1, 2) === 0x1111 &&
         buf.readUIntBE(2, 2) === 0x1111;
});

test('LE: 重复值读取 - 全部相同', () => {
  const buf = Buffer.from([0x11, 0x11, 0x11, 0x11]);
  return buf.readUIntLE(0, 2) === 0x1111 &&
         buf.readUIntLE(1, 2) === 0x1111 &&
         buf.readUIntLE(2, 2) === 0x1111;
});

// === 与数组索引对比 ===

test('BE: 与数组索引对比 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const expected = (buf[0] << 8) | buf[1];
  return buf.readUIntBE(0, 2) === expected;
});

test('LE: 与数组索引对比 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const expected = (buf[1] << 8) | buf[0];
  return buf.readUIntLE(0, 2) === expected;
});

test('BE: 与数组索引对比 - 3字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const expected = (buf[0] << 16) | (buf[1] << 8) | buf[2];
  return buf.readUIntBE(0, 3) === expected;
});

test('LE: 与数组索引对比 - 3字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const expected = (buf[2] << 16) | (buf[1] << 8) | buf[0];
  return buf.readUIntLE(0, 3) === expected;
});

// === 位运算验证 ===

test('BE: 提取高字节 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const value = buf.readUIntBE(0, 2);
  const highByte = (value >> 8) & 0xFF;
  return highByte === 0x12;
});

test('LE: 提取高字节 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const value = buf.readUIntLE(0, 2);
  const highByte = (value >> 8) & 0xFF;
  return highByte === 0x34;
});

test('BE: 提取低字节 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const value = buf.readUIntBE(0, 2);
  const lowByte = value & 0xFF;
  return lowByte === 0x34;
});

test('LE: 提取低字节 - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const value = buf.readUIntLE(0, 2);
  const lowByte = value & 0xFF;
  return lowByte === 0x12;
});

// === 位掩码提取 ===

test('BE: 位掩码提取最高字节 - 4字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const value = buf.readUIntBE(0, 4);
  const highestByte = (value >>> 24) & 0xFF;
  return highestByte === 0x12;
});

test('LE: 位掩码提取最高字节 - 4字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const value = buf.readUIntLE(0, 4);
  const highestByte = (value >>> 24) & 0xFF;
  return highestByte === 0x78;
});

// === BE/LE 交叉验证 ===

test('BE vs LE: 同一数据不同结果', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const be = buf.readUIntBE(0, 3);
  const le = buf.readUIntLE(0, 3);
  return be !== le && be === 0x123456 && le === 0x563412;
});

// === 边界组合测试 ===

test('BE: 最小 offset + 最大值 - 1字节', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntBE(0, 1) === 255;
});

test('LE: 最小 offset + 最大值 - 1字节', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntLE(0, 1) === 255;
});

test('BE: 最大 offset + 最小值 - 1字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(5, 1) === 0;
});

test('LE: 最大 offset + 最小值 - 1字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(5, 1) === 0;
});

// === 性能测试（同位置多次读取）===

test('BE: 同位置读取 1000 次一致性', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const expected = buf.readUIntBE(0, 2);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUIntBE(0, 2) !== expected) {
      return false;
    }
  }
  return true;
});

test('LE: 同位置读取 1000 次一致性', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const expected = buf.readUIntLE(0, 2);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUIntLE(0, 2) !== expected) {
      return false;
    }
  }
  return true;
});

// === 整数边界值 ===

test('BE: 接近 Number.MAX_SAFE_INTEGER - 6字节', () => {
  const buf = Buffer.from([0x1F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const value = buf.readUIntBE(0, 6);
  return value === 35184372088831;
});

test('LE: 接近 Number.MAX_SAFE_INTEGER - 6字节', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F]);
  const value = buf.readUIntLE(0, 6);
  return value === 35184372088831;
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
