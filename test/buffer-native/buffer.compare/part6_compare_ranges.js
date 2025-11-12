// buffer.compare() - Advanced Range Parameters Tests
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

test('完整参数范围比较', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([0, 1, 2, 3, 4, 5, 6]);
  const result = buf1.compare(buf2, 1, 6, 0, 5);
  return result === 0;
});

test('带targetStart参数比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([0, 1, 2, 3, 4]);
  const result = buf1.compare(buf2, 1, 4);
  return result === 0;
});

test('带targetStart和targetEnd参数比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([0, 1, 2, 3, 4]);
  const result = buf1.compare(buf2, 1, 4);
  return result === 0;
});

test('带所有范围参数比较', () => {
  const buf1 = Buffer.from([0, 1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3, 1, 4);
  return result === 0;
});

test('不同范围切片比较', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6]);
  const buf2 = Buffer.from([3, 4]);
  const result = buf1.compare(buf2, 0, 2, 2, 4);
  return result === 0;
});

test('边界范围相等比较', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5]);
  const result = buf1.compare(buf2, 0, 5, 0, 5);
  return result === 0;
});

test('负数targetStart应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, -1);
    return false;
  } catch (e) {
    return e.message.includes('ERR_OUT_OF_RANGE') || e.message.includes('out of range');
  }
});

test('负数sourceStart应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 3, -1);
    return false;
  } catch (e) {
    return e.message.includes('ERR_OUT_OF_RANGE') || e.message.includes('out of range');
  }
});

test('超出范围的targetEnd应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 10);
    return false;
  } catch (e) {
    return e.message.includes('ERR_OUT_OF_RANGE') || e.message.includes('out of range');
  }
});

test('超出范围的sourceEnd应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 3, 0, 10);
    return false;
  } catch (e) {
    return e.message.includes('ERR_OUT_OF_RANGE') || e.message.includes('out of range');
  }
});

test('单个字节范围比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([0, 2, 4]);
  const result = buf1.compare(buf2, 1, 2, 1, 2);
  return result === 0;
});

test('长度为0的范围比较', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 0, 0, 0);
  return result === 0;
});

test('浮点数参数截断', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0.9, 2.9, 0.8, 2.8);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
  }
});

test('大范围参数比较', () => {
  const buf1 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const buf2 = Buffer.from([5, 6, 7]);
  const result = buf1.compare(buf2, 0, 3, 5, 8);
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