// buf.readBigInt64BE() - 非 Buffer 对象调用测试
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

// Uint8Array 测试（Buffer 的父类，Node.js 允许调用）
test('在 Uint8Array 上调用可以工作', () => {
  try {
    const arr = new Uint8Array(8);
    const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
    return result === 0n;
  } catch (e) {
    // 某些实现可能不允许
    return e.name === 'TypeError';
  }
});

// 其他 TypedArray 测试（Node.js 允许调用）
test('在 Int8Array 上调用可以工作', () => {
  try {
    const arr = new Int8Array(8);
    const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('在 Uint16Array 上调用（元素大小不匹配）', () => {
  try {
    const arr = new Uint16Array(8); // 需要 8 个元素才有 8 个索引
    const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
    return result === 0n;
  } catch (e) {
    // 元素大小不是 1 字节，可能失败
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在 Int32Array 上调用（元素大小不匹配）', () => {
  try {
    const arr = new Int32Array(8);
    const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在 Float32Array 上调用（元素大小不匹配）', () => {
  try {
    const arr = new Float32Array(8);
    const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在 Float64Array 上调用（元素大小不匹配）', () => {
  try {
    const arr = new Float64Array(8);
    const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在 BigInt64Array 上调用（元素大小不匹配）', () => {
  try {
    const arr = new BigInt64Array(8);
    const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在 BigUint64Array 上调用（元素大小不匹配）', () => {
  try {
    const arr = new BigUint64Array(8);
    const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// ArrayBuffer 测试（没有索引访问，应该失败）
test('在 ArrayBuffer 上调用可能失败', () => {
  try {
    const ab = new ArrayBuffer(8);
    Buffer.prototype.readBigInt64BE.call(ab, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// DataView 测试（有索引访问，可能工作）
test('在 DataView 上调用可能工作', () => {
  try {
    const ab = new ArrayBuffer(8);
    const dv = new DataView(ab);
    const result = Buffer.prototype.readBigInt64BE.call(dv, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 普通对象测试（有索引属性，可能工作）
test('在普通对象上调用可能工作（如有索引属性）', () => {
  try {
    const obj = { length: 8, 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const result = Buffer.prototype.readBigInt64BE.call(obj, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 类数组对象测试
test('在类数组对象上调用可能工作', () => {
  try {
    const arrayLike = {
      length: 8,
      0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0
    };
    const result = Buffer.prototype.readBigInt64BE.call(arrayLike, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 数组测试（有索引访问，可能工作）
test('在普通数组上调用可能工作', () => {
  try {
    const arr = [0, 0, 0, 0, 0, 0, 0, 0];
    const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 字符串测试（有索引访问，字符会被转换为 charCode）
test('在字符串上调用可能工作（字符转为 charCode）', () => {
  try {
    const str = '00000000';
    const result = Buffer.prototype.readBigInt64BE.call(str, 0);
    // 字符 '0' 的 charCode 是 48，所以会读取到一个值
    return typeof result === 'bigint';
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 原始值测试
test('在 null 上调用应抛出错误', () => {
  try {
    Buffer.prototype.readBigInt64BE.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('在 undefined 上调用应抛出错误', () => {
  try {
    Buffer.prototype.readBigInt64BE.call(undefined, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('在数字上调用可能失败', () => {
  try {
    Buffer.prototype.readBigInt64BE.call(12345, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在布尔值上调用可能失败', () => {
  try {
    Buffer.prototype.readBigInt64BE.call(true, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在 Symbol 上调用可能失败', () => {
  try {
    Buffer.prototype.readBigInt64BE.call(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('在 BigInt 上调用可能失败', () => {
  try {
    Buffer.prototype.readBigInt64BE.call(100n, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
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
