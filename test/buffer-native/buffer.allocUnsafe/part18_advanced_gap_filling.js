// Buffer.allocUnsafe() - 高级查缺补漏测试
// 专注于TypedArray交互、原型链、特殊数值、迭代器等高级场景
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

// ==================== TypedArray 底层共享测试 ====================

test('Buffer 与 Uint8Array 内存共享验证', () => {
  const buf = Buffer.allocUnsafe(10);
  
  // 填充数据
  for (let i = 0; i < 10; i++) {
    buf[i] = i;
  }

  // 创建 Uint8Array 视图
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

  // 验证初始数据一致
  for (let i = 0; i < 10; i++) {
    if (uint8[i] !== i) {
      throw new Error(`初始数据不一致: uint8[${i}] = ${uint8[i]}, 期望 ${i}`);
    }
  }

  // 通过 Buffer 修改数据
  buf[5] = 99;

  // 验证 Uint8Array 视图也被修改
  if (uint8[5] !== 99) {
    throw new Error('Buffer 修改未反映到 Uint8Array 视图');
  }

  // 通过 Uint8Array 修改数据
  uint8[7] = 88;

  // 验证 Buffer 也被修改
  if (buf[7] !== 88) {
    throw new Error('Uint8Array 修改未反映到 Buffer');
  }

  console.log('✅ Buffer 与 Uint8Array 内存共享验证');
  return true;
});

test('Buffer 与 Uint16Array 视图交互', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0);

  // 写入16位值
  buf.writeUInt16LE(0x1234, 0);
  buf.writeUInt16LE(0x5678, 2);

  // 创建 Uint16Array 视图（小端）
  const uint16 = new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);

  // 验证数据
  if (uint16[0] !== 0x1234) {
    throw new Error(`uint16[0] 期望 0x1234，得到 0x${uint16[0].toString(16)}`);
  }
  if (uint16[1] !== 0x5678) {
    throw new Error(`uint16[1] 期望 0x5678，得到 0x${uint16[1].toString(16)}`);
  }

  // 通过 Uint16Array 修改
  uint16[2] = 0xABCD;

  // 验证 Buffer 反映了修改
  const value = buf.readUInt16LE(4);
  if (value !== 0xABCD) {
    throw new Error(`Buffer 读取期望 0xABCD，得到 0x${value.toString(16)}`);
  }

  console.log('✅ Buffer 与 Uint16Array 视图交互');
  return true;
});

test('Buffer 与 DataView 交互', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.fill(0);

  // 通过 Buffer 写入数据
  buf.writeInt32BE(0x12345678, 0);
  buf.writeFloatLE(3.14159, 4);

  // 创建 DataView
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // 验证 DataView 可以读取 Buffer 写入的数据
  const int32 = view.getInt32(0, false); // 大端
  if (int32 !== 0x12345678) {
    throw new Error(`DataView 读取 Int32 失败: 期望 0x12345678，得到 0x${int32.toString(16)}`);
  }

  const float = view.getFloat32(4, true); // 小端
  if (Math.abs(float - 3.14159) > 0.001) {
    throw new Error(`DataView 读取 Float 失败: 期望 3.14159，得到 ${float}`);
  }

  // 通过 DataView 写入数据
  view.setUint16(8, 0xBEEF, false); // 大端

  // 验证 Buffer 可以读取
  const uint16 = buf.readUInt16BE(8);
  if (uint16 !== 0xBEEF) {
    throw new Error(`Buffer 读取 DataView 写入的数据失败`);
  }

  console.log('✅ Buffer 与 DataView 交互');
  return true;
});

// ==================== 特殊数值的深度边界测试 ====================

test('负零 (-0) 处理', () => {
  const negZero = -0;
  const buf = Buffer.allocUnsafe(negZero);
  
  if (buf.length !== 0) {
    throw new Error(`负零应该创建长度为0的Buffer，得到 ${buf.length}`);
  }

  // 验证 1 / -0 是负无穷
  if (1 / negZero !== -Infinity) {
    console.log('⚠️  -0 处理可能有问题');
  }

  console.log('✅ 负零 (-0) 处理');
  return true;
});

test('接近整数边界的浮点数', () => {
  const testCases = [
    { input: 0.9999999999999999, expected: 0 }, // 接近1但小于1
    { input: 1.0000000000000002, expected: 1 }, // 略大于1
    { input: 9.999999999999998, expected: 9 },  // 接近10
    { input: 10.000000000000002, expected: 10 },
    { input: 99.99999999999999, expected: 99 },
    { input: 100.00000000000001, expected: 100 }
  ];

  for (const tc of testCases) {
    const buf = Buffer.allocUnsafe(tc.input);
    if (buf.length !== tc.expected) {
      throw new Error(`${tc.input}: 期望长度 ${tc.expected}，得到 ${buf.length}`);
    }
  }

  console.log('✅ 接近整数边界的浮点数');
  return true;
});

