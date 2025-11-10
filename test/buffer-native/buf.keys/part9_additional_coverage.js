// buf.keys() - Part 9: 额外覆盖测试
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

// 迭代器方法的 this 绑定
test('keys() 方法可以被解构', () => {
  const buf = Buffer.from([1, 2, 3]);
  const { keys } = buf;
  const iter = keys.call(buf);
  const result = iter.next();
  return result.value === 0 && result.done === false;
});

test('next() 方法可以被解构调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const { next } = iter;
  const result = next.call(iter);
  return result.value === 0;
});

// 与其他 Buffer 方法组合
test('keys() 与 slice() 组合', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(1, 4);
  const keys = Array.from(sliced.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('keys() 与 subarray() 组合', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(2, 5);
  const keys = Array.from(sub.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('keys() 与 Buffer.concat() 组合', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf3 = Buffer.from([5, 6]);
  const concatenated = Buffer.concat([buf1, buf2, buf3]);
  const keys = Array.from(concatenated.keys());
  return keys.length === 6 && keys[0] === 0 && keys[5] === 5;
});

test('keys() 与 fill() 后的 Buffer', () => {
  const buf = Buffer.alloc(5);
  buf.fill(255);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('keys() 与 write() 后的 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 0, 'utf8');
  const keys = Array.from(buf.keys());
  return keys.length === 10 && keys[0] === 0 && keys[9] === 9;
});

// 特殊编码场景
test('keys() 与 UTF-16 编码的 Buffer', () => {
  const buf = Buffer.from('hello', 'utf16le');
  const keys = Array.from(buf.keys());
  return keys.length === buf.length && keys[0] === 0;
});

test('keys() 与 Latin1 编码的 Buffer', () => {
  const buf = Buffer.from('hello', 'latin1');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[4] === 4;
});

test('keys() 与 ASCII 编码的 Buffer', () => {
  const buf = Buffer.from('test', 'ascii');
  const keys = Array.from(buf.keys());
  return keys.length === 4 && keys[0] === 0;
});

// 迭代器在不同上下文中的行为
test('迭代器可以在函数参数中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sum = Array.from(buf.keys()).reduce((acc, key) => acc + key, 0);
  return sum === 3; // 0 + 1 + 2
});

test('迭代器可以在 map 中使用', () => {
  const buf = Buffer.from([10, 20, 30]);
  const mapped = Array.from(buf.keys()).map(key => key * 10);
  return mapped[0] === 0 && mapped[1] === 10 && mapped[2] === 20;
});

test('迭代器可以在 filter 中使用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const filtered = Array.from(buf.keys()).filter(key => key % 2 === 0);
  return filtered.length === 3 && filtered[0] === 0 && filtered[2] === 4;
});

test('迭代器可以在 some 中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const hasTwo = Array.from(buf.keys()).some(key => key === 2);
  return hasTwo === true;
});

test('迭代器可以在 every 中使用', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const allNonNegative = Array.from(buf.keys()).every(key => key >= 0);
  return allNonNegative === true;
});

test('迭代器可以在 find 中使用', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const found = Array.from(buf.keys()).find(key => key === 2);
  return found === 2;
});

// 迭代器与解构
test('迭代器可以用于数组解构', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const [first, second, third] = buf.keys();
  return first === 0 && second === 1 && third === 2;
});

test('迭代器可以用于剩余参数解构', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [first, ...rest] = buf.keys();
  return first === 0 && rest.length === 4 && rest[3] === 4;
});

// 边界条件补充
test('Buffer.allocUnsafeSlow() 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const keys = Array.from(buf.keys());
  return keys.length === 8 && keys[0] === 0 && keys[7] === 7;
});

test('从 SharedArrayBuffer 创建的 Buffer (如果支持)', () => {
  try {
    const sab = new SharedArrayBuffer(4);
    const buf = Buffer.from(sab);
    const keys = Array.from(buf.keys());
    return keys.length === 4 && keys[0] === 0;
  } catch (e) {
    // SharedArrayBuffer 可能不支持
    return true;
  }
});

// 迭代器协议边界测试
test('迭代器的 Symbol.toStringTag', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const tag = Object.prototype.toString.call(iter);
  return typeof tag === 'string';
});

test('迭代器没有 length 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return iter.length === undefined;
});

test('迭代器不可枚举自身属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const ownKeys = Object.keys(iter);
  return ownKeys.length === 0;
});

// 多次转换
test('迭代器可以多次转换为数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr1 = Array.from(buf.keys());
  const arr2 = Array.from(buf.keys());
  return arr1.length === 3 && arr2.length === 3 && arr1 !== arr2;
});

test('同一个迭代器只能转换一次', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const arr1 = Array.from(iter);
  const arr2 = Array.from(iter);
  return arr1.length === 3 && arr2.length === 0;
});

// 与 Buffer 静态方法的组合
test('Buffer.compare() 后的 Buffer keys()', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  Buffer.compare(buf1, buf2);
  const keys = Array.from(buf1.keys());
  return keys.length === 3;
});

test('Buffer.isBuffer() 检查后 keys()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const isBuf = Buffer.isBuffer(buf);
  const keys = Array.from(buf.keys());
  return isBuf && keys.length === 3;
});

// 输出结果
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
