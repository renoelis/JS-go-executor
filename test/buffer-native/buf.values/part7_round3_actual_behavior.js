// buf.values() - 第 3 轮补漏：Node 实际行为和边缘分支
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
  }
}

// 测试 1：迭代过程中 Buffer 长度不变的情况
test('迭代过程中 Buffer 长度应保持不变', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const originalLength = buf.length;

  let count = 0;
  for (const v of iter) {
    count++;
    if (buf.length !== originalLength) return false;
  }

  return count === 3 && buf.length === originalLength;
});

// 测试 2：slice 后的 Buffer 迭代与原 Buffer 的独立性
test('slice 后的 Buffer 迭代应与原 Buffer 独立', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);

  buf[2] = 99; // 修改原 Buffer

  const slicedValues = [...sliced.values()];
  // sliced 应该受到影响（因为 slice 创建的是视图）
  if (slicedValues[1] !== 99) return false;

  return slicedValues.length === 3;
});

// 测试 3：subarray 的迭代与原 Buffer 的联动
test('subarray 的迭代应反映原 Buffer 的修改', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  const iter = sub.values();
  iter.next(); // 消耗第一个值 (2)

  buf[2] = 88; // 修改原 Buffer 的第三个字节（sub 的第二个字节）

  const v2 = iter.next().value;
  return v2 === 88;
});

// 测试 4：Buffer.from 使用 TypedArray 创建后迭代
test('从 TypedArray 创建的 Buffer 应正确迭代', () => {
  const uint8 = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(uint8);

  // 修改原 TypedArray 不应影响 Buffer
  uint8[0] = 99;

  const values = [...buf.values()];
  if (values[0] !== 10) return false; // 应该还是 10，不受 uint8 修改影响
  return values.length === 3;
});

// 测试 5：Buffer.from 使用 ArrayBuffer 创建后迭代（共享内存）
test('从 ArrayBuffer 创建的 Buffer 应共享内存', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;

  const buf = Buffer.from(ab);

  // 修改原 ArrayBuffer 应该影响 Buffer（因为是共享内存）
  view[0] = 99;

  const values = [...buf.values()];
  if (values[0] !== 99) return false; // 应该是 99
  return true;
});

// 测试 6：concat 后的 Buffer 迭代
test('concat 创建的 Buffer 应正确迭代', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);

  // 修改原 Buffer 不应影响 concat 的结果
  buf1[0] = 99;

  const values = [...buf.values()];
  if (values[0] !== 1) return false; // concat 是复制，不受影响
  if (values.length !== 4) return false;
  return true;
});

// 测试 7：迭代器在迭代完成后的状态
test('迭代器完成后应持续返回相同的结果', () => {
  const buf = Buffer.from([1]);
  const iter = buf.values();

  iter.next(); // 消耗唯一的值
  const done1 = iter.next();
  const done2 = iter.next();
  const done3 = iter.next();

  if (!done1.done || !done2.done || !done3.done) return false;
  if (done1.value !== undefined || done2.value !== undefined || done3.value !== undefined) return false;
  return true;
});

// 测试 8：迭代器与 Buffer 索引混合使用
test('迭代器和索引访问应可以混合使用', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const iter = buf.values();

  const v1 = iter.next().value; // 10
  const idx1 = buf[1]; // 20
  const v2 = iter.next().value; // 20
  const idx2 = buf[2]; // 30

  return v1 === 10 && idx1 === 20 && v2 === 20 && idx2 === 30;
});

// 测试 9：使用 break 提前退出 for...of
test('使用 break 提前退出应正常工作', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  let sum = 0;

  for (const v of buf.values()) {
    sum += v;
    count++;
    if (count === 3) break;
  }

  return count === 3 && sum === 6; // 1+2+3
});

// 测试 10：使用 continue 跳过某些值
test('使用 continue 跳过值应正常工作', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let sum = 0;

  for (const v of buf.values()) {
    if (v % 2 === 0) continue;
    sum += v;
  }

  return sum === 9; // 1+3+5
});

