// buffer.transcode() - Part 5: Memory and Performance Tests
const { Buffer, transcode } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 零拷贝验证
test('transcode 返回新 Buffer（非视图）', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');

  result[0] = 0xFF;
  return source[0] === 0x48;
});

test('修改源 Buffer 不影响结果', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');

  const originalFirst = result[0];
  source[0] = 0xFF;
  return result[0] === originalFirst;
});

test('多次 transcode 同一 Buffer', () => {
  const source = Buffer.from('Hello', 'utf8');
  const r1 = transcode(source, 'utf8', 'utf16le');
  const r2 = transcode(source, 'utf8', 'utf16le');
  const r3 = transcode(source, 'utf8', 'utf16le');

  return r1.equals(r2) && r2.equals(r3);
});

// 大数据量测试
test('10KB 数据转码', () => {
  const source = Buffer.from('A'.repeat(10000), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 20000;
});

test('100KB 数据转码', () => {
  const source = Buffer.from('B'.repeat(100000), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 200000;
});

test('1MB 数据转码', () => {
  const source = Buffer.from('C'.repeat(1000000), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2000000;
});

test('混合多字节字符的大数据', () => {
  const str = '你好世界😀'.repeat(10000);
  const source = Buffer.from(str, 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length > 0;
});

// 连续调用稳定性
test('连续 100 次转码', () => {
  const source = Buffer.from('Test', 'utf8');
  const first = transcode(source, 'utf8', 'utf16le');

  for (let i = 0; i < 99; i++) {
    const current = transcode(source, 'utf8', 'utf16le');
    if (!current.equals(first)) {
      return false;
    }
  }
  return true;
});

test('交替编码转换 100 次', () => {
  let current = Buffer.from('Hello', 'utf8');

  for (let i = 0; i < 50; i++) {
    current = transcode(current, 'utf8', 'utf16le');
    current = transcode(current, 'utf16le', 'utf8');
  }

  return current.toString('utf8') === 'Hello';
});

// Buffer 池和内存管理
test('创建多个不同大小的转码结果', () => {
  const sizes = [1, 10, 100, 1000, 10000];
  const results = sizes.map(size => {
    const source = Buffer.from('X'.repeat(size), 'utf8');
    return transcode(source, 'utf8', 'utf16le');
  });

  return results.every((r, i) => r.length === sizes[i] * 2);
});

test('大量小 Buffer 转码', () => {
  const results = [];
  for (let i = 0; i < 1000; i++) {
    const source = Buffer.from(`T${i}`, 'utf8');
    results.push(transcode(source, 'utf8', 'utf16le'));
  }
  return results.length === 1000 && results.every(r => r instanceof Buffer);
});

// 特殊大小边界
test('接近页面大小 (4096 字节)', () => {
  const source = Buffer.from('A'.repeat(4096), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 8192;
});

test('超过页面大小', () => {
  const source = Buffer.from('B'.repeat(5000), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 10000;
});

test('2 的幂次大小 - 256', () => {
  const source = Buffer.from('C'.repeat(256), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 512;
});

test('2 的幂次大小 - 512', () => {
  const source = Buffer.from('D'.repeat(512), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 1024;
});

test('2 的幂次大小 - 1024', () => {
  const source = Buffer.from('E'.repeat(1024), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2048;
});

// 不同长度的往返转换
test('往返转换 - 1 字节', () => {
  const original = Buffer.from('A', 'utf8');
  const utf16 = transcode(original, 'utf8', 'utf16le');
  const back = transcode(utf16, 'utf16le', 'utf8');
  return back.equals(original);
});

test('往返转换 - 奇数字节', () => {
  const original = Buffer.from('ABC', 'utf8');
  const utf16 = transcode(original, 'utf8', 'utf16le');
  const back = transcode(utf16, 'utf16le', 'utf8');
  return back.equals(original);
});

test('往返转换 - 偶数字节', () => {
  const original = Buffer.from('ABCD', 'utf8');
  const utf16 = transcode(original, 'utf8', 'utf16le');
  const back = transcode(utf16, 'utf16le', 'utf8');
  return back.equals(original);
});

test('往返转换 - 大数据', () => {
  const original = Buffer.from('X'.repeat(10000), 'utf8');
  const utf16 = transcode(original, 'utf8', 'utf16le');
  const back = transcode(utf16, 'utf16le', 'utf8');
  return back.equals(original);
});

// 并发场景模拟
test('嵌套 transcode 调用', () => {
  const s1 = Buffer.from('Test1', 'utf8');
  const s2 = Buffer.from('Test2', 'utf8');

  const r1 = transcode(s1, 'utf8', 'utf16le');
  const r2 = transcode(s2, 'utf8', 'utf16le');

  const back1 = transcode(r1, 'utf16le', 'utf8');
  const back2 = transcode(r2, 'utf16le', 'utf8');

  return back1.toString() === 'Test1' && back2.toString() === 'Test2';
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
