// buf.writeUInt8() - 错误路径和类型转换测试
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

// value 类型转换 - Node.js 会做强制转换
test('value 为字符串 "123" 转换为 123', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8("123", 0);
  return buf[0] === 123;
});

test('value 为字符串 "0" 转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8("0", 0);
  return buf[0] === 0;
});

test('value 为字符串 "255" 转换为 255', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8("255", 0);
  return buf[0] === 255;
});

test('value 为非数字字符串抛错或转为NaN', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8("abc", 0);
    // 如果不抛错，检查是否转为0（NaN -> 0）
    return buf[0] === 0;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 null 转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(null, 0);
  return buf[0] === 0;
});

test('value 为 undefined 转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(undefined, 0);
  return buf[0] === 0;
});

test('value 为空对象 {} 转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8({}, 0);
  return buf[0] === 0;
});

test('value 为数组 [123] 转换为 123', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8([123], 0);
  return buf[0] === 123;
});

test('value 为空数组 [] 转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8([], 0);
  return buf[0] === 0;
});

test('value 为带 valueOf 的对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8({ valueOf: () => 100 }, 0);
  return buf[0] === 100;
});

test('value 为 NaN 转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(NaN, 0);
  return buf[0] === 0;
});

test('value 为 Infinity 超出范围抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(Infinity, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 -Infinity 超出范围抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(-Infinity, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 true 转换为 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(true, 0);
  return buf[0] === 1;
});

test('value 为 false 转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(false, 0);
  return buf[0] === 0;
});

// 空 Buffer 写入
test('空 Buffer 写入抛错', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeUInt8(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// this 不是 Buffer/Uint8Array
test('普通对象调用 writeUInt8 抛错', () => {
  const obj = {};
  try {
    Buffer.prototype.writeUInt8.call(obj, 123, 0);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('Buffer') || e.message.includes('Uint8Array');
  }
});

test('null 调用 writeUInt8 抛错', () => {
  try {
    Buffer.prototype.writeUInt8.call(null, 123, 0);
    return false;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('Uint8Array') || e.message.includes('this') || e.message.includes('Cannot');
  }
});

test('undefined 调用 writeUInt8 抛错', () => {
  try {
    Buffer.prototype.writeUInt8.call(undefined, 123, 0);
    return false;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('Uint8Array') || e.message.includes('this') || e.message.includes('Cannot');
  }
});

// 缺少参数 - value 缺失会转为 0
test('缺少 value 参数转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8();
  return buf[0] === 0;
});

// 字符串超出范围
test('字符串 "256" 超出范围抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8("256", 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('字符串 "-1" 负数抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8("-1", 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
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
