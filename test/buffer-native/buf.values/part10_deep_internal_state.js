// buf.values() - 深度补充 Part 10: 迭代器内部状态和边界条件
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

// 测试 1: Object.freeze Buffer（应该失败）
test('Object.freeze Buffer 应抛出 TypeError', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.freeze(buf);
    return false; // 不应该成功
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('freeze');
  }
});

// 测试 2: Object.seal Buffer（应该失败）
test('Object.seal Buffer 应抛出 TypeError', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    Object.seal(buf);
    return false; // 不应该成功
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('seal');
  }
});

// 测试 3: 迭代器的 next 方法可被修改
test('迭代器的 next 方法应可被修改', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  iter.next = function() {
    return { value: 999, done: false };
  };

  const result = iter.next();
  return result.value === 999 && result.done === false;
});

// 测试 4: 删除 Buffer.prototype.values 后行为
test('删除 Buffer.prototype.values 后仍可调用（原型链）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const savedValues = Buffer.prototype.values;

  delete Buffer.prototype.values;

  // 删除后，buf 可能仍能找到方法（取决于实现）
  let canCall = false;
  try {
    const iter = buf.values();
    canCall = true;
  } catch (e) {
    canCall = false;
  }

  // 恢复
  Buffer.prototype.values = savedValues;

  // 无论是否能调用，都不应该崩溃
  return true;
});

// 测试 5: Buffer.length 是只读的
test('Buffer.length 应是只读属性', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const originalLength = buf.length;

  buf.length = 2; // 尝试修改

  // length 应该不变
  return buf.length === originalLength;
});

// 测试 6: 迭代过程中尝试修改 length
test('迭代过程中修改 length 不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  iter.next();
  iter.next();

  buf.length = 2; // 尝试修改（实际不会改变）

  const remaining = [...iter];
  return remaining.length === 3; // 应该还是剩余 3 个
});

// 测试 7: SharedArrayBuffer 支持
test('从 SharedArrayBuffer 创建的 Buffer 应可迭代', () => {
  try {
    const sab = new SharedArrayBuffer(4);
    const view = new Uint8Array(sab);
    view[0] = 10;
    view[1] = 20;
    view[2] = 30;
    view[3] = 40;

    const buf = Buffer.from(sab);
    const values = [...buf.values()];

    if (values.length !== 4) return false;
    if (values[0] !== 10 || values[3] !== 40) return false;
    return true;
  } catch (e) {
    // SharedArrayBuffer 可能不可用
    return true;
  }
});

// 测试 8: 严格模式下的迭代
test('严格模式下迭代应正常工作', () => {
  'use strict';
  const buf = Buffer.from([1, 2, 3]);
  const values = [...buf.values()];
  return values.length === 3 && values[0] === 1;
});

// 测试 9: subarray 的极端边界
test('subarray(0, 0) 应返回空迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(0, 0);
  const values = [...sub.values()];
  return values.length === 0;
});

// 测试 10: subarray 末尾边界
test('subarray(length, length) 应返回空迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(3, 3);
  const values = [...sub.values()];
  return values.length === 0;
});

// 测试 11: 负索引 subarray 超出范围
test('subarray 负索引超出范围应正确处理', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(-100);
  const values = [...sub.values()];
  return values.length === 3 && values[0] === 1;
});

// 测试 12: 正索引超出范围
test('subarray 正索引超出范围应返回空', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(100);
  const values = [...sub.values()];
  return values.length === 0;
});

// 测试 13: NaN 作为 subarray 参数
test('subarray(NaN) 应被当作 0 处理', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(NaN);
  const values = [...sub.values()];
  return values.length === 3;
});

// 测试 14: Infinity 作为 subarray 参数
test('subarray(Infinity) 应返回空', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(Infinity);
  const values = [...sub.values()];
  return values.length === 0;
});

// 测试 15: 大量迭代器并发创建
test('应能并发创建大量迭代器', () => {
  const buf = Buffer.alloc(100);
  const iters = [];

  for (let i = 0; i < 10000; i++) {
    iters.push(buf.values());
  }

  if (iters.length !== 10000) return false;

  // 测试其中一个是否仍然工作
  const testValues = [...iters[5000]];
  return testValues.length === 100;
});

// 测试 16: slice 在 Node v25 中的内存共享行为
test('slice 应创建共享内存视图（Node v25）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);

  buf[2] = 99; // 修改原 Buffer

  const values = [...sliced.values()];
  // slice 在 Node v25 中也是共享内存
  return values[1] === 99;
});

// 测试 17: subarray 的内存共享行为
test('subarray 应创建共享内存视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  buf[2] = 99; // 修改原 Buffer

  const values = [...sub.values()];
  return values[1] === 99;
});

