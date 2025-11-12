// buffer.compare() - Error Cases and Boundary Tests
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

test('null参数应该抛出错误', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.compare(null);
    return false;
  } catch (e) {
    return e.message.includes('target') && e.message.includes('instance');
  }
});

test('undefined参数应该抛出错误', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.compare(undefined);
    return false;
  } catch (e) {
    return e.message.includes('target') && e.message.includes('instance');
  }
});

test('字符串参数应该抛出错误', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.compare('abc');
    return false;
  } catch (e) {
    return e.message.includes('target') && e.message.includes('instance');
  }
});

test('数字参数应该抛出错误', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.compare(123);
    return false;
  } catch (e) {
    return e.message.includes('target') && e.message.includes('instance');
  }
});

test('普通对象参数应该抛出错误', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.compare({ valueOf: () => [1, 2, 3] });
    return false;
  } catch (e) {
    return e.message.includes('target') && e.message.includes('instance');
  }
});

test('数组参数应该抛出错误', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.compare([1, 2, 3]);
    return false;
  } catch (e) {
    return e.message.includes('target') && e.message.includes('instance');
  }
});

test('零长度TypedArray比较', () => {
  const buf = Buffer.alloc(0);
  const uint8 = new Uint8Array(0);
  const result = buf.compare(uint8);
  return result === 0;
});

test('空Buffer与长度为1的TypedArray比较', () => {
  const buf = Buffer.alloc(0);
  const uint8 = new Uint8Array([1]);
  const result = buf.compare(uint8);
  return result < 0;
});

test('长度不匹配的TypedArray比较', () => {
  const buf = Buffer.from([1, 2]);
  const uint8 = new Uint8Array([1, 2, 3]);
  const result = buf.compare(uint8);
  return result < 0;
});

test('负数内容比较', () => {
  const buf = Buffer.from([255]);
  const int8 = new Int8Array([-1]);
  const uint8 = new Uint8Array(int8.buffer);
  const result = buf.compare(uint8);
  return result === 0;
});

test('NaN参数边界检查', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.compare(NaN);
    return false;
  } catch (e) {
    return e.message.includes('target') && e.message.includes('instance');
  }
});

test('空对象参数边界检查', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.compare({});
    return false;
  } catch (e) {
    return e.message.includes('target') && e.message.includes('instance');
  }
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