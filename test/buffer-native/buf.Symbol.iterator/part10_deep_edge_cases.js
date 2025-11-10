// buf[Symbol.iterator] - Part 10: Deep Edge Cases Discovery
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅', passed: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// 深度边缘场景发现

// === 关键发现：Symbol.iterator === values ===
test('buf[Symbol.iterator] 与 buf.values 是同一个函数', () => {
  const buf = Buffer.from([1, 2, 3]);

  if (buf[Symbol.iterator] !== buf.values) {
    throw new Error('Symbol.iterator should be the same as values method');
  }

  // 验证行为一致性
  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf.values();

  const result1 = [...Array(3)].map(() => iter1.next());
  const result2 = [...Array(3)].map(() => iter2.next());

  for (let i = 0; i < 3; i++) {
    if (result1[i].value !== result2[i].value) {
      throw new Error('Symbol.iterator and values should produce same results');
    }
  }
});

// === Object.freeze/seal 不支持 Buffer ===
test('Object.freeze Buffer 应该抛出 TypeError', () => {
  const buf = Buffer.from([1, 2, 3]);

  let errorThrown = false;
  try {
    Object.freeze(buf);
  } catch (e) {
    errorThrown = true;
    if (!e.message.includes('Cannot freeze')) {
      throw new Error('Wrong error message');
    }
  }

  if (!errorThrown) {
    throw new Error('Should throw TypeError when freezing Buffer');
  }
});

test('Object.seal Buffer 应该抛出 TypeError', () => {
  const buf = Buffer.from([1, 2, 3]);

  let errorThrown = false;
  try {
    Object.seal(buf);
  } catch (e) {
    errorThrown = true;
    if (!e.message.includes('Cannot seal')) {
      throw new Error('Wrong error message');
    }
  }

  if (!errorThrown) {
    throw new Error('Should throw TypeError when sealing Buffer');
  }
});

test('Object.preventExtensions Buffer 应该成功', () => {
  const buf = Buffer.from([1, 2, 3]);

  // preventExtensions 应该成功（但没什么实际作用）
  Object.preventExtensions(buf);

  // 迭代应该仍然正常工作
  const result = [...buf];
  if (result.length !== 3) {
    throw new Error('preventExtensions should not affect iteration');
  }
});

// === 迭代器原型和构造器 ===
// 注：constructor 测试被移除（禁用关键词）

test('迭代器 Symbol.toStringTag 是 Array Iterator', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  if (iter[Symbol.toStringTag] !== 'Array Iterator') {
    throw new Error(`toStringTag should be 'Array Iterator', got ${iter[Symbol.toStringTag]}`);
  }
});

test('迭代器 Object.prototype.toString 返回 [object Array Iterator]', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const str = Object.prototype.toString.call(iter);
  if (str !== '[object Array Iterator]') {
    throw new Error(`toString should return '[object Array Iterator]', got ${str}`);
  }
});

// === 迭代器自身没有可枚举属性 ===
test('迭代器没有可枚举的自身属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const keys = Object.keys(iter);
  if (keys.length !== 0) {
    throw new Error('Iterator should have no enumerable own properties');
  }

  const ownProps = Object.getOwnPropertyNames(iter);
  if (ownProps.length !== 0) {
    throw new Error('Iterator should have no own property names');
  }
});

// === 迭代器的 next.length 是 0 ===
test('迭代器 next 方法 length 为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  if (iter.next.length !== 0) {
    throw new Error(`next.length should be 0, got ${iter.next.length}`);
  }
});

// === 迭代器消费后状态持久化 ===
test('迭代器消费后通过 Symbol.iterator 获取的仍是同一实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  // 消费一个元素
  iter.next();

  // 通过 Symbol.iterator 获取
  const sameIter = iter[Symbol.iterator]();

  if (sameIter !== iter) {
    throw new Error('Should return the same iterator instance');
  }

  // 验证状态共享
  const nextValue = sameIter.next();
  if (nextValue.value !== 2) {
    throw new Error('State should be shared after consuming one element');
  }
});

// === Buffer 属性修改后迭代 ===
test('删除 Buffer 的索引属性后迭代', () => {
  const buf = Buffer.from([10, 20, 30]);

  // 尝试删除索引属性（应该无效，Buffer 索引不可删除）
  delete buf[1];

  const result = [...buf];

  // 删除应该无效，值应该还在
  if (result[1] !== 20) {
    throw new Error('Delete should not affect Buffer indexed properties');
  }
});

test('重新赋值 Buffer[Symbol.iterator] 后迭代', () => {
  const buf = Buffer.from([1, 2, 3]);

  // 保存原始迭代器
  const originalIterator = buf[Symbol.iterator];

  // 重新赋值
  buf[Symbol.iterator] = function* () {
    yield 99;
    yield 88;
  };

  const result = [...buf];

  // 应该使用新的迭代器
  if (result[0] !== 99 || result[1] !== 88) {
    throw new Error('Should use the overridden iterator');
  }

  // 恢复原始迭代器
  buf[Symbol.iterator] = originalIterator;
});

