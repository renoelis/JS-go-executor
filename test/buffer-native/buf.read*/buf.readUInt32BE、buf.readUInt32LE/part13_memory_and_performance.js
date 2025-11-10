// 内存安全与性能测试 - 32位无符号整数
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

// 内存安全测试
test('BE: 读取后 buffer 被垃圾回收不影响已读取的值', () => {
  let value;
  function createAndRead() {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    value = buf.readUInt32BE(0);
  }
  createAndRead();
  return value === 0x12345678;
});

test('LE: 读取后 buffer 被垃圾回收不影响已读取的值', () => {
  let value;
  function createAndRead() {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    value = buf.readUInt32LE(0);
  }
  createAndRead();
  return value === 0x78563412;
});

test('BE: 多次创建销毁 buffer 读取一致性', () => {
  for (let i = 0; i < 100; i++) {
    const val = (i * 42949673) % 4294967296;
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(val, 0);
    if (buf.readUInt32BE(0) !== val) return false;
  }
  return true;
});

test('LE: 多次创建销毁 buffer 读取一致性', () => {
  for (let i = 0; i < 100; i++) {
    const val = (i * 42949673) % 4294967296;
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(val, 0);
    if (buf.readUInt32LE(0) !== val) return false;
  }
  return true;
});

// 大量连续读取
test('BE: 连续读取 10000 次同一位置', () => {
  const buf = Buffer.from([0xAB, 0xCD, 0xEF, 0x12]);
  for (let i = 0; i < 10000; i++) {
    if (buf.readUInt32BE(0) !== 0xABCDEF12) return false;
  }
  return true;
});

test('LE: 连续读取 10000 次同一位置', () => {
  const buf = Buffer.from([0xAB, 0xCD, 0xEF, 0x12]);
  for (let i = 0; i < 10000; i++) {
    if (buf.readUInt32LE(0) !== 0x12EFCDAB) return false;
  }
  return true;
});

test('BE: 连续读取 1000 个不同位置', () => {
  const buf = Buffer.alloc(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt32BE((i * 4294967) % 4294967296, i * 4);
  }
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32BE(i * 4) !== (i * 4294967) % 4294967296) return false;
  }
  return true;
});

test('LE: 连续读取 1000 个不同位置', () => {
  const buf = Buffer.alloc(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt32LE((i * 4294967) % 4294967296, i * 4);
  }
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32LE(i * 4) !== (i * 4294967) % 4294967296) return false;
  }
  return true;
});

// 交替读写测试
test('BE: 交替读写 1000 次', () => {
  const buf = Buffer.alloc(40);
  for (let i = 0; i < 1000; i++) {
    const pos = (i % 10) * 4;
    const val = (i * 42949673) % 4294967296;
    buf.writeUInt32BE(val, pos);
    if (buf.readUInt32BE(pos) !== val) return false;
  }
  return true;
});

test('LE: 交替读写 1000 次', () => {
  const buf = Buffer.alloc(40);
  for (let i = 0; i < 1000; i++) {
    const pos = (i % 10) * 4;
    const val = (i * 42949673) % 4294967296;
    buf.writeUInt32LE(val, pos);
    if (buf.readUInt32LE(pos) !== val) return false;
  }
  return true;
});

// 随机访问模式
test('BE: 随机位置读取', () => {
  const buf = Buffer.alloc(400);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt32BE(i * 10000, i * 4);
  }
  const positions = [0, 98, 2, 50, 24, 74, 10, 90, 44, 54];
  for (const pos of positions) {
    if (buf.readUInt32BE(pos * 4) !== pos * 10000) return false;
  }
  return true;
});

test('LE: 随机位置读取', () => {
  const buf = Buffer.alloc(400);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt32LE(i * 10000, i * 4);
  }
  const positions = [0, 98, 2, 50, 24, 74, 10, 90, 44, 54];
  for (const pos of positions) {
    if (buf.readUInt32LE(pos * 4) !== pos * 10000) return false;
  }
  return true;
});

