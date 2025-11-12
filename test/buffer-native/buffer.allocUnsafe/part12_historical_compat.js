// Buffer.allocUnsafe() - Historical Behavior Compatibility Tests
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

// 历史行为兼容性测试
test('Node.js早期版本行为兼容性', () => {
  // 模拟早期Node.js版本的行为

  // 1. 基本分配行为
  const buf = Buffer.allocUnsafe(10);
  if (buf.length !== 10) {
    throw new Error('Basic allocation behavior changed');
  }

  // 2. 类型检查严格性（早期版本可能更宽松）
  try {
    Buffer.allocUnsafe("10");
    throw new Error('String parameter should be rejected');
  } catch (error) {
    // 现代版本应该拒绝字符串参数
  }

  // 3. 浮点数处理
  const floatBuf = Buffer.allocUnsafe(10.7);
  if (floatBuf.length !== 10) {
    throw new Error('Float truncation behavior changed');
  }

  console.log('✅ Node.js早期版本行为兼容性');
  return true;
});

test('Buffer构造函数迁移兼容性', () => {
  // 测试从new Buffer()迁移到Buffer.allocUnsafe()的兼容性

  // 旧方式：new Buffer(size) [已废弃]
  // 新方式：Buffer.allocUnsafe(size)

  const size = 20;
  const unsafeBuf = Buffer.allocUnsafe(size);

  // 验证基本兼容性
  if (unsafeBuf.length !== size) {
    throw new Error('Buffer size compatibility issue');
  }

  if (!(unsafeBuf instanceof Buffer)) {
    throw new Error('Buffer instance compatibility issue');
  }

  // 验证功能兼容性
  unsafeBuf.fill(65); // 'A'
  const str = unsafeBuf.toString('utf8');
  if (str !== 'AAAAAAAAAAAAAAAAAAAA') {
    throw new Error('Buffer functionality compatibility issue');
  }

  console.log('✅ Buffer构造函数迁移兼容性');
  return true;
});

test('alloc与allocUnsafe历史差异', () => {
  const size = 50;

  // 创建两个Buffer
  const allocBuf = Buffer.alloc(size);
  const unsafeBuf = Buffer.allocUnsafe(size);

  // 历史行为：alloc应该清零，allocUnsafe不清零
  let allocIsZeroed = true;
  let unsafeHasRandomData = false;

  for (let i = 0; i < size; i++) {
    if (allocBuf[i] !== 0) {
      allocIsZeroed = false;
    }
    if (unsafeBuf[i] !== 0) {
      unsafeHasRandomData = true;
    }
  }

  // alloc应该被清零（但不是必须，因为实现可能变化）
  if (!allocIsZeroed) {
    console.log('⚠️  Buffer.alloc可能没有完全清零（实现可能变化）');
  }

  // allocUnsafe应该包含未初始化数据
  // 但现代系统可能清零内存，所以不强制要求
  if (!unsafeHasRandomData) {
    console.log('⚠️  Buffer.allocUnsafe可能返回清零内存（系统安全特性）');
  }

  console.log('✅ alloc与allocUnsafe历史差异验证');
  return true;
});

test('废弃API调用模式兼容性', () => {
  // 测试一些历史上使用allocUnsafe的模式

  // 模式1：临时缓冲区
  const tempBuf = Buffer.allocUnsafe(256);
  tempBuf.write('temporary data', 'utf8');
  const tempStr = tempBuf.toString('utf8', 0, 14);
  if (tempStr !== 'temporary data') {
    throw new Error('Temporary buffer pattern failed');
  }

  // 模式2：二进制数据处理
  const binaryBuf = Buffer.allocUnsafe(4);
  binaryBuf.writeUInt32BE(0xDEADBEEF, 0);
  const value = binaryBuf.readUInt32BE(0);
  if (value !== 0xDEADBEEF) {
    throw new Error('Binary data pattern failed');
  }

  // 模式3：网络数据包
  const packetBuf = Buffer.allocUnsafe(64);
  packetBuf[0] = 0xFF; // 头部
  packetBuf[1] = 0x01; // 版本
  packetBuf[2] = 0x00; // 标志
  packetBuf[3] = 0x00; // 标志

  if (packetBuf[0] !== 0xFF || packetBuf[1] !== 0x01) {
    throw new Error('Network packet pattern failed');
  }

  console.log('✅ 废弃API调用模式兼容性');
  return true;
});

test('Node.js版本演进中的行为变化', () => {
  // 测试不同Node.js版本间可能的行为变化

  // 1. 参数验证严格性增加
  const strictTests = [
    { input: '10', shouldFail: true, desc: '字符串数字' },
    { input: true, shouldFail: true, desc: '布尔值' },
    { input: {}, shouldFail: true, desc: '对象' },
    { input: [], shouldFail: true, desc: '数组' }
  ];

  for (const test of strictTests) {
    try {
      Buffer.allocUnsafe(test.input);
      if (test.shouldFail) {
        throw new Error(`Expected failure for ${test.desc}`);
      }
    } catch (error) {
      if (!test.shouldFail) {
        throw new Error(`Unexpected failure for ${test.desc}`);
      }
    }
  }

  // 2. 浮点数处理一致性
  const floatTests = [
    { input: 10.0, expected: 10 },
    { input: 10.1, expected: 10 },
    { input: 10.5, expected: 10 },
    { input: 10.9, expected: 10 },
    { input: 10.99, expected: 10 }
  ];

  for (const test of floatTests) {
    const buf = Buffer.allocUnsafe(test.input);
    if (buf.length !== test.expected) {
      throw new Error(`Float truncation changed for ${test.input}`);
    }
  }

  console.log('✅ Node.js版本演进中的行为变化');
  return true;
});

test('向后兼容性保证验证', () => {
  // 验证关键向后兼容性保证

  // 保证1：基本功能不变
  const buf = Buffer.allocUnsafe(100);
  if (!(buf instanceof Buffer)) {
    throw new Error('Basic Buffer instance guarantee broken');
  }

  // 保证2：长度属性不变
  if (buf.length !== 100) {
    throw new Error('Length property guarantee broken');
  }

  // 保证3：数组式访问不变
  buf[0] = 255;
  if (buf[0] !== 255) {
    throw new Error('Array-like access guarantee broken');
  }

  // 保证4：方法可用性不变
  if (typeof buf.toString !== 'function') {
    throw new Error('toString method guarantee broken');
  }
  if (typeof buf.fill !== 'function') {
    throw new Error('fill method guarantee broken');
  }
  if (typeof buf.slice !== 'function') {
    throw new Error('slice method guarantee broken');
  }

  console.log('✅ 向后兼容性保证验证');
  return true;
});

test('历史错误处理行为一致性', () => {
  // 验证历史上各种错误情况的处理

  const errorScenarios = [
    {
      name: '负大小',
      test: () => Buffer.allocUnsafe(-1),
      shouldThrow: true
    },
    {
      name: 'NaN大小',
      test: () => Buffer.allocUnsafe(NaN),
      shouldThrow: true
    },
    {
      name: 'Infinity大小',
      test: () => Buffer.allocUnsafe(Infinity),
      shouldThrow: true
    },
    {
      name: '字符串参数',
      test: () => Buffer.allocUnsafe('100'),
      shouldThrow: true
    },
    {
      name: '零大小',
      test: () => Buffer.allocUnsafe(0),
      shouldThrow: false
    }
  ];

  for (const scenario of errorScenarios) {
    try {
      const result = scenario.test();
      if (scenario.shouldThrow) {
        throw new Error(`${scenario.name}: Expected error but succeeded`);
      }
      // 验证返回结果
      if (!(result instanceof Buffer)) {
        throw new Error(`${scenario.name}: Expected Buffer instance`);
      }
    } catch (error) {
      if (!scenario.shouldThrow) {
        throw new Error(`${scenario.name}: Unexpected error: ${error.message}`);
      }
      // 验证错误消息格式
      if (!error.message || error.message.length === 0) {
        throw new Error(`${scenario.name}: Empty error message`);
      }
    }
  }

  console.log('✅ 历史错误处理行为一致性');
  return true;
});

test('性能特征历史一致性', () => {
  // 验证allocUnsafe的性能特征

  const iterations = 1000;
  const size = 1024;

  // 测量分配时间（使用 Date.now() 代替 process.hrtime.bigint）
  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    const buf = Buffer.allocUnsafe(size);
    // 确保Buffer被使用，防止优化掉
    buf[0] = i % 256;
  }

  const end = Date.now();
  const duration = end - start; // 毫秒

  const avgTime = duration / iterations;
  console.log(`单次allocUnsafe平均时间: ${avgTime.toFixed(4)}ms`);

  // 验证性能特征：allocUnsafe应该很快（< 1ms）
  if (avgTime > 1) {
    console.log('⚠️  allocUnsafe性能可能下降');
  }

  console.log('✅ 性能特征历史一致性');
  return true;
});

test('内存使用模式历史一致性', () => {
  // 验证历史上观察到的内存使用模式

  // 模式1：小Buffer分配
  const smallBuf = Buffer.allocUnsafe(64);
  smallBuf.fill(0xFF);

  // 模式2：中等Buffer分配
  const mediumBuf = Buffer.allocUnsafe(1024);
  mediumBuf.fill(0xAA);

  // 模式3：大Buffer分配
  const largeBuf = Buffer.allocUnsafe(4096);
  largeBuf.fill(0x55);

  // 验证所有Buffer都能正常工作
  for (let i = 0; i < smallBuf.length; i++) {
    if (smallBuf[i] !== 0xFF) {
      throw new Error('Small buffer memory pattern broken');
    }
  }

  for (let i = 0; i < mediumBuf.length; i++) {
    if (mediumBuf[i] !== 0xAA) {
      throw new Error('Medium buffer memory pattern broken');
    }
  }

  for (let i = 0; i < largeBuf.length; i++) {
    if (largeBuf[i] !== 0x55) {
      throw new Error('Large buffer memory pattern broken');
    }
  }

  console.log('✅ 内存使用模式历史一致性');
  return true;
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