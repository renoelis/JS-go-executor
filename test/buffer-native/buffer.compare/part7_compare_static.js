// Buffer.compare() - Static Method Tests
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

test('静态方法基本相等比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = Buffer.compare(buf1, buf2);
  return result === 0;
});

test('静态方法基本小于比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 3, 3]);
  const result = Buffer.compare(buf1, buf2);
  return result < 0;
});

test('静态方法基本大于比较', () => {
  const buf1 = Buffer.from([2, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = Buffer.compare(buf1, buf2);
  return result > 0;
});

test('静态方法字符串比较', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('def');
  const result = Buffer.compare(buf1, buf2);
  return result < 0;
});

test('静态方法空buffer比较', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const result = Buffer.compare(buf1, buf2);
  return result === 0;
});

test('静态方法不同长度比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3, 4]);
  const result = Buffer.compare(buf1, buf2);
  return result < 0;
});

test('静态方法Uint8Array比较', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);
  const result = Buffer.compare(buf, uint8);
  return result === 0;
});

test('静态方法相同buffer比较', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = Buffer.compare(buf, buf);
  return result === 0;
});

test('静态方法null参数应该抛出错误', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    Buffer.compare(buf, null);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('instance');
  }
});

test('静态方法两个null参数应该抛出错误', () => {
  try {
    Buffer.compare(null, null);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('instance');
  }
});

test('静态方法单参数应该抛出错误', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    Buffer.compare(buf);
    return false;
  } catch (e) {
    return e.message.includes('buf2') && e.message.includes('undefined');
  }
});

test('静态方法参数顺序不同结果', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([2, 2, 3]);
  const result1 = Buffer.compare(buf1, buf2);
  const result2 = Buffer.compare(buf2, buf1);
  return (result1 < 0 && result2 > 0);
});

test('静态方法大buffer比较', () => {
  const size = 10000;
  const buf1 = Buffer.alloc(size, 0x42);
  const buf2 = Buffer.alloc(size, 0x42);
  buf2[size - 1] = 0x41;
  const result = Buffer.compare(buf1, buf2);
  return result > 0;
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