// 缓存行测试（64字节对齐）
test('BE: 读取 64 字节对齐的数据', () => {
  const buf = Buffer.alloc(256);
  buf.writeUInt32BE(0xFFFFFFFF, 0);
  buf.writeUInt32BE(0x80000000, 64);
  buf.writeUInt32BE(0x12345678, 128);
  return buf.readUInt32BE(0) === 0xFFFFFFFF && 
         buf.readUInt32BE(64) === 0x80000000 && 
         buf.readUInt32BE(128) === 0x12345678;
});

test('LE: 读取 64 字节对齐的数据', () => {
  const buf = Buffer.alloc(256);
  buf.writeUInt32LE(0xFFFFFFFF, 0);
  buf.writeUInt32LE(0x80000000, 64);
  buf.writeUInt32LE(0x12345678, 128);
  return buf.readUInt32LE(0) === 0xFFFFFFFF && 
         buf.readUInt32LE(64) === 0x80000000 && 
         buf.readUInt32LE(128) === 0x12345678;
});

test('BE: 跨缓存行读取', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 64; i++) {
    buf.writeUInt32BE((i * 67108864) % 4294967296, i * 4);
  }
  return buf.readUInt32BE(60) === (15 * 67108864) % 4294967296 && 
         buf.readUInt32BE(64) === (16 * 67108864) % 4294967296 && 
         buf.readUInt32BE(68) === (17 * 67108864) % 4294967296;
});

test('LE: 跨缓存行读取', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 64; i++) {
    buf.writeUInt32LE((i * 67108864) % 4294967296, i * 4);
  }
  return buf.readUInt32LE(60) === (15 * 67108864) % 4294967296 && 
         buf.readUInt32LE(64) === (16 * 67108864) % 4294967296 && 
         buf.readUInt32LE(68) === (17 * 67108864) % 4294967296;
});

// 内存对齐测试
test('BE: 非对齐地址读取（奇数 offset）', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt32BE(0x12345678, 1);
  buf.writeUInt32BE(0x9ABCDEF0, 5);
  buf.writeUInt32BE(0xAABBCCDD, 9);
  return buf.readUInt32BE(1) === 0x12345678 && 
         buf.readUInt32BE(5) === 0x9ABCDEF0 && 
         buf.readUInt32BE(9) === 0xAABBCCDD;
});

test('LE: 非对齐地址读取（奇数 offset）', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt32LE(0x12345678, 1);
  buf.writeUInt32LE(0x9ABCDEF0, 5);
  buf.writeUInt32LE(0xAABBCCDD, 9);
  return buf.readUInt32LE(1) === 0x12345678 && 
         buf.readUInt32LE(5) === 0x9ABCDEF0 && 
         buf.readUInt32LE(9) === 0xAABBCCDD;
});

// 稀疏访问模式
test('BE: 稀疏访问模式（每隔 16 个字节）', () => {
  const buf = Buffer.alloc(160);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt32BE(i * 100000000, i * 16);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32BE(i * 16) !== i * 100000000) return false;
  }
  return true;
});

test('LE: 稀疏访问模式（每隔 16 个字节）', () => {
  const buf = Buffer.alloc(160);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt32LE(i * 100000000, i * 16);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32LE(i * 16) !== i * 100000000) return false;
  }
  return true;
});

// 密集访问模式
test('BE: 密集访问模式（连续字节）', () => {
  const buf = Buffer.alloc(400);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt32BE((i * 42949673) % 4294967296, i * 4);
  }
  for (let i = 0; i < 100; i++) {
    if (buf.readUInt32BE(i * 4) !== (i * 42949673) % 4294967296) return false;
  }
  return true;
});

test('LE: 密集访问模式（连续字节）', () => {
  const buf = Buffer.alloc(400);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt32LE((i * 42949673) % 4294967296, i * 4);
  }
  for (let i = 0; i < 100; i++) {
    if (buf.readUInt32LE(i * 4) !== (i * 42949673) % 4294967296) return false;
  }
  return true;
});

// 向前扫描
test('BE: 向前扫描模式', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 50; i++) {
    buf.writeUInt32BE(i * 1000, i * 4);
  }
  for (let i = 0; i < 50; i++) {
    if (buf.readUInt32BE(i * 4) !== i * 1000) return false;
  }
  return true;
});

