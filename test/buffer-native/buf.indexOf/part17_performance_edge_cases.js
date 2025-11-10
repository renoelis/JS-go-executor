// buf.indexOf() - Performance Edge Cases
// 测试性能相关的边界场景
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

// 大 Buffer 测试
test('大 Buffer - 5MB 查找开头', () => {
  const buf = Buffer.alloc(5 * 1024 * 1024);
  buf.write('target', 0);
  return buf.indexOf('target') === 0;
});

test('大 Buffer - 5MB 查找末尾', () => {
  const buf = Buffer.alloc(5 * 1024 * 1024);
  const pos = buf.length - 6;
  buf.write('target', pos);
  return buf.indexOf('target') === pos;
});

test('大 Buffer - 5MB 查找中间', () => {
  const buf = Buffer.alloc(5 * 1024 * 1024);
  const pos = Math.floor(buf.length / 2);
  buf.write('target', pos);
  return buf.indexOf('target') === pos;
});

test('大 Buffer - 5MB 未找到', () => {
  const buf = Buffer.alloc(5 * 1024 * 1024);
  return buf.indexOf('target') === -1;
});

test('大 Buffer - 10MB 查找', () => {
  const buf = Buffer.alloc(10 * 1024 * 1024);
  buf.write('needle', 1000000);
  return buf.indexOf('needle') === 1000000;
});

// 长字符串查找
test('长字符串 - 1KB 模式', () => {
  const pattern = 'x'.repeat(1024);
  const buf = Buffer.alloc(10000);
  buf.write(pattern, 5000);
  return buf.indexOf(pattern) === 5000;
});

test('长字符串 - 4KB 模式', () => {
  const pattern = 'y'.repeat(4096);
  const buf = Buffer.alloc(20000);
  buf.write(pattern, 8000);
  return buf.indexOf(pattern) === 8000;
});

test('长字符串 - 重复模式 1KB', () => {
  const pattern = 'ab'.repeat(512);
  const buf = Buffer.alloc(10000);
  buf.write(pattern, 3000);
  return buf.indexOf(pattern) === 3000;
});

test('长字符串 - 几乎匹配但失败', () => {
  const pattern = 'a'.repeat(1000) + 'b';
  const buf = Buffer.alloc(10000);
  buf.fill('a');
  return buf.indexOf(pattern) === -1;
});

// 重复模式测试
test('重复模式 - 连续 1000 个相同字符', () => {
  const buf = Buffer.alloc(10000);
  buf.fill('a');
  return buf.indexOf('a') === 0;
});

test('重复模式 - 查找重复子串', () => {
  const buf = Buffer.alloc(10000);
  buf.fill('a');
  return buf.indexOf('aaa') === 0;
});

test('重复模式 - 查找长重复子串', () => {
  const buf = Buffer.alloc(10000);
  buf.fill('a');
  const pattern = 'a'.repeat(100);
  return buf.indexOf(pattern) === 0;
});

test('重复模式 - 交替字符', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i % 2 === 0 ? 97 : 98; // 'a' or 'b'
  }
  return buf.indexOf('abab') === 0;
});

test('重复模式 - 周期性模式', () => {
  const buf = Buffer.alloc(10000);
  const pattern = 'abc';
  for (let i = 0; i < buf.length; i++) {
    buf[i] = pattern.charCodeAt(i % 3);
  }
  return buf.indexOf('abcabc') === 0;
});

// 最坏情况场景
test('最坏情况 - 几乎匹配的长模式', () => {
  const buf = Buffer.alloc(10000);
  buf.fill('a');
  buf.write('a'.repeat(99) + 'b', 9900);
  const pattern = 'a'.repeat(100) + 'b';
  // 从位置 9899 开始有 100 个 'a' + 1 个 'b'
  return buf.indexOf(pattern) === 9899;
});

test('最坏情况 - 多个部分匹配', () => {
  const buf = Buffer.from('aaabaaabaaabaaaac');
  return buf.indexOf('aaaac') === 12;
});

test('最坏情况 - 重叠模式', () => {
  const buf = Buffer.from('ababababac');
  return buf.indexOf('ababac') === 4;
});

test('最坏情况 - 长重复前缀', () => {
  const pattern = 'a'.repeat(50) + 'b';
  const buf = Buffer.alloc(1000);
  buf.fill('a');
  buf.write(pattern, 500);
  return buf.indexOf(pattern) === 500;
});

// 稀疏匹配测试
test('稀疏匹配 - 大 Buffer 中的小模式', () => {
  const buf = Buffer.alloc(100000);
  buf.write('needle', 50000);
  return buf.indexOf('needle') === 50000;
});

test('稀疏匹配 - 多个匹配取第一个', () => {
  const buf = Buffer.alloc(10000);
  buf.write('target', 1000);
  buf.write('target', 5000);
  buf.write('target', 9000);
  return buf.indexOf('target') === 1000;
});

