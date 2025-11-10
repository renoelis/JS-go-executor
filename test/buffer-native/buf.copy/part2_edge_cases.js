// buf.copy() - Edge Cases and Boundary Tests
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

// 负数索引测试 - 应抛出 RangeError
test('负数 targetStart - 应抛出错误', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10, 0);
  try {
    buf1.copy(buf2, -1);
    return false; // 不应该成功
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('负数 sourceStart - 应抛出错误', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  try {
    buf1.copy(buf2, 0, -1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('负数 sourceEnd - 应抛出错误', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  try {
    buf1.copy(buf2, 0, 0, -1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('sourceStart 大于 sourceEnd', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 3, 1);
  // sourceStart > sourceEnd 应复制 0 字节
  return bytes === 0;
});

// 浮点数索引测试
test('浮点数 targetStart', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10, 0);
  const bytes = buf1.copy(buf2, 2.7);
  // 应向下取整为 2
  return buf2.slice(2, 7).toString() === 'hello';
});

test('浮点数 sourceStart', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 1.5);
  // 应向下取整为 1
  return buf2.slice(0, 4).toString() === 'ello';
});

test('浮点数 sourceEnd', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 0, 3.9);
  // 应向下取整为 3
  return bytes === 3 && buf2.slice(0, 3).toString() === 'hel';
});

// 极端值测试
test('targetStart 等于 target.length', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(5);
  const bytes = buf1.copy(buf2, 5);
  // targetStart 等于 length 时应复制 0 字节
  return bytes === 0;
});

test('targetStart 大于 target.length', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(5);
  const bytes = buf1.copy(buf2, 10);
  // targetStart 超出范围应复制 0 字节
  return bytes === 0;
});

test('sourceStart 等于 source.length', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 5);
  // sourceStart 等于 length 时应复制 0 字节
  return bytes === 0;
});

test('sourceStart 大于 source.length - 应抛出错误', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  try {
    buf1.copy(buf2, 0, 10);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('零长度源 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(5, 0x61);
  const bytes = buf1.copy(buf2);
  // 空 buffer 复制应返回 0
  return bytes === 0 && buf2.toString() === 'aaaaa';
});

test('零长度目标 buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(0);
  const bytes = buf1.copy(buf2);
  // 目标为空时应返回 0
  return bytes === 0;
});

// 自身重叠复制测试
test('自身复制 - 向后覆盖', () => {
  const buf = Buffer.from('abcdef');
  buf.copy(buf, 3, 0, 3);
  return buf.toString() === 'abcabc';
});

test('自身复制 - 向前覆盖', () => {
  const buf = Buffer.from('abcdef');
  buf.copy(buf, 0, 3, 6);
  return buf.toString() === 'defdef';
});

test('自身复制 - 完全重叠', () => {
  const buf = Buffer.from('hello');
  buf.copy(buf, 0, 0, 5);
  return buf.toString() === 'hello';
});

test('自身复制 - 部分重叠', () => {
  const buf = Buffer.from('abcdefgh');
  buf.copy(buf, 2, 0, 6);
  return buf.toString() === 'ababcdef';
});

// 非常大的值
test('非常大的 sourceEnd', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 0, Number.MAX_SAFE_INTEGER);
  // 应该只复制到源 buffer 的末尾
  return bytes === 5;
});

test('非常大的 targetStart 和足够的空间', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.alloc(1000);
  const bytes = buf1.copy(buf2, 998);
  // 只能复制 2 字节
  return bytes === 2 && buf2.slice(998, 1000).toString() === 'hi';
});

// 部分复制场景
test('目标空间不足 - 从中间开始', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.alloc(5);
  const bytes = buf1.copy(buf2, 2);
  // 只能复制 3 字节到位置 2-4
  return bytes === 3 && buf2.slice(2, 5).toString() === 'hel';
});

test('源和目标部分重叠 - 精确边界', () => {
  const buf1 = Buffer.from('123456');
  const buf2 = Buffer.alloc(6);
  const bytes = buf1.copy(buf2, 0, 2, 6);
  return bytes === 4 && buf2.slice(0, 4).toString() === '3456';
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