test('LE: 向前扫描模式', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 50; i++) {
    buf.writeUInt32LE(i * 1000, i * 4);
  }
  for (let i = 0; i < 50; i++) {
    if (buf.readUInt32LE(i * 4) !== i * 1000) return false;
  }
  return true;
});

// 向后扫描
test('BE: 向后扫描模式', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 50; i++) {
    buf.writeUInt32BE(i * 1000, i * 4);
  }
  for (let i = 49; i >= 0; i--) {
    if (buf.readUInt32BE(i * 4) !== i * 1000) return false;
  }
  return true;
});

test('LE: 向后扫描模式', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 50; i++) {
    buf.writeUInt32LE(i * 1000, i * 4);
  }
  for (let i = 49; i >= 0; i--) {
    if (buf.readUInt32LE(i * 4) !== i * 1000) return false;
  }
  return true;
});

// 跳跃扫描
test('BE: 跳跃扫描模式（步长 8）', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 25; i++) {
    buf.writeUInt32BE(i * 10000000, i * 8);
  }
  for (let i = 0; i < 25; i++) {
    if (buf.readUInt32BE(i * 8) !== i * 10000000) return false;
  }
  return true;
});

test('LE: 跳跃扫描模式（步长 8）', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 25; i++) {
    buf.writeUInt32LE(i * 10000000, i * 8);
  }
  for (let i = 0; i < 25; i++) {
    if (buf.readUInt32LE(i * 8) !== i * 10000000) return false;
  }
  return true;
});

// 小 buffer 性能
test('BE: 小 buffer (20 字节) 重复读取', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt32BE(123456789, 0);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32BE(0) !== 123456789) return false;
  }
  return true;
});

test('LE: 小 buffer (20 字节) 重复读取', () => {
  const buf = Buffer.alloc(20);
  buf.writeUInt32LE(123456789, 0);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32LE(0) !== 123456789) return false;
  }
  return true;
});

// 中等 buffer 性能
test('BE: 中等 buffer (1000 字节) 重复读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt32BE(987654321, 500);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32BE(500) !== 987654321) return false;
  }
  return true;
});

test('LE: 中等 buffer (1000 字节) 重复读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt32LE(987654321, 500);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32LE(500) !== 987654321) return false;
  }
  return true;
});

// 大 buffer 性能
test('BE: 大 buffer (10000 字节) 重复读取', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt32BE(4294967295, 5000);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32BE(5000) !== 4294967295) return false;
  }
  return true;
});

test('LE: 大 buffer (10000 字节) 重复读取', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt32LE(4294967295, 5000);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt32LE(5000) !== 4294967295) return false;
  }
  return true;
});

// 内存复用
test('BE: 内存复用（同一 buffer 不同值）', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 100; i++) {
    const val = (i * 42949673) % 4294967296;
    buf.writeUInt32BE(val, 0);
    if (buf.readUInt32BE(0) !== val) return false;
  }
  return true;
});

test('LE: 内存复用（同一 buffer 不同值）', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 100; i++) {
    const val = (i * 42949673) % 4294967296;
    buf.writeUInt32LE(val, 0);
    if (buf.readUInt32LE(0) !== val) return false;
  }
  return true;
});

// 数据完整性验证
test('BE: 数据完整性（写入后立即验证）', () => {
  const buf = Buffer.alloc(200);
  const values = [];
  for (let i = 0; i < 50; i++) {
    const val = Math.floor(Math.random() * 4294967296);
    values.push(val);
    buf.writeUInt32BE(val, i * 4);
  }
  for (let i = 0; i < 50; i++) {
    if (buf.readUInt32BE(i * 4) !== values[i]) return false;
  }
  return true;
});

test('LE: 数据完整性（写入后立即验证）', () => {
  const buf = Buffer.alloc(200);
  const values = [];
  for (let i = 0; i < 50; i++) {
    const val = Math.floor(Math.random() * 4294967296);
    values.push(val);
    buf.writeUInt32LE(val, i * 4);
  }
  for (let i = 0; i < 50; i++) {
    if (buf.readUInt32LE(i * 4) !== values[i]) return false;
  }
  return true;
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
