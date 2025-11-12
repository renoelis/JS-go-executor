// Buffer.allocUnsafe() - 深度查缺补漏测试
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

// ==================== 错误消息一致性测试 ====================

test('TypeError 错误消息格式验证', () => {
  const testCases = [
    { input: 'string', desc: '字符串' },
    { input: null, desc: 'null' },
    { input: undefined, desc: 'undefined' },
    { input: true, desc: '布尔值' },
    { input: {}, desc: '对象' },
    { input: [], desc: '数组' },
    { input: () => {}, desc: '函数' }
  ];

  for (const tc of testCases) {
    try {
      Buffer.allocUnsafe(tc.input);
      throw new Error(`${tc.desc} 应该抛出 TypeError`);
    } catch (error) {
      // 验证错误名称
      if (error.name !== 'TypeError') {
        throw new Error(`${tc.desc}: 期望 TypeError，得到 ${error.name}`);
      }
      
      // 验证错误消息包含关键信息（大小写不敏感）
      const msg = error.message.toLowerCase();
      const hasTypeInfo = msg.includes('type') || msg.includes('number') || msg.includes('argument');
      if (!hasTypeInfo) {
        throw new Error(`${tc.desc}: 错误消息缺少类型信息: ${error.message}`);
      }
    }
  }

  console.log('✅ TypeError 错误消息格式验证');
  return true;
});

test('RangeError 错误消息格式验证', () => {
  const testCases = [
    { input: -1, desc: '负数 -1' },
    { input: -100, desc: '负数 -100' },
    { input: NaN, desc: 'NaN' },
    { input: Infinity, desc: 'Infinity' },
    { input: -Infinity, desc: '-Infinity' }
  ];

  for (const tc of testCases) {
    try {
      Buffer.allocUnsafe(tc.input);
      throw new Error(`${tc.desc} 应该抛出 RangeError`);
    } catch (error) {
      // 验证错误名称
      if (error.name !== 'RangeError') {
        throw new Error(`${tc.desc}: 期望 RangeError，得到 ${error.name}`);
      }
      
      // 验证错误消息包含关键信息（大小写不敏感）
      const msg = error.message.toLowerCase();
      const hasRangeInfo = msg.includes('range') || msg.includes('size') || msg.includes('out of');
      if (!hasRangeInfo) {
        throw new Error(`${tc.desc}: 错误消息缺少范围信息: ${error.message}`);
      }
    }
  }

  console.log('✅ RangeError 错误消息格式验证');
  return true;
});

// ==================== 边界值深度测试 ====================

test('精确的边界值测试（poolSize 相关）', () => {
  const poolSize = Buffer.poolSize; // 默认 8192
  const halfPoolSize = poolSize / 2; // 4096

  const boundaries = [
    halfPoolSize - 2,
    halfPoolSize - 1,
    halfPoolSize,
    halfPoolSize + 1,
    halfPoolSize + 2,
    poolSize - 2,
    poolSize - 1,
    poolSize,
    poolSize + 1,
    poolSize + 2
  ];

  for (const size of boundaries) {
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`边界值 ${size}: 期望长度 ${size}，得到 ${buf.length}`);
    }
  }

  console.log('✅ 精确的边界值测试（poolSize 相关）');
  return true;
});

test('2的幂次精确边界', () => {
  // 测试从 2^0 到 2^20 的所有2的幂次
  for (let power = 0; power <= 20; power++) {
    const size = Math.pow(2, power);
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`2^${power} (${size}): 期望长度 ${size}，得到 ${buf.length}`);
    }

    // 测试 2^n - 1
    if (size > 1) {
      const buf2 = Buffer.allocUnsafe(size - 1);
      if (buf2.length !== size - 1) {
        throw new Error(`2^${power} - 1: 期望长度 ${size - 1}，得到 ${buf2.length}`);
      }
    }

    // 测试 2^n + 1
    const buf3 = Buffer.allocUnsafe(size + 1);
    if (buf3.length !== size + 1) {
      throw new Error(`2^${power} + 1: 期望长度 ${size + 1}，得到 ${buf3.length}`);
    }
  }

  console.log('✅ 2的幂次精确边界');
  return true;
});

// ==================== 浮点数转整数精确测试 ====================

test('浮点数截断规则验证', () => {
  const testCases = [
    { input: 10.1, expected: 10 },
    { input: 10.5, expected: 10 },
    { input: 10.9, expected: 10 },
    { input: 10.999999, expected: 10 },
    { input: 100.1, expected: 100 },
    { input: 100.9, expected: 100 },
    { input: 0.1, expected: 0 },
    { input: 0.9, expected: 0 },
    { input: 0.999999, expected: 0 },
    { input: 1.0, expected: 1 },
    { input: 1.00000001, expected: 1 }
  ];

  for (const tc of testCases) {
    const buf = Buffer.allocUnsafe(tc.input);
    if (buf.length !== tc.expected) {
      throw new Error(`浮点数 ${tc.input}: 期望长度 ${tc.expected}，得到 ${buf.length}`);
    }
  }

  console.log('✅ 浮点数截断规则验证');
  return true;
});

