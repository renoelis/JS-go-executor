// 内存安全与性能测试
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
    const buf = Buffer.from([0x12, 0x34]);
    value = buf.readUInt16BE(0);
  }
  createAndRead();
  return value === 0x1234;
});

test('LE: 读取后 buffer 被垃圾回收不影响已读取的值', () => {
  let value;
  function createAndRead() {
    const buf = Buffer.from([0x12, 0x34]);
    value = buf.readUInt16LE(0);
  }
  createAndRead();
  return value === 0x3412;
});

test('BE: 多次创建销毁 buffer 读取一致性', () => {
  for (let i = 0; i < 100; i++) {
    const val = (i * 257) % 65536;
    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(val, 0);
    if (buf.readUInt16BE(0) !== val) return false;
  }
  return true;
});

test('LE: 多次创建销毁 buffer 读取一致性', () => {
  for (let i = 0; i < 100; i++) {
    const val = (i * 257) % 65536;
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(val, 0);
    if (buf.readUInt16LE(0) !== val) return false;
  }
  return true;
});

// 大量连续读取
test('BE: 连续读取 10000 次同一位置', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  for (let i = 0; i < 10000; i++) {
    if (buf.readUInt16BE(0) !== 0xABCD) return false;
  }
  return true;
});

test('LE: 连续读取 10000 次同一位置', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  for (let i = 0; i < 10000; i++) {
    if (buf.readUInt16LE(0) !== 0xCDAB) return false;
  }
  return true;
});

test('BE: 连续读取 1000 个不同位置', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt16BE((i * 65) % 65536, i * 2);
  }
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16BE(i * 2) !== (i * 65) % 65536) return false;
  }
  return true;
});

test('LE: 连续读取 1000 个不同位置', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt16LE((i * 65) % 65536, i * 2);
  }
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16LE(i * 2) !== (i * 65) % 65536) return false;
  }
  return true;
});

// 交替读写测试
test('BE: 交替读写 1000 次', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 1000; i++) {
    const pos = (i % 10) * 2;
    const val = (i * 257) % 65536;
    buf.writeUInt16BE(val, pos);
    if (buf.readUInt16BE(pos) !== val) return false;
  }
  return true;
});

test('LE: 交替读写 1000 次', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 1000; i++) {
    const pos = (i % 10) * 2;
    const val = (i * 257) % 65536;
    buf.writeUInt16LE(val, pos);
    if (buf.readUInt16LE(pos) !== val) return false;
  }
  return true;
});

// 随机访问模式
test('BE: 随机位置读取', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt16BE(i * 100, i * 2);
  }
  const positions = [0, 98, 2, 50, 24, 74, 10, 90, 44, 54];
  for (const pos of positions) {
    if (buf.readUInt16BE(pos * 2) !== pos * 100) return false;
  }
  return true;
});

test('LE: 随机位置读取', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt16LE(i * 100, i * 2);
  }
  const positions = [0, 98, 2, 50, 24, 74, 10, 90, 44, 54];
  for (const pos of positions) {
    if (buf.readUInt16LE(pos * 2) !== pos * 100) return false;
  }
  return true;
});

// 缓存行测试（64字节对齐）
test('BE: 读取 64 字节对齐的数据', () => {
  const buf = Buffer.alloc(256);
  buf.writeUInt16BE(0xFFFF, 0);
  buf.writeUInt16BE(0x8000, 64);
  buf.writeUInt16BE(0x1234, 128);
  return buf.readUInt16BE(0) === 0xFFFF && 
         buf.readUInt16BE(64) === 0x8000 && 
         buf.readUInt16BE(128) === 0x1234;
});

test('LE: 读取 64 字节对齐的数据', () => {
  const buf = Buffer.alloc(256);
  buf.writeUInt16LE(0xFFFF, 0);
  buf.writeUInt16LE(0x8000, 64);
  buf.writeUInt16LE(0x1234, 128);
  return buf.readUInt16LE(0) === 0xFFFF && 
         buf.readUInt16LE(64) === 0x8000 && 
         buf.readUInt16LE(128) === 0x1234;
});

test('BE: 跨缓存行读取', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 128; i++) {
    buf.writeUInt16BE((i * 257) % 65536, i * 2);
  }
  return buf.readUInt16BE(62) === (31 * 257) % 65536 && 
         buf.readUInt16BE(64) === (32 * 257) % 65536 && 
         buf.readUInt16BE(66) === (33 * 257) % 65536;
});

test('LE: 跨缓存行读取', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 128; i++) {
    buf.writeUInt16LE((i * 257) % 65536, i * 2);
  }
  return buf.readUInt16LE(62) === (31 * 257) % 65536 && 
         buf.readUInt16LE(64) === (32 * 257) % 65536 && 
         buf.readUInt16LE(66) === (33 * 257) % 65536;
});

// 内存对齐测试
test('BE: 非对齐地址读取（奇数 offset）', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt16BE(0x1234, 1);
  buf.writeUInt16BE(0x5678, 3);
  buf.writeUInt16BE(0xABCD, 5);
  return buf.readUInt16BE(1) === 0x1234 && 
         buf.readUInt16BE(3) === 0x5678 && 
         buf.readUInt16BE(5) === 0xABCD;
});

