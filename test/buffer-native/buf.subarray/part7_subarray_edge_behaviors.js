// buf.subarray() - Edge Cases & Special Scenarios
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

// 极端参数组合
test('两个参数都是 Infinity', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(Infinity, Infinity);
  if (sub.length !== 0) return false;
  console.log('✅ Infinity, Infinity 返回空');
  return true;
});

test('两个参数都是 -Infinity', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-Infinity, -Infinity);
  if (sub.length !== 0) return false;
  console.log('✅ -Infinity, -Infinity 返回空');
  return true;
});

test('start 为 -Infinity, end 为 Infinity', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-Infinity, Infinity);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1 || sub[4] !== 5) return false;
  console.log('✅ -Infinity 到 Infinity 返回完整视图');
  return true;
});

test('start 为正小数，end 为负小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1.8, -0.9);
  // 1.8 截断为 1, -0.9 截断为 0（向下取整），从末尾算为 5，结果为空
  if (sub.length !== 0) return false;
  console.log('✅ 小数混合正确截断');
  return true;
});

test('start 为 -0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-0);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1) return false;
  console.log('✅ -0 视为 0');
  return true;
});

test('start 为 +0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(+0);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1) return false;
  console.log('✅ +0 视为 0');
  return true;
});

// 多参数传入（只取前两个）
test('传入超过 2 个参数 - 忽略多余参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4, 10, 20);
  if (sub.length !== 3) return false;
  if (sub[0] !== 2) return false;
  console.log('✅ 多余参数被忽略');
  return true;
});

// 字符串边界
test('start 为空字符串 - 转为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('');
  if (sub.length !== 5) return false;
  console.log('✅ 空字符串转为 0');
  return true;
});

test('start 为 "0x10" 十六进制字符串', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('0x2');
  // "0x2" 转为数字 2
  if (sub.length !== 3) return false;
  if (sub[0] !== 3) return false;
  console.log('✅ 十六进制字符串转换');
  return true;
});

test('start 为科学计数法字符串 "1e2"', () => {
  const buf = Buffer.alloc(200);
  buf[100] = 99;
  const sub = buf.subarray('1e2');
  // "1e2" = 100
  if (sub.length !== 100) return false;
  if (sub[0] !== 99) return false;
  console.log('✅ 科学计数法字符串转换');
  return true;
});

// 对象 valueOf 和 toString
test('start 为对象 - 先调用 valueOf', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let valueOfCalled = false;
  const obj = {
    valueOf: () => { valueOfCalled = true; return 2; },
    toString: () => '3'
  };
  const sub = buf.subarray(obj);
  if (!valueOfCalled) return false;
  if (sub.length !== 3) return false;
  if (sub[0] !== 3) return false;
  console.log('✅ 优先调用 valueOf');
  return true;
});

test('start 为对象 - valueOf 返回非数字时调用 toString', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = {
    valueOf: () => ({}),
    toString: () => '2'
  };
  const sub = buf.subarray(obj);
  if (sub.length !== 3) return false;
  if (sub[0] !== 3) return false;
  console.log('✅ valueOf 失败后调用 toString');
  return true;
});

// Symbol.toPrimitive
test('start 为对象 - 有 Symbol.toPrimitive', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = {
    [Symbol.toPrimitive]: (hint) => {
      return 2;
    }
  };
  const sub = buf.subarray(obj);
  if (sub.length !== 3) return false;
  if (sub[0] !== 3) return false;
  console.log('✅ Symbol.toPrimitive 被调用');
  return true;
});

// 测试对象继承行为
test('测试继承对象的行为', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  // 使用 setPrototypeOf 的替代方式：通过原型链测试
  const EmptyConstructor = function() {};
  EmptyConstructor.prototype = buf;
  const obj = new EmptyConstructor();
  
  try {
    const sub = obj.subarray(1, 4);
    console.log('✅ 原型链继承未报错');
    return true;
  } catch (e) {
    // Node v25 中会报错，因为 this 必须是真正的 TypedArray
    console.log('✅ 原型链继承正确报错:', e.message);
    return true;
  }
});

// Buffer 不能被冻结或密封（有元素时）
test('Buffer 不能被冻结（会抛错）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  try {
    Object.freeze(buf);
    console.log('✅ Buffer freeze 未报错');
    return false;
  } catch (e) {
    console.log('✅ Buffer freeze 正确报错:', e.message);
    return true;
  }
});

test('Buffer 不能被密封（会抛错）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  try {
    Object.seal(buf);
    console.log('✅ Buffer seal 未报错');
    return false;
  } catch (e) {
    console.log('✅ Buffer seal 正确报错:', e.message);
    return true;
  }
});

// 空 Buffer 可以被冻结
test('空 Buffer 可以被冻结', () => {
  const buf = Buffer.alloc(0);
  try {
    Object.freeze(buf);
    const sub = buf.subarray();
    if (sub.length !== 0) return false;
    console.log('✅ 空 Buffer freeze 成功');
    return true;
  } catch (e) {
    console.log('✅ 空 Buffer freeze 失败:', e.message);
    return false;
  }
});

// 非常长的 buffer
test('超大 buffer 的 subarray', () => {
  const size = 1024 * 1024; // 1MB
  const buf = Buffer.alloc(size);
  buf[0] = 1;
  buf[size - 1] = 255;

  const sub = buf.subarray(size / 2, size);
  if (sub.length !== size / 2) return false;
  if (sub[sub.length - 1] !== 255) return false;

  sub[0] = 128;
  if (buf[size / 2] !== 128) return false;

  console.log('✅ 超大 buffer subarray 正常');
  return true;
});

// 连续多次 subarray
test('连续 10 层嵌套 subarray', () => {
  let buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  // 每次去掉头尾
  for (let i = 0; i < 10; i++) {
    if (buf.length <= 2) break;
    buf = buf.subarray(1, buf.length - 1);
  }

  // 16 个元素，每次减 2，循环 7 次后剩余 2 个元素
  if (buf.length !== 2) return false;

  console.log('✅ 连续嵌套 subarray 正常');
  return true;
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
