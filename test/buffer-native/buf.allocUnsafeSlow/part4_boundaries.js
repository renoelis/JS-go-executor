const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ name, passed: result, details: result ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, error: e.message, stack: e.stack });
  }
}

test('边界情况 - 长度 1 的缓冲区', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf.length === 1 && buf instanceof Buffer;
});

test('边界情况 - 正常大缓冲区（接近8KB）', () => {
  const buf = Buffer.allocUnsafeSlow(8191);
  return buf.length === 8191 && buf instanceof Buffer;
});

test('边界情况 - 精确 8KB 缓冲区', () => {
  const buf = Buffer.allocUnsafeSlow(8192);
  return buf.length === 8192 && buf instanceof Buffer;
});

test('边界情况 - 超过 8KB 缓冲区', () => {
  const buf = Buffer.allocUnsafeSlow(8193);
  return buf.length === 8193 && buf instanceof Buffer;
});

test('边界情况 - 大缓冲区（64KB）', () => {
  const buf = Buffer.allocUnsafeSlow(65536);
  return buf.length === 65536 && buf instanceof Buffer;
});

test('边界情况 - 超大缓冲区（1MB）', () => {
  const buf = Buffer.allocUnsafeSlow(1024 * 1024);
  return buf.length === 1024 * 1024 && buf instanceof Buffer;
});

test('边界情况 - 边界值 0 但不越界', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0 && !buf.byteLength;
});

test('边界情况 - fill 跑多次循环', () => {
  const buf = Buffer.allocUnsafeSlow(100, '12345');
  let index = 0;
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 5; j++, index++) {
      if (buf[index] !== Buffer.from('12345')[j]) {
        return false;
      }
    }
  }
  return true;
});

test('安全性 - 返回的缓冲区可以安全修改', () => {
  const size = 1000;
  const original = Buffer.allocUnsafeSlow(size);
  const filled = Buffer.allocUnsafeSlow(size, 'A');

  for (let i = 0; i < size; i++) {
    if (filled[i] !== 65) return false;
    filled[i] = 66;
  }
  return filled[0] === 66 && filled[size-1] === 66;
});

test('安全性 - 不共享底层内存（慢分配策略）', () => {
  const buf1 = Buffer.allocUnsafeSlow(1000);
  const buf2 = Buffer.allocUnsafeSlow(1000);

  buf1[0] = 42;
  buf2[0] = 84;

  return buf1[0] === 42 && buf2[0] === 84;
});

test('安全性 - 多层嵌套缓冲区视图', () => {
  const base = Buffer.allocUnsafeSlow(100);
  base.fill('A', 0, 50);
  base.fill('B', 50, 100);

  const view1 = base.subarray(10, 90);
  const view2 = view1.subarray(10, 70);

  return view1.length === 80 && view2.length === 60 && view2[10] === 66;
});

test('边界情况 - 模拟超大缓冲区大小', () => {
  try {
    Buffer.allocUnsafeSlow(2147483647);
    return false; // 应该抛出限制错误
  } catch (e) {
    return e.message && (e.message.includes('size') || e.message.includes('range') || e.message.includes('memory'));
  }
});

test('边界情况 - 长度为 0 但支持 fill', () => {
  const buf = Buffer.allocUnsafeSlow(0, 'A');
  return buf.length === 0;
});

test('边界情况 - 刚好匹配 fill 长度的倍数次填充', () => {
  const pattern = 'ABC';
  const size = 12; // 4 * pattern.length
  const buf = Buffer.allocUnsafeSlow(size, pattern);

  for (let i = 0; i < size; i++) {
    if (buf[i] !== Buffer.from(pattern)[i % 3]) return false;
  }
  return true;
});

test('边界情况 - 多字节字符作为 fill 字符串', () => {
  const buf = Buffer.allocUnsafeSlow(12, '你好');
  return buf.length === 12; // 注意处理多字节填充时的边界
});

test('边界情况 - 多个填充片段被正确覆盖', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill('X', 0, 3);
  buf.fill('Y', 3, 6);
  buf.fill('Z', 6, 10);

  return buf.toString('ascii', 0, 3) === 'XXX' &&
         buf.toString('ascii', 3, 6) === 'YYY' &&
         buf.toString('ascii', 6, 10) === 'ZZZZ';
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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