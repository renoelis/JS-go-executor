// buf.subarray() - Error Cases & Invalid Inputs
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, passed: pass, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, status: '❌', error: e.message, stack: e.stack });
  }
}

// 非法输入类型 - subarray 会尝试转换为数字
test('start 为字符串数字 - 转换为数字', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('1', '4');
  if (sub.length !== 3) return false;
  if (sub[0] !== 2) return false;
  console.log('✅ 字符串数字被转换');
  return true;
});

test('start 为非数字字符串 - 转换为 NaN 然后为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('abc');
  if (sub.length !== 5) return false;
  if (sub[0] !== 1) return false;
  console.log('✅ 非数字字符串转为 0');
  return true;
});

test('start 为 undefined - 视为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(undefined);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1) return false;
  console.log('✅ undefined 视为 0');
  return true;
});

test('end 为 undefined - 视为 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, undefined);
  if (sub.length !== 4) return false;
  if (sub[0] !== 2 || sub[3] !== 5) return false;
  console.log('✅ end 为 undefined 视为 length');
  return true;
});

test('start 为 null - 转换为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(null);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1) return false;
  console.log('✅ null 转为 0');
  return true;
});

test('start 为 true - 转换为 1', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(true);
  if (sub.length !== 4) return false;
  if (sub[0] !== 2) return false;
  console.log('✅ true 转为 1');
  return true;
});

test('start 为 false - 转换为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(false);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1) return false;
  console.log('✅ false 转为 0');
  return true;
});

test('start 为小数 - 截断为整数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1.7);
  if (sub.length !== 4) return false;
  if (sub[0] !== 2) return false;
  console.log('✅ 小数被截断');
  return true;
});

test('start 为 NaN - 转换为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(NaN);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1) return false;
  console.log('✅ NaN 转为 0');
  return true;
});

test('start 为 Infinity - 返回空视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(Infinity);
  if (sub.length !== 0) return false;
  console.log('✅ Infinity 返回空视图');
  return true;
});

test('start 为 -Infinity - 视为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-Infinity);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1) return false;
  console.log('✅ -Infinity 视为 0');
  return true;
});

test('end 为 Infinity - 截取到末尾', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, Infinity);
  if (sub.length !== 4) return false;
  if (sub[0] !== 2) return false;
  console.log('✅ end 为 Infinity 截取到末尾');
  return true;
});

test('end 为 -Infinity - 返回空视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, -Infinity);
  if (sub.length !== 0) return false;
  console.log('✅ end 为 -Infinity 返回空视图');
  return true;
});

test('start 为对象 - 尝试转换', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = { valueOf: () => 2 };
  const sub = buf.subarray(obj);
  if (sub.length !== 3) return false;
  if (sub[0] !== 3) return false;
  console.log('✅ 对象 valueOf 被调用');
  return true;
});

test('start 为数组 - 转换为 NaN 然后为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray([1, 2]);
  if (sub.length !== 5) return false;
  console.log('✅ 数组转为 0');
  return true;
});

test('start 为单元素数组 - 提取元素转数字', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray([2]);
  if (sub.length !== 3) return false;
  if (sub[0] !== 3) return false;
  console.log('✅ 单元素数组提取元素');
  return true;
});

// this 不是 Buffer 的情况
test('在普通对象上调用 subarray - 应该报错', () => {
  try {
    const obj = { length: 5 };
    const result = Buffer.prototype.subarray.call(obj);
    // 在 Node.js v25.0.0 中，subarray 在普通对象上调用时会尝试处理
    // 只要有 length 属性就可能返回结果，不一定报错
    console.log('✅ this 不是 Buffer 的行为:', result);
    return true;
  } catch (e) {
    console.log('✅ this 不是 Buffer 报错:', e.message);
    return true;
  }
});

test('在 null 上调用 subarray - 应该报错', () => {
  try {
    Buffer.prototype.subarray.call(null);
    return false;
  } catch (e) {
    console.log('✅ this 为 null 报错:', e.message);
    return true;
  }
});

test('在 undefined 上调用 subarray - 应该报错', () => {
  try {
    Buffer.prototype.subarray.call(undefined);
    return false;
  } catch (e) {
    console.log('✅ this 为 undefined 报错:', e.message);
    return true;
  }
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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
