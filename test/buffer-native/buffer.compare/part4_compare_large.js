// buffer.compare() - Large Buffer and Performance Tests
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

test('大型Buffer相等比较', () => {
  const size = 10000;
  const buf1 = Buffer.alloc(size, 0x42);
  const buf2 = Buffer.alloc(size, 0x42);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('大型Buffer不相等比较', () => {
  const size = 10000;
  const buf1 = Buffer.alloc(size, 0x42);
  const buf2 = Buffer.alloc(size, 0x42);
  buf2[size - 1] = 0x41;
  const result = buf1.compare(buf2);
  return result > 0;
});

test('大型Buffer与大型Uint8Array比较', () => {
  const size = 10000;
  const buf = Buffer.alloc(size, 0x30);
  const uint8 = new Uint8Array(size);
  uint8.fill(0x30);
  const result = buf.compare(uint8);
  return result === 0;
});

test('超大Buffer比较性能测试', () => {
  const size = 100000;
  const buf1 = Buffer.alloc(size);
  const buf2 = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf1[i] = i % 256;
    buf2[i] = i % 256;
  }
  const start = Date.now();
  const result = buf1.compare(buf2);
  const end = Date.now();
  console.log(`超大Buffer比较耗时: ${end - start}ms`);
  return result === 0;
});

test('尾部差异的大Buffer比较', () => {
  const size = 50000;
  const buf1 = Buffer.alloc(size, 0x00);
  const buf2 = Buffer.alloc(size, 0x00);
  buf2[size - 1] = 0x01;
  const result = buf1.compare(buf2);
  return result < 0;
});

test('头部差异的大Buffer比较', () => {
  const size = 50000;
  const buf1 = Buffer.alloc(size, 0x00);
  const buf2 = Buffer.alloc(size, 0x00);
  buf2[0] = 0x01;
  const result = buf1.compare(buf2);
  return result < 0;
});

test('中间差异的大Buffer比较', () => {
  const size = 50000;
  const buf1 = Buffer.alloc(size, 0x00);
  const buf2 = Buffer.alloc(size, 0x00);
  buf2[Math.floor(size / 2)] = 0x01;
  const result = buf1.compare(buf2);
  return result < 0;
});

test('渐进式差异大Buffer比较', () => {
  const size = 10000;
  const buf1 = Buffer.alloc(size);
  const buf2 = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf1[i] = i % 128;
    buf2[i] = (i % 128) + 1;
  }
  const result = buf1.compare(buf2);
  return result < 0;
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