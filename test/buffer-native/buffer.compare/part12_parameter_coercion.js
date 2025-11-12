// buffer.compare() - 参数类型强制转换测试
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

test('targetStart为字符串数字应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([0, 1, 2, 3]);
    buf1.compare(buf2, '1', '4');
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('string');
  }
});

test('targetStart为布尔值应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, true, 3);
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('boolean');
  }
});

test('范围参数为null应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, null, 3);
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('null');
  }
});

test('范围参数为undefined应该使用默认值', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, undefined, undefined);
  return result === 0;
});

test('targetEnd省略应该使用target长度', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([0, 1, 2, 3, 4]);
  const result = buf1.compare(buf2, 1); // 比较 buf2[1..end] 与 buf1[0..end]
  return result < 0; // buf2[1..4] = [1,2,3,4] vs buf1 = [1,2,3], 前3个相同但buf2更长
});

test('sourceEnd省略应该使用source长度', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([2, 3, 4]);
  const result = buf1.compare(buf2, 0, 3, 1); // buf1[1..end] vs buf2[0..3]
  return result > 0; // buf1[1..end] = [2,3,4,5] vs buf2[0..3] = [2,3,4], 前3个相同但buf1更长
});

test('所有范围参数省略应该比较整个buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('Infinity作为targetEnd应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, Infinity);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('integer');
  }
});

test('-Infinity作为targetStart应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, -Infinity);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('integer');
  }
});

test('NaN作为targetStart应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, NaN);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
  }
});

test('小数参数应该被拒绝', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0.5, 2.7);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
  }
});

test('负数targetEnd应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, -1);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('targetStart大于targetEnd结果为正数', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 2, 1); // 空范围
  return result > 0; // 整个buf1 vs 空范围
});

test('sourceStart大于sourceEnd结果为负数', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3, 2, 1); // buf1空范围 vs buf2全部
  return result < 0; // 空范围 vs 整个buf2
});

test('空字符串参数应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, '', '3');
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('string');
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
