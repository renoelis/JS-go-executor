// buf.values() - 深度补充 Part 14: keys/entries 与其他迭代方法交互
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

// 测试 1: buf.keys() 返回索引迭代器
test('buf.keys() 应返回索引迭代器', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = [...buf.keys()];

  if (keys.length !== 3) return false;
  if (keys[0] !== 0 || keys[1] !== 1 || keys[2] !== 2) return false;
  return true;
});

// 测试 2: buf.entries() 返回 [index, value] 对
test('buf.entries() 应返回 [index, value] 对', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = [...buf.entries()];

  if (entries.length !== 3) return false;
  if (!Array.isArray(entries[0])) return false;
  if (entries[0][0] !== 0 || entries[0][1] !== 10) return false;
  if (entries[2][0] !== 2 || entries[2][1] !== 30) return false;
  return true;
});

// 测试 3: keys/entries/values 独立性
test('keys/entries/values 应返回独立迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);

  const keysIter = buf.keys();
  const entriesIter = buf.entries();
  const valuesIter = buf.values();

  keysIter.next();
  entriesIter.next();
  // valuesIter 不动

  const k = keysIter.next().value;
  const e = entriesIter.next().value;
  const v = valuesIter.next().value;

  // keys 在 1, entries 在 1, values 在 0
  return k === 1 && e[0] === 1 && v === 1;
});

// 测试 4: 空 Buffer 的 keys
test('空 Buffer 的 keys 应立即结束', () => {
  const buf = Buffer.alloc(0);
  const keys = [...buf.keys()];

  return keys.length === 0;
});

// 测试 5: 空 Buffer 的 entries
test('空 Buffer 的 entries 应立即结束', () => {
  const buf = Buffer.alloc(0);
  const entries = [...buf.entries()];

  return entries.length === 0;
});

// 测试 6: buf.forEach 遍历
test('buf.forEach 应遍历所有字节', () => {
  const buf = Buffer.from([10, 20, 30]);
  const values = [];

  buf.forEach(v => values.push(v));

  if (values.length !== 3) return false;
  if (values[0] !== 10 || values[2] !== 30) return false;
  return true;
});

// 测试 7: forEach 带索引参数
test('buf.forEach 应提供索引参数', () => {
  const buf = Buffer.from([10, 20, 30]);
  const pairs = [];

  buf.forEach((v, i) => pairs.push([i, v]));

  if (pairs.length !== 3) return false;
  if (pairs[0][0] !== 0 || pairs[0][1] !== 10) return false;
  return true;
});

// 测试 8: forEach 带 buffer 参数
test('buf.forEach 应提供 buffer 参数', () => {
  const buf = Buffer.from([10, 20, 30]);
  let receivedBuf = null;

  buf.forEach((v, i, b) => {
    if (i === 0) receivedBuf = b;
  });

  return receivedBuf === buf;
});

// 测试 9: forEach 修改 Buffer 影响后续迭代
test('forEach 中修改 Buffer 应影响后续元素', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = [];

  buf.forEach((v, i) => {
    values.push(v);
    if (i === 0) buf[1] = 99;
  });

  // 第一个是 1，第二个应该是 99
  return values[0] === 1 && values[1] === 99;
});

// 测试 10: forEach 与 values() 的区别
test('forEach 不返回迭代器，values() 返回', () => {
  const buf = Buffer.from([1, 2, 3]);

  const forEachResult = buf.forEach(v => {});
  const valuesResult = buf.values();

  return forEachResult === undefined && typeof valuesResult.next === 'function';
});

// 测试 11: buf.some() 方法
test('buf.some() 应正确判断', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const hasEven = buf.some(x => x % 2 === 0);
  const hasLarge = buf.some(x => x > 10);

  return hasEven === true && hasLarge === false;
});

// 测试 12: buf.every() 方法
test('buf.every() 应正确判断', () => {
  const buf = Buffer.from([2, 4, 6, 8]);

  const allEven = buf.every(x => x % 2 === 0);
  const allLarge = buf.every(x => x > 1);

  return allEven === true && allLarge === true;
});

// 测试 13: buf.find() 方法
test('buf.find() 应找到第一个匹配', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const found = buf.find(x => x > 2);
  const notFound = buf.find(x => x > 10);

  return found === 3 && notFound === undefined;
});

// 测试 14: buf.findIndex() 方法
test('buf.findIndex() 应返回索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const foundIdx = buf.findIndex(x => x > 2);
  const notFoundIdx = buf.findIndex(x => x > 10);

  return foundIdx === 2 && notFoundIdx === -1;
});

// 测试 15: buf.includes() 检查值
test('buf.includes() 应检查字节值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const has3 = buf.includes(3);
  const has10 = buf.includes(10);

  return has3 === true && has10 === false;
});

