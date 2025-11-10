// buf[index] - Part 2: Edge Cases & Boundary Tests
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

// 越界读取测试
test('读取负数索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[-1] === undefined;
});

test('读取超出范围的索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[10] === undefined;
});

test('读取 length 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[buf.length] === undefined;
});

test('读取 length + 1 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[buf.length + 1] === undefined;
});

// 越界写入测试（不应该扩展 Buffer）
test('写入负数索引（不生效）', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[-1] = 99;
  return buf[-1] === undefined && buf.length === 3;
});

test('写入超出范围的索引（不生效）', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[10] = 99;
  return buf[10] === undefined && buf.length === 3;
});

test('写入 length 索引（不扩展）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const originalLength = buf.length;
  buf[buf.length] = 99;
  return buf.length === originalLength;
});

// 特殊值写入测试
test('写入超过 255 的值（取模）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 256;
  return buf[0] === 0;
});

test('写入 257（取模）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 257;
  return buf[0] === 1;
});

test('写入 511（取模）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 511;
  return buf[0] === 255;
});

test('写入负数（转换为无符号）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = -1;
  return buf[0] === 255;
});

test('写入 -2（转换为无符号）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = -2;
  return buf[0] === 254;
});

test('写入 -128（转换为无符号）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = -128;
  return buf[0] === 128;
});

test('写入 NaN（转换为 0）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = NaN;
  return buf[0] === 0;
});

test('写入 Infinity（转换为 0）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = Infinity;
  return buf[0] === 0;
});

test('写入 -Infinity（转换为 0）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = -Infinity;
  return buf[0] === 0;
});

test('写入小数（截断）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 3.14;
  return buf[0] === 3;
});

test('写入小数 255.9（截断）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 255.9;
  return buf[0] === 255;
});

// 类型强制转换
test('写入字符串数字', () => {
  const buf = Buffer.alloc(1);
  buf[0] = '65';
  return buf[0] === 65;
});

test('写入布尔值 true', () => {
  const buf = Buffer.alloc(1);
  buf[0] = true;
  return buf[0] === 1;
});

test('写入布尔值 false', () => {
  const buf = Buffer.alloc(1);
  buf[0] = false;
  return buf[0] === 0;
});

test('写入 null（转换为 0）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = null;
  return buf[0] === 0;
});

test('写入 undefined（转换为 0）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = undefined;
  return buf[0] === 0;
});

// 非整数索引
test('使用小数索引读取（返回 undefined）', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[1.9] === undefined;
});

test('使用小数索引写入（不生效）', () => {
  const buf = Buffer.alloc(3);
  buf[1.9] = 99;
  return buf[1] === 0 && buf[1.9] === undefined;
});

test('使用字符串数字索引读取', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['1'] === 2;
});

test('使用字符串数字索引写入', () => {
  const buf = Buffer.alloc(3);
  buf['1'] = 99;
  return buf[1] === 99;
});

// 大 Buffer 边界测试
test('大 Buffer 第一个元素', () => {
  const buf = Buffer.alloc(10000);
  buf[0] = 123;
  return buf[0] === 123;
});

test('大 Buffer 最后一个元素', () => {
  const buf = Buffer.alloc(10000);
  buf[9999] = 234;
  return buf[9999] === 234;
});

test('大 Buffer 中间元素', () => {
  const buf = Buffer.alloc(10000);
  buf[5000] = 111;
  return buf[5000] === 111;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
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