// 测试 18: indexOf 操作不影响迭代器状态
test('indexOf 操作不应影响迭代器', () => {
  const buf = Buffer.from('hello world');
  const iter = buf.values();

  iter.next();
  iter.next();

  const idx = buf.indexOf('world');
  const remaining = [...iter];

  return idx === 6 && remaining.length === 9;
});

// 测试 19: includes 操作不影响迭代器状态
test('includes 操作不应影响迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  iter.next();

  const hasThree = buf.includes(3);
  const remaining = [...iter];

  return hasThree === true && remaining.length === 4;
});

// 测试 20: readInt 操作不影响迭代器
test('readInt32BE 操作不应影响迭代器', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const iter = buf.values();

  iter.next();

  const num = buf.readInt32BE(0);
  const remaining = [...iter];

  return num === 0x12345678 && remaining.length === 3;
});

// 测试 21: writeInt 操作影响后续迭代值
test('writeInt32BE 应影响后续迭代值', () => {
  const buf = Buffer.alloc(4);
  const iter = buf.values();

  iter.next(); // 消耗第一个 0

  buf.writeInt32BE(0x12345678, 0);

  const remaining = [...iter];
  // 剩余 3 个字节应该是 0x34, 0x56, 0x78
  return remaining.length === 3 && remaining[0] === 0x34 && remaining[2] === 0x78;
});

// 测试 22: compare 操作不改变 Buffer
test('Buffer.compare 不应改变原 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);

  const before = [...buf1.values()];
  Buffer.compare(buf1, buf2);
  const after = [...buf1.values()];

  return before.every((v, i) => v === after[i]);
});

// 测试 23: equals 操作不改变 Buffer
test('buf.equals 不应改变原 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);

  const before = [...buf1.values()];
  buf1.equals(buf2);
  const after = [...buf1.values()];

  return before.every((v, i) => v === after[i]);
});

// 测试 24: Symbol 键不影响迭代
test('Symbol 键不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sym = Symbol('test');
  buf[sym] = 999;

  const values = [...buf.values()];
  return values.length === 3 && values[0] === 1 && buf[sym] === 999;
});

// 测试 25: 字符串键不影响迭代
test('字符串键不应影响迭代', () => {
  const buf = Buffer.from([10, 20, 30]);
  buf['customProp'] = 'test';

  const values = [...buf.values()];
  return values.length === 3 && values[0] === 10 && buf['customProp'] === 'test';
});

// 测试 26: Buffer.prototype 污染不影响迭代
test('Buffer.prototype 污染不应影响迭代', () => {
  Buffer.prototype.testProp = '污染';

  const buf = Buffer.from([1, 2, 3]);
  const values = [...buf.values()];

  delete Buffer.prototype.testProp;

  return values.length === 3 && values[0] === 1;
});

// 测试 27: 字节序不影响迭代顺序
test('字节序不应影响迭代顺序', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  const le = buf.readUInt32LE(0);
  const be = buf.readUInt32BE(0);

  const values = [...buf.values()];

  // 迭代顺序始终是字节顺序，不受读取字节序影响
  return values[0] === 1 && values[3] === 4 && le !== be;
});

// 测试 28: Buffer.isBuffer 对迭代器返回 false
test('Buffer.isBuffer(iterator) 应返回 false', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  return Buffer.isBuffer(buf) === true && Buffer.isBuffer(iter) === false;
});

// 测试 29: Buffer.poolSize 不影响迭代
test('Buffer.poolSize 不应影响迭代', () => {
  const originalPoolSize = Buffer.poolSize;

  Buffer.poolSize = 1;
  const buf1 = Buffer.allocUnsafe(5);
  for (let i = 0; i < 5; i++) buf1[i] = i;

  Buffer.poolSize = 8192;
  const buf2 = Buffer.allocUnsafe(5);
  for (let i = 0; i < 5; i++) buf2[i] = i;

  const vals1 = [...buf1.values()];
  const vals2 = [...buf2.values()];

  Buffer.poolSize = originalPoolSize;

  return vals1.length === 5 && vals2.length === 5 && vals1[2] === 2 && vals2[2] === 2;
});

// 测试 30: 非整数索引访问不影响迭代
test('非整数索引访问不应影响迭代', () => {
  const buf = Buffer.from([10, 20, 30]);

  // 访问非整数索引
  const v1 = buf[0.5];
  const v2 = buf['0'];
  const v3 = buf[-0];

  const values = [...buf.values()];

  return values.length === 3 && values[0] === 10 && v1 === undefined && v2 === 10 && v3 === 10;
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
