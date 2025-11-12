// buf.writeUInt8() - 第6轮补漏：value参数更多类型转换
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

// value 复杂对象转换
test('value 为带 toString 的对象转换', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8({ toString: () => '150' }, 0);
  return buf[0] === 150;
});

test('value 为同时有 valueOf 和 toString 的对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8({ valueOf: () => 100, toString: () => '200' }, 0);
  return buf[0] === 100; // valueOf 优先
});

test('value 为只有 toString 返回数字的对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8({ toString: () => 123 }, 0);
  return buf[0] === 123;
});

// 字符串特殊格式
test('value 为空字符串转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('', 0);
  return buf[0] === 0;
});

test('value 为多个空格转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('   ', 0);
  return buf[0] === 0;
});

test('value 为字符串 "+100" 转为 100', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('+100', 0);
  return buf[0] === 100;
});

test('value 为字符串 "+0" 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('+0', 0);
  return buf[0] === 0;
});

test('value 为字符串 "0x00" 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('0x00', 0);
  return buf[0] === 0;
});

test('value 为八进制字符串 "0o77" 转为 63', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('0o77', 0);
  return buf[0] === 63;
});

test('value 为八进制字符串 "0o377" 转为 255', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('0o377', 0);
  return buf[0] === 255;
});

test('value 为科学计数法字符串 "1e2" 转为 100', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('1e2', 0);
  return buf[0] === 100;
});

test('value 为科学计数法字符串 "2.55e2" 转为 255', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('2.55e2', 0);
  return buf[0] === 255;
});

test('value 为混合字符串 "123abc" 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('123abc', 0);
  return buf[0] === 0;
});

// 数字特殊表示
test('value 为下划线分隔数字 1_2_3 等于 123', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(1_2_3, 0);
  return buf[0] === 123;
});

test('value 为下划线分隔数字 2_5_5 等于 255', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(2_5_5, 0);
  return buf[0] === 255;
});

// 特殊对象类型
test('value 为 Set 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(new Set([1, 2, 3]), 0);
  return buf[0] === 0;
});

test('value 为 Map 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(new Map([[1, 2]]), 0);
  return buf[0] === 0;
});

test('value 为 WeakSet 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(new WeakSet(), 0);
  return buf[0] === 0;
});

test('value 为 WeakMap 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(new WeakMap(), 0);
  return buf[0] === 0;
});

test('value 为 Promise 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(Promise.resolve(100), 0);
  return buf[0] === 0;
});

test('value 为 Buffer 对象转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(Buffer.from([200]), 0);
  return buf[0] === 0;
});

test('value 为 Error 对象转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(new Error('test'), 0);
  return buf[0] === 0;
});

// 多元素数组
test('value 为多元素数组 [1, 2, 3] 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8([1, 2, 3], 0);
  return buf[0] === 0;
});

test('value 为两元素数组 [1, 2] 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8([1, 2], 0);
  return buf[0] === 0;
});

// 嵌套数组
test('value 为嵌套数组 [[100]] 转为 100', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8([[100]], 0);
  return buf[0] === 100;
});

test('value 为嵌套数组 [[[200]]] 转为 200', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8([[[200]]], 0);
  return buf[0] === 200;
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
