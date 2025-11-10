// buf.set() - Part 11: 深度查缺补漏
// 基于 MDN 规范和其他 API 的测试模式进行更深层次的测试
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

// ===== 1. MDN 规范：负数 offset =====

testError('offset 为 -1（应抛出 RangeError）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], -1);
}, RangeError);

test('offset 为 -0.1（截断为 0，合法）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], -0.1); // -0.1 -> 0
  return buf[0] === 99;
});

testError('offset 为 -Infinity（应抛出 RangeError）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], -Infinity);
}, RangeError);

testError('offset 为 Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(5);
  buf.set([1], Number.MIN_SAFE_INTEGER);
}, RangeError);

// ===== 2. offset 超出但不越界的精确边界 =====

test('offset 等于 buffer length（空数组，合法）', () => {
  const buf = Buffer.alloc(5);
  buf.set([], 5);
  return true; // 不应抛出错误
});

testError('offset 等于 buffer length（非空数组，应报错）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1], 5);
}, RangeError);

test('offset = length - 1，set 一个元素（精确边界）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], 4);
  return buf[4] === 99;
});

testError('offset = length - 1，set 两个元素（超出 1 字节）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2], 4);
}, RangeError);

// ===== 3. 源数组长度为 0 的各种情况 =====

test('源为空 TypedArray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const empty = new Uint8Array(0);
  buf.set(empty, 2);
  return buf[0] === 1 && buf[4] === 5;
});

test('源为空 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const empty = Buffer.alloc(0);
  buf.set(empty, 3);
  return buf[0] === 1 && buf[4] === 5;
});

test('源为 length=0 的类数组对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.set({ length: 0 }, 2);
  return buf[0] === 1 && buf[4] === 5;
});

// ===== 4. 内存重叠的更多精确场景 =====

test('重叠：从位置 1 复制到位置 0（向前移动）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const view = buf.subarray(1, 4);
  buf.set(view, 0);
  return buf[0] === 2 && buf[1] === 3 && buf[2] === 4;
});

test('重叠：从位置 0 复制到位置 1（向后移动）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const view = buf.subarray(0, 3);
  buf.set(view, 1);
  return buf[1] === 1 && buf[2] === 2 && buf[3] === 3;
});

test('重叠：从中间复制到开头', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const view = buf.subarray(2, 5);
  buf.set(view, 0);
  return buf[0] === 30 && buf[1] === 40 && buf[2] === 50;
});

test('重叠：从开头复制到中间（完全覆盖源）', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const view = buf.subarray(0, 2);
  buf.set(view, 2);
  return buf[2] === 10 && buf[3] === 20;
});

test('重叠：单字节交换相邻位置', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const view = buf.subarray(1, 2);
  buf.set(view, 0);
  return buf[0] === 2;
});

// ===== 5. 不同 byteOffset 的 TypedArray 视图 =====

test('TypedArray 从 byteOffset 2 开始的视图', () => {
  const ab = new ArrayBuffer(10);
  const uint8 = new Uint8Array(ab, 2, 3);
  uint8[0] = 10; uint8[1] = 20; uint8[2] = 30;
  const buf = Buffer.alloc(5);
  buf.set(uint8, 1);
  return buf[1] === 10 && buf[2] === 20 && buf[3] === 30;
});

