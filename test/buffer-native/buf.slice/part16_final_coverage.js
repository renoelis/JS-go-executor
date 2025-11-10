const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = !!fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({
      name,
      status: '❌',
      error: e.message,
      stack: e.stack
    });
  }
}

// ============ Buffer.prototype.slice 规范对齐测试 ============

test('规范：slice() 无参数时的默认行为', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice();
  // 应返回整个 buffer 的视图
  return sliced.length === 5 && sliced[0] === 1 && sliced[4] === 5;
});

test('规范：slice(start) 时 end 默认为 buffer.length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(2);
  return sliced.length === 3 && sliced[0] === 3 && sliced[2] === 5;
});

test('规范：slice(start, end) 的索引计算', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  return sliced.length === 3 && sliced[0] === 2 && sliced[2] === 4;
});

test('规范：负索引从末尾计算 - start 为负', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(-3);
  return sliced.length === 3 && sliced[0] === 3;
});

test('规范：负索引从末尾计算 - end 为负', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, -2);
  return sliced.length === 3 && sliced[2] === 3;
});

test('规范：负索引从末尾计算 - start 和 end 都为负', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(-4, -1);
  return sliced.length === 3 && sliced[0] === 2 && sliced[2] === 4;
});

// ============ 零拷贝语义验证 ============

test('零拷贝：slice 不创建新的底层内存', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  
  // 修改 slice 应该影响原 buffer
  sliced[0] = 99;
  return buf[1] === 99;
});

test('零拷贝：多次 slice 共享同一底层内存', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(0, 5);
  
  slice1[0] = 99;
  return slice2[0] === 99 && buf[0] === 99;
});

test('零拷贝：嵌套 slice 保持共享', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice1 = buf.slice(1, 4);
  const slice2 = slice1.slice(0, 2);
  
  slice2[0] = 99;
  return buf[1] === 99 && slice1[0] === 99;
});

// ============ 参数边界测试 ============

test('边界：start === end 返回空 buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(1, 1);
  return sliced.length === 0;
});

test('边界：start > end 返回空 buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(2, 1);
  return sliced.length === 0;
});

test('边界：start >= buffer.length 返回空 buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(3);
  return sliced.length === 0;
});

test('边界：end <= 0 返回空 buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 0);
  return sliced.length === 0;
});

test('边界：start < 0 且 abs(start) >= length', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(-10, 2);
  return sliced.length === 2 && sliced[0] === 1 && sliced[1] === 2;
});

test('边界：end < 0 且 abs(end) >= length', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, -10);
  return sliced.length === 0;
});

// ============ 参数类型强制转换测试 ============

test('类型转换：start 为浮点数时截断小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1.7, 3.9);
  return sliced.length === 2 && sliced[0] === 2 && sliced[1] === 3;
});

test('类型转换：NaN 被转换为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(NaN, 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('类型转换：Infinity 被转换为 buffer.length', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, Infinity);
  return sliced.length === 3;
});

test('类型转换：-Infinity 被转换为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(-Infinity, 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('类型转换：undefined 使用默认值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(undefined, undefined);
  return sliced.length === 3;
});

test('类型转换：null 被转换为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(null, 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('类型转换：布尔值被转换为数字', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(true, 3); // true -> 1
  return sliced.length === 2 && sliced[0] === 2;
});

test('类型转换：字符串数字被转换为数字', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const sliced = buf.slice('1', '3');
  return sliced.length === 2 && sliced[0] === 2;
});

test('类型转换：非数字字符串被转换为 NaN 再转为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice('abc', 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('类型转换：对象被转换为 NaN 再转为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice({}, 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('类型转换：数组被转换（空数组 -> 0）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice([], 2);
  return sliced.length === 2 && sliced[0] === 1;
});

// ============ 返回值类型验证 ============

test('返回值：slice 返回 Buffer 实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice();
  return Buffer.isBuffer(sliced);
});

test('返回值：slice 返回值是 Uint8Array 实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice();
  return sliced instanceof Uint8Array;
});

test('返回值：slice 返回值有 Buffer 的方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice();
  return typeof sliced.toString === 'function' &&
         typeof sliced.slice === 'function' &&
         typeof sliced.write === 'function';
});

// ============ 空 Buffer 测试 ============

test('空 Buffer：对长度为 0 的 buffer 调用 slice()', () => {
  const buf = Buffer.alloc(0);
  const sliced = buf.slice();
  return sliced.length === 0 && Buffer.isBuffer(sliced);
});

test('空 Buffer：对长度为 0 的 buffer 调用 slice(0, 0)', () => {
  const buf = Buffer.alloc(0);
  const sliced = buf.slice(0, 0);
  return sliced.length === 0;
});

test('空 Buffer：对长度为 0 的 buffer 使用负索引', () => {
  const buf = Buffer.alloc(0);
  const sliced = buf.slice(-1, -1);
  return sliced.length === 0;
});

// ============ 大 Buffer 测试 ============

test('大 Buffer：slice 大 buffer 的小部分', () => {
  const buf = Buffer.alloc(10000);
  buf[5000] = 99;
  const sliced = buf.slice(5000, 5001);
  return sliced.length === 1 && sliced[0] === 99;
});

test('大 Buffer：slice 大 buffer 保持零拷贝', () => {
  const buf = Buffer.alloc(10000);
  const sliced = buf.slice(0, 10000);
  sliced[9999] = 88;
  return buf[9999] === 88;
});

// ============ 方法链测试 ============

test('方法链：连续调用 slice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = buf.slice(1, 4).slice(0, 2);
  return result.length === 2 && result[0] === 2 && result[1] === 3;
});

test('方法链：slice 后调用其他方法', () => {
  const buf = Buffer.from('hello world');
  const result = buf.slice(0, 5).toString('utf8');
  return result === 'hello';
});

test('方法链：slice 后使用 for...of', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const arr = [];
  for (const byte of sliced) {
    arr.push(byte);
  }
  return arr.length === 3 && arr[0] === 1 && arr[2] === 3;
});

// ============ 与 TypedArray 的行为差异 ============

test('行为差异：Buffer.slice 创建视图', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  sliced[0] = 99;
  return buf[0] === 99; // 视图：修改会影响原 buffer
});

test('行为差异：Uint8Array.slice 创建拷贝', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const sliced = uint8.slice(0, 3);
  sliced[0] = 99;
  return uint8[0] === 1; // 拷贝：修改不会影响原数组
});

// ============ 与 subarray 的行为一致性 ============

test('行为一致：Buffer.slice 与 Buffer.subarray 等效（基本）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const subarrayed = buf.subarray(1, 4);
  return sliced.length === subarrayed.length &&
         sliced[0] === subarrayed[0] &&
         sliced[2] === subarrayed[2];
});

test('行为一致：Buffer.slice 与 Buffer.subarray 等效（共享内存）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const subarrayed = buf.subarray(1, 4);
  
  sliced[0] = 99;
  return subarrayed[0] === 99 && buf[1] === 99;
});

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