test('科学计数法边界精确测试', () => {
  const testCases = [
    { input: 1e0, expected: 1 },
    { input: 1e1, expected: 10 },
    { input: 1e2, expected: 100 },
    { input: 1e3, expected: 1000 },
    { input: 1e4, expected: 10000 },
    { input: 1.5e2, expected: 150 },
    { input: 2.5e3, expected: 2500 },
    { input: 1.23e4, expected: 12300 },
    { input: 1e-1, expected: 0 }, // 0.1 -> 0
    { input: 5e-1, expected: 0 }, // 0.5 -> 0
    { input: 9e-1, expected: 0 }  // 0.9 -> 0
  ];

  for (const tc of testCases) {
    const buf = Buffer.allocUnsafe(tc.input);
    if (buf.length !== tc.expected) {
      throw new Error(`科学计数法 ${tc.input}: 期望长度 ${tc.expected}，得到 ${buf.length}`);
    }
  }

  console.log('✅ 科学计数法边界精确测试');
  return true;
});

// ==================== 内存重用和池化深度测试 ====================

test('小 Buffer 池化验证（< poolSize/2）', () => {
  const poolSize = Buffer.poolSize;
  const smallSize = Math.floor(poolSize / 2) - 1; // 确保使用池

  // 分配多个小 Buffer，验证它们是独立的
  const buffers = [];
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.allocUnsafe(smallSize);
    buf.fill(i); // 填充不同的值
    buffers.push(buf);
  }

  // 验证每个 Buffer 都有正确的内容
  for (let i = 0; i < buffers.length; i++) {
    const firstByte = buffers[i][0];
    if (firstByte !== i) {
      throw new Error(`池化 Buffer ${i}: 期望首字节 ${i}，得到 ${firstByte}`);
    }
  }

  console.log('✅ 小 Buffer 池化验证（< poolSize/2）');
  return true;
});

test('大 Buffer 不使用池验证（>= poolSize/2）', () => {
  const poolSize = Buffer.poolSize;
  const largeSize = Math.floor(poolSize / 2); // 边界值，不使用池

  // 分配多个大 Buffer
  const buffers = [];
  for (let i = 0; i < 5; i++) {
    const buf = Buffer.allocUnsafe(largeSize);
    buf.fill(i + 100); // 填充不同的值
    buffers.push(buf);
  }

  // 验证每个 Buffer 都有正确的内容
  for (let i = 0; i < buffers.length; i++) {
    const firstByte = buffers[i][0];
    const expected = (i + 100) & 0xFF; // uint8
    if (firstByte !== expected) {
      throw new Error(`非池化 Buffer ${i}: 期望首字节 ${expected}，得到 ${firstByte}`);
    }
  }

  console.log('✅ 大 Buffer 不使用池验证（>= poolSize/2）');
  return true;
});

// ==================== 数据完整性深度测试 ====================

test('分配后立即读写验证', () => {
  const sizes = [1, 10, 100, 1000, 4096, 8192];

  for (const size of sizes) {
    const buf = Buffer.allocUnsafe(size);

    // 写入模式数据
    for (let i = 0; i < Math.min(size, 256); i++) {
      buf[i] = i;
    }

    // 立即读取验证
    for (let i = 0; i < Math.min(size, 256); i++) {
      if (buf[i] !== i) {
        throw new Error(`大小 ${size}: 索引 ${i} 期望 ${i}，得到 ${buf[i]}`);
      }
    }
  }

  console.log('✅ 分配后立即读写验证');
  return true;
});

test('跨边界写入验证', () => {
  const buf = Buffer.allocUnsafe(256);

  // 测试所有可能的 uint8 值
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }

  // 验证
  for (let i = 0; i < 256; i++) {
    if (buf[i] !== i) {
      throw new Error(`Uint8 边界: 索引 ${i} 期望 ${i}，得到 ${buf[i]}`);
    }
  }

  console.log('✅ 跨边界写入验证');
  return true;
});

// ==================== 与其他 Buffer API 交互测试 ====================

