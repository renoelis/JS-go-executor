// buf.indexOf() - Memory Safety Tests
// 测试内存安全和边界保护
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

// 修改源 Buffer 后的查找
test('修改源 Buffer - 查找不受影响', () => {
  const buf = Buffer.from('hello world');
  const searchBuf = Buffer.from('world');
  const pos1 = buf.indexOf(searchBuf);
  searchBuf[0] = 120; // 修改 searchBuf
  const pos2 = buf.indexOf(Buffer.from('world'));
  return pos1 === 6 && pos2 === 6;
});

test('修改目标 Buffer - 查找结果改变', () => {
  const buf = Buffer.from('hello world');
  const pos1 = buf.indexOf('world');
  buf[6] = 120; // 修改 buf，'world' 变成 'xorld'
  const pos2 = buf.indexOf('world');
  return pos1 === 6 && pos2 === -1;
});

test('共享内存 - slice 修改影响原 Buffer', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6, 11); // 'world'
  const pos1 = buf.indexOf('world');
  sliced[0] = 120; // 修改 sliced，也会影响 buf
  const pos2 = buf.indexOf('world');
  return pos1 === 6 && pos2 === -1;
});

test('独立内存 - subarray 修改影响原 Buffer', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(6, 11); // 'world'
  const pos1 = buf.indexOf('world');
  sub[0] = 120; // 修改 sub，也会影响 buf
  const pos2 = buf.indexOf('world');
  return pos1 === 6 && pos2 === -1;
});

test('独立内存 - Buffer.from 创建副本', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.from(buf1);
  const pos1 = buf1.indexOf('world');
  buf2[6] = 120; // 修改 buf2 不影响 buf1
  const pos2 = buf1.indexOf('world');
  return pos1 === 6 && pos2 === 6;
});

// 越界访问保护
test('越界访问 - byteOffset 超出范围', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', 100) === -1;
});

test('越界访问 - 负 byteOffset 超出范围', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', -1000) === 0;
});

test('越界访问 - 查找值长度超出 Buffer', () => {
  const buf = Buffer.from('hi');
  return buf.indexOf('hello world') === -1;
});

test('越界访问 - 空 Buffer 查找非空值', () => {
  const buf = Buffer.alloc(0);
  return buf.indexOf('hello') === -1;
});

// 零拷贝语义测试
test('零拷贝 - TypedArray 视图', () => {
  const ab = new ArrayBuffer(10);
  const u8 = new Uint8Array(ab);
  u8.set([1, 2, 3, 4, 5], 2);
  const buf = Buffer.from(ab);
  return buf.indexOf(Buffer.from([3, 4, 5])) === 4;
});

test('零拷贝 - 修改 ArrayBuffer 影响 Buffer', () => {
  const ab = new ArrayBuffer(10);
  const u8 = new Uint8Array(ab);
  u8.set([1, 2, 3, 4, 5], 0);
  const buf = Buffer.from(ab);
  const pos1 = buf.indexOf(3);
  u8[2] = 99; // 修改 ArrayBuffer
  const buf2 = Buffer.from(ab); // 重新创建 Buffer
  const pos2 = buf2.indexOf(3);
  return pos1 === 2 && pos2 === -1;
});

// 内存对齐测试
test('内存对齐 - 奇数偏移', () => {
  const buf = Buffer.from('xhello world');
  return buf.indexOf('hello', 1) === 1;
});

test('内存对齐 - 偶数偏移', () => {
  const buf = Buffer.from('xxhello world');
  return buf.indexOf('hello', 2) === 2;
});

test('内存对齐 - 4 字节对齐', () => {
  const buf = Buffer.from('xxxxhello world');
  return buf.indexOf('hello', 4) === 4;
});

test('内存对齐 - 8 字节对齐', () => {
  const buf = Buffer.from('xxxxxxxxhello world');
  return buf.indexOf('hello', 8) === 8;
});

test('内存对齐 - 16 字节对齐', () => {
  const buf = Buffer.from('xxxxxxxxxxxxxxxxhello world');
  return buf.indexOf('hello', 16) === 16;
});

