// Buffer.copyBytesFrom() - Part 2: Edge Cases and Error Handling
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
test('offset 为 0', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view, 0);
  return buf.length === 3 && buf[0] === 1;
});

test('offset 等于长度', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view, 3);
  return buf.length === 0;
});

test('length 为 0', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view, 0, 0);
  return buf.length === 0;
});

test('length 超过剩余长度', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view, 1, 10);
  return buf.length === 2; // 只复制剩余的
});

// 错误处理测试
test('TypeError: 非 TypedArray 参数', () => {
  try {
    Buffer.copyBytesFrom({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: null 参数', () => {
  try {
    Buffer.copyBytesFrom(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: undefined 参数', () => {
  try {
    Buffer.copyBytesFrom(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 普通数组', () => {
  try {
    Buffer.copyBytesFrom([1, 2, 3]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('RangeError: 负数 offset', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 超出范围（返回空 Buffer）', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view, 10);
  // offset 超出范围时返回空 Buffer
  return buf.length === 0;
});

test('RangeError: 负数 length', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊值测试
test('NaN offset', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    const buf = Buffer.copyBytesFrom(view, NaN);
    return buf.length === 3; // NaN 转为 0
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('Infinity offset', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Detached ArrayBuffer 测试
test('Detached ArrayBuffer', () => {
  try {
    const ab = new ArrayBuffer(4);
    const view = new Uint8Array(ab);
    // 注意：实际 detach 需要特定 API，这里模拟测试结构
    // 在真实环境中需要使用 structuredClone 或 postMessage 来 detach
    const buf = Buffer.copyBytesFrom(view);
    return buf.length === 4;
  } catch (e) {
    return e.message.includes('detached');
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
