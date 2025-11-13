// SlowBuffer - API Removal Tests
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

// API 移除核心验证
test('SlowBuffer 在 v25.0.0 中已被完全移除', () => {
  let SlowBuffer;
  try {
    SlowBuffer = require('buffer').SlowBuffer;
  } catch (e) {
    SlowBuffer = undefined;
  }
  return SlowBuffer === undefined;
});

test('通过解构无法获取 SlowBuffer', () => {
  try {
    const { SlowBuffer } = require('buffer');
    return SlowBuffer === undefined;
  } catch (e) {
    return true;
  }
});

test('Buffer 模块导出中不包含 SlowBuffer', () => {
  const bufferModule = require('buffer');
  return !bufferModule.hasOwnProperty('SlowBuffer');
});

test('遍历 Buffer 模块属性找不到 SlowBuffer', () => {
  const bufferModule = require('buffer');
  const keys = Object.keys(bufferModule);
  return !keys.includes('SlowBuffer');
});

test('使用 in 操作符检测 SlowBuffer 返回 false', () => {
  const bufferModule = require('buffer');
  return !('SlowBuffer' in bufferModule);
});

// 替代方案可用性验证
test('Buffer.allocUnsafeSlow 方法存在', () => {
  return typeof Buffer.allocUnsafeSlow === 'function';
});

test('Buffer.allocUnsafeSlow 是推荐的替代方案', () => {
  return Buffer.allocUnsafeSlow !== undefined &&
         typeof Buffer.allocUnsafeSlow === 'function';
});

test('Buffer.allocUnsafe 方法依然存在（另一种替代）', () => {
  return typeof Buffer.allocUnsafe === 'function';
});

test('Buffer.alloc 方法依然存在（安全替代）', () => {
  return typeof Buffer.alloc === 'function';
});

// 确保其他 Buffer API 未受影响
test('Buffer.from 方法正常工作', () => {
  const buf = Buffer.from('test');
  return buf.length === 4 && buf.toString() === 'test';
});

test('Buffer.alloc 方法正常工作', () => {
  const buf = Buffer.alloc(10);
  return buf.length === 10 && buf[0] === 0;
});

test('Buffer.allocUnsafe 方法正常工作', () => {
  const buf = Buffer.allocUnsafe(10);
  return buf.length === 10 && buf instanceof Buffer;
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
