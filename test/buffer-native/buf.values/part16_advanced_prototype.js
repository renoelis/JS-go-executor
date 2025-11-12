// buf.values() - 深度补充 Part 16: 原型链和高级特性
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

// 测试 1: Buffer.prototype 自定义方法不影响迭代
test('Buffer.prototype 自定义方法不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  Buffer.prototype.customMethod = function() { return 'custom'; };

  const hasCustom = buf.customMethod() === 'custom';
  const values = [...buf.values()];

  delete Buffer.prototype.customMethod;

  return hasCustom && values.length === 3 && values[0] === 1;
});

// 测试 2: 迭代器没有 return 方法
test('迭代器不应有 return 方法', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  return typeof iter.return !== 'function';
});

// 测试 3: 迭代器没有 throw 方法
test('迭代器不应有 throw 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  return typeof iter.throw !== 'function';
});

// 测试 4: Object.prototype.toString 返回 [object Uint8Array]
test('Buffer 的 toString tag 应为 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  const tag = Object.prototype.toString.call(buf);

  return tag === '[object Uint8Array]';
});

// 测试 5: Buffer 是 Uint8Array 实例
test('Buffer 应是 Uint8Array 的实例', () => {
  const buf = Buffer.from([1, 2, 3]);

  return buf instanceof Uint8Array && buf instanceof Object;
});

// 测试 6: BYTES_PER_ELEMENT 属性
test('Buffer 应有 BYTES_PER_ELEMENT 属性为 1', () => {
  const buf = Buffer.from([1, 2, 3]);

  return buf.BYTES_PER_ELEMENT === 1;
});

// 测试 7: Buffer[Symbol.species]
test('Buffer[Symbol.species] 应存在', () => {
  return typeof Buffer[Symbol.species] === 'function';
});

// 测试 8: slice 使用 Symbol.species
test('slice 应使用 Symbol.species 创建实例', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 3);

  return sliced instanceof Buffer;
});

// 测试 9: Object.isFrozen 初始为 false
test('Buffer 初始不应被冻结', () => {
  const buf = Buffer.from([1, 2, 3]);

  return !Object.isFrozen(buf);
});

// 测试 10: Object.isSealed 初始为 false
test('Buffer 初始不应被密封', () => {
  const buf = Buffer.from([1, 2, 3]);

  return !Object.isSealed(buf);
});

// 测试 11: Object.isExtensible 初始为 true
test('Buffer 初始应可扩展', () => {
  const buf = Buffer.from([1, 2, 3]);

  return Object.isExtensible(buf);
});

// 测试 12: Object.preventExtensions 不影响值修改
test('preventExtensions 后仍可修改值', () => {
  const buf = Buffer.from([1, 2, 3]);
  Object.preventExtensions(buf);

  buf[0] = 99;
  const canModify = buf[0] === 99;
  const canIterate = [...buf.values()].length === 3;

  return !Object.isExtensible(buf) && canModify && canIterate;
});

// 测试 13: 迭代器 toString 返回 [object Array Iterator]
test('迭代器 toString 应返回 Array Iterator', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const tag = Object.prototype.toString.call(iter);

  return tag === '[object Array Iterator]';
});

// 测试 14: 迭代器 next 方法名称
test('迭代器 next 方法应有名称', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  return iter.next.name === 'next';
});

// 测试 15: values/keys/entries 不在 Buffer.prototype 自有属性中
test('values 方法应继承自 Uint8Array', () => {
  const hasValues = Object.getOwnPropertyNames(Buffer.prototype).includes('values');
  const hasKeys = Object.getOwnPropertyNames(Buffer.prototype).includes('keys');
  const hasEntries = Object.getOwnPropertyNames(Buffer.prototype).includes('entries');

  // 这些方法继承自 Uint8Array.prototype
  return !hasValues && !hasKeys && !hasEntries;
});

// 测试 16: Generator yield* 支持
test('Generator 应支持 yield* buf.values()', () => {
  function* gen() {
    const buf = Buffer.from([10, 20, 30]);
    yield* buf.values();
  }

  const values = [...gen()];
  return values.length === 3 && values[0] === 10 && values[2] === 30;
});

