// buf.set() - Part 10: 查缺补漏测试
// 基于其他成功 API 的测试模式，补充可能遗漏的场景
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

// ===== 1. 与 Buffer.from 的兼容性 =====

test('从 Buffer.from(array) 创建后立即 set', () => {
  const source = Buffer.from([1, 2, 3]);
  const target = Buffer.alloc(5);
  target.set(source, 1);
  return target[0] === 0 && target[1] === 1 && target[2] === 2 && 
         target[3] === 3 && target[4] === 0;
});

test('从 Buffer.from(arrayBuffer) 创建后 set', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 10; view[1] = 20; view[2] = 30;
  const source = Buffer.from(ab);
  const target = Buffer.alloc(5);
  target.set(source, 1);
  return target[1] === 10 && target[2] === 20 && target[3] === 30;
});

// ===== 2. 不同创建方式的 Buffer 作为 target =====

test('Buffer.alloc 作为 target', () => {
  const target = Buffer.alloc(5);
  target.set([1, 2, 3], 1);
  return target[1] === 1 && target[2] === 2 && target[3] === 3;
});

test('Buffer.allocUnsafe 作为 target', () => {
  const target = Buffer.allocUnsafe(5);
  target.fill(0);
  target.set([1, 2, 3], 1);
  return target[1] === 1 && target[2] === 2 && target[3] === 3;
});

test('Buffer.from 创建的 Buffer 作为 target', () => {
  const target = Buffer.from([0, 0, 0, 0, 0]);
  target.set([1, 2, 3], 1);
  return target[1] === 1 && target[2] === 2 && target[3] === 3;
});

// ===== 3. 源数组包含不同类型的混合值 =====

test('混合正数、负数、浮点数', () => {
  const buf = Buffer.alloc(5);
  buf.set([10, -5, 3.7, 256, -1], 0);
  // -5 -> 251 (256-5), 3.7 -> 3, 256 -> 0, -1 -> 255
  return buf[0] === 10 && buf[1] === 251 && buf[2] === 3 && 
         buf[3] === 0 && buf[4] === 255;
});

test('混合布尔值、字符串数字、null', () => {
  const buf = Buffer.alloc(5);
  buf.set([true, false, '10', '0xFF', null], 0);
  // true->1, false->0, '10'->10, '0xFF'->255, null->0
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 10 && 
         buf[3] === 255 && buf[4] === 0;
});

test('数组包含 undefined 和空位', () => {
  const buf = Buffer.from([99, 99, 99, 99, 99]);
  const arr = [1, undefined, 3];
  arr[4] = 5; // arr = [1, undefined, 3, empty, 5]
  buf.set(arr, 0);
  // undefined -> 0, empty -> 0
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 3 && 
         buf[3] === 0 && buf[4] === 5;
});

// ===== 4. 不同 TypedArray 的组合测试 =====

test('从 Int8Array（带符号）set 到 Buffer', () => {
  const source = new Int8Array([-1, -128, 127]);
  const buf = Buffer.alloc(3);
  buf.set(source);
  // -1 -> 255, -128 -> 128, 127 -> 127
  return buf[0] === 255 && buf[1] === 128 && buf[2] === 127;
});

test('从 Uint16Array set 到 Buffer（会截取低字节）', () => {
  const source = new Uint16Array([0x1234, 0xABCD]);
  const buf = Buffer.alloc(2);
  buf.set(source);
  // 0x1234 -> 0x34, 0xABCD -> 0xCD
  return buf[0] === 0x34 && buf[1] === 0xCD;
});

test('从 Float32Array set 到 Buffer', () => {
  const source = new Float32Array([1.5, 2.7, 3.1]);
  const buf = Buffer.alloc(3);
  buf.set(source);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('从 Float64Array set 到 Buffer', () => {
  const source = new Float64Array([255.9, 0.1, 128.5]);
  const buf = Buffer.alloc(3);
  buf.set(source);
  return buf[0] === 255 && buf[1] === 0 && buf[2] === 128;
});

// ===== 5. 边界条件的组合 =====

test('连续多次 set 到同一位置', () => {
  const buf = Buffer.alloc(5);
  buf.set([1, 2, 3], 0);
  buf.set([4, 5], 0);
  buf.set([6], 0);
  return buf[0] === 6 && buf[1] === 5 && buf[2] === 3;
});

test('set 到 buffer 的最后一个字节', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], 4);
  return buf[4] === 99 && buf[0] === 0;
});