// 测试 11：嵌套迭代相同 Buffer
test('嵌套迭代相同 Buffer 应正常工作', () => {
  const buf = Buffer.from([1, 2]);
  let count = 0;

  for (const v1 of buf.values()) {
    for (const v2 of buf.values()) {
      count++;
    }
  }

  return count === 4; // 2 * 2
});

// 测试 12：Buffer.allocUnsafeSlow 的迭代
test('Buffer.allocUnsafeSlow 应可迭代', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;

  const values = [...buf.values()];
  if (values.length !== 3) return false;
  if (values[0] !== 10 || values[2] !== 30) return false;
  return true;
});

// 测试 13：迭代器消费部分后转为数组
test('迭代器消费部分后应可转为数组获取剩余值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  iter.next(); // 1
  iter.next(); // 2

  const rest = [...iter];
  if (rest.length !== 3) return false;
  if (rest[0] !== 3 || rest[2] !== 5) return false;
  return true;
});

// 测试 14：Object.prototype 污染不影响迭代
test('Object.prototype 污染不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3]);

  // 临时污染（测试后清理）
  const originalProp = Object.prototype.testProp;
  Object.prototype.testProp = 999;

  const values = [...buf.values()];

  // 清理
  if (originalProp === undefined) {
    delete Object.prototype.testProp;
  } else {
    Object.prototype.testProp = originalProp;
  }

  // 验证迭代不受影响
  if (values.length !== 3) return false;
  if (values[0] !== 1 || values[2] !== 3) return false;
  return true;
});

// 测试 15：迭代器与 JSON.stringify 的配合
test('迭代器值应可用于构造 JSON', () => {
  const buf = Buffer.from([65, 66, 67]); // "ABC"
  const values = [...buf.values()];
  const json = JSON.stringify(values);

  if (json !== '[65,66,67]') return false;
  return true;
});

// 测试 16：零拷贝场景：Buffer 与底层 ArrayBuffer
test('Buffer 与底层 ArrayBuffer 的迭代', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;

  // 从 ArrayBuffer 的一部分创建 Buffer
  const buf = Buffer.from(ab, 1, 2);
  const values = [...buf.values()];

  if (values.length !== 2) return false;
  if (values[0] !== 2 || values[1] !== 3) return false;
  return true;
});

// 测试 17：迭代器的 return 方法（如果存在）
test('迭代器可能有 return 方法用于提前终止', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  // 某些迭代器实现有 return 方法
  if (typeof iter.return === 'function') {
    const result = iter.return();
    // return 应该返回 done: true
    if (!result.done) return false;
  }

  return true; // 如果没有 return 方法也是正常的
});

// 测试 18：迭代器的 throw 方法（如果存在）
test('迭代器可能有 throw 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  // 检查是否有 throw 方法（Generator 迭代器有，普通迭代器可能没有）
  const hasThrow = typeof iter.throw === 'function';

  // 不管有没有，都不应该崩溃
  return true;
});

// 测试 19：迭代非常大的 Buffer（性能测试）
test('迭代大 Buffer 应正常完成', () => {
  const size = 50000;
  const buf = Buffer.alloc(size, 42);

  let count = 0;
  for (const v of buf.values()) {
    count++;
    if (count === 1 && v !== 42) return false;
  }

  return count === size;
});

// 测试 20：迭代器与 WeakMap 的配合
test('迭代器应可用于收集数据到 Map', () => {
  const buf = Buffer.from([1, 2, 3]);
  const map = new Map();

  let index = 0;
  for (const v of buf.values()) {
    map.set(index++, v);
  }

  if (map.size !== 3) return false;
  if (map.get(0) !== 1 || map.get(2) !== 3) return false;
  return true;
});

const passed = tests.filter(t => t.passed === true).length;
const failed = tests.filter(t => t.passed === false).length;

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

return result
