// SlowBuffer - API Removal Test (Removed in Node.js v25.0.0)
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

// 检查 SlowBuffer 是否已被移除
let SlowBuffer;
try {
  SlowBuffer = require('buffer').SlowBuffer;
} catch (e) {
  SlowBuffer = undefined;
}

// API 移除测试
test('SlowBuffer 在 v25.0.0 中已被移除', () => {
  return SlowBuffer === undefined;
});

test('Buffer.allocUnsafeSlow 是推荐的替代方案', () => {
  return typeof Buffer.allocUnsafeSlow === 'function';
});

// 使用 Buffer.allocUnsafeSlow 作为替代方案的测试
test('Buffer.allocUnsafeSlow 可以创建 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer && buf.length === 10;
});

test('Buffer.allocUnsafeSlow 不初始化内存', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  // 内容不确定，但应该是有效的 Buffer
  return buf instanceof Buffer;
});

test('Buffer.allocUnsafeSlow 支持各种大小', () => {
  const buf0 = Buffer.allocUnsafeSlow(0);
  const buf1 = Buffer.allocUnsafeSlow(1);
  const buf100 = Buffer.allocUnsafeSlow(100);
  return buf0.length === 0 && buf1.length === 1 && buf100.length === 100;
});

test('Buffer.allocUnsafeSlow 可以读写数据', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 65;
  buf[1] = 66;
  buf[2] = 67;
  return buf[0] === 65 && buf[1] === 66 && buf[2] === 67;
});

test('Buffer.allocUnsafeSlow 支持 Buffer 方法', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('hello');
  return buf.toString('utf8', 0, 5) === 'hello';
});

// 文档说明
test('SlowBuffer API 已在 v25.0.0 中移除', () => {
  // 这是一个破坏性变更
  // 所有使用 SlowBuffer 的代码应该迁移到 Buffer.allocUnsafeSlow
  return SlowBuffer === undefined;
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      note: 'SlowBuffer is deprecated. Use Buffer.allocUnsafeSlow() instead.'
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