test('稀疏匹配 - 带偏移跳过第一个', () => {
  const buf = Buffer.alloc(10000);
  buf.write('target', 1000);
  buf.write('target', 5000);
  return buf.indexOf('target', 1001) === 5000;
});

// 边界性能测试
test('边界性能 - 单字节查找大 Buffer', () => {
  const buf = Buffer.alloc(100000);
  buf[50000] = 42;
  return buf.indexOf(42) === 50000;
});

test('边界性能 - 双字节查找大 Buffer', () => {
  const buf = Buffer.alloc(100000);
  buf[50000] = 1;
  buf[50001] = 2;
  return buf.indexOf(Buffer.from([1, 2])) === 50000;
});

test('边界性能 - 四字节查找大 Buffer', () => {
  const buf = Buffer.alloc(100000);
  buf[50000] = 1;
  buf[50001] = 2;
  buf[50002] = 3;
  buf[50003] = 4;
  return buf.indexOf(Buffer.from([1, 2, 3, 4])) === 50000;
});

// 连续查找性能
test('连续查找 - 10 次查找', () => {
  const buf = Buffer.from('hello world hello world hello world');
  let count = 0;
  let pos = 0;
  while ((pos = buf.indexOf('hello', pos)) !== -1) {
    count++;
    pos++;
    if (count >= 10) break;
  }
  return count === 3;
});

test('连续查找 - 查找所有匹配', () => {
  const buf = Buffer.from('a'.repeat(100));
  let count = 0;
  let pos = 0;
  while ((pos = buf.indexOf('a', pos)) !== -1) {
    count++;
    pos++;
    if (count >= 100) break;
  }
  return count === 100;
});

test('连续查找 - 重叠模式查找', () => {
  const buf = Buffer.from('aaaa');
  let count = 0;
  let pos = 0;
  while ((pos = buf.indexOf('aa', pos)) !== -1) {
    count++;
    pos++;
    if (count >= 10) break;
  }
  return count === 3; // 位置 0, 1, 2
});

// Unicode 性能测试
test('Unicode 性能 - 大量中文字符', () => {
  const text = '你好世界'.repeat(1000);
  const buf = Buffer.from(text);
  return buf.indexOf('世界') === 6;
});

test('Unicode 性能 - 大量 emoji', () => {
  const text = '😀😁😂'.repeat(500);
  const buf = Buffer.from(text);
  return buf.indexOf('😂') === 8;
});

test('Unicode 性能 - 混合字符', () => {
  const text = 'hello你好world世界'.repeat(500);
  const buf = Buffer.from(text);
  return buf.indexOf('world') === 11;
});

// 编码转换性能
test('编码转换性能 - utf8 大字符串', () => {
  const text = 'hello world '.repeat(1000);
  const buf = Buffer.from(text, 'utf8');
  return buf.indexOf('world', 0, 'utf8') === 6;
});

test('编码转换性能 - hex 大字符串', () => {
  const hex = '48656c6c6f'.repeat(100);
  const buf = Buffer.from(hex, 'hex');
  return buf.indexOf('48656c6c6f', 0, 'hex') === 0;
});

test('编码转换性能 - base64 大字符串', () => {
  const b64 = 'SGVsbG8='.repeat(100);
  const buf = Buffer.from(b64, 'base64');
  return buf.indexOf('Hello', 0, 'utf8') === 0;
});

// 内存密集型测试
test('内存密集 - 多个大 Buffer 查找', () => {
  const buf1 = Buffer.alloc(1000000);
  const buf2 = Buffer.alloc(1000000);
  const buf3 = Buffer.alloc(1000000);
  buf1.write('target', 500000);
  buf2.write('target', 500000);
  buf3.write('target', 500000);
  return buf1.indexOf('target') === 500000 &&
         buf2.indexOf('target') === 500000 &&
         buf3.indexOf('target') === 500000;
});

test('内存密集 - 创建和销毁多个 Buffer', () => {
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(10000);
    buf.write('test', 5000);
    if (buf.indexOf('test') !== 5000) return false;
  }
  return true;
});

// 缓存友好性测试
test('缓存友好 - 顺序访问', () => {
  const buf = Buffer.alloc(100000);
  for (let i = 0; i < 100; i++) {
    buf.write('x', i * 1000);
  }
  let found = 0;
  for (let i = 0; i < 100; i++) {
    if (buf.indexOf('x', i * 1000) === i * 1000) found++;
  }
  return found === 100;
});

test('缓存友好 - 随机访问', () => {
  const buf = Buffer.alloc(100000);
  const positions = [1000, 50000, 25000, 75000, 10000];
  for (const pos of positions) {
    buf.write('y', pos);
  }
  let found = 0;
  for (const pos of positions) {
    if (buf.indexOf('y', pos) === pos) found++;
  }
  return found === positions.length;
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
