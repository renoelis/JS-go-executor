// buf.set() - Part 2: Edge Cases & Error Handling
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

function testError(name, fn, expectedErrorType) {
  try {
    fn();
    tests.push({ 
      name, 
      status: '❌', 
      error: 'Expected error was not thrown' 
    });
  } catch (e) {
    let pass = true;
    if (expectedErrorType) {
      if (typeof expectedErrorType === 'string') {
        pass = e.name === expectedErrorType || e.code === expectedErrorType;
      } else {
        pass = e instanceof expectedErrorType;
      }
    }
    tests.push({ 
      name, 
      status: pass ? '✅' : '❌',
      error: pass ? undefined : `Expected ${expectedErrorType}, got ${e.constructor.name}: ${e.message}`,
      actualError: e.message
    });
  }
}

// 越界错误测试
testError('offset + array.length 超出 Buffer 长度', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3, 4], 3); // 3 + 4 = 7 > 5
}, 'RangeError');

testError('offset 等于 Buffer 长度（非空数组）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1], 5);
}, 'RangeError');

testError('offset 超出 Buffer 长度', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2], 10);
}, 'RangeError');

testError('负数 offset', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], -1);
}, 'RangeError');

// 边界合法情况
test('offset + array.length 正好等于 Buffer 长度', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], 2); // 2 + 3 = 5
  return buf[2] === 1 && buf[3] === 2 && buf[4] === 3;
});

test('offset 等于 Buffer 长度（空数组）', () => {
  const buf = Buffer.alloc(5);
  buf.set([], 5);
  return true; // 不应该抛出错误
});

// 类型错误测试
test('第一个参数为字符串（不被处理）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.set('ab');
    // 字符串虽然可迭代，但 set 不处理字符串
    return buf[0] === 0 && buf[1] === 0; // 未被修改
  } catch (e) {
    // 如果报错也可以接受
    return e instanceof TypeError;
  }
});

testError('第一个参数为 null', () => {
  const buf = Buffer.alloc(5);
  buf.set(null);
}, 'TypeError');

testError('第一个参数为 undefined', () => {
  const buf = Buffer.alloc(5);
  buf.set(undefined);
}, 'TypeError');

test('第一个参数为数字（不可迭代，但不报错）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.set(123);
    // 数字不可迭代，但 Node.js 可能不报错，只是不做任何操作
    return true;
  } catch (e) {
    // 如果报错也是合理的
    return e instanceof TypeError;
  }
});

test('第一个参数为类数组对象（可能被接受）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.set({ 0: 1, 1: 2, length: 2 });
    // 类数组对象可能被接受
    return true;
  } catch (e) {
    // 如果报错也是合理的
    return e instanceof TypeError;
  }
});

// offset 类型转换
test('offset 为字符串数字', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2], '2');
  return buf[2] === 1 && buf[3] === 2;
});

test('offset 为小数（截断）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2], 2.9);
  return buf[2] === 1 && buf[3] === 2;
});

test('offset 为 NaN（转换为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2], NaN);
  // NaN 被转换为 0
  return buf[0] === 1 && buf[1] === 2;
});

testError('offset 为 Infinity', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2], Infinity);
}, 'RangeError');

// 数组包含特殊值
test('数组包含 NaN（转换为 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set([NaN, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('数组包含 Infinity（转换为 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set([Infinity, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('数组包含负数（转换为无符号）', () => {
  const buf = Buffer.alloc(3);
  buf.set([-1, -2, -128]);
  return buf[0] === 255 && buf[1] === 254 && buf[2] === 128;
});

test('数组包含超过 255 的值（取模）', () => {
  const buf = Buffer.alloc(3);
  buf.set([256, 257, 511]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 255;
});

test('数组包含小数（截断）', () => {
  const buf = Buffer.alloc(3);
  buf.set([1.9, 2.1, 3.5]);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('数组包含布尔值', () => {
  const buf = Buffer.alloc(3);
  buf.set([true, false, true]);
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 1;
});

test('数组包含 null（转换为 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set([null, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('数组包含 undefined（转换为 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set([undefined, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

// 大数组测试
test('设置大数组', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);
  const arr = new Array(size).fill(0).map((_, i) => i % 256);
  buf.set(arr);
  return buf[0] === 0 && buf[255] === 255 && buf[256] === 0 && buf[9999] === (9999 % 256);
});

// 自身设置测试（重叠）
test('从自身的 subarray 设置（重叠区域）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, 3);
  buf.set(sub, 2);
  // 应该正确处理重叠
  return buf[2] === 1 && buf[3] === 2 && buf[4] === 3;
});

test('从自身设置（完全重叠）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.set(buf, 0);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && buf[3] === 4 && buf[4] === 5;
});

// Float32Array 和 Float64Array
test('从 Float32Array 设置（截断）', () => {
  const buf = Buffer.alloc(3);
  const float32 = new Float32Array([1.5, 2.7, 3.9]);
  buf.set(float32);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('从 Float64Array 设置（截断）', () => {
  const buf = Buffer.alloc(3);
  const float64 = new Float64Array([1.5, 2.7, 3.9]);
  buf.set(float64);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// BigInt TypedArray
test('从 BigInt64Array 设置（会报错）', () => {
  const buf = Buffer.alloc(3);
  const bigint64 = new BigInt64Array([1n, 2n, 255n]);
  try {
    buf.set(bigint64);
    return false; // 应该报错
  } catch (e) {
    // BigInt 不能直接与 Number 混合
    return e instanceof TypeError && e.message.includes('BigInt');
  }
});

test('从 BigUint64Array 设置（会报错）', () => {
  const buf = Buffer.alloc(3);
  const biguint64 = new BigUint64Array([1n, 2n, 255n]);
  try {
    buf.set(biguint64);
    return false; // 应该报错
  } catch (e) {
    // BigInt 不能直接与 Number 混合
    return e instanceof TypeError && e.message.includes('BigInt');
  }
});

// 零长度 Buffer
test('在零长度 Buffer 上调用 set（空数组）', () => {
  const buf = Buffer.alloc(0);
  buf.set([]);
  return buf.length === 0;
});

testError('在零长度 Buffer 上调用 set（非空数组）', () => {
  const buf = Buffer.alloc(0);
  buf.set([1]);
}, 'RangeError');

// 稀疏数组
test('稀疏数组（undefined 转换为 0）', () => {
  const arr = [1, , 3]; // 中间是 undefined
  const buf = Buffer.alloc(3);
  buf.set(arr);
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 3;
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
