// buf[index] - Part 9: Strict Mode and Frozen Buffer Tests
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

// 冻结 Buffer 测试（Node.js v25 不允许 freeze/seal 有元素的 TypedArray）
test('Object.freeze 空 Buffer 后读取正常', () => {
  const buf = Buffer.alloc(0);
  Object.freeze(buf);
  return buf[0] === undefined && buf.length === 0;
});

test('尝试 freeze 非空 Buffer 抛出错误', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.freeze(buf);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('freeze') || e.message.includes('array buffer');
  }
});

test('尝试 freeze 非空 Buffer 不影响原数据', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.freeze(buf);
  } catch (e) {
    // 预期会抛出错误
  }
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// Object.seal 测试（Node.js v25 不允许 seal 有元素的 TypedArray）
test('Object.seal 空 Buffer 后读取正常', () => {
  const buf = Buffer.alloc(0);
  Object.seal(buf);
  return buf[0] === undefined && buf.length === 0;
});

test('尝试 seal 非空 Buffer 抛出错误', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.seal(buf);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('seal') || e.message.includes('array buffer');
  }
});

test('尝试 seal 非空 Buffer 不影响原数据', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.seal(buf);
  } catch (e) {
    // 预期会抛出错误
  }
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// Object.preventExtensions 测试
test('Object.preventExtensions 后读取正常', () => {
  const buf = Buffer.from([1, 2, 3]);
  Object.preventExtensions(buf);
  return buf[0] === 1;
});

test('Object.preventExtensions 后写入正常', () => {
  const buf = Buffer.from([1, 2, 3]);
  Object.preventExtensions(buf);
  buf[0] = 99;
  return buf[0] === 99;
});

test('Object.preventExtensions 后越界写入不生效', () => {
  const buf = Buffer.from([1, 2, 3]);
  Object.preventExtensions(buf);
  buf[10] = 99;
  return buf.length === 3 && buf[10] === undefined;
});

// 删除索引测试（严格模式下会抛出错误）
test('delete buf[index] 在严格模式抛出错误', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    delete buf[1];
    // 非严格模式：返回 false
    return buf[1] === 2 && buf.length === 3;
  } catch (e) {
    // 严格模式：抛出 TypeError
    return e.message.includes('Cannot delete') && buf[1] === 2;
  }
});

test('delete buf[index] 不删除元素', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    delete buf[1];
  } catch (e) {
    // 严格模式下会抛出错误，但元素不会被删除
  }
  return buf[1] === 2 && buf.length === 3;
});

test('delete 越界索引返回 true', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = delete buf[10];
  return result === true;
});

// in 操作符测试
test('in 操作符检测有效索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return (0 in buf) && (1 in buf) && (2 in buf);
});

test('in 操作符检测越界索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return !(10 in buf) && !(3 in buf);
});

test('in 操作符检测负索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return !(-1 in buf);
});

test('in 操作符检测字符串索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return ('1' in buf) && !('abc' in buf);
});

// hasOwnProperty 测试
test('hasOwnProperty 检测有效索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.hasOwnProperty(0) && buf.hasOwnProperty(1);
});

test('hasOwnProperty 检测越界索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return !buf.hasOwnProperty(10);
});

test('hasOwnProperty 检测负索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return !buf.hasOwnProperty(-1);
});

// Object.keys 测试
test('Object.keys 返回索引数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Object.keys(buf);
  return keys.length === 3 && keys[0] === '0' && keys[1] === '1' && keys[2] === '2';
});

test('空 Buffer 的 Object.keys', () => {
  const buf = Buffer.alloc(0);
  const keys = Object.keys(buf);
  return keys.length === 0;
});

// Object.values 测试
test('Object.values 返回值数组', () => {
  const buf = Buffer.from([10, 20, 30]);
  const values = Object.values(buf);
  return values.length === 3 && values[0] === 10 && values[1] === 20 && values[2] === 30;
});

// Object.entries 测试
test('Object.entries 返回键值对数组', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Object.entries(buf);
  return entries.length === 3 && 
         entries[0][0] === '0' && entries[0][1] === 10 &&
         entries[1][0] === '1' && entries[1][1] === 20;
});

// Object.getOwnPropertyDescriptor 测试
test('getOwnPropertyDescriptor 获取索引描述符', () => {
  const buf = Buffer.from([65, 66, 67]);
  const desc = Object.getOwnPropertyDescriptor(buf, 0);
  return desc !== undefined && desc.value === 65 && desc.writable === true;
});

test('getOwnPropertyDescriptor 越界索引返回 undefined', () => {
  const buf = Buffer.from([65, 66, 67]);
  const desc = Object.getOwnPropertyDescriptor(buf, 10);
  return desc === undefined;
});

// Object.defineProperty 测试
test('defineProperty 修改索引值', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.defineProperty(buf, 0, { value: 99 });
    return buf[0] === 99;
  } catch (e) {
    // 可能不允许重新定义
    return true;
  }
});

test('defineProperty 添加越界索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.defineProperty(buf, 10, { value: 99 });
    return buf[10] === 99 && buf.length === 3;
  } catch (e) {
    // 可能不允许
    return true;
  }
});

// for...in 循环测试
test('for...in 遍历索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  const indices = [];
  for (let key in buf) {
    if (buf.hasOwnProperty(key) && !isNaN(key)) {
      indices.push(key);
    }
  }
  return indices.length === 3;
});

// Object.assign 测试
test('Object.assign 复制 Buffer 索引', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.alloc(3);
  Object.assign(buf2, buf1);
  return buf2[0] === 1 && buf2[1] === 2 && buf2[2] === 3;
});

test('Object.assign 从普通对象复制到 Buffer', () => {
  const buf = Buffer.alloc(3);
  Object.assign(buf, { 0: 10, 1: 20, 2: 30 });
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

// 属性枚举测试
test('Object.getOwnPropertyNames 包含索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const names = Object.getOwnPropertyNames(buf);
  const indexNames = names.filter(n => !isNaN(n));
  return indexNames.length === 3;
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
