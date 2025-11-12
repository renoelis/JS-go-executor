// buf.writeUInt8() - 值范围测试
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

// 合法范围内的值
test('写入 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0, 0);
  return buf[0] === 0;
});

test('写入 255', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(255, 0);
  return buf[0] === 255;
});

test('写入 1', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(1, 0);
  return buf[0] === 1;
});

test('写入 127', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(127, 0);
  return buf[0] === 127;
});

test('写入 128', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(128, 0);
  return buf[0] === 128;
});

test('写入 254', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(254, 0);
  return buf[0] === 254;
});

// 超出范围的值 - 应该抛出错误或截断
test('写入 256 超出最大值', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(256, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('写入 -1 负数', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(-1, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('写入 -128 负数', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(-128, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('写入 1000 远超范围', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(1000, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('写入 0xFFFF 远超范围', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(0xFFFF, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

// 浮点数处理 - 合法范围内会被截断
test('写入浮点数 123.5 被截断为 123', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(123.5, 0);
  return buf[0] === 123;
});

test('写入浮点数 0.9 被截断为 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0.9, 0);
  return buf[0] === 0;
});

test('写入浮点数 255.1 超出范围抛错', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(255.1, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') && e.message.includes('255.1');
  }
});

test('写入浮点数 254.9 被截断为 254', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(254.9, 0);
  return buf[0] === 254;
});

test('写入浮点数 1.1 被截断为 1', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(1.1, 0);
  return buf[0] === 1;
});

test('写入浮点数 127.7 被截断为 127', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(127.7, 0);
  return buf[0] === 127;
});

test('写入浮点数 -0.5 超出范围抛错', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(-0.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
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