// === 迭代过程中修改 Buffer 长度（不可能，但测试行为）===
test('迭代过程中尝试修改 Buffer.length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const result = [];
  let index = 0;
  for (const byte of buf) {
    result.push(byte);

    // 尝试修改 length（应该无效或抛错）
    if (index === 2) {
      try {
        buf.length = 10; // 尝试扩大
      } catch (e) {
        // 可能抛错
      }
    }
    index++;
  }

  // 应该迭代完所有原始元素
  if (result.length !== 5) {
    throw new Error('Should iterate all original elements');
  }
});

// === Buffer 作为 TypedArray 的特殊性 ===
test('Buffer 是 Uint8Array 的实例', () => {
  const buf = Buffer.from([1, 2, 3]);

  if (!(buf instanceof Uint8Array)) {
    throw new Error('Buffer should be instance of Uint8Array');
  }

  // 迭代行为应该一致
  const uint8 = new Uint8Array([1, 2, 3]);
  const bufResult = [...buf];
  const uint8Result = [...uint8];

  if (JSON.stringify(bufResult) !== JSON.stringify(uint8Result)) {
    throw new Error('Buffer and Uint8Array iteration should be identical');
  }
});

// === 迭代器与 WeakMap/WeakSet ===
test('迭代器可以作为 WeakMap 的键', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const weakMap = new WeakMap();
  weakMap.set(iter, 'test value');

  if (weakMap.get(iter) !== 'test value') {
    throw new Error('Iterator should work as WeakMap key');
  }
});

test('迭代器可以添加到 WeakSet', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const weakSet = new WeakSet();
  weakSet.add(iter);

  if (!weakSet.has(iter)) {
    throw new Error('Iterator should work in WeakSet');
  }
});

// === 空 Buffer 的边界行为 ===
test('空 Buffer 迭代器立即完成且 value 为 undefined', () => {
  const buf = Buffer.alloc(0);
  const iter = buf[Symbol.iterator]();

  const result = iter.next();

  if (result.done !== true) {
    throw new Error('Empty buffer iterator should be done immediately');
  }

  if (result.value !== undefined) {
    throw new Error('Empty buffer iterator done value should be undefined');
  }
});

// === 迭代器与 JSON.stringify ===
test('迭代器 JSON.stringify 返回空对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const json = JSON.stringify(iter);

  if (json !== '{}') {
    throw new Error(`Iterator JSON should be {}, got ${json}`);
  }
});

// === 迭代器与 for...in ===
test('迭代器 for...in 不应迭代任何属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  let count = 0;
  for (const key in iter) {
    count++;
  }

  if (count !== 0) {
    throw new Error('for...in on iterator should not iterate any properties');
  }
});

// === Buffer 迭代与 Array.isArray ===
test('Buffer 迭代结果可以被 Array.isArray 识别', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = [...buf];

  if (!Array.isArray(arr)) {
    throw new Error('Spread result should be an array');
  }
});

// === 迭代器与 instanceof ===
test('迭代器不是 Array 实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  if (iter instanceof Array) {
    throw new Error('Iterator should not be Array instance');
  }
});

test('迭代器不是 Object 实例（特殊情况）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  // 实际上所有对象都是 Object 实例
  if (!(iter instanceof Object)) {
    throw new Error('Iterator should be Object instance');
  }
});

// === Uint8Array 迭代器与 Buffer 迭代器完全一致 ===
test('Buffer 和 Uint8Array 迭代器行为完全一致', () => {
  const data = [10, 20, 30, 40, 50];
  const buf = Buffer.from(data);
  const uint8 = new Uint8Array(data);

  const bufIter = buf[Symbol.iterator]();
  const uint8Iter = uint8[Symbol.iterator]();

  // 比较每一步
  for (let i = 0; i < data.length + 1; i++) {
    const bufNext = bufIter.next();
    const uint8Next = uint8Iter.next();

    if (bufNext.value !== uint8Next.value || bufNext.done !== uint8Next.done) {
      throw new Error(`Mismatch at iteration ${i}`);
    }
  }
});

// === 迭代器的原型链 ===
// 注：原型链测试被移除（使用了 Object.getPrototypeOf 禁用关键词）

// === Buffer.subarray 和 slice 迭代器独立性再验证 ===
test('subarray 和原 Buffer 的迭代器完全独立', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const sub = original.subarray(1, 4); // [2,3,4]

  const origIter = original[Symbol.iterator]();
  const subIter = sub[Symbol.iterator]();

  // 消费不同数量
  origIter.next();
  origIter.next();

  subIter.next();

  // 应该互不影响
  const origNext = origIter.next();
  const subNext = subIter.next();

  if (origNext.value !== 3) {
    throw new Error('Original iterator should be at position 3');
  }

  if (subNext.value !== 3) {
    throw new Error('Subarray iterator should be at position 2 (value 3)');
  }
});

// === 边界：Buffer 最大索引访问 ===
test('迭代大索引 Buffer 的边界元素', () => {
  const buf = Buffer.alloc(1000);
  buf[0] = 1;
  buf[999] = 255;

  let first = null;
  let last = null;
  let count = 0;

  for (const byte of buf) {
    if (count === 0) first = byte;
    last = byte;
    count++;
  }

  if (first !== 1 || last !== 255) {
    throw new Error('Boundary elements mismatch');
  }

  if (count !== 1000) {
    throw new Error('Should iterate exactly 1000 elements');
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 10: Deep Edge Cases',
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log('\n' + JSON.stringify(result, null, 2));
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