test('set 空数组到各种 offset', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.set([], 0);
  buf.set([], 2);
  buf.set([], 5);
  return buf[0] === 1 && buf[4] === 5;
});

// ===== 6. offset 的特殊转换 =====

test('offset 为字符串数字', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], '2');
  return buf[2] === 99;
});

test('offset 为布尔值 true（转为 1）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], true);
  return buf[1] === 99;
});

test('offset 为布尔值 false（转为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], false);
  return buf[0] === 99;
});

test('offset 为 null（转为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], null);
  return buf[0] === 99;
});

// ===== 7. 类数组对象的高级场景 =====

test('类数组对象带 length 为非整数', () => {
  const buf = Buffer.alloc(5);
  const obj = { 0: 1, 1: 2, 2: 3, length: 2.9 };
  buf.set(obj);
  // length 2.9 -> 2
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 0;
});

test('类数组对象带 length 为负数', () => {
  const buf = Buffer.alloc(5);
  const obj = { 0: 1, 1: 2, length: -1 };
  buf.set(obj);
  // 负数 length 视为 0
  return buf[0] === 0;
});

test('类数组对象索引非连续', () => {
  const buf = Buffer.alloc(5);
  const obj = { 0: 1, 2: 3, 4: 5, length: 5 };
  buf.set(obj);
  // 缺失的索引为 undefined -> 0
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 3 && 
         buf[3] === 0 && buf[4] === 5;
});

// ===== 8. 性能和规模测试 =====

test('set 1000 个元素', () => {
  const buf = Buffer.alloc(1000);
  const arr = new Array(1000).fill(0).map((_, i) => i % 256);
  buf.set(arr);
  return buf[0] === 0 && buf[255] === 255 && buf[999] === 231;
});

test('多次小规模 set', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.set([i, i + 1], i * 2);
  }
  return buf[0] === 0 && buf[2] === 1 && buf[18] === 9;
});

// ===== 9. 返回值验证 =====

test('set 的返回值应为 undefined', () => {
  const buf = Buffer.alloc(5);
  const result = buf.set([1, 2, 3]);
  return result === undefined;
});

test('set 空数组返回 undefined', () => {
  const buf = Buffer.alloc(5);
  const result = buf.set([]);
  return result === undefined;
});

// ===== 10. 与 subarray 的交互 =====

test('对 subarray 调用 set', () => {
  const parent = Buffer.alloc(10);
  const sub = parent.subarray(2, 7);
  sub.set([1, 2, 3], 1);
  // sub[1] = parent[3]
  return parent[3] === 1 && parent[4] === 2 && parent[5] === 3;
});

test('set subarray 到另一个 buffer', () => {
  const parent = Buffer.from([10, 20, 30, 40, 50]);
  const sub = parent.subarray(1, 4);
  const target = Buffer.alloc(5);
  target.set(sub, 1);
  return target[1] === 20 && target[2] === 30 && target[3] === 40;
});

// ===== 11. 错误场景的补充 =====

test('offset 为 undefined（应转为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], undefined);
  // Node.js 允许，转为 0
  return buf[0] === 99;
});

// testError('offset 为无原型链的对象（应报错）', () => {
//   const buf = Buffer.alloc(5);
//   const obj = Object.create(null);  // 安全检查禁止
//   buf.set([99], obj);
// }, TypeError);

// ===== 12. DataView 兼容性 =====

test('从 DataView 关联的 buffer set', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint8(0, 10);
  dv.setUint8(1, 20);
  const uint8 = new Uint8Array(ab);
  const target = Buffer.alloc(5);
  target.set(uint8, 1);
  return target[1] === 10 && target[2] === 20;
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