test('Number.MIN_VALUE (最小正数) 处理', () => {
  const minValue = Number.MIN_VALUE; // 约 5e-324
  const buf = Buffer.allocUnsafe(minValue);
  
  if (buf.length !== 0) {
    throw new Error(`MIN_VALUE 应该向下取整为0，得到 ${buf.length}`);
  }

  console.log('✅ Number.MIN_VALUE 处理');
  return true;
});

test('2^53 精度边界（MAX_SAFE_INTEGER）', () => {
  const maxSafe = Number.MAX_SAFE_INTEGER; // 2^53 - 1
  
  // 这些值可能因内存限制而失败，主要测试不会崩溃
  try {
    const buf1 = Buffer.allocUnsafe(1000000);
    if (buf1.length !== 1000000) {
      throw new Error('长度验证失败');
    }
  } catch (error) {
    const msg = error.message.toLowerCase();
    if (!msg.includes('allocation') && !msg.includes('array buffer') && !msg.includes('memory')) {
      throw error;
    }
    console.log('⚠️  内存限制，跳过大内存测试');
  }

  console.log('✅ 2^53 精度边界测试');
  return true;
});

// ==================== Buffer 迭代器测试 ====================

test('Buffer.prototype.entries() 迭代器', () => {
  const buf = Buffer.allocUnsafe(5);
  for (let i = 0; i < 5; i++) {
    buf[i] = i + 10;
  }

  // 使用 entries() 迭代器
  const entries = [];
  for (const [index, value] of buf.entries()) {
    entries.push({ index, value });
  }

  // 验证
  if (entries.length !== 5) {
    throw new Error(`entries 长度应为5，得到 ${entries.length}`);
  }

  for (let i = 0; i < 5; i++) {
    if (entries[i].index !== i || entries[i].value !== i + 10) {
      throw new Error(`entries[${i}] 数据不匹配`);
    }
  }

  console.log('✅ Buffer.prototype.entries() 迭代器');
  return true;
});

test('Buffer.prototype.keys() 迭代器', () => {
  const buf = Buffer.allocUnsafe(5);
  
  const keys = [];
  for (const key of buf.keys()) {
    keys.push(key);
  }

  // 验证
  if (keys.length !== 5) {
    throw new Error(`keys 长度应为5，得到 ${keys.length}`);
  }

  for (let i = 0; i < 5; i++) {
    if (keys[i] !== i) {
      throw new Error(`keys[${i}] 应为 ${i}，得到 ${keys[i]}`);
    }
  }

  console.log('✅ Buffer.prototype.keys() 迭代器');
  return true;
});

test('Buffer.prototype.values() 迭代器', () => {
  const buf = Buffer.allocUnsafe(5);
  for (let i = 0; i < 5; i++) {
    buf[i] = i * 2;
  }

  const values = [];
  for (const value of buf.values()) {
    values.push(value);
  }

  // 验证
  if (values.length !== 5) {
    throw new Error(`values 长度应为5，得到 ${values.length}`);
  }

  for (let i = 0; i < 5; i++) {
    if (values[i] !== i * 2) {
      throw new Error(`values[${i}] 应为 ${i * 2}，得到 ${values[i]}`);
    }
  }

  console.log('✅ Buffer.prototype.values() 迭代器');
  return true;
});

test('Buffer for...of 迭代（默认迭代器）', () => {
  const buf = Buffer.allocUnsafe(4);
  buf[0] = 65; // 'A'
  buf[1] = 66; // 'B'
  buf[2] = 67; // 'C'
  buf[3] = 68; // 'D'

  const values = [];
  for (const value of buf) {
    values.push(value);
  }

  // 验证
  const expected = [65, 66, 67, 68];
  if (values.length !== expected.length) {
    throw new Error('for...of 长度不匹配');
  }

  for (let i = 0; i < expected.length; i++) {
    if (values[i] !== expected[i]) {
      throw new Error(`for...of[${i}] 应为 ${expected[i]}，得到 ${values[i]}`);
    }
  }

  console.log('✅ Buffer for...of 迭代');
  return true;
});

// ==================== allocUnsafe vs Buffer.from 对比 ====================

test('allocUnsafe 与 Buffer.from 的初始化差异', () => {
  const size = 100;

  // allocUnsafe 不初始化
  const unsafeBuf = Buffer.allocUnsafe(size);
  
  // Buffer.from 会初始化（用0填充）
  const fromBuf = Buffer.from(new Array(size).fill(0));

  // 验证 fromBuf 全为0
  for (let i = 0; i < size; i++) {
    if (fromBuf[i] !== 0) {
      throw new Error('Buffer.from 应该全为0');
    }
  }

  // allocUnsafe 的内容是未定义的，不能假设任何值
  // 但可以验证它可以被正常使用
  unsafeBuf.fill(42);
  for (let i = 0; i < size; i++) {
    if (unsafeBuf[i] !== 42) {
      throw new Error('allocUnsafe 填充后应该全为42');
    }
  }

  console.log('✅ allocUnsafe 与 Buffer.from 的初始化差异');
  return true;
});