// 并发安全测试（模拟）
test('并发安全 - 多次查找同一 Buffer', () => {
  const buf = Buffer.from('hello world hello');
  const pos1 = buf.indexOf('hello', 0);
  const pos2 = buf.indexOf('hello', 1);
  const pos3 = buf.indexOf('hello', 12);
  return pos1 === 0 && pos2 === 12 && pos3 === 12;
});

test('并发安全 - 不同查找值', () => {
  const buf = Buffer.from('hello world');
  const pos1 = buf.indexOf('hello');
  const pos2 = buf.indexOf('world');
  const pos3 = buf.indexOf('o');
  return pos1 === 0 && pos2 === 6 && pos3 === 4;
});

// 内存泄漏预防测试
test('内存泄漏预防 - 大量小查找', () => {
  const buf = Buffer.from('hello world');
  for (let i = 0; i < 1000; i++) {
    buf.indexOf('world');
  }
  return buf.indexOf('world') === 6;
});

test('内存泄漏预防 - 大量不同查找', () => {
  const buf = Buffer.from('hello world');
  const searches = ['hello', 'world', 'o', 'l', 'h', 'w', 'd'];
  for (let i = 0; i < 100; i++) {
    for (const s of searches) {
      buf.indexOf(s);
    }
  }
  return buf.indexOf('world') === 6;
});

// Buffer 池化测试
test('Buffer 池化 - allocUnsafe 后查找', () => {
  const buf = Buffer.allocUnsafe(20);
  buf.write('hello world', 0);
  return buf.indexOf('world') === 6;
});

test('Buffer 池化 - allocUnsafe 部分写入', () => {
  const buf = Buffer.allocUnsafe(20);
  buf.write('hello', 0);
  buf.write('world', 6);
  return buf.indexOf('world') === 6;
});

test('Buffer 池化 - allocUnsafeSlow', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.write('hello world', 0);
  return buf.indexOf('world') === 6;
});

// 跨边界查找
test('跨边界查找 - 查找跨越中间', () => {
  const buf = Buffer.from('abcdefghijklmnop');
  return buf.indexOf('fghij') === 5;
});

test('跨边界查找 - 查找跨越多个块', () => {
  const buf = Buffer.alloc(100);
  buf.write('hello', 30);
  buf.write('world', 35);
  return buf.indexOf('helloworld') === 30;
});

test('跨边界查找 - 部分匹配后失败', () => {
  const buf = Buffer.from('aaaaaab');
  return buf.indexOf('aaab') === 3;
});

test('跨边界查找 - 重复模式', () => {
  const buf = Buffer.from('abababab');
  return buf.indexOf('abab') === 0;
});

// 特殊内存模式
test('特殊内存模式 - 全零 Buffer', () => {
  const buf = Buffer.alloc(100);
  return buf.indexOf(0) === 0;
});

test('特殊内存模式 - 全 0xFF Buffer', () => {
  const buf = Buffer.alloc(100);
  buf.fill(0xFF);
  return buf.indexOf(0xFF) === 0;
});

test('特殊内存模式 - 交替模式', () => {
  const buf = Buffer.from([0, 1, 0, 1, 0, 1, 0, 1]);
  return buf.indexOf(Buffer.from([0, 1, 0, 1])) === 0;
});

test('特殊内存模式 - 递增模式', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return buf.indexOf(Buffer.from([5, 6, 7])) === 5;
});

// 边界对齐测试
test('边界对齐 - 1 字节边界', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.indexOf(3) === 2;
});

test('边界对齐 - 2 字节边界', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  return buf.indexOf(Buffer.from([3, 4])) === 2;
});

test('边界对齐 - 4 字节边界', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  return buf.indexOf(Buffer.from([5, 6, 7, 8])) === 4;
});

test('边界对齐 - 8 字节边界', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  return buf.indexOf(Buffer.from([9, 10, 11, 12])) === 8;
});

// 缓存一致性测试
test('缓存一致性 - 修改后立即查找', () => {
  const buf = Buffer.from('hello world');
  buf[0] = 72; // 'H'
  return buf.indexOf('Hello') === 0;
});

test('缓存一致性 - 多次修改后查找', () => {
  const buf = Buffer.from('hello world');
  buf[0] = 72; // 'H'
  buf[6] = 87; // 'W'
  return buf.indexOf('Hello') === 0 && buf.indexOf('World') === 6;
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
