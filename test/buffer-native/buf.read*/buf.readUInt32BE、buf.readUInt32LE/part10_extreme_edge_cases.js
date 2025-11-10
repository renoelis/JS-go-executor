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

// 大 Buffer 中的读取
test('BE: 大 Buffer 开头读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt32BE(0x12345678, 0);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: 大 Buffer 开头读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt32LE(0x12345678, 0);
  return buf.readUInt32LE(0) === 0x12345678;
});

test('BE: 大 Buffer 中间读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt32BE(0x12345678, 500);
  return buf.readUInt32BE(500) === 0x12345678;
});

test('LE: 大 Buffer 中间读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt32LE(0x12345678, 500);
  return buf.readUInt32LE(500) === 0x12345678;
});

test('BE: 大 Buffer 末尾读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt32BE(0x12345678, 996);
  return buf.readUInt32BE(996) === 0x12345678;
});

test('LE: 大 Buffer 末尾读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt32LE(0x12345678, 996);
  return buf.readUInt32LE(996) === 0x12345678;
});

// 连续多次读取
test('BE: 连续读取 10 次', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32BE(0) !== 0x12345678) return false;
  }
  return true;
});

test('LE: 连续读取 10 次', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32LE(0) !== 0x78563412) return false;
  }
  return true;
});

// 读取后立即写入
test('BE: 读取后立即写入', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v1 = buf.readUInt32BE(0);
  buf.writeUInt32BE(0x9ABCDEF0, 0);
  const v2 = buf.readUInt32BE(0);
  return v1 === 0x12345678 && v2 === 0x9ABCDEF0;
});

test('LE: 读取后立即写入', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v1 = buf.readUInt32LE(0);
  buf.writeUInt32LE(0x9ABCDEF0, 0);
  const v2 = buf.readUInt32LE(0);
  return v1 === 0x78563412 && v2 === 0x9ABCDEF0;
});

// 交叉读取 BE 和 LE
test('同一 Buffer 交叉读取 BE 和 LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const be = buf.readUInt32BE(0);
  const le = buf.readUInt32LE(0);
  return be === 0x12345678 && le === 0x78563412;
});

// 重叠读取
test('BE: 重叠位置读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  const v1 = buf.readUInt32BE(0);
  const v2 = buf.readUInt32BE(1);
  const v3 = buf.readUInt32BE(2);
  return v1 === 0x12345678 && v2 === 0x3456789A && v3 === 0x56789ABC;
});

test('LE: 重叠位置读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  const v1 = buf.readUInt32LE(0);
  const v2 = buf.readUInt32LE(1);
  const v3 = buf.readUInt32LE(2);
  return v1 === 0x78563412 && v2 === 0x9A785634 && v3 === 0xBC9A7856;
});

// 所有可能的 offset 位置
test('BE: 遍历所有有效 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);
  for (let i = 0; i <= buf.length - 4; i++) {
    try {
      buf.readUInt32BE(i);
    } catch (e) {
      return false;
    }
  }
  return true;
});

test('LE: 遍历所有有效 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);
  for (let i = 0; i <= buf.length - 4; i++) {
    try {
      buf.readUInt32LE(i);
    } catch (e) {
      return false;
    }
  }
  return true;
});

// 边界值组合
test('BE: 最小 offset + 最小值', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0;
});

test('LE: 最小 offset + 最小值', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 0;
});

test('BE: 最小 offset + 最大值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(0) === 4294967295;
});

test('LE: 最小 offset + 最大值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32LE(0) === 4294967295;
});

test('BE: 最大 offset + 最小值', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(1) === 0;
});

test('LE: 最大 offset + 最小值', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32LE(1) === 0;
});

test('BE: 最大 offset + 最大值', () => {
  const buf = Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(1) === 4294967295;
});

test('LE: 最大 offset + 最大值', () => {
  const buf = Buffer.from([0x00, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32LE(1) === 4294967295;
});

// 特殊数值边界
test('BE: 0x80000000 边界', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 2147483648;
});

test('LE: 0x80000000 边界', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readUInt32LE(0) === 2147483648;
});

test('BE: 0x7FFFFFFF 边界', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(0) === 2147483647;
});

test('LE: 0x7FFFFFFF 边界', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readUInt32LE(0) === 2147483647;
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
