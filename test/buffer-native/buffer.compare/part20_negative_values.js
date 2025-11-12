// buffer.compare() - 负数参数与边界值深度测试
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

test('负数targetStart应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, -1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('负数targetEnd应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, -1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('负数sourceStart应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 3, -1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('负数sourceEnd应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 3, 0, -1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('负零作为targetStart应该可以', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, -0, 3);
  return result === 0;
});

test('负零作为targetEnd应该可以', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, -0);
  return result > 0; // buf1全部 vs buf2空范围
});

test('小数targetStart应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0.5);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' && e.message.includes('integer');
  }
});

test('小数targetEnd应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 2.9);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' && e.message.includes('integer');
  }
});

test('小数sourceStart应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 3, 1.5);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' && e.message.includes('integer');
  }
});

test('小数sourceEnd应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 3, 0, 2.7);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' && e.message.includes('integer');
  }
});

test('非常小的负数应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, -1000000);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('非常小的负小数应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, -0.1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('Number.MIN_VALUE作为参数应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('Number.EPSILON作为参数应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, Number.EPSILON);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('Number.MIN_SAFE_INTEGER作为targetStart应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('1.0作为参数应该接受', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([0, 1, 2, 3]);
  const result = buf1.compare(buf2, 1.0, 4.0);
  return result === 0;
});

test('2e0作为参数应该接受', () => {
  const buf1 = Buffer.from([3, 4]);
  const buf2 = Buffer.from([1, 2, 3, 4]);
  const result = buf1.compare(buf2, 2e0, 4e0);
  return result === 0;
});

test('科学计数法小数应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 1.5e0);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('targetStart为0但targetEnd为负数', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, -1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('所有参数都是负零', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = buf1.compare(buf2, -0, -0, -0, -0);
  return result === 0; // 空范围 vs 空范围
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
