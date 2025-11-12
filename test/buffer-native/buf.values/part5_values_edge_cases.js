// buf.values() - 边界和极端情况测试
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

// 测试 1：零长度 Buffer
test('零长度 Buffer 的迭代器应立即完成', () => {
  const buf = Buffer.alloc(0);
  const values = [...buf.values()];
  return values.length === 0;
});

// 测试 2：长度为 1 的 Buffer
test('长度为 1 的 Buffer 应返回一个值', () => {
  const buf = Buffer.from([255]);
  const values = [...buf.values()];
  if (values.length !== 1) return false;
  if (values[0] !== 255) return false;
  return true;
});

// 测试 3：大 Buffer 迭代（10000 字节）
test('大 Buffer (10000 字节) 应正确迭代', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = i % 256;
  }

  const values = [...buf.values()];
  if (values.length !== size) return false;

  // 抽样检查
  if (values[0] !== 0) return false;
  if (values[255] !== 255) return false;
  if (values[256] !== 0) return false;
  if (values[9999] !== 9999 % 256) return false;

  return true;
});

// 测试 4：所有可能的字节值 (0-255)
test('应正确迭代所有可能的字节值 0-255', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }

  const values = [...buf.values()];
  if (values.length !== 256) return false;

  for (let i = 0; i < 256; i++) {
    if (values[i] !== i) return false;
  }

  return true;
});

// 测试 5：slice 后的零长度 Buffer
test('slice 产生的零长度 Buffer 应正确迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(1, 1);
  const values = [...sliced.values()];
  return values.length === 0;
});

// 测试 6：负索引 slice
test('负索引 slice 后的 Buffer 应正确迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(-3, -1);
  const values = [...sliced.values()];
  if (values.length !== 2) return false;
  if (values[0] !== 3 || values[1] !== 4) return false;
  return true;
});

// 测试 7：subarray 的边界情况
test('subarray 到末尾应正确迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(3);
  const values = [...sub.values()];
  if (values.length !== 2) return false;
  if (values[0] !== 4 || values[1] !== 5) return false;
  return true;
});

// 测试 8：修改 Buffer 在迭代过程中
test('迭代过程中修改 Buffer 应反映在后续值中', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  const v1 = iter.next().value; // 1
  buf[1] = 99;
  const v2 = iter.next().value; // 应该是 99
  buf[2] = 88;
  const v3 = iter.next().value; // 应该是 88

  if (v1 !== 1 || v2 !== 99 || v3 !== 88) return false;
  return true;
});

// 测试 9：修改共享内存的 subarray
test('修改共享内存的 subarray 应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  const iter = sub.values();
  const v1 = iter.next().value; // 2

  buf[2] = 99; // 修改原 Buffer，影响 sub
  const v2 = iter.next().value; // 应该是 99

  if (v1 !== 2 || v2 !== 99) return false;
  return true;
});

// 测试 10：多字节 UTF-8 字符的字节迭代
test('多字节 UTF-8 字符应按字节迭代', () => {
  const buf = Buffer.from('🔥', 'utf8'); // emoji 是 4 字节
  const values = [...buf.values()];
  if (values.length !== 4) return false;

  // 检查所有值都是有效字节
  for (const val of values) {
    if (val < 0 || val > 255 || !Number.isInteger(val)) return false;
  }
  return true;
});

// 测试 11：Latin-1 编码
test('Latin-1 编码的 Buffer 应正确迭代', () => {
  const buf = Buffer.from('café', 'latin1');
  const values = [...buf.values()];
  if (values.length !== 4) return false;
  return true;
});

// 测试 12：二进制数据
test('二进制数据应正确迭代', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x80, 0x7F, 0x01]);
  const values = [...buf.values()];
  if (values.length !== 5) return false;
  if (values[0] !== 0 || values[1] !== 255 || values[2] !== 128 || values[3] !== 127 || values[4] !== 1) return false;
  return true;
});

// 测试 13：重复调用 values() 的独立性
test('多次调用 values() 应返回完全独立的迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.values();
  const iter2 = buf.values();
  const iter3 = buf.values();

  iter1.next();
  iter2.next();
  iter2.next();

  const v1 = iter1.next().value;
  const v2 = iter2.next().value;
  const v3 = iter3.next().value;

  // iter1 在位置 2 (值 2)，iter2 在位置 3 (值 3)，iter3 在位置 1 (值 1)
  if (v1 !== 2 || v2 !== 3 || v3 !== 1) return false;
  return true;
});

// 测试 14：空字符串创建的 Buffer
test('空字符串创建的 Buffer 应返回空迭代器', () => {
  const buf = Buffer.from('', 'utf8');
  const values = [...buf.values()];
  return values.length === 0;
});

// 测试 15：无效 hex 字符串（会被截断）
test('无效 hex 字符串创建的 Buffer 应正确迭代', () => {
  const buf = Buffer.from('48656c', 'hex'); // 有效的 3 字节
  const values = [...buf.values()];
  if (values.length !== 3) return false;
  if (values[0] !== 0x48 || values[1] !== 0x65 || values[2] !== 0x6c) return false;
  return true;
});

// 测试 16：Buffer.allocUnsafe 的迭代
test('Buffer.allocUnsafe 应可迭代（即使内容未初始化）', () => {
  const buf = Buffer.allocUnsafe(5);
  // 不关心具体值，只关心能迭代
  const values = [...buf.values()];
  if (values.length !== 5) return false;

  // 每个值都应该是 0-255 的整数
  for (const val of values) {
    if (!Number.isInteger(val) || val < 0 || val > 255) return false;
  }
  return true;
});

// 测试 17：极端小的非零长度
test('长度为 2 的 Buffer 应正确迭代', () => {
  const buf = Buffer.from([42, 43]);
  const values = [...buf.values()];
  if (values.length !== 2) return false;
  if (values[0] !== 42 || values[1] !== 43) return false;
  return true;
});

// 测试 18：交替的 0 和 255
test('交替的 0 和 255 应正确迭代', () => {
  const buf = Buffer.from([0, 255, 0, 255, 0]);
  const values = [...buf.values()];
  if (values.length !== 5) return false;
  if (values[0] !== 0 || values[1] !== 255 || values[2] !== 0 || values[3] !== 255 || values[4] !== 0) return false;
  return true;
});

// 测试 19：连续相同值的长 Buffer
test('连续相同值的长 Buffer 应正确迭代', () => {
  const buf = Buffer.alloc(1000, 42);
  const values = [...buf.values()];
  if (values.length !== 1000) return false;

  for (const val of values) {
    if (val !== 42) return false;
  }
  return true;
});

// 测试 20：使用 Buffer.concat 合并空 Buffer
test('Buffer.concat 合并包含空 Buffer 应正确迭代', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2, buf3]);

  const values = [...buf.values()];
  if (values.length !== 4) return false;
  if (values[0] !== 1 || values[3] !== 4) return false;
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