test('Uint16Array 的奇数 byteOffset 视图', () => {
  const ab = new ArrayBuffer(10);
  // Uint16Array 需要 2 字节对齐，但我们测试非对齐的情况
  const uint8 = new Uint8Array(ab, 1, 4);
  uint8[0] = 0x12; uint8[1] = 0x34;
  const buf = Buffer.alloc(5);
  buf.set(uint8, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

// ===== 6. 源数组包含特殊的 getter =====

test('源对象的索引为 getter 属性', () => {
  const buf = Buffer.alloc(3);
  let callCount = 0;
  const obj = {
    length: 3,
    get 0() { callCount++; return 10; },
    get 1() { callCount++; return 20; },
    get 2() { callCount++; return 30; }
  };
  buf.set(obj);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30 && callCount === 3;
});

test('源数组的 length 为 getter', () => {
  const buf = Buffer.alloc(5);
  let lengthCalls = 0;
  const obj = {
    get length() { lengthCalls++; return 3; },
    0: 1, 1: 2, 2: 3
  };
  buf.set(obj);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && lengthCalls >= 1;
});

// ===== 7. 源数组在 set 过程中被修改 =====

test('源数组在 set 中途被修改（应不影响）', () => {
  const buf = Buffer.alloc(3);
  const arr = [1, 2, 3];
  // 理论上 set 应该先读取所有值，但测试实际行为
  buf.set(arr);
  arr[0] = 99; // 修改源数组
  return buf[0] === 1; // buf 应不受影响
});

// ===== 8. 极端大小的 offset 和 length 组合 =====

testError('offset + length 刚好超出 1 字节', () => {
  const buf = Buffer.alloc(10);
  buf.set([1, 2, 3, 4, 5, 6], 5); // 5 + 6 = 11 > 10
}, RangeError);

testError('offset 为 Number.MAX_SAFE_INTEGER - 1', () => {
  const buf = Buffer.alloc(5);
  buf.set([1], Number.MAX_SAFE_INTEGER - 1);
}, RangeError);

testError('源数组 length 为浮点数（会被截断）', () => {
  const buf = Buffer.alloc(10);
  const obj = { length: 11.9, 0: 1 };
  buf.set(obj); // length 11.9 -> 11，超出 10
}, RangeError);

// ===== 9. 对 frozen/sealed 对象作为源 =====

test('frozen 数组作为源', () => {
  const buf = Buffer.alloc(3);
  const arr = Object.freeze([1, 2, 3]);
  buf.set(arr);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('sealed 数组作为源', () => {
  const buf = Buffer.alloc(3);
  const arr = Object.seal([10, 20, 30]);
  buf.set(arr);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

// ===== 10. 不同内存池的 Buffer =====

test('小 Buffer（内存池）set 到大 Buffer（独立分配）', () => {
  const small = Buffer.allocUnsafe(8); // 通常来自内存池
  small.fill(99);
  const large = Buffer.allocUnsafe(8192); // 独立分配
  large.fill(0);
  large.set(small.subarray(0, 5), 100);
  return large[100] === 99 && large[104] === 99;
});

// ===== 11. 链式操作 =====

test('set 后立即 subarray 再 set', () => {
  const buf1 = Buffer.alloc(10);
  buf1.set([1, 2, 3, 4, 5], 0);
  const sub = buf1.subarray(1, 4);
  const buf2 = Buffer.alloc(5);
  buf2.set(sub, 1);
  return buf2[1] === 2 && buf2[2] === 3 && buf2[3] === 4;
});

test('set 到 Buffer 后用 slice 验证', () => {
  const buf = Buffer.alloc(10);
  buf.set([10, 20, 30], 3);
  const sliced = buf.slice(3, 6);
  return sliced[0] === 10 && sliced[1] === 20 && sliced[2] === 30;
});

// ===== 12. 特殊的 TypedArray 边界 =====

test('Uint8ClampedArray 作为源（值会被钳制）', () => {
  const clamped = new Uint8ClampedArray([300, -50, 128]);
  // Uint8ClampedArray: 300->255, -50->0, 128->128
  const buf = Buffer.alloc(3);
  buf.set(clamped);
  return buf[0] === 255 && buf[1] === 0 && buf[2] === 128;
});

test('Int32Array 转 Buffer（截取低字节）', () => {
  const int32 = new Int32Array([0x12345678]);
  const buf = Buffer.alloc(1);
  buf.set(int32);
  return buf[0] === 0x78; // 取最低字节
});

// ===== 13. offset 为特殊对象 =====

test('offset 为有 valueOf 返回负数的对象', () => {
  const buf = Buffer.alloc(5);
  let pass = false;
  try {
    buf.set([1], { valueOf: () => -1 });
  } catch (e) {
    pass = e instanceof RangeError;
  }
  return pass;
});

test('offset 为有 valueOf 返回有效值的对象', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], { valueOf: () => 2 });
  return buf[2] === 99;
});

// ===== 14. 参数个数的边界 =====

test('只传 1 个参数（offset 默认 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3]);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('传 3 个参数（第 3 个应被忽略）', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], 1, 'ignored');
  return buf[1] === 1 && buf[2] === 2 && buf[3] === 3;
});

// ===== 15. 源数组包含 Proxy =====

// test('源为 Proxy 数组', () => {
//   const buf = Buffer.alloc(3);
//   const handler = {
//     get(target, prop) {
//       if (prop === 'length') return 3;
//       if (prop === '0') return 10;
//       if (prop === '1') return 20;
//       if (prop === '2') return 30;
//       return target[prop];
//     }
//   };
//   const proxy = new Proxy([], handler);  // 安全检查禁止
//   buf.set(proxy);
//   return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
// });

// ===== 16. 不可写的 Buffer（理论上不存在，但测试） =====

// ===== 17. 与 Buffer.compare 的交互 =====

test('set 后 compare 验证内容', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.alloc(5);
  buf2.set([1, 2, 3, 4, 5]);
  return buf1.compare(buf2) === 0;
});

// ===== 18. 零长度 Buffer 的所有操作 =====

test('零长度 Buffer set 空数组', () => {
  const buf = Buffer.alloc(0);
  buf.set([]);
  return buf.length === 0;
});

testError('零长度 Buffer set 非空数组', () => {
  const buf = Buffer.alloc(0);
  buf.set([1]);
}, RangeError);

test('零长度 Buffer set 到其他 Buffer', () => {
  const buf = Buffer.alloc(5);
  const empty = Buffer.alloc(0);
  buf.set(empty, 2);
  return buf.length === 5;
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
