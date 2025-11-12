// buf.writeInt8() - Deep Boundary Analysis Tests
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

// offset 参数的符号零和精确整数浮点数
test('offset 为 -0 等同于 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(42, -0);
  return result === 1 && buf[0] === 42;
});

test('offset 为 +0 等同于 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(42, +0);
  return result === 1 && buf[0] === 42;
});

test('offset 为 0.0（精确整数浮点数）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(42, 0.0);
  return result === 1 && buf[0] === 42;
});

test('offset 为 1.0（精确整数浮点数）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(42, 1.0);
  return result === 2 && buf[1] === 42;
});

test('offset 为 2.0（精确整数浮点数）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(42, 2.0);
  return result === 3 && buf[2] === 42;
});

// value 的精确边界浮点数
test('value 为 127.0（精确整数浮点数）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(127.0, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 -128.0（精确整数浮点数）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-128.0, 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 127.000001 超出范围抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(127.000001, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 -128.000001 超出范围抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(-128.000001, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

// 负数浮点数的截断行为
test('value 为 -0.1 截断为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-0.1, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 -0.4 截断为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-0.4, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 -0.6 截断为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-0.6, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 -1.1 截断为 -1', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-1.1, 0);
  return result === 1 && buf[0] === 0xFF;
});

test('value 为 -1.5 截断为 -1', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-1.5, 0);
  return result === 1 && buf[0] === 0xFF;
});

test('value 为 -1.9 截断为 -1', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-1.9, 0);
  return result === 1 && buf[0] === 0xFF;
});

// 整数边界附近浮点数
test('value 为 126.4 截断为 126', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(126.4, 0);
  return result === 1 && buf[0] === 126;
});

test('value 为 126.5 截断为 126', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(126.5, 0);
  return result === 1 && buf[0] === 126;
});

test('value 为 126.6 截断为 126', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(126.6, 0);
  return result === 1 && buf[0] === 126;
});

test('value 为 -127.4 截断为 -127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-127.4, 0);
  return result === 1 && buf[0] === (256 - 127);
});

test('value 为 -127.5 截断为 -127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-127.5, 0);
  return result === 1 && buf[0] === (256 - 127);
});

test('value 为 -127.6 截断为 -127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-127.6, 0);
  return result === 1 && buf[0] === (256 - 127);
});

// 更多 value 超限整数
test('value 为 129 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(129, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 200 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(200, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 -130 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(-130, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 -200 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(-200, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 -255 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(-255, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

// 特殊字符串
test('value 为字符串 "127.5" 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8('127.5', 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为字符串 "-128.5" 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8('-128.5', 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为字符串 "127abc" 转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('127abc', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为字符串 "abc127" 转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('abc127', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为字符串 "+127" 正常写入', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('+127', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为字符串 "-0" 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('-0', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为字符串 "1e2" 写入 100', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('1e2', 0);
  return result === 1 && buf[0] === 100;
});

test('value 为字符串 "0o177"（八进制 127）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('0o177', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为字符串 "0b01111111"（二进制 127）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('0b01111111', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为字符串 "NaN" 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('NaN', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为字符串 "Infinity" 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8('Infinity', 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range') || e.message.includes('finite');
  }
});

test('value 为字符串 "-Infinity" 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8('-Infinity', 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range') || e.message.includes('finite');
  }
});

// 特殊对象
test('value 为 Date(100) 对象', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(new Date(100), 0);
  return result === 1 && buf[0] === 100;
});

test('value 为 RegExp 对象转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(/test/, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为循环引用对象转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const obj = { a: 1 };
  obj.self = obj;
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 0;
});

// 数组特殊情况
test('value 为数组 [-128]', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8([-128], 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为数组 [127, 0] 转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8([127, 0], 0);
  return result === 1 && buf[0] === 0;
});

test('value 为数组 [null] 转换为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8([null], 0);
  return result === 1 && buf[0] === 0;
});

test('value 为数组 [undefined] 转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8([undefined], 0);
  return result === 1 && buf[0] === 0;
});

test('value 为数组 [NaN] 转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8([NaN], 0);
  return result === 1 && buf[0] === 0;
});

// 极限数值常量
test('value 为 Number.MIN_VALUE 截断为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Number.MIN_VALUE, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 Number.MAX_VALUE 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(Number.MAX_VALUE, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 Number.MIN_SAFE_INTEGER 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(Number.MIN_SAFE_INTEGER, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 Number.MAX_SAFE_INTEGER 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(Number.MAX_SAFE_INTEGER, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

// subarray 边界
test('subarray 在边界位置写入', () => {
  const parent = Buffer.alloc(10);
  const sub = parent.subarray(2, 5);
  sub.writeInt8(99, 0);
  return sub[0] === 99 && parent[2] === 99;
});

test('subarray 在最后位置写入', () => {
  const parent = Buffer.alloc(10);
  const sub = parent.subarray(2, 5);
  sub.writeInt8(88, 2);
  return sub[2] === 88 && parent[4] === 88;
});

test('subarray 越界写入抛出错误', () => {
  const parent = Buffer.alloc(10);
  const sub = parent.subarray(2, 5);
  try {
    sub.writeInt8(77, 3);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// this 绑定测试
test('使用 call 绑定正确的 this', () => {
  const buf = Buffer.alloc(4);
  const writeInt8 = buf.writeInt8;
  writeInt8.call(buf, 42, 0);
  return buf[0] === 42;
});

test('使用 call 绑定错误的 this 抛出错误', () => {
  const buf = Buffer.alloc(4);
  const writeInt8 = buf.writeInt8;
  try {
    writeInt8.call({}, 42, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('使用 call 绑定 null 作为 this 抛出错误', () => {
  const buf = Buffer.alloc(4);
  const writeInt8 = buf.writeInt8;
  try {
    writeInt8.call(null, 42, 0);
    return false;
  } catch (e) {
    return true;
  }
});

// offset 浮点数完整覆盖
test('offset 为 0.1 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(42, 0.1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer');
  }
});

test('offset 为 0.5 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(42, 0.5);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer');
  }
});

test('offset 为 1.5 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(42, 1.5);
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
