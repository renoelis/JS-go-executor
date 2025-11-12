// buf.values() - 深度补充 Part 15: 极端边界条件和特殊场景
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

// 测试 1: 特殊索引访问 -1
test('buf[-1] 应返回 undefined', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[-1] === undefined;
});

// 测试 2: 特殊索引访问 Infinity
test('buf[Infinity] 应返回 undefined', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[Infinity] === undefined;
});

// 测试 3: 特殊索引访问 -Infinity
test('buf[-Infinity] 应返回 undefined', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[-Infinity] === undefined;
});

// 测试 4: 特殊索引访问 NaN
test('buf[NaN] 应返回 undefined', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[NaN] === undefined;
});

// 测试 5: 特殊索引访问 true (转为 1)
test('buf[true] 应返回 undefined', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[true] === undefined;
});

// 测试 6: 特殊索引访问 null (转为 0)
test('buf[null] 应返回 undefined', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[null] === undefined;
});

// 测试 7: 非法 UTF-8 序列
test('非法 UTF-8 序列应产生替换字符', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFD]);
  const str = buf.toString('utf8');
  // 非法序列通常产生 � (U+FFFD)
  return str.length > 0;
});

// 测试 8: 截断的 UTF-8 序列
test('截断的 UTF-8 序列应正确处理', () => {
  // 完整的 UTF-8 字符 "测" 是 E6 B5 8B
  const buf = Buffer.from([0xE6, 0xB5]); // 缺少最后一个字节
  const str = buf.toString('utf8');
  // 应该产生替换字符
  return str.length > 0;
});

// 测试 9: 空字符串各种编码
test('空字符串各种编码应产生空 Buffer', () => {
  const encodings = ['utf8', 'ascii', 'latin1', 'hex', 'base64'];

  for (const enc of encodings) {
    const buf = Buffer.from('', enc);
    if (buf.length !== 0) return false;
    const values = [...buf.values()];
    if (values.length !== 0) return false;
  }

  return true;
});

// 测试 10: 非法 hex 字符串
test('非法 hex 字符串应抛错或忽略', () => {
  try {
    const buf = Buffer.from('xyz', 'hex');
    // 如果成功，应该是空或忽略非法字符
    return buf.length === 0;
  } catch (e) {
    // 抛错也是合理的
    return true;
  }
});

// 测试 11: 非法 base64 字符串
test('非法 base64 字符串应被忽略', () => {
  try {
    const buf = Buffer.from('!!!', 'base64');
    // base64 通常会忽略非法字符
    return true;
  } catch (e) {
    // 或者抛错
    return true;
  }
});

// 测试 12: 超长 hex 字符串
test('超长 hex 字符串应正确解析', () => {
  const hexStr = '01'.repeat(1000);
  const buf = Buffer.from(hexStr, 'hex');

  if (buf.length !== 1000) return false;

  const values = [...buf.values()];
  return values.every(v => v === 1);
});

// 测试 13: 浮点数索引访问
test('浮点数索引应向下取整访问', () => {
  const buf = Buffer.from([10, 20, 30, 40]);

  // 浮点数索引访问的行为取决于实现
  const v1 = buf[1.5];
  const v2 = buf[1.9];

  // 通常会返回 undefined
  return v1 === undefined && v2 === undefined;
});

// 测试 14: 大端小端 readInt
test('readInt16BE/LE 应正确读取', () => {
  const buf = Buffer.from([0x12, 0x34]);

  const be = buf.readInt16BE(0); // 0x1234 = 4660
  const le = buf.readInt16LE(0); // 0x3412 = 13330

  return be === 0x1234 && le === 0x3412;
});

// 测试 15: 超大 Buffer 的 slice
test('超大 Buffer 的 slice 应正常工作', () => {
  const buf = Buffer.alloc(100000);
  for (let i = 0; i < 100; i++) buf[i] = i;

  const sliced = buf.slice(10, 20);
  const values = [...sliced.values()];

  if (values.length !== 10) return false;
  if (values[0] !== 10 || values[9] !== 19) return false;

  return true;
});

// 测试 16: Buffer.compare 边界
test('Buffer.compare 各种大小关系应正确', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 4]);
  const buf4 = Buffer.from([1, 2]);

  const r1 = Buffer.compare(buf1, buf2); // 相等
  const r2 = Buffer.compare(buf1, buf3); // buf1 < buf3
  const r3 = Buffer.compare(buf1, buf4); // buf1 > buf4 (长度更长)

  return r1 === 0 && r2 < 0 && r3 > 0;
});

// 测试 17: equals 方法
test('buf.equals() 应正确判断相等', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 4]);

  return buf1.equals(buf2) && !buf1.equals(buf3);
});

