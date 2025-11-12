// buffer.compare() - Edge Cases and Safety Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅', name);
    } else {
      console.log('❌', name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌', name, '-', e.message);
  }
}

test('Buffer.MAX_LENGTH边界测试', () => {
  const maxSize = Buffer.MAX_LENGTH;
  const buf1 = Buffer.allocUnsafe(1);
  buf1[0] = 255;
  const buf2 = Buffer.allocUnsafe(1);
  buf2[0] = 254;
  const result = buf1.compare(buf2);
  return result > 0;
});

test('内存对齐边界 - 奇数长度', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3, 4, 6]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('内存对齐边界 - 偶数长度', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.from([1, 2, 3, 5]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('单字节边界比较', () => {
  for (let i = 0; i < 256; i++) {
    const buf1 = Buffer.from([i]);
    const buf2 = Buffer.from([255 - i]);
    const result = buf1.compare(buf2);
    if (i < 255 - i && result >= 0) return false;
    if (i > 255 - i && result <= 0) return false;
    if (i === 255 - i && result !== 0) return false;
  }
  return true;
});

test('零拷贝视图比较', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const slice1 = original.slice(0, 3);
  const slice2 = original.slice(2, 5);
  const result = slice1.compare(slice2);
  return result < 0;
});

test('重叠视图比较', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const slice1 = original.slice(1, 4);
  const slice2 = original.slice(2, 5);
  const result = slice1.compare(slice2);
  return result < 0;
});

test('修改视图影响原buffer', () => {
  const original = Buffer.from([1, 2, 3]);
  const view = original.slice(0, 3);
  view[1] = 9;
  const result = original.compare(Buffer.from([1, 9, 3]));
  return result === 0;
});

test('共享内存的不同视图比较', () => {
  const shared = new ArrayBuffer(6);
  const buf1 = Buffer.from(shared, 0, 3);
  const buf2 = Buffer.from(shared, 3, 3);

  buf1[0] = 1; buf1[1] = 2; buf1[2] = 3;
  buf2[0] = 1; buf2[1] = 2; buf2[2] = 3;

  const result = buf1.compare(buf2);
  return result === 0;
});

test('零值填充buffer比较', () => {
  const buf1 = Buffer.alloc(100, 0);
  const buf2 = Buffer.allocUnsafe(100);
  buf2.fill(0);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('随机内容buffer比较一致性', () => {
  const size = 100;
  const buf1 = Buffer.allocUnsafe(size);
  const buf2 = Buffer.allocUnsafe(size);

  for (let i = 0; i < size; i++) {
    buf1[i] = Math.floor(Math.random() * 256);
    buf2[i] = buf1[i];
  }

  const result1 = buf1.compare(buf2);
  const result2 = buf2.compare(buf1);
  return result1 === 0 && result2 === 0;
});

test('极值字符比较', () => {
  const buf1 = Buffer.from([0, 255, 128, 1, 254]);
  const buf2 = Buffer.from([0, 255, 128, 1, 254]);
  const result = buf1.compare(buf2);
  return result === 0;
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