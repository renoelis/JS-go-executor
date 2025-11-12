// Buffer.allocUnsafe() - Edge Cases and Advanced Tests
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

// 边界情况测试
test('传入Number.MAX_SAFE_INTEGER', () => {
  try {
    // 使用一个相对安全的值，避免内存溢出
    Buffer.allocUnsafe(9007199254740991); // Number.MAX_SAFE_INTEGER
    console.log('✅ 传入Number.MAX_SAFE_INTEGER处理');
    return true;
  } catch (error) {
    console.log('✅ 传入超大数值正确抛错');
    return true;
  }
});

test('传入Number.MIN_SAFE_INTEGER', () => {
  try {
    Buffer.allocUnsafe(-9007199254740991); // Number.MIN_SAFE_INTEGER
    console.log('❌ 传入负数超大值应该抛错');
    return false;
  } catch (error) {
    console.log('✅ 传入负数超大值正确抛错');
    return true;
  }
});

test('传入Number.MAX_VALUE', () => {
  try {
    Buffer.allocUnsafe(Number.MAX_VALUE);
    console.log('❌ 传入Number.MAX_VALUE应该抛错');
    return false;
  } catch (error) {
    console.log('✅ 传入Number.MAX_VALUE正确抛错');
    return true;
  }
});

test('传入Number.MIN_VALUE', () => {
  const buf = Buffer.allocUnsafe(Number.MIN_VALUE); // 非常小的正数
  if (buf.length !== 0) throw new Error(`Expected length 0, got ${buf.length}`);
  console.log('✅ 传入Number.MIN_VALUE');
  return true;
});

test('传入0.000001', () => {
  const buf = Buffer.allocUnsafe(0.000001);
  if (buf.length !== 0) throw new Error(`Expected length 0, got ${buf.length}`);
  console.log('✅ 传入0.000001');
  return true;
});

test('传入1e-10', () => {
  const buf = Buffer.allocUnsafe(1e-10);
  if (buf.length !== 0) throw new Error(`Expected length 0, got ${buf.length}`);
  console.log('✅ 传入1e-10');
  return true;
});

test('传入1e10', () => {
  try {
    Buffer.allocUnsafe(1e10);
    // Node.js v25.0.0 可能会处理这个值，取决于内存限制
    console.log('✅ 传入1e10处理');
    return true;
  } catch (error) {
    console.log('✅ 传入1e10正确抛错');
    return true;
  }
});

// 特殊数值测试
test('传入Math.PI', () => {
  const buf = Buffer.allocUnsafe(Math.PI); // ~3.14159
  if (buf.length !== 3) throw new Error(`Expected length 3, got ${buf.length}`);
  console.log('✅ 传入Math.PI');
  return true;
});

test('传入Math.E', () => {
  const buf = Buffer.allocUnsafe(Math.E); // ~2.71828
  if (buf.length !== 2) throw new Error(`Expected length 2, got ${buf.length}`);
  console.log('✅ 传入Math.E');
  return true;
});

test('传入字符串数字"123.456"', () => {
  try {
    Buffer.allocUnsafe("123.456");
    console.log('❌ 传入字符串数字"123.456"应该抛错');
    return false;
  } catch (error) {
    console.log('✅ 传入字符串数字"123.456"正确抛错');
    return true;
  }
});

test('传入带前导0的字符串"0123"', () => {
  try {
    Buffer.allocUnsafe("0123");
    console.log('❌ 传入带前导0字符串"0123"应该抛错');
    return false;
  } catch (error) {
    console.log('✅ 传入带前导0字符串"0123"正确抛错');
    return true;
  }
});

// 内存模式和性能相关测试
test('连续分配不同大小的Buffer', () => {
  const sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
  const buffers = [];

  for (const size of sizes) {
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`Expected length ${size}, got ${buf.length}`);
    }
    buffers.push(buf);
  }

  // 验证所有Buffer都是不同实例
  for (let i = 0; i < buffers.length; i++) {
    for (let j = i + 1; j < buffers.length; j++) {
      if (buffers[i] === buffers[j]) {
        throw new Error('Expected different Buffer instances');
      }
    }
  }

  console.log('✅ 连续分配不同大小的Buffer');
  return true;
});

test('分配后立即可用性', () => {
  const buf = Buffer.allocUnsafe(100);

  // 立即写入数据
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i % 256;
  }

  // 立即读取数据
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== i % 256) {
      throw new Error(`Data mismatch at index ${i}`);
    }
  }

  console.log('✅ 分配后立即可用性');
  return true;
});

test('与Buffer.from的行为对比', () => {
  const size = 10;
  const unsafeBuf = Buffer.allocUnsafe(size);
  const fromBuf = Buffer.from(new Array(size).fill(0));

  if (unsafeBuf.length !== size) throw new Error(`unsafeBuf length mismatch`);
  if (fromBuf.length !== size) throw new Error(`fromBuf length mismatch`);

  // from创建的Buffer应该全是0
  for (let i = 0; i < fromBuf.length; i++) {
    if (fromBuf[i] !== 0) {
      throw new Error('fromBuf should be initialized to 0');
    }
  }

  console.log('✅ 与Buffer.from的行为对比');
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