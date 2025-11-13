// Buffer.from() - Part 4: Array-Like Objects Tests
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

// 类数组对象测试
test('类数组对象 - 有 length 属性', () => {
  const arrayLike = { 0: 65, 1: 66, 2: 67, length: 3 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 3 && buf[0] === 65 && buf[1] === 66 && buf[2] === 67;
});

test('类数组对象 - length 为 0', () => {
  const arrayLike = { length: 0 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 0;
});

test('类数组对象 - length 为 1', () => {
  const arrayLike = { 0: 255, length: 1 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 1 && buf[0] === 255;
});

test('类数组对象 - 稀疏数组（中间缺失索引）', () => {
  const arrayLike = { 0: 1, 2: 3, length: 3 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 3 && buf[0] === 1 && buf[1] === 0 && buf[2] === 3;
});

test('类数组对象 - 包含非数字索引属性', () => {
  const arrayLike = { 0: 10, 1: 20, foo: 'bar', length: 2 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 2 && buf[0] === 10 && buf[1] === 20;
});

test('类数组对象 - length 大于实际索引数量', () => {
  const arrayLike = { 0: 100, length: 5 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 5 && buf[0] === 100 && buf[1] === 0 && buf[4] === 0;
});

test('类数组对象 - length 为小数（截断）', () => {
  const arrayLike = { 0: 50, 1: 60, length: 1.9 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 1 && buf[0] === 50;
});

test('类数组对象 - length 为负数（转换为 0）', () => {
  const arrayLike = { 0: 50, length: -1 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 0;
});

test('类数组对象 - length 为 NaN（转换为 0）', () => {
  const arrayLike = { 0: 50, length: NaN };
  const buf = Buffer.from(arrayLike);
  return buf.length === 0;
});

test('类数组对象 - length 为字符串数字', () => {
  const arrayLike = { 0: 10, 1: 20, length: '2' };
  const buf = Buffer.from(arrayLike);
  // Node.js 将字符串数字 length 当作无效值，转换为 0
  return buf.length === 0;
});

test('类数组对象 - 使用字符串索引', () => {
  const arrayLike = { '0': 65, '1': 66, length: 2 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 2 && buf[0] === 65 && buf[1] === 66;
});

test('类数组对象 - arguments 对象模拟', () => {
  function createArgs() {
    return arguments;
  }
  const args = createArgs(10, 20, 30);
  const buf = Buffer.from(args);
  return buf.length === 3 && buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('类数组对象 - 包含 getter', () => {
  const arrayLike = {
    get 0() { return 128; },
    get 1() { return 255; },
    length: 2
  };
  const buf = Buffer.from(arrayLike);
  return buf.length === 2 && buf[0] === 128 && buf[1] === 255;
});

test('类数组对象 - 数组索引值为字符串数字', () => {
  const arrayLike = { 0: '65', 1: '66', length: 2 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 2 && buf[0] === 65 && buf[1] === 66;
});

test('类数组对象 - 数组索引值为非数字字符串（转为 0）', () => {
  const arrayLike = { 0: 'hello', 1: 'world', length: 2 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 2 && buf[0] === 0 && buf[1] === 0;
});

// NodeList/HTMLCollection 类似对象
test('类数组对象 - 模拟 NodeList 结构', () => {
  const nodeList = {
    0: 72,
    1: 101,
    2: 108,
    length: 3,
    item: function(i) { return this[i]; }
  };
  const buf = Buffer.from(nodeList);
  return buf.length === 3 && buf[0] === 72 && buf[1] === 101 && buf[2] === 108;
});

// 可迭代对象（如果支持）
test('类数组对象 - Set（会被当作普通对象）', () => {
  const set = new Set([1, 2, 3]);
  try {
    const buf = Buffer.from(set);
    // Set 没有 length 属性，应该报错
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('类数组对象 - Map（会被当作普通对象）', () => {
  const map = new Map([[0, 1], [1, 2]]);
  try {
    const buf = Buffer.from(map);
    // Map 没有 length 属性，应该报错
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 超大 length
test('类数组对象 - 超大 length（测试内存限制）', () => {
  const arrayLike = { 0: 10, length: 1000 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 1000 && buf[0] === 10 && buf[999] === 0;
});

test('类数组对象 - length 为 Infinity（转为安全值或报错）', () => {
  const arrayLike = { 0: 10, length: Infinity };
  try {
    const buf = Buffer.from(arrayLike);
    // 如果不报错，应该转换为 0 或某个安全值
    return buf.length >= 0;
  } catch (e) {
    // 也可能报错
    return e instanceof RangeError || e instanceof TypeError;
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
