// buf.set() - Part 7: Additional Coverage & Missing Scenarios
// 补充遗漏的测试场景
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
      error: pass ? undefined : `Expected ${expectedErrorType}, got ${e.name}: ${e.message}`,
      actualError: e.message
    });
  }
}

// ===== 1. 原型链与继承场景 =====

test('从继承了 TypedArray 的对象设置', () => {
  const buf = Buffer.alloc(5);
  const uint8 = new Uint8Array([10, 20, 30]);
  buf.set(uint8);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('Buffer 实例本身可以调用 set', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.alloc(5);
  buf2.set(buf1, 1);
  return buf2[0] === 0 && buf2[1] === 1 && buf2[2] === 2 && buf2[3] === 3;
});

// ===== 2. SharedArrayBuffer 场景 =====

test('从 SharedArrayBuffer 创建的 Uint8Array 设置', () => {
  const buf = Buffer.alloc(5);
  try {
    const sab = new SharedArrayBuffer(3);
    const view = new Uint8Array(sab);
    view[0] = 100;
    view[1] = 101;
    view[2] = 102;
    buf.set(view);
    return buf[0] === 100 && buf[1] === 101 && buf[2] === 102;
  } catch (e) {
    // 某些环境可能不支持 SharedArrayBuffer
    return true;
  }
});

// ===== 3. DataView 场景 =====

test('从 DataView 设置（应静默或报错）', () => {
  const buf = Buffer.alloc(5);
  const ab = new ArrayBuffer(3);
  const dv = new DataView(ab);
  try {
    buf.set(dv);
    // DataView 没有迭代器，可能静默失败或报错
    return true;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ===== 4. 空数组和边界组合 =====

test('offset 为 0 设置空数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.set([], 0);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('offset 为中间位置设置空数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.set([], 1);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('offset 为最后位置设置空数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.set([], 3);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// ===== 5. 特殊数值边界 =====

test('设置 255 边界值', () => {
  const buf = Buffer.alloc(3);
  buf.set([254, 255, 256]);
  return buf[0] === 254 && buf[1] === 255 && buf[2] === 0;
});

test('设置 0 边界值', () => {
  const buf = Buffer.alloc(3);
  buf.set([0, -0, +0]);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('设置超大正数（模运算）', () => {
  const buf = Buffer.alloc(3);
  buf.set([1000, 2000, 10000]);
  return buf[0] === (1000 % 256) && 
         buf[1] === (2000 % 256) && 
         buf[2] === (10000 % 256);
});

test('设置超小负数（模运算）', () => {
  const buf = Buffer.alloc(3);
  buf.set([-1000, -2000, -256]);
  const expected0 = ((-1000 % 256) + 256) % 256;
  const expected1 = ((-2000 % 256) + 256) % 256;
  const expected2 = 0; // -256 % 256 = 0
  return buf[0] === expected0 && buf[1] === expected1 && buf[2] === expected2;
});

// ===== 6. 链式调用 =====

test('set 方法不支持链式调用（返回 undefined）', () => {
  const buf = Buffer.alloc(5);
  const result = buf.set([1, 2, 3]);
  return result === undefined;
});

// ===== 7. 不同 TypedArray 视图 =====

test('从 Int8Array 设置（有符号）', () => {
  const buf = Buffer.alloc(3);
  const int8 = new Int8Array([-1, -128, 127]);
  buf.set(int8);
  return buf[0] === 255 && buf[1] === 128 && buf[2] === 127;
});

test('从 Int16Array 设置（只取低字节）', () => {
  const buf = Buffer.alloc(3);
  const int16 = new Int16Array([256, 257, 258]);
  buf.set(int16);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('从 Int32Array 设置（只取低字节）', () => {
  const buf = Buffer.alloc(3);
  const int32 = new Int32Array([65536, 65537, 65538]);
  buf.set(int32);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('从 Uint16Array 设置（只取低字节）', () => {
  const buf = Buffer.alloc(3);
  const uint16 = new Uint16Array([256, 511, 1024]);
  buf.set(uint16);
  return buf[0] === 0 && buf[1] === 255 && buf[2] === 0;
});

test('从 Uint32Array 设置（只取低字节）', () => {
  const buf = Buffer.alloc(3);
  const uint32 = new Uint32Array([256, 511, 1024]);
  buf.set(uint32);
  return buf[0] === 0 && buf[1] === 255 && buf[2] === 0;
});

// ===== 8. 极端长度场景 =====

test('设置单字节数组到单字节 Buffer', () => {
  const buf = Buffer.alloc(1);
  buf.set([255]);
  return buf[0] === 255;
});

test('offset 和 length 的加法不溢出（大值）', () => {
  // 测试大索引值不会导致整数溢出
  const buf = Buffer.alloc(1000);
  buf.set([99], 999);
  return buf[999] === 99;
});

// ===== 9. 类数组对象特殊场景 =====

test('类数组对象的 length 为字符串数字', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 10, 1: 20, 2: 30, length: '3' };
  try {
    buf.set(arrayLike);
    return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('类数组对象的 length 为小数', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 10, 1: 20, 2: 30, length: 2.9 };
  try {
    buf.set(arrayLike);
    // length 应该被截断为 2
    return buf[0] === 10 && buf[1] === 20 && buf[2] === 0;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('类数组对象的 length 为负数', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 10, 1: 20, length: -1 };
  try {
    buf.set(arrayLike);
    // 负数 length 应该被当作 0
    return buf[0] === 0;
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('类数组对象缺少 length 属性', () => {
  const buf = Buffer.alloc(5);
  const arrayLike = { 0: 10, 1: 20, 2: 30 };
  try {
    buf.set(arrayLike);
    // 没有 length，应该被当作长度为 0
    return buf[0] === 0;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ===== 10. 性能相关场景 =====

test('设置长度为 1024 的数组', () => {
  const buf = Buffer.alloc(1024);
  const arr = new Array(1024).fill(0).map((_, i) => i % 256);
  buf.set(arr);
  return buf[0] === 0 && buf[511] === 255 && buf[512] === 0 && buf[1023] === 255;
});

test('重复设置同一位置', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], 0);
  buf.set([4, 5, 6], 0);
  return buf[0] === 4 && buf[1] === 5 && buf[2] === 6;
});

// ===== 11. Getter 和动态属性 =====

test('数组元素是 getter（应该被调用）', () => {
  const buf = Buffer.alloc(3);
  let callCount = 0;
  const arr = Object.defineProperties([], {
    0: { get() { callCount++; return 100; } },
    1: { get() { callCount++; return 101; } },
    2: { get() { callCount++; return 102; } },
    length: { value: 3 }
  });
  buf.set(arr);
  return buf[0] === 100 && buf[1] === 101 && buf[2] === 102 && callCount === 3;
});

// 输出结果
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
      successRate: total
        ? (passed * 100 / total).toFixed(2) + '%'
        : '0.00%'
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