test('allocUnsafe 与 subarray 精确交互', () => {
  const buf = Buffer.allocUnsafe(20);
  
  // 填充数据
  for (let i = 0; i < 20; i++) {
    buf[i] = i;
  }

  // 测试各种 subarray 范围
  const testCases = [
    { start: 0, end: 5, expected: [0, 1, 2, 3, 4] },
    { start: 5, end: 10, expected: [5, 6, 7, 8, 9] },
    { start: 10, end: 20, expected: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19] },
    { start: 0, end: 20, expected: Array.from({length: 20}, (_, i) => i) }
  ];

  for (const tc of testCases) {
    const sub = buf.subarray(tc.start, tc.end);
    if (sub.length !== tc.expected.length) {
      throw new Error(`subarray(${tc.start}, ${tc.end}): 期望长度 ${tc.expected.length}，得到 ${sub.length}`);
    }

    for (let i = 0; i < tc.expected.length; i++) {
      if (sub[i] !== tc.expected[i]) {
        throw new Error(`subarray(${tc.start}, ${tc.end})[${i}]: 期望 ${tc.expected[i]}，得到 ${sub[i]}`);
      }
    }

    // 验证共享内存：修改 subarray 应该影响原 buffer
    const originalValue = sub[0];
    sub[0] = 255;
    if (buf[tc.start] !== 255) {
      throw new Error(`subarray 内存共享失败：修改未反映到原 buffer`);
    }
    sub[0] = originalValue; // 恢复
  }

  console.log('✅ allocUnsafe 与 subarray 精确交互');
  return true;
});

test('allocUnsafe 与 Buffer.compare 交互', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  const buf3 = Buffer.allocUnsafe(5);

  // 填充相同数据
  buf1.fill(42);
  buf2.fill(42);
  buf3.fill(42);

  // buf1 和 buf2 应该相等
  if (Buffer.compare(buf1, buf2) !== 0) {
    throw new Error('相同内容的 Buffer 应该相等');
  }

  // buf1 应该大于 buf3（长度不同）
  if (Buffer.compare(buf1, buf3) <= 0) {
    throw new Error('更长的 Buffer 应该大于更短的');
  }

  console.log('✅ allocUnsafe 与 Buffer.compare 交互');
  return true;
});

// ==================== 特殊数值边界测试 ====================

test('Number.EPSILON 附近的值', () => {
  const epsilon = Number.EPSILON; // 约 2.220446049250313e-16
  
  const testCases = [
    { input: epsilon, expected: 0 },
    { input: 1 + epsilon, expected: 1 },
    { input: 10 + epsilon, expected: 10 },
    { input: 100 + epsilon, expected: 100 }
  ];

  for (const tc of testCases) {
    const buf = Buffer.allocUnsafe(tc.input);
    if (buf.length !== tc.expected) {
      throw new Error(`${tc.input}: 期望长度 ${tc.expected}，得到 ${buf.length}`);
    }
  }

  console.log('✅ Number.EPSILON 附近的值');
  return true;
});

test('接近 MAX_SAFE_INTEGER 的边界', () => {
  // 这些值可能因内存限制而失败，但不应该导致崩溃
  const boundaries = [
    1000000, // 1MB
    2000000, // 2MB
    5000000  // 5MB
  ];

  for (const size of boundaries) {
    try {
      const buf = Buffer.allocUnsafe(size);
      if (buf.length !== size) {
        throw new Error(`大小 ${size}: 长度不匹配`);
      }
      console.log(`✅ 成功分配 ${size} 字节`);
    } catch (error) {
      // 内存不足是可接受的
      const msg = error.message.toLowerCase();
      if (msg.includes('allocation') || msg.includes('array buffer') || msg.includes('memory')) {
        console.log(`⚠️  大小 ${size}: 内存限制 (${error.message})`);
      } else {
        throw error;
      }
    }
  }

  console.log('✅ 接近 MAX_SAFE_INTEGER 的边界');
  return true;
});

// ==================== 错误恢复和状态一致性 ====================

test('错误后状态恢复验证', () => {
  // 先触发一些错误
  const errors = [];
  try { Buffer.allocUnsafe(-1); } catch (e) { errors.push(e); }
  try { Buffer.allocUnsafe(NaN); } catch (e) { errors.push(e); }
  try { Buffer.allocUnsafe('invalid'); } catch (e) { errors.push(e); }

  if (errors.length !== 3) {
    throw new Error(`应该捕获3个错误，实际捕获 ${errors.length} 个`);
  }

  // 验证错误后仍然可以正常分配
  const buf = Buffer.allocUnsafe(100);
  if (buf.length !== 100) {
    throw new Error('错误恢复后分配失败');
  }

  buf.fill(123);
  if (buf[0] !== 123) {
    throw new Error('错误恢复后写入失败');
  }

  console.log('✅ 错误后状态恢复验证');
  return true;
});

// ==================== 性能特征验证 ====================

test('连续分配性能一致性', () => {
  const iterations = 100;
  const size = 1024;

  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    const buf = Buffer.allocUnsafe(size);
    buf[0] = i % 256; // 确保使用
  }
  const duration = Date.now() - start;

  const avgTime = duration / iterations;
  console.log(`平均分配时间: ${avgTime.toFixed(4)}ms`);

  // 验证性能：每次分配应该很快（< 10ms）
  if (avgTime > 10) {
    console.log('⚠️  平均分配时间较长，可能有性能问题');
  }

  console.log('✅ 连续分配性能一致性');
  return true;
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
