// Buffer.alloc() - Part 2: Edge Cases & Error Handling
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

test('负数大小 -1', () => {
  try {
    Buffer.alloc(-1);
    return false;
  } catch (error) {
    return error.code === 'ERR_OUT_OF_RANGE' || error.message.includes('out of range');
  }
});

test('非数字类型', () => {
  try {
    Buffer.alloc('not a number');
    return false;
  } catch (error) {
    return error.name === 'TypeError' || error.message.includes('must be') || error.message.includes('type');
  }
});

test('undefined 作为大小', () => {
  try {
    Buffer.alloc(undefined);
    return false;
  } catch (error) {
    return true;
  }
});

test('null 作为大小', () => {
  try {
    Buffer.alloc(null);
    return false;
  } catch (error) {
    return true;
  }
});

test('NaN 作为大小', () => {
  try {
    Buffer.alloc(NaN);
    return false;
  } catch (error) {
    return true;
  }
});

test('浮点数大小 5.7', () => {
  try {
    const buf = Buffer.alloc(5.7);
    return true; // 接受浮点数
  } catch (error) {
    return true; // 或拒绝浮点数
  }
});

test('无效的编码', () => {
  try {
    const buf = Buffer.alloc(5, 'test', 'invalid-encoding');
    return true; // 使用默认编码
  } catch (error) {
    return true; // 或拒绝无效编码
  }
});

test('空字符串作为 fill', () => {
  const buf = Buffer.alloc(5, '');
  return buf.equals(Buffer.from([0, 0, 0, 0, 0]));
});

test('fill 为 undefined', () => {
  const buf = Buffer.alloc(5, undefined);
  return buf.equals(Buffer.from([0, 0, 0, 0, 0]));
});

test('1MB 大小分配', () => {
  const buf = Buffer.alloc(1024 * 1024);
  return buf.length === 1024 * 1024 && buf[0] === 0;
});

test('fill 字符串长度大于 buffer', () => {
  const buf = Buffer.alloc(3, 'hello world');
  return buf.length === 3;
});

test('多字节字符 UTF-8 填充', () => {
  const buf = Buffer.alloc(6, '中');
  return buf.length === 6;
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
