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

// ============ 正常操作不应抛出错误 ============

test('正常操作：slice 不应在合法参数下抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.slice(0, 5);
    buf.slice();
    buf.slice(1);
    buf.slice(-1);
    buf.slice(0, -1);
    return true;
  } catch (e) {
    return false;
  }
});

test('正常操作：slice 对空 buffer 不应抛出错误', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.slice();
    buf.slice(0);
    buf.slice(0, 0);
    return true;
  } catch (e) {
    return false;
  }
});

test('正常操作：slice 对单字节 buffer 不应抛出错误', () => {
  const buf = Buffer.from('a');
  try {
    buf.slice();
    buf.slice(0);
    buf.slice(0, 1);
    buf.slice(1);
    return true;
  } catch (e) {
    return false;
  }
});

// ============ 边界情况不应抛出错误 ============

test('边界：start 超大正数不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    const sliced = buf.slice(999999999);
    return sliced.length === 0;
  } catch (e) {
    return false;
  }
});

test('边界：start 超大负数不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    const sliced = buf.slice(-999999999);
    return sliced.length === 5;
  } catch (e) {
    return false;
  }
});

test('边界：end 超大正数不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    const sliced = buf.slice(0, 999999999);
    return sliced.length === 5;
  } catch (e) {
    return false;
  }
});

test('边界：end 超大负数不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    const sliced = buf.slice(0, -999999999);
    return sliced.length === 0;
  } catch (e) {
    return false;
  }
});

// ============ 特殊输入不应抛出错误 ============

test('特殊输入：参数为 NaN 不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.slice(NaN);
    buf.slice(0, NaN);
    buf.slice(NaN, NaN);
    return true;
  } catch (e) {
    return false;
  }
});

test('特殊输入：参数为 Infinity 不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.slice(Infinity);
    buf.slice(-Infinity);
    buf.slice(0, Infinity);
    buf.slice(0, -Infinity);
    return true;
  } catch (e) {
    return false;
  }
});

test('特殊输入：参数为 undefined 不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.slice(undefined);
    buf.slice(0, undefined);
    buf.slice(undefined, undefined);
    return true;
  } catch (e) {
    return false;
  }
});

test('特殊输入：参数为 null 不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.slice(null);
    buf.slice(0, null);
    buf.slice(null, null);
    return true;
  } catch (e) {
    return false;
  }
});

test('特殊输入：参数为布尔值不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.slice(true);
    buf.slice(false);
    buf.slice(0, true);
    buf.slice(0, false);
    return true;
  } catch (e) {
    return false;
  }
});

test('特殊输入：参数为字符串数字不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.slice('1');
    buf.slice('0', '3');
    buf.slice('-1');
    return true;
  } catch (e) {
    return false;
  }
});

test('特殊输入：参数为非数字字符串 - 转为 NaN 再转为 0', () => {
  const buf = Buffer.from('hello');
  try {
    const sliced = buf.slice('abc', 3);
    return sliced.length === 3 && sliced.toString() === 'hel';
  } catch (e) {
    return false;
  }
});

test('特殊输入：参数为空对象不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.slice({});
    buf.slice(0, {});
    return true;
  } catch (e) {
    return false;
  }
});

test('特殊输入：参数为空数组不应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.slice([]);
    buf.slice(0, []);
    return true;
  } catch (e) {
    return false;
  }
});

// ============ 多余参数测试 ============

test('多余参数：传入 3 个参数 - 第 3 个参数应被忽略', () => {
  const buf = Buffer.from('hello');
  try {
    const sliced = buf.slice(0, 3, 999);
    return sliced.length === 3 && sliced.toString() === 'hel';
  } catch (e) {
    return false;
  }
});

test('多余参数：传入 4 个参数 - 多余参数应被忽略', () => {
  const buf = Buffer.from('hello');
  try {
    const sliced = buf.slice(1, 4, 'extra', { foo: 'bar' });
    return sliced.length === 3 && sliced.toString() === 'ell';
  } catch (e) {
    return false;
  }
});

// ============ 上下文测试 ============

test('上下文：使用 call 改变 this 指向非 Buffer - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  const notBuffer = { length: 5 };
  try {
    // 正常情况下，this 必须是 Buffer 实例
    Buffer.prototype.slice.call(notBuffer, 0, 2);
    // 如果没有报错，说明实现有问题
    return false;
  } catch (e) {
    // 应该抛出错误 - Node v25 会抛出 TypeError
    return true;
  }
});

test('上下文：slice 方法存在于 Buffer.prototype', () => {
  return typeof Buffer.prototype.slice === 'function';
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
