// buf.writeInt8() - Error Cases Tests
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

// offset 越界错误
test('offset 为负数抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('offset 等于 buffer 长度抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, 4);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('offset 大于 buffer 长度抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, 10);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('空 Buffer 任意 offset 均越界', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeInt8(10, 0);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// value 超出范围抛出错误
test('value 大于 127 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(128, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 255 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(255, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 256 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(256, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 小于 -128 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(-129, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 -256 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(-256, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

// 非法参数类型
test('offset 为 NaN 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, NaN);
    return false;
  } catch (e) {
    return true;
  }
});

test('offset 为 Infinity 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, Infinity);
    return false;
  } catch (e) {
    return true;
  }
});

test('offset 为 -Infinity 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, -Infinity);
    return false;
  } catch (e) {
    return true;
  }
});

test('value 为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(NaN, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 Infinity 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(Infinity, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range') || e.message.includes('finite');
  }
});

test('value 为 -Infinity 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(-Infinity, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range') || e.message.includes('finite');
  }
});

// undefined 和 null
test('offset 为 undefined 默认为 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(10, undefined);
  return result === 1 && buf[0] === 10;
});

test('offset 为 null 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, null);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('type');
  }
});

test('value 为 undefined 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(undefined, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 null 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(null, 0);
  return result === 1 && buf[0] === 0;
});

// 缺少参数
test('缺少 value 和 offset 参数写入 0 到位置 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8();
  return result === 1 && buf[0] === 0;
});

test('缺少 offset 参数默认为 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(10);
  return result === 1 && buf[0] === 10;
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