test('LE: 非对齐地址读取（奇数 offset）', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt16LE(0x1234, 1);
  buf.writeUInt16LE(0x5678, 3);
  buf.writeUInt16LE(0xABCD, 5);
  return buf.readUInt16LE(1) === 0x1234 && 
         buf.readUInt16LE(3) === 0x5678 && 
         buf.readUInt16LE(5) === 0xABCD;
});

// 稀疏访问模式
test('BE: 稀疏访问模式（每隔 10 个字节）', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16BE(i * 1000, i * 10);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt16BE(i * 10) !== i * 1000) return false;
  }
  return true;
});

test('LE: 稀疏访问模式（每隔 10 个字节）', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16LE(i * 1000, i * 10);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt16LE(i * 10) !== i * 1000) return false;
  }
  return true;
});

// 密集访问模式
test('BE: 密集访问模式（连续字节）', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt16BE((i * 100) % 65536, i * 2);
  }
  for (let i = 0; i < 100; i++) {
    if (buf.readUInt16BE(i * 2) !== (i * 100) % 65536) return false;
  }
  return true;
});

test('LE: 密集访问模式（连续字节）', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt16LE((i * 100) % 65536, i * 2);
  }
  for (let i = 0; i < 100; i++) {
    if (buf.readUInt16LE(i * 2) !== (i * 100) % 65536) return false;
  }
  return true;
});

// 向前扫描
test('BE: 向前扫描模式', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    buf.writeUInt16BE(i, i * 2);
  }
  for (let i = 0; i < 50; i++) {
    if (buf.readUInt16BE(i * 2) !== i) return false;
  }
  return true;
});

test('LE: 向前扫描模式', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    buf.writeUInt16LE(i, i * 2);
  }
  for (let i = 0; i < 50; i++) {
    if (buf.readUInt16LE(i * 2) !== i) return false;
  }
  return true;
});

// 向后扫描
test('BE: 向后扫描模式', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    buf.writeUInt16BE(i, i * 2);
  }
  for (let i = 49; i >= 0; i--) {
    if (buf.readUInt16BE(i * 2) !== i) return false;
  }
  return true;
});

test('LE: 向后扫描模式', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    buf.writeUInt16LE(i, i * 2);
  }
  for (let i = 49; i >= 0; i--) {
    if (buf.readUInt16LE(i * 2) !== i) return false;
  }
  return true;
});

// 跳跃扫描
test('BE: 跳跃扫描模式（步长 4）', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 25; i++) {
    buf.writeUInt16BE(i * 100, i * 4);
  }
  for (let i = 0; i < 25; i++) {
    if (buf.readUInt16BE(i * 4) !== i * 100) return false;
  }
  return true;
});

test('LE: 跳跃扫描模式（步长 4）', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 25; i++) {
    buf.writeUInt16LE(i * 100, i * 4);
  }
  for (let i = 0; i < 25; i++) {
    if (buf.readUInt16LE(i * 4) !== i * 100) return false;
  }
  return true;
});

// 小 buffer 性能
test('BE: 小 buffer (10 字节) 重复读取', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt16BE(12345, 0);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16BE(0) !== 12345) return false;
  }
  return true;
});

test('LE: 小 buffer (10 字节) 重复读取', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt16LE(12345, 0);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16LE(0) !== 12345) return false;
  }
  return true;
});

// 中等 buffer 性能
test('BE: 中等 buffer (1000 字节) 重复读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt16BE(54321, 500);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16BE(500) !== 54321) return false;
  }
  return true;
});

test('LE: 中等 buffer (1000 字节) 重复读取', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt16LE(54321, 500);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16LE(500) !== 54321) return false;
  }
  return true;
});

// 大 buffer 性能
test('BE: 大 buffer (10000 字节) 重复读取', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt16BE(65535, 5000);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16BE(5000) !== 65535) return false;
  }
  return true;
});

test('LE: 大 buffer (10000 字节) 重复读取', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt16LE(65535, 5000);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt16LE(5000) !== 65535) return false;
  }
  return true;
});

// 内存复用
test('BE: 内存复用（同一 buffer 不同值）', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i < 100; i++) {
    const val = (i * 655) % 65536;
    buf.writeUInt16BE(val, 0);
    if (buf.readUInt16BE(0) !== val) return false;
  }
  return true;
});

test('LE: 内存复用（同一 buffer 不同值）', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i < 100; i++) {
    const val = (i * 655) % 65536;
    buf.writeUInt16LE(val, 0);
    if (buf.readUInt16LE(0) !== val) return false;
  }
  return true;
});

// 数据完整性验证
test('BE: 数据完整性（写入后立即验证）', () => {
  const buf = Buffer.alloc(100);
  const values = [];
  for (let i = 0; i < 50; i++) {
    const val = Math.floor(Math.random() * 65536);
    values.push(val);
    buf.writeUInt16BE(val, i * 2);
  }
  for (let i = 0; i < 50; i++) {
    if (buf.readUInt16BE(i * 2) !== values[i]) return false;
  }
  return true;
});

test('LE: 数据完整性（写入后立即验证）', () => {
  const buf = Buffer.alloc(100);
  const values = [];
  for (let i = 0; i < 50; i++) {
    const val = Math.floor(Math.random() * 65536);
    values.push(val);
    buf.writeUInt16LE(val, i * 2);
  }
  for (let i = 0; i < 50; i++) {
    if (buf.readUInt16LE(i * 2) !== values[i]) return false;
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
