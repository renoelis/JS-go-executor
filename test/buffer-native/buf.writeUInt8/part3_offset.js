// buf.writeUInt8() - offset 参数测试
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

// 合法 offset
test('offset 为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(123, 0);
  return buf[0] === 123;
});

test('offset 为 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(123, 1);
  return buf[1] === 123 && buf[0] === 0;
});

test('offset 为最后位置', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(123, 3);
  return buf[3] === 123;
});

test('offset 省略时默认 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(123);
  return buf[0] === 123;
});

test('offset 为 undefined 时默认 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(123, undefined);
  return buf[0] === 123;
});

// 越界 offset
test('offset 等于 buffer 长度', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, 4);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('offset 超出 buffer 长度', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, 10);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('offset 为负数', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('offset 为负数 -10', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, -10);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

// 非法 offset 类型
test('offset 为 NaN', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, NaN);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer') || e.message.includes('finite');
  }
});

test('offset 为 Infinity', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, Infinity);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer') || e.message.includes('finite');
  }
});

test('offset 为字符串', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, "1");
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('number');
  }
});

test('offset 为 null', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, null);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('number');
  }
});

test('offset 为对象', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, {});
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('number');
  }
});

test('offset 为浮点数', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(123, 1.5);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer');
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