// 测试 16: buf.includes() 带起始位置
test('buf.includes() 带起始位置应正确', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);

  const has2From0 = buf.includes(2, 0);
  const has2From2 = buf.includes(2, 2);
  const has2From4 = buf.includes(2, 4);

  return has2From0 === true && has2From2 === true && has2From4 === false;
});

// 测试 17: buf.slice() vs buf.subarray() 迭代对比
test('slice 和 subarray 在 Node v25 中行为应一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const sliced = buf.slice(1, 4);
  const subarrayed = buf.subarray(1, 4);

  buf[2] = 99;

  const slicedVals = [...sliced.values()];
  const subarrayedVals = [...subarrayed.values()];

  // 在 Node v25 中，两者都应该反映修改
  return slicedVals[1] === 99 && subarrayedVals[1] === 99;
});

// 测试 18: buf.copyWithin() 影响迭代
test('buf.copyWithin() 应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  buf.copyWithin(0, 3, 5); // 将 [4,5] 复制到开头

  const values = [...buf.values()];
  return values[0] === 4 && values[1] === 5;
});

// 测试 19: buf.fill() 带范围
test('buf.fill() 指定范围应部分填充', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  buf.fill(99, 1, 4); // 从索引 1 到 3

  const values = [...buf.values()];
  // [1, 99, 99, 99, 5]
  return values[0] === 1 && values[1] === 99 && values[4] === 5;
});

// 测试 20: buf.slice() 负索引
test('buf.slice() 负索引应正确处理', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const sliced = buf.slice(-3, -1);
  const values = [...sliced.values()];

  // 应该是 [3, 4]
  return values.length === 2 && values[0] === 3 && values[1] === 4;
});

// 测试 21: buf.sort() 影响迭代
test('buf.sort() 应改变迭代顺序', () => {
  const buf = Buffer.from([5, 3, 1, 4, 2]);

  buf.sort();

  const values = [...buf.values()];
  // 应该排序为 [1, 2, 3, 4, 5]
  return values[0] === 1 && values[4] === 5;
});

// 测试 22: buf.reverse() 双重反转
test('buf.reverse() 两次应恢复原状', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const original = [...buf.values()];

  buf.reverse();
  buf.reverse();

  const restored = [...buf.values()];

  return original.every((v, i) => v === restored[i]);
});

// 测试 23: buf.set() 方法（从 TypedArray 继承）
test('buf.set() 应设置多个值', () => {
  const buf = Buffer.alloc(5);
  const source = new Uint8Array([10, 20, 30]);

  buf.set(source, 1); // 从索引 1 开始设置

  const values = [...buf.values()];
  // [0, 10, 20, 30, 0]
  return values[0] === 0 && values[1] === 10 && values[3] === 30 && values[4] === 0;
});

// 测试 24: buf.subarray() 零长度
test('buf.subarray() 返回零长度应正确', () => {
  const buf = Buffer.from([1, 2, 3]);

  const sub1 = buf.subarray(1, 1);
  const sub2 = buf.subarray(5, 10);

  const v1 = [...sub1.values()];
  const v2 = [...sub2.values()];

  return v1.length === 0 && v2.length === 0;
});

// 测试 25: buf.indexOf() 找不到返回 -1
test('buf.indexOf() 找不到应返回 -1', () => {
  const buf = Buffer.from([1, 2, 3]);

  const idx = buf.indexOf(99);

  return idx === -1;
});

// 测试 26: buf.lastIndexOf() 找到最后一个
test('buf.lastIndexOf() 应找到最后一个', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);

  const idx = buf.lastIndexOf(2);

  return idx === 3;
});

// 测试 27: buf.toString() 各种编码
test('buf.toString() 不同编码应正确', () => {
  const buf = Buffer.from([72, 101, 108, 108, 111]); // "Hello"

  const utf8 = buf.toString('utf8');
  const hex = buf.toString('hex');
  const base64 = buf.toString('base64');

  return utf8 === 'Hello' && hex === '48656c6c6f' && base64 === 'SGVsbG8=';
});

// 测试 28: buf.toJSON() 返回对象
test('buf.toJSON() 应返回对象', () => {
  const buf = Buffer.from([1, 2, 3]);

  const json = buf.toJSON();

  return json.type === 'Buffer' && Array.isArray(json.data) && json.data.length === 3;
});

// 测试 29: Buffer.isBuffer() 判断
test('Buffer.isBuffer() 应正确判断', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = [1, 2, 3];
  const uint8 = new Uint8Array([1, 2, 3]);

  return Buffer.isBuffer(buf) === true && Buffer.isBuffer(arr) === false && Buffer.isBuffer(uint8) === false;
});

// 测试 30: Buffer.byteLength() 静态方法
test('Buffer.byteLength() 应计算字节长度', () => {
  const len1 = Buffer.byteLength('Hello');
  const len2 = Buffer.byteLength('测试', 'utf8');

  const buf1 = Buffer.from('Hello');
  const buf2 = Buffer.from('测试', 'utf8');

  return len1 === buf1.length && len2 === buf2.length;
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
