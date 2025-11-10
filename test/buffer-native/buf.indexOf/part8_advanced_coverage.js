// buf.indexOf() - Advanced Coverage Tests
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

// 多字节编码边界测试
test('多字节 UTF-8 - 中文字符边界', () => {
  const buf = Buffer.from('你好世界');
  // '你' = 3 bytes, '好' = 3 bytes, '世' = 3 bytes, '界' = 3 bytes
  return buf.indexOf('世') === 6;
});

test('多字节 UTF-8 - 从中间字节开始查找', () => {
  const buf = Buffer.from('你好世界');
  // 从第 4 字节开始，应该找到 '世界'
  return buf.indexOf('世界', 4) === 6;
});

test('多字节 UTF-8 - Emoji 边界', () => {
  const buf = Buffer.from('😀😁😂');
  // 每个 emoji 4 bytes
  return buf.indexOf('😁') === 4;
});

test('多字节 UTF-8 - 组合字符', () => {
  const buf = Buffer.from('café'); // é 可能是组合字符
  return buf.indexOf('é') >= 0;
});

// 编码混合测试
test('编码混合 - ASCII + UTF-8', () => {
  const buf = Buffer.from('hello 世界');
  return buf.indexOf('世界') === 6;
});

test('编码混合 - 数字 + UTF-8', () => {
  const buf = Buffer.from('123你好');
  return buf.indexOf('你好') === 3;
});

// 大 Buffer 性能测试
test('大 Buffer - 10KB 查找末尾', () => {
  const buf = Buffer.alloc(10240);
  buf.write('target', 10234);
  return buf.indexOf('target') === 10234;
});

test('大 Buffer - 10KB 查找开头', () => {
  const buf = Buffer.alloc(10240);
  buf.write('target', 0);
  return buf.indexOf('target') === 0;
});

test('大 Buffer - 10KB 查找中间', () => {
  const buf = Buffer.alloc(10240);
  buf.write('target', 5120);
  return buf.indexOf('target') === 5120;
});

test('大 Buffer - 10KB 未找到', () => {
  const buf = Buffer.alloc(10240);
  return buf.indexOf('target') === -1;
});

// 重复模式测试
test('重复模式 - AAAA 查找 AA', () => {
  const buf = Buffer.from('AAAA');
  return buf.indexOf('AA') === 0;
});

test('重复模式 - AAAA 查找 AA 偏移 1', () => {
  const buf = Buffer.from('AAAA');
  return buf.indexOf('AA', 1) === 1;
});

test('重复模式 - AAAA 查找 AA 偏移 2', () => {
  const buf = Buffer.from('AAAA');
  return buf.indexOf('AA', 2) === 2;
});

test('重复模式 - ABABABAB 查找 ABAB', () => {
  const buf = Buffer.from('ABABABAB');
  return buf.indexOf('ABAB') === 0;
});

test('重复模式 - ABABABAB 查找 ABAB 偏移 1', () => {
  const buf = Buffer.from('ABABABAB');
  return buf.indexOf('ABAB', 1) === 2;
});

test('重复模式 - ABABABAB 查找 ABAB 偏移 2', () => {
  const buf = Buffer.from('ABABABAB');
  return buf.indexOf('ABAB', 2) === 2;
});

// 边界对齐测试
test('边界对齐 - 4 字节对齐查找', () => {
  const buf = Buffer.from([0, 0, 0, 0, 1, 2, 3, 4]);
  return buf.indexOf(Buffer.from([1, 2, 3, 4])) === 4;
});

test('边界对齐 - 8 字节对齐查找', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4]);
  return buf.indexOf(Buffer.from([1, 2, 3, 4])) === 8;
});

test('边界对齐 - 非对齐查找', () => {
  const buf = Buffer.from([0, 0, 0, 1, 2, 3, 4]);
  return buf.indexOf(Buffer.from([1, 2, 3, 4])) === 3;
});

// 特殊字节序列测试
test('特殊字节序列 - 全 0', () => {
  const buf = Buffer.alloc(100);
  return buf.indexOf(0) === 0;
});

test('特殊字节序列 - 全 0xFF', () => {
  const buf = Buffer.alloc(100, 0xFF);
  return buf.indexOf(0xFF) === 0;
});

test('特殊字节序列 - 交替 0 和 1', () => {
  const buf = Buffer.from([0, 1, 0, 1, 0, 1]);
  return buf.indexOf(Buffer.from([0, 1, 0])) === 0;
});

test('特殊字节序列 - 递增序列', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return buf.indexOf(Buffer.from([5, 6, 7])) === 5;
});

// 部分重叠测试
test('部分重叠 - AABAAB 查找 AAB', () => {
  const buf = Buffer.from('AABAAB');
  return buf.indexOf('AAB') === 0;
});

test('部分重叠 - AABAAB 查找 AAB 偏移 1', () => {
  const buf = Buffer.from('AABAAB');
  return buf.indexOf('AAB', 1) === 3;
});

test('部分重叠 - ABCABC 查找 CABC', () => {
  const buf = Buffer.from('ABCABC');
  return buf.indexOf('CABC') === 2;
});

// 负偏移高级测试
test('负偏移 - 从倒数第 5 个字节开始', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', -5) === 6;
});

test('负偏移 - 从倒数第 1 个字节开始', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('d', -1) === 10;
});

test('负偏移 - 超出范围（负数太大）', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('h', -1000) === 0;
});

// 空值高级测试
test('空值 - 空字符串在空 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.indexOf('') === 0;
});

test('空值 - 空 Buffer 在非空 Buffer', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0)) === 0;
});

test('空值 - 空 Buffer 带大偏移', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 100) === 5;
});

// TypedArray 子类测试
test('TypedArray - Int8Array', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const search = new Int8Array([3, 4]);
  return buf.indexOf(Buffer.from(search.buffer)) === 2;
});

test('TypedArray - Uint16Array', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const search = new Uint16Array([0x0201]); // 小端序
  return buf.indexOf(Buffer.from(search.buffer)) === 0;
});

// 编码边界测试
test('编码边界 - Hex 奇数长度', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.indexOf('6c', 0, 'hex') === 2;
});

test('编码边界 - Base64 padding', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  return buf.indexOf('Hello') === 0;
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