// 测试 17: Array.from 第二参数 mapFn
test('Array.from 应支持 mapFn 参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const doubled = Array.from(buf.values(), x => x * 2);

  return doubled.length === 3 && doubled[0] === 2 && doubled[2] === 6;
});

// 测试 18: Array.from mapFn 带索引
test('Array.from mapFn 应接收索引参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const withIndex = Array.from(buf.values(), (x, i) => x + i);

  return withIndex.length === 3 && withIndex[0] === 1 && withIndex[2] === 5;
});

// 测试 19: Buffer.toLocaleString
test('Buffer.toLocaleString 应与 toString 一致', () => {
  const buf = Buffer.from([1, 2, 3]);

  return buf.toLocaleString() === buf.toString();
});

// 测试 20: Set 构造去重
test('Set 应能从 buf.values() 构造并去重', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);
  const set = new Set(buf.values());

  return set.size === 3 && set.has(1) && set.has(2) && set.has(3);
});

// 测试 21: Map 从 entries 构造
test('Map 应能从 buf.entries() 构造', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const map = new Map(buf.entries());

  if (map.size !== 5) return false;
  if (map.get(0) !== 10) return false;
  if (map.get(2) !== 30) return false;
  if (map.get(4) !== 50) return false;

  return true;
});

// 测试 22: 空 Buffer 的 forEach 不执行
test('空 Buffer forEach 不应执行回调', () => {
  const empty = Buffer.alloc(0);
  let executed = false;

  empty.forEach(() => { executed = true; });

  return !executed;
});

// 测试 23: 空 Buffer 的 some 返回 false
test('空 Buffer some 应返回 false', () => {
  const empty = Buffer.alloc(0);

  return empty.some(() => true) === false;
});

// 测试 24: 空 Buffer 的 every 返回 true
test('空 Buffer every 应返回 true', () => {
  const empty = Buffer.alloc(0);

  return empty.every(() => false) === true;
});

// 测试 25: for-await-of 支持同步迭代器
test('for-await-of 应支持 buf.values()', () => {
  // for-await-of 会将同步迭代器当作异步迭代器处理
  // 这里验证迭代器可以被 for-await-of 使用（虽然是同步的）
  const buf = Buffer.from([1, 2, 3]);

  // 由于测试框架是同步的，我们只验证迭代器的基本特性
  // 实际的 for-await-of 需要在 async 上下文中测试
  const iter = buf.values();
  const hasNext = typeof iter.next === 'function';
  const hasSymbolIterator = typeof iter[Symbol.iterator] === 'function';

  return hasNext && hasSymbolIterator;
});

// 测试 26: Buffer.poolSize 可修改
test('Buffer.poolSize 应可修改', () => {
  const oldSize = Buffer.poolSize;
  Buffer.poolSize = 1024;
  const modified = Buffer.poolSize === 1024;
  Buffer.poolSize = oldSize;
  const restored = Buffer.poolSize === oldSize;

  return modified && restored;
});

// 测试 27: Buffer.isEncoding 大小写不敏感
test('Buffer.isEncoding 应大小写不敏感', () => {
  return Buffer.isEncoding('utf8') &&
         Buffer.isEncoding('UTF-8') &&
         Buffer.isEncoding('utf-8') &&
         Buffer.isEncoding('Utf8');
});

// 测试 28: Buffer.isEncoding 对非法值
test('Buffer.isEncoding 对非法值应返回 false', () => {
  return !Buffer.isEncoding('xxx') &&
         !Buffer.isEncoding(null) &&
         !Buffer.isEncoding(undefined) &&
         !Buffer.isEncoding(123);
});

// 测试 29: Buffer.isEncoding 支持 binary
test('Buffer.isEncoding 应支持 binary 编码', () => {
  return Buffer.isEncoding('binary');
});

// 测试 30: Buffer 与 DataView 互操作
test('Buffer 应可与 DataView 互操作', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const original = dv.getUint16(0, false);
  dv.setUint16(0, 0xAABB, false);

  const values = [...buf.values()];

  // DataView 修改应反映到 Buffer
  return values[0] === 0xAA && values[1] === 0xBB;
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
