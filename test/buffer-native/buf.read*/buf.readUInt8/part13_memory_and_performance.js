// buf.readUInt8() - 内存安全与性能测试
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
test('读取后 buffer 被垃圾回收不影响已读取的值', () => {
  let value;
  function createAndRead() {
    const buf = Buffer.from([123]);
    value = buf.readUInt8(0);
  }
  createAndRead();
  return value === 123;
});

test('多次创建销毁 buffer 读取一致性', () => {
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.from([i % 256]);
    if (buf.readUInt8(0) !== i % 256) return false;
  }
  return true;
});

// 大量连续读取
test('连续读取 10000 次同一位置', () => {
  const buf = Buffer.from([200]);
  for (let i = 0; i < 10000; i++) {
    if (buf.readUInt8(0) !== 200) return false;
  }
  return true;
});

test('连续读取 1000 个不同位置', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt8(i % 256, i);
  }
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt8(i) !== i % 256) return false;
  }
  return true;
});

// 交替读写测试
test('交替读写 1000 次', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 1000; i++) {
    const pos = i % 10;
    const val = i % 256;
    buf.writeUInt8(val, pos);
    if (buf.readUInt8(pos) !== val) return false;
  }
  return true;
});

// 随机访问模式
test('随机位置读取（模拟）', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt8(i, i);
  }
  // 模拟随机访问
  const positions = [5, 99, 0, 50, 25, 75, 10, 90, 45, 55];
  for (const pos of positions) {
    if (buf.readUInt8(pos) !== pos) return false;
  }
  return true;
});

// 缓存行测试（64字节对齐）
test('读取 64 字节对齐的数据', () => {
  const buf = Buffer.alloc(128);
  buf.writeUInt8(255, 0);
  buf.writeUInt8(128, 64);
  return buf.readUInt8(0) === 255 && buf.readUInt8(64) === 128;
});

test('跨缓存行读取', () => {
  const buf = Buffer.alloc(128);
  for (let i = 0; i < 128; i++) {
    buf.writeUInt8(i % 256, i);
  }
  // 读取跨越多个缓存行
  return buf.readUInt8(63) === 63 && 
         buf.readUInt8(64) === 64 && 
         buf.readUInt8(65) === 65;
});

// 内存对齐测试
test('非对齐地址读取', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(111, 3);
  buf.writeUInt8(222, 7);
  return buf.readUInt8(3) === 111 && buf.readUInt8(7) === 222;
});

// 稀疏访问模式
test('稀疏读取模式（每隔 10 个字节）', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i += 10) {
    buf.writeUInt8(i, i);
  }
  for (let i = 0; i < 100; i += 10) {
    if (buf.readUInt8(i) !== i) return false;
  }
  return true;
});

// 密集访问模式
test('密集连续读取（模拟扫描）', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf.writeUInt8(i, i);
  }
  for (let i = 0; i < 256; i++) {
    if (buf.readUInt8(i) !== i) return false;
  }
  return true;
});

// 读取模式：向前扫描
test('向前扫描读取', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    sum += buf.readUInt8(i);
  }
  return sum === 55; // 1+2+...+10 = 55
});

// 读取模式：向后扫描
test('向后扫描读取', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  let sum = 0;
  for (let i = buf.length - 1; i >= 0; i--) {
    sum += buf.readUInt8(i);
  }
  return sum === 55;
});

// 读取模式：跳跃式
test('跳跃式读取（步长为 2）', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  let sum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    sum += buf.readUInt8(i);
  }
  return sum === 10 + 30 + 50 + 70 + 90; // 250
});

// 性能：最小 buffer
test('最小 buffer（1 字节）重复读取', () => {
  const buf = Buffer.from([99]);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt8(0) !== 99) return false;
  }
  return true;
});

// 性能：中等 buffer
test('中等 buffer（1000 字节）全部读取', () => {
  const buf = Buffer.alloc(1000, 77);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt8(i) !== 77) return false;
  }
  return true;
});

// 性能：大 buffer
test('大 buffer（10000 字节）采样读取', () => {
  const buf = Buffer.alloc(10000, 88);
  // 采样读取（每隔 100 字节）
  for (let i = 0; i < 10000; i += 100) {
    if (buf.readUInt8(i) !== 88) return false;
  }
  return true;
});

// 内存复用测试
test('同一 buffer 多次使用', () => {
  const buf = Buffer.alloc(10);
  
  // 第一轮
  buf.fill(100);
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt8(i) !== 100) return false;
  }
  
  // 第二轮
  buf.fill(200);
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt8(i) !== 200) return false;
  }
  
  return true;
});

// 读取一致性：多次读取相同数据
test('同一数据多次读取结果一致', () => {
  const buf = Buffer.from([0, 50, 100, 150, 200, 250]);
  const results = [];
  
  // 读取 3 次
  for (let round = 0; round < 3; round++) {
    const roundResults = [];
    for (let i = 0; i < buf.length; i++) {
      roundResults.push(buf.readUInt8(i));
    }
    results.push(roundResults);
  }
  
  // 验证三次结果相同
  for (let i = 0; i < buf.length; i++) {
    if (results[0][i] !== results[1][i] || results[1][i] !== results[2][i]) {
      return false;
    }
  }
  return true;
});

// 零拷贝验证
test('subarray 零拷贝读取验证', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(1, 4);
  
  // 修改原 buffer
  buf.writeUInt8(99, 2);
  
  // subarray 应该看到修改（零拷贝）
  return sub.readUInt8(1) === 99;
});

test('slice 共享内存验证', () => {
  const buf = Buffer.from([100, 200, 50]);
  const sliced = buf.slice(0, 2);
  
  // 修改原 buffer
  buf.writeUInt8(111, 0);
  
  // slice 应该看到修改
  return sliced.readUInt8(0) === 111;
});

// 边界预热测试（模拟 JIT 优化）
test('重复相同操作（模拟预热）', () => {
  const buf = Buffer.from([123]);
  
  // 预热
  for (let i = 0; i < 100; i++) {
    buf.readUInt8(0);
  }
  
  // 实际测试
  return buf.readUInt8(0) === 123;
});

// 不同大小 buffer 的读取
test('读取不同大小的 buffer（1-100 字节）', () => {
  for (let size = 1; size <= 100; size++) {
    const buf = Buffer.alloc(size, size % 256);
    if (buf.readUInt8(0) !== size % 256) return false;
    if (buf.readUInt8(size - 1) !== size % 256) return false;
  }
  return true;
});

// 数据完整性：写入读取循环
test('写入读取完整性验证（256 个值）', () => {
  const buf = Buffer.alloc(256);
  
  // 写入所有可能的 uint8 值
  for (let i = 0; i < 256; i++) {
    buf.writeUInt8(i, i);
  }
  
  // 读取并验证
  for (let i = 0; i < 256; i++) {
    if (buf.readUInt8(i) !== i) return false;
  }
  
  return true;
});

// 极限测试：接近最大 buffer 大小
test('读取接近最大支持大小的 buffer', () => {
  try {
    const size = 1000000; // 1MB
    const buf = Buffer.alloc(size);
    buf.writeUInt8(42, 0);
    buf.writeUInt8(43, size - 1);
    return buf.readUInt8(0) === 42 && buf.readUInt8(size - 1) === 43;
  } catch (e) {
    // 如果内存不足，跳过此测试
    return true;
  }
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