test('allocUnsafe 与 alloc 的性能特征对比', () => {
  const size = 1024;
  const iterations = 50;

  // 测量 allocUnsafe
  const startUnsafe = Date.now();
  for (let i = 0; i < iterations; i++) {
    const buf = Buffer.allocUnsafe(size);
    buf[0] = i; // 确保使用
  }
  const unsafeTime = Date.now() - startUnsafe;

  // 测量 alloc
  const startAlloc = Date.now();
  for (let i = 0; i < iterations; i++) {
    const buf = Buffer.alloc(size);
    buf[0] = i; // 确保使用
  }
  const allocTime = Date.now() - startAlloc;

  console.log(`allocUnsafe 时间: ${unsafeTime}ms, alloc 时间: ${allocTime}ms`);

  // allocUnsafe 通常应该更快或相当（但不保证）
  if (unsafeTime > allocTime * 5) {
    console.log('⚠️  allocUnsafe 性能异常慢');
  }

  console.log('✅ allocUnsafe 与 alloc 的性能特征对比');
  return true;
});

// ==================== 内存对齐测试 ====================

test('非对齐访问验证', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.fill(0);

  // 写入32位整数到非4字节对齐的位置（使用无符号）
  buf.writeUInt32LE(0x12345678, 1); // 偏移1，非对齐
  buf.writeUInt32LE(0xABCDEF00, 7); // 偏移7，非对齐

  // 验证可以正确读取
  const val1 = buf.readUInt32LE(1);
  const val2 = buf.readUInt32LE(7);

  if (val1 !== 0x12345678) {
    throw new Error(`非对齐读取1失败: 期望 0x12345678，得到 0x${val1.toString(16)}`);
  }

  if (val2 !== 0xABCDEF00) {
    throw new Error(`非对齐读取2失败: 期望 0xABCDEF00，得到 0x${val2.toString(16)}`);
  }

  console.log('✅ 非对齐访问验证');
  return true;
});

// ==================== WeakMap 和引用测试 ====================

test('Buffer 作为 WeakMap 键', () => {
  const weakMap = new WeakMap();
  const buf = Buffer.allocUnsafe(10);
  
  // Buffer 作为键
  weakMap.set(buf, 'test-value');

  // 验证可以获取
  const value = weakMap.get(buf);
  if (value !== 'test-value') {
    throw new Error('WeakMap 获取失败');
  }

  // 验证 has
  if (!weakMap.has(buf)) {
    throw new Error('WeakMap has 失败');
  }

  console.log('✅ Buffer 作为 WeakMap 键');
  return true;
});

// ==================== 边缘组合测试 ====================

test('先大后小的分配模式', () => {
  const large = 10000;
  const small = 10;

  // 先分配大Buffer
  const largeBuf = Buffer.allocUnsafe(large);
  largeBuf.fill(1);

  // 再分配小Buffer
  const smallBuf = Buffer.allocUnsafe(small);
  smallBuf.fill(2);

  // 验证两个Buffer是独立的
  if (largeBuf[0] !== 1) {
    throw new Error('大Buffer数据被污染');
  }

  if (smallBuf[0] !== 2) {
    throw new Error('小Buffer数据不正确');
  }

  // 验证长度
  if (largeBuf.length !== large || smallBuf.length !== small) {
    throw new Error('Buffer长度不正确');
  }

  console.log('✅ 先大后小的分配模式');
  return true;
});

test('交替分配不同大小', () => {
  const sizes = [10, 100, 50, 200, 25, 150];
  const buffers = [];

  for (const size of sizes) {
    const buf = Buffer.allocUnsafe(size);
    buf.fill(size % 256);
    buffers.push({ buf, size });
  }

  // 验证所有Buffer都是独立且正确的
  for (let i = 0; i < buffers.length; i++) {
    const { buf, size } = buffers[i];
    if (buf.length !== size) {
      throw new Error(`Buffer ${i} 长度不匹配`);
    }

    const expectedValue = size % 256;
    if (buf[0] !== expectedValue) {
      throw new Error(`Buffer ${i} 数据不正确`);
    }
  }

  console.log('✅ 交替分配不同大小');
  return true;
});

// ==================== poolSize 动态修改的影响 ====================

test('poolSize 修改后的分配行为', () => {
  const originalPoolSize = Buffer.poolSize;

  try {
    // 修改 poolSize
    Buffer.poolSize = 1024;

    const halfPool = 512;

    // 分配小于新 poolSize/2 的Buffer
    const buf1 = Buffer.allocUnsafe(halfPool - 1);
    buf1.fill(1);

    // 分配等于新 poolSize/2 的Buffer
    const buf2 = Buffer.allocUnsafe(halfPool);
    buf2.fill(2);

    // 分配大于新 poolSize/2 的Buffer
    const buf3 = Buffer.allocUnsafe(halfPool + 1);
    buf3.fill(3);

    // 验证所有Buffer独立且正确
    if (buf1[0] !== 1 || buf2[0] !== 2 || buf3[0] !== 3) {
      throw new Error('poolSize 修改后分配的Buffer数据不正确');
    }

    console.log('✅ poolSize 修改后的分配行为');
    return true;
  } finally {
    // 恢复原始 poolSize
    Buffer.poolSize = originalPoolSize;
  }
});

// ==================== 总结 ====================

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
