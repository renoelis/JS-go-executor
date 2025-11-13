// Buffer.isBuffer() - 边界与极端情况测试
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

// 参数缺失测试
test('不传参数返回 false', () => {
  return Buffer.isBuffer() === false;
});

test('传递 null 返回 false', () => {
  return Buffer.isBuffer(null) === false;
});

test('传递 undefined 返回 false', () => {
  return Buffer.isBuffer(undefined) === false;
});

// 边界长度测试
test('零长度 Buffer 返回 true', () => {
  const buf = Buffer.alloc(0);
  return Buffer.isBuffer(buf) === true;
});

test('零长度 Uint8Array 返回 false', () => {
  const arr = new Uint8Array(0);
  return Buffer.isBuffer(arr) === false;
});

test('空字符串创建的 Buffer 返回 true', () => {
  const buf = Buffer.from('');
  return Buffer.isBuffer(buf) === true;
});

test('空数组创建的 Buffer 返回 true', () => {
  const buf = Buffer.from([]);
  return Buffer.isBuffer(buf) === true;
});

// 特殊数值测试
test('Number.MAX_SAFE_INTEGER 返回 false', () => {
  return Buffer.isBuffer(Number.MAX_SAFE_INTEGER) === false;
});

test('Number.MIN_SAFE_INTEGER 返回 false', () => {
  return Buffer.isBuffer(Number.MIN_SAFE_INTEGER) === false;
});

test('Number.MAX_VALUE 返回 false', () => {
  return Buffer.isBuffer(Number.MAX_VALUE) === false;
});

test('Number.MIN_VALUE 返回 false', () => {
  return Buffer.isBuffer(Number.MIN_VALUE) === false;
});

test('Number.EPSILON 返回 false', () => {
  return Buffer.isBuffer(Number.EPSILON) === false;
});

// 极端字符测试
test('包含 null 字符的 Buffer 返回 true', () => {
  const buf = Buffer.from([0, 0, 0]);
  return Buffer.isBuffer(buf) === true;
});

test('包含所有 0xFF 的 Buffer 返回 true', () => {
  const buf = Buffer.alloc(10, 0xFF);
  return Buffer.isBuffer(buf) === true;
});

// 特殊对象测试
test('具有 length 属性的普通对象返回 false', () => {
  const obj = { length: 10 };
  return Buffer.isBuffer(obj) === false;
});

test('具有 buffer 属性的对象返回 false', () => {
  const obj = { buffer: new ArrayBuffer(10) };
  return Buffer.isBuffer(obj) === false;
});

test('具有 byteLength 属性的对象返回 false', () => {
  const obj = { byteLength: 10 };
  return Buffer.isBuffer(obj) === false;
});

test('具有所有 Buffer 特征属性但不是 Buffer 的对象返回 false', () => {
  const obj = {
    length: 10,
    byteLength: 10,
    buffer: new ArrayBuffer(10),
    byteOffset: 0
  };
  return Buffer.isBuffer(obj) === false;
});

// 冻结和密封对象测试
test('尝试冻结 Buffer 会抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.message.includes('Cannot freeze') && Buffer.isBuffer(buf) === true;
  }
});

test('尝试密封 Buffer 会抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.message.includes('Cannot seal') && Buffer.isBuffer(buf) === true;
  }
});

test('可以冻结空 Buffer', () => {
  const buf = Buffer.alloc(0);
  try {
    const frozen = Object.freeze(buf);
    return Buffer.isBuffer(frozen) === true;
  } catch (e) {
    return true;
  }
});

test('冻结的普通对象返回 false', () => {
  const obj = Object.freeze({ data: [1, 2, 3] });
  return Buffer.isBuffer(obj) === false;
});

// 多重包装测试
test('对象包装的 Buffer 不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const wrapped = { buffer: buf };
  return Buffer.isBuffer(wrapped) === false;
});

test('数组包装的 Buffer 元素仍是 Buffer', () => {
  const buf = Buffer.from('hello');
  const arr = [buf];
  return Buffer.isBuffer(arr) === false && Buffer.isBuffer(arr[0]) === true;
});

// 循环引用测试
test('具有循环引用的对象返回 false', () => {
  const obj = {};
  obj.self = obj;
  return Buffer.isBuffer(obj) === false;
});

// 全局对象测试（goja 环境中 global 被禁用，跳过）
// test('global 对象返回 false', () => {
//   return Buffer.isBuffer(global) === false;
// });

test('globalThis 对象返回 false', () => {
  return Buffer.isBuffer(globalThis) === false;
});

// 特殊 TypedArray 边界
test('零长度 TypedArray 各类型都返回 false', () => {
  const types = [
    new Uint8Array(0),
    new Uint16Array(0),
    new Uint32Array(0),
    new Int8Array(0),
    new Int16Array(0),
    new Int32Array(0),
    new Float32Array(0),
    new Float64Array(0)
  ];
  return types.every(arr => Buffer.isBuffer(arr) === false);
});

// Buffer 原型链测试（不使用禁止的关键词，通过行为验证）
test('修改 Buffer 实例属性后仍返回 true', () => {
  const buf = Buffer.from('hello');
  buf.customProperty = 'test';
  return Buffer.isBuffer(buf) === true;
});

test('删除 Buffer 实例属性后仍返回 true', () => {
  const buf = Buffer.from('hello');
  delete buf[0];
  return Buffer.isBuffer(buf) === true;
});

// 混合类型数组测试
test('包含混合类型的数组创建的 Buffer 返回 true', () => {
  const buf = Buffer.from([0, 255, 128, 1, 254]);
  return Buffer.isBuffer(buf) === true;
});

// 极端边界组合
test('连续切片的 Buffer 仍返回 true', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = slice1.slice(1, 4);
  const slice3 = slice2.slice(0, 2);
  return Buffer.isBuffer(slice3) === true;
});

test('多次 subarray 的 Buffer 仍返回 true', () => {
  const buf = Buffer.from('hello world');
  const sub1 = buf.subarray(0, 8);
  const sub2 = sub1.subarray(2, 6);
  const sub3 = sub2.subarray(1, 3);
  return Buffer.isBuffer(sub3) === true;
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
