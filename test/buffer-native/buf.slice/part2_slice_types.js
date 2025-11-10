const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = !!fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({
      name,
      status: '❌',
      error: e.message,
      stack: e.stack
    });
  }
}

// ============ 不同参数类型测试 ============

test('参数类型：start 为整数', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(1);
  return sliced.toString() === 'ello';
});

test('参数类型：start 为浮点数 - 应截断为整数', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(1.9);
  return sliced.toString() === 'ello';
});

test('参数类型：end 为浮点数 - 应截断为整数', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3.9);
  return sliced.toString() === 'hel';
});

test('参数类型：start 和 end 都为浮点数', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(1.5, 5.8);
  return sliced.toString() === 'ello';
});

test('参数类型：start 为字符串数字 - 应转换为数字', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice('1');
  return sliced.toString() === 'ello';
});

test('参数类型：end 为字符串数字 - 应转换为数字', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, '3');
  return sliced.toString() === 'hel';
});

test('参数类型：start 为负浮点数', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-2.9);
  return sliced.toString() === 'lo';
});

test('参数类型：end 为负浮点数', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, -1.5);
  return sliced.toString() === 'hell';
});

// ============ 特殊数值测试 ============

test('特殊值：start 为 undefined - 等同于 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(undefined, 3);
  return sliced.toString() === 'hel';
});

test('特殊值：end 为 undefined - 等同于 buffer.length', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(2, undefined);
  return sliced.toString() === 'llo';
});

test('特殊值：start 和 end 都为 undefined', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(undefined, undefined);
  return sliced.toString() === 'hello';
});

test('特殊值：start 为 null - 转换为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(null, 3);
  return sliced.toString() === 'hel';
});

test('特殊值：end 为 null - 转换为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, null);
  return sliced.length === 0;
});

test('特殊值：start 为 NaN - 转换为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(NaN, 3);
  return sliced.toString() === 'hel';
});

test('特殊值：end 为 NaN - 转换为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, NaN);
  return sliced.length === 0;
});

test('特殊值：start 为 Infinity - 超过长度返回空', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(Infinity);
  return sliced.length === 0;
});

test('特殊值：end 为 Infinity - 等同于到末尾', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, Infinity);
  return sliced.toString() === 'hello';
});

test('特殊值：start 为 -Infinity - 等同于 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-Infinity, 3);
  return sliced.toString() === 'hel';
});

test('特殊值：end 为 -Infinity - 等同于 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, -Infinity);
  return sliced.length === 0;
});

// ============ 布尔值测试 ============

test('布尔值：start 为 true - 转换为 1', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(true);
  return sliced.toString() === 'ello';
});

test('布尔值：start 为 false - 转换为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(false);
  return sliced.toString() === 'hello';
});

test('布尔值：end 为 true - 转换为 1', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, true);
  return sliced.toString() === 'h';
});

test('布尔值：end 为 false - 转换为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, false);
  return sliced.length === 0;
});

// ============ 对象与数组测试 ============

test('对象：start 为空对象 - 转换为 NaN 再转为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice({}, 3);
  return sliced.toString() === 'hel';
});

test('对象：start 为有 valueOf 的对象', () => {
  const buf = Buffer.from('hello');
  const obj = { valueOf: () => 2 };
  const sliced = buf.slice(obj);
  return sliced.toString() === 'llo';
});

test('对象：end 为有 valueOf 的对象', () => {
  const buf = Buffer.from('hello');
  const obj = { valueOf: () => 3 };
  const sliced = buf.slice(0, obj);
  return sliced.toString() === 'hel';
});

test('数组：start 为空数组 - 转换为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice([], 3);
  return sliced.toString() === 'hel';
});

test('数组：start 为单元素数组 - 转换为该元素的数值', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice([2]);
  return sliced.toString() === 'llo';
});

try {
  let passed = 0;
  for (let i = 0; i < tests.length; i++) {
    if (tests[i].status === '✅') passed++;
  }
  const total = tests.length;
  const failed = total - passed;

  const result = {
    success: failed === 0,
    summary: {
      total,
      passed,
      failed,
      successRate: total ? (passed * 100 / total).toFixed(2) + '%' : '0.00%'
    },
    tests
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