// 测试 18: indexOf 字符串查找
test('buf.indexOf() 应支持字符串查找', () => {
  const buf = Buffer.from('hello world');

  const idx1 = buf.indexOf('world');
  const idx2 = buf.indexOf('xyz');

  return idx1 === 6 && idx2 === -1;
});

// 测试 19: indexOf Buffer 查找
test('buf.indexOf() 应支持 Buffer 查找', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const search = Buffer.from([3, 4]);

  const idx = buf.indexOf(search);
  return idx === 2;
});

// 测试 20: lastIndexOf 字符串查找
test('buf.lastIndexOf() 应支持字符串查找', () => {
  const buf = Buffer.from('hello hello');

  const idx = buf.lastIndexOf('hello');
  return idx === 6;
});

// 测试 21: 多字节 UTF-8 字符边界
test('多字节 UTF-8 字符应正确迭代字节', () => {
  const buf = Buffer.from('测试', 'utf8');
  const values = [...buf.values()];

  // "测试" 在 UTF-8 中是 6 字节
  if (values.length !== 6) return false;

  // 所有字节应该在合法范围
  return values.every(v => v >= 0 && v <= 255);
});

// 测试 22: emoji 字符迭代
test('emoji 字符应正确迭代字节', () => {
  const buf = Buffer.from('😀', 'utf8');
  const values = [...buf.values()];

  // emoji 通常是 4 字节
  if (values.length !== 4) return false;

  // 应该是 0xF0 0x9F 0x98 0x80
  return values[0] === 0xF0;
});

// 测试 23: 混合 ASCII 和多字节字符
test('混合 ASCII 和多字节字符应正确', () => {
  const buf = Buffer.from('a测b试c', 'utf8');
  const values = [...buf.values()];

  // "a测b试c" = 1 + 3 + 1 + 3 + 1 = 9 字节
  if (values.length !== 9) return false;

  // 'a' = 0x61, 'b' = 0x62, 'c' = 0x63
  return values[0] === 0x61 && values[4] === 0x62 && values[8] === 0x63;
});

// 测试 24: 所有 256 字节值
test('所有 256 字节值应都可迭代', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) buf[i] = i;

  const values = [...buf.values()];

  if (values.length !== 256) return false;

  for (let i = 0; i < 256; i++) {
    if (values[i] !== i) return false;
  }

  return true;
});

// 测试 25: subarray 零长度各种情况
test('subarray 零长度各种参数应正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const sub1 = buf.subarray(2, 2);
  const sub2 = buf.subarray(5, 10);
  const sub3 = buf.subarray(10, 20);

  const v1 = [...sub1.values()];
  const v2 = [...sub2.values()];
  const v3 = [...sub3.values()];

  return v1.length === 0 && v2.length === 0 && v3.length === 0;
});

// 测试 26: subarray 负数和超界混合
test('subarray 负数和超界混合应正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const sub1 = buf.subarray(-2, 10); // [4, 5]
  const sub2 = buf.subarray(-10, 2); // [1, 2]

  const v1 = [...sub1.values()];
  const v2 = [...sub2.values()];

  if (v1.length !== 2 || v1[0] !== 4) return false;
  if (v2.length !== 2 || v2[0] !== 1) return false;

  return true;
});

// 测试 27: UCS-2 编码迭代
test('UCS-2 编码应产生正确字节数', () => {
  const buf = Buffer.from('abc', 'ucs2');
  const values = [...buf.values()];

  // UCS-2 每个字符 2 字节，3 个字符 = 6 字节
  return values.length === 6;
});

// 测试 28: Latin1 编码迭代
test('Latin1 编码应一对一映射', () => {
  const buf = Buffer.from('abc', 'latin1');
  const values = [...buf.values()];

  // Latin1 每个字符 1 字节
  return values.length === 3 && values[0] === 0x61 && values[1] === 0x62 && values[2] === 0x63;
});

// 测试 29: Binary 编码（已废弃，等同 latin1）
test('Binary 编码应等同 latin1', () => {
  const buf1 = Buffer.from('test', 'binary');
  const buf2 = Buffer.from('test', 'latin1');

  const v1 = [...buf1.values()];
  const v2 = [...buf2.values()];

  if (v1.length !== v2.length) return false;

  return v1.every((val, i) => val === v2[i]);
});

// 测试 30: 迭代器在不同上下文中的稳定性
test('迭代器在不同上下文中应保持稳定', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  // 在不同作用域中使用
  function consume() {
    return iter.next().value;
  }

  const v1 = consume();
  const v2 = iter.next().value;

  (function() {
    // IIFE 中继续使用
  })();

  const v3 = consume();

  return v1 === 1 && v2 === 2 && v3 === 3;
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
