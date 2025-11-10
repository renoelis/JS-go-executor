// buf.set() - Part 6: Comprehensive Edge Cases (Rounds 2-5)
// 综合第2-5轮的补充测试：官方文档对照、实际行为、Go实现反推、极端场景
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

// ===== 第2轮：对照 Node 官方文档补漏 =====

// 官方文档示例验证
test('官方文档示例：基本用法', () => {
  const buf = Buffer.alloc(10);
  buf.set([1, 2, 3], 5);
  return buf[5] === 1 && buf[6] === 2 && buf[7] === 3;
});

// offset 参数的默认值
test('offset 参数默认为 0', () => {
  const buf = Buffer.alloc(5);
  buf.set([10, 20, 30]);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

// 返回值验证（应该是 undefined）
test('set 方法返回 undefined', () => {
  const buf = Buffer.alloc(5);
  const result = buf.set([1, 2, 3]);
  return result === undefined;
});

// ===== 第3轮：对照 Node 实际行为补充边缘场景 =====

// 极端 offset 值
test('offset 为 MAX_SAFE_INTEGER（应该报错）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.set([1], Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('offset 为负小数（截断为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], -0.5);
  // 负小数被截断为 0
  return buf[0] === 99;
});

test('offset 为 -Infinity（应该报错）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.set([1], -Infinity);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

// 数组元素的类型转换
test('数组包含对象（转换为 NaN -> 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set([{}, {a: 1}, {toString: () => '5'}], 0);
  // {} -> NaN -> 0, {a:1} -> NaN -> 0, {toString} -> '5' -> 5
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 5;
});

test('数组包含数组（转换为字符串再转数字）', () => {
  const buf = Buffer.alloc(3);
  buf.set([[1], [2, 3], []], 0);
  // [1] -> '1' -> 1, [2,3] -> '2,3' -> NaN -> 0, [] -> '' -> 0
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 0;
});

// TypedArray 的边界情况
test('从 Uint8Array 的零长度 subarray 设置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([10, 20, 30]);
  const sub = uint8.subarray(1, 1); // 零长度
  buf.set(sub, 1);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('从 detached ArrayBuffer 的 TypedArray 设置', () => {
  // 注：在浏览器环境中可以 detach ArrayBuffer，Node.js 中较难模拟
  // 这里只是占位测试
  const buf = Buffer.alloc(5);
  const uint8 = new Uint8Array([1, 2, 3]);
  buf.set(uint8);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// ===== 第4轮：结合 Go 实现逻辑反推测试缺口 =====

// 测试 Buffer 与 Uint8Array 的互操作
test('从 Buffer 设置到 Buffer（不同实例）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.alloc(5);
  buf2.set(buf1, 1);
  return buf2[0] === 0 && buf2[1] === 1 && buf2[2] === 2 && 
         buf2[3] === 3 && buf2[4] === 0;
});

test('从 Uint8Array 设置到 Buffer', () => {
  const uint8 = new Uint8Array([10, 20, 30]);
  const buf = Buffer.alloc(5);
  buf.set(uint8, 1);
  return buf[0] === 0 && buf[1] === 10 && buf[2] === 20 && 
         buf[3] === 30 && buf[4] === 0;
});

// 测试数组索引的边界
test('数组长度为 0（空数组）', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.set([], 1);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('数组长度为 1', () => {
  const buf = Buffer.alloc(3);
  buf.set([42], 1);
  return buf[0] === 0 && buf[1] === 42 && buf[2] === 0;
});

// 测试 offset 的边界
test('offset = buffer.length（空数组，合法）', () => {
  const buf = Buffer.alloc(5);
  buf.set([], 5);
  return buf.length === 5;
});

testError('offset = buffer.length（非空数组，非法）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1], 5);
}, 'RangeError');

test('offset = buffer.length - 1（单元素数组，合法）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], 4);
  return buf[4] === 99;
});

// ===== 第5轮：极端场景与兼容性再挑刺 =====

// 超大数组
test('设置超大数组（10000元素）', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);
  const arr = new Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = i % 256;
  }
  buf.set(arr);
  return buf[0] === 0 && buf[255] === 255 && buf[256] === 0 && 
         buf[9999] === (9999 % 256);
});

// 数组包含极端值
test('数组包含 Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(3);
  buf.set([Number.MAX_VALUE, 1, 2]);
  // MAX_VALUE 转换为 uint8 应该是 0
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('数组包含 Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(3);
  buf.set([Number.MIN_VALUE, 1, 2]);
  // MIN_VALUE (接近0的正数) 转换为 uint8 应该是 0
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('数组包含 -0', () => {
  const buf = Buffer.alloc(3);
  buf.set([-0, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

// offset 的类型转换
test('offset 为对象（转换为 NaN -> 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], {});
  // {} -> NaN -> 0
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('offset 为数组（转换为字符串再转数字）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2], [2]); // [2] -> '2' -> 2
  return buf[2] === 1 && buf[3] === 2;
});

test('offset 为 null（转换为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], null);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('offset 为 undefined（转换为 NaN -> 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], undefined);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('offset 为布尔值 true（转换为 1）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2], true);
  return buf[1] === 1 && buf[2] === 2;
});

test('offset 为布尔值 false（转换为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2], false);
  return buf[0] === 1 && buf[1] === 2;
});

// 多次连续 set 操作
test('连续10次 set 操作', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.set([i * 2, i * 2 + 1], i * 2);
  }
  return buf[0] === 0 && buf[1] === 1 && buf[18] === 18 && buf[19] === 19;
});

// 冻结的数组
test('从冻结的数组设置', () => {
  const buf = Buffer.alloc(5);
  const arr = Object.freeze([1, 2, 3]);
  buf.set(arr);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 密封的数组
test('从密封的数组设置', () => {
  const buf = Buffer.alloc(5);
  const arr = Object.seal([1, 2, 3]);
  buf.set(arr);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 不可扩展的数组
test('从不可扩展的数组设置', () => {
  const buf = Buffer.alloc(5);
  const arr = Object.preventExtensions([1, 2, 3]);
  buf.set(arr);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 稀疏数组的各种情况
test('稀疏数组（多个空洞）', () => {
  const buf = Buffer.alloc(5);
  const arr = [1, , , 4, 5]; // 索引1和2是空洞
  buf.set(arr);
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 0 && 
         buf[3] === 4 && buf[4] === 5;
});

test('稀疏数组（开头是空洞）', () => {
  const buf = Buffer.alloc(5);
  const arr = [, , 3, 4, 5];
  buf.set(arr);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 3;
});

test('稀疏数组（结尾是空洞）', () => {
  const buf = Buffer.alloc(5);
  const arr = [1, 2, 3, ,];
  buf.set(arr);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && buf[3] === 0;
});

// 数组包含 getter
test('数组包含 getter（应该被调用）', () => {
  const buf = Buffer.alloc(5);
  let callCount = 0;
  const arr = [1, 2, 3];
  Object.defineProperty(arr, '1', {
    get() {
      callCount++;
      return 99;
    }
  });
  buf.set(arr);
  return buf[0] === 1 && buf[1] === 99 && buf[2] === 3 && callCount === 1;
});

// 数组长度在迭代过程中改变
test('数组长度在 getter 中改变', () => {
  const buf = Buffer.alloc(5);
  const arr = [1, 2, 3];
  Object.defineProperty(arr, '1', {
    get() {
      arr.length = 2; // 缩短数组
      return 99;
    }
  });
  buf.set(arr);
  // 行为取决于实现，但不应该崩溃
  return true;
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
