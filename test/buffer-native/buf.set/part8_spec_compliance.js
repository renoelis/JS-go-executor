// buf.set() - Part 8: ECMAScript Specification Compliance
// 基于 MDN TypedArray.prototype.set 规范的严格合规性测试
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

// ===== 1. 规范要求：targetOffset 为负数必须抛出 RangeError =====

test('targetOffset 为 -0（应被视为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], -0);
  // -0 应该被视为 0，不抛出错误
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

testError('targetOffset 为 -1', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], -1);
}, 'RangeError');

testError('targetOffset 为 -100', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], -100);
}, 'RangeError');

testError('targetOffset 为 Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(5);
  buf.set([1], Number.MIN_SAFE_INTEGER);
}, 'RangeError');

// ===== 2. offset 参数省略时默认为 0 =====

test('省略 offset 参数（默认为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([10, 20, 30]);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('显式传入 undefined 作为 offset（应视为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([10, 20, 30], undefined);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('显式传入 null 作为 offset（应转换为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([10, 20, 30], null);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

// ===== 3. 元素会被存储在数组之外时抛出 RangeError =====

testError('offset + source.length = target.length + 1', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], 3); // 3 + 3 = 6 > 5
}, 'RangeError');

testError('offset = target.length, source.length > 0', () => {
  const buf = Buffer.alloc(5);
  buf.set([1], 5); // 5 + 1 = 6 > 5
}, 'RangeError');

test('offset = target.length, source.length = 0（边界合法）', () => {
  const buf = Buffer.alloc(5);
  buf.set([], 5);
  return true;
});

// ===== 4. 共享 ArrayBuffer 的智能复制（memmove 语义）=====

test('同一 Buffer 向后复制（重叠，memmove）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const view = buf.subarray(0, 3);
  buf.set(view, 2);
  // 应该是 [1, 2, 1, 2, 3]，而不是 [1, 2, 1, 1, 1]
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 1 && 
         buf[3] === 2 && buf[4] === 3;
});

test('同一 Buffer 向前复制（重叠，memmove）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const view = buf.subarray(2, 5);
  buf.set(view, 0);
  // 应该是 [3, 4, 5, 4, 5]，而不是 [3, 4, 5, 5, 5]
  return buf[0] === 3 && buf[1] === 4 && buf[2] === 5 && 
         buf[3] === 4 && buf[4] === 5;
});

test('不同 Buffer 共享同一 ArrayBuffer（重叠）', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab, 0, 5);
  const buf2 = Buffer.from(ab, 2, 5);
  buf1.fill(1);
  buf2.fill(2);
  // buf1: [1,1,1,1,1] at offset 0
  // buf2: [2,2,2,2,2] at offset 2
  // 实际内存: [1,1,2,2,2,2,2,x,x,x]
  const source = Buffer.from(ab, 0, 3); // [1,1,2]
  const target = Buffer.from(ab, 2, 5); // [2,2,2,2,2]
  target.set(source, 0);
  // 应该变成 [1,1,2,2,2]
  const result = Buffer.from(ab, 2, 5);
  return result[0] === 1 && result[1] === 1 && result[2] === 2;
});

// ===== 5. 不同 TypedArray 视图之间的复制 =====

test('从 Uint8Array 到 Buffer', () => {
  const buf = Buffer.alloc(5);
  const uint8 = new Uint8Array([10, 20, 30]);
  buf.set(uint8, 1);
  return buf[0] === 0 && buf[1] === 10 && buf[2] === 20 && buf[3] === 30;
});

test('从 Uint8ClampedArray 到 Buffer', () => {
  const buf = Buffer.alloc(5);
  const clamped = new Uint8ClampedArray([10, 20, 30]);
  buf.set(clamped, 1);
  return buf[0] === 0 && buf[1] === 10 && buf[2] === 20 && buf[3] === 30;
});

test('从 Buffer 到 Buffer（不同实例）', () => {
  const buf1 = Buffer.from([10, 20, 30]);
  const buf2 = Buffer.alloc(5);
  buf2.set(buf1, 1);
  return buf2[0] === 0 && buf2[1] === 10 && buf2[2] === 20 && buf2[3] === 30;
});

// ===== 6. 源数组长度为 0 的各种情况 =====

test('空数组，offset 为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.set([], 0);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('空数组，offset 为中间', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.set([], 1);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('空数组，offset 为末尾', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.set([], 3);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('空 TypedArray，offset 为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const empty = new Uint8Array(0);
  buf.set(empty, 0);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// ===== 7. 目标 Buffer 长度为 0 =====

test('长度为 0 的 Buffer 设置空数组', () => {
  const buf = Buffer.alloc(0);
  buf.set([], 0);
  return buf.length === 0;
});

testError('长度为 0 的 Buffer 设置非空数组', () => {
  const buf = Buffer.alloc(0);
  buf.set([1], 0);
}, 'RangeError');

// ===== 8. offset 的类型强制转换 =====

test('offset 为布尔值 true（转换为 1）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], true);
  return buf[0] === 0 && buf[1] === 99;
});

test('offset 为布尔值 false（转换为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], false);
  return buf[0] === 99 && buf[1] === 0;
});

test('offset 为字符串 "2"（转换为 2）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], "2");
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 99;
});

test('offset 为字符串 "abc"（转换为 NaN，然后为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], "abc");
  return buf[0] === 99;
});

test('offset 为对象（调用 valueOf 或 toString）', () => {
  const buf = Buffer.alloc(5);
  const obj = { valueOf() { return 2; } };
  buf.set([99], obj);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 99;
});

// ===== 9. 边界精确匹配 =====

test('offset + source.length 正好等于 target.length', () => {
  const buf = Buffer.alloc(10);
  buf.set([1, 2, 3, 4, 5], 5);
  return buf[5] === 1 && buf[6] === 2 && buf[9] === 5;
});

test('offset = 0, source.length = target.length', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3, 4, 5], 0);
  return buf[0] === 1 && buf[4] === 5;
});

// ===== 10. 数组元素的类型转换 =====

test('数组元素为字符串数字', () => {
  const buf = Buffer.alloc(3);
  buf.set(["10", "20", "30"]);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('数组元素为对象（调用 valueOf）', () => {
  const buf = Buffer.alloc(3);
  const obj1 = { valueOf() { return 10; } };
  const obj2 = { valueOf() { return 20; } };
  buf.set([obj1, obj2, 30]);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('数组元素为符号（应转换失败或抛错）', () => {
  const buf = Buffer.alloc(3);
  try {
    const sym = Symbol('test');
    buf.set([sym, 1, 2]);
    return false; // 如果没抛错，测试失败
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ===== 11. ArrayBuffer 的 detached 状态（高级场景）=====

test('从正常 ArrayBuffer 的视图设置', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  view[0] = 10;
  view[1] = 20;
  const buf = Buffer.alloc(5);
  buf.set(view.subarray(0, 2));
  return buf[0] === 10 && buf[1] === 20;
});

// ===== 12. 特殊的数组索引 =====

test('稀疏数组（holes）', () => {
  const sparse = [1, , 3]; // 索引 1 是 hole
  const buf = Buffer.alloc(3);
  buf.set(sparse);
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 3;
});

test('数组的非数字索引属性会被忽略', () => {
  const arr = [1, 2, 3];
  arr.foo = 99;
  arr.bar = 100;
  const buf = Buffer.alloc(5);
  buf.set(arr);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 0 && buf[4] === 0;
});

// ===== 13. offset 的边界值测试 =====

test('offset 为 Number.MAX_VALUE（应该导致越界）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.set([1], Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('offset 为 2^31（应该导致越界）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.set([1], Math.pow(2, 31));
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
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
