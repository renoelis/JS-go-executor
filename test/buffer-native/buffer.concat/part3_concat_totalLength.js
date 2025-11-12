// Buffer.concat() - totalLength Parameter Tests
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

// 指定 totalLength 参数测试
test('totalLength等于实际长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 10);
  return result.length === 10 && result.toString() === 'helloworld';
});

test('totalLength小于实际长度（截断）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 7);
  return result.length === 7 && result.toString() === 'hellowo';
});

test('totalLength大于实际长度（填充零）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 15);
  return result.length === 15 &&
         result.toString('utf8', 0, 10) === 'helloworld' &&
         result[10] === 0 && result[14] === 0;
});

test('totalLength为0', () => {
  const buf1 = Buffer.from('test');
  const result = Buffer.concat([buf1], 0);
  return result.length === 0;
});

test('totalLength为1', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 1);
  return result.length === 1 && result[0] === 104; // 'h'
});

test('totalLength为负数时的行为', () => {
  const buf1 = Buffer.from('test');
  try {
    const result = Buffer.concat([buf1], -1);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('length') || e.message.includes('size') ||
           e.message.includes('negative') || e.message.includes('ERR_OUT_OF_RANGE');
  }
});

test('totalLength为超大值', () => {
  const buf = Buffer.from('a');
  try {
    const result = Buffer.concat([buf], 2147483647); // 接近 MAX_INT32
    return result.length === 2147483647;
  } catch (e) {
    // 某些环境可能会因内存不足而失败，这是可接受的
    return e.message.includes('memory') || e.message.includes('size') || e.message.includes('Invalid');
  }
});

test('totalLength为小数（应取整或报错）', () => {
  const buf = Buffer.from('test');
  try {
    const result = Buffer.concat([buf], 2.7);
    return result.length === 2; // 通常会截断小数部分
  } catch (e) {
    return true; // 或者抛出错误也是合理的
  }
});

test('totalLength为NaN', () => {
  const buf = Buffer.from('test');
  try {
    const result = Buffer.concat([buf], NaN);
    return false; // 应该抛出错误或有明确行为
  } catch (e) {
    return true;
  }
});

test('totalLength为Infinity', () => {
  const buf = Buffer.from('test');
  try {
    const result = Buffer.concat([buf], Infinity);
    return false;
  } catch (e) {
    return e.message.includes('length') || e.message.includes('Invalid') ||
           e.message.includes('size');
  }
});

test('totalLength为-Infinity', () => {
  const buf = Buffer.from('test');
  try {
    const result = Buffer.concat([buf], -Infinity);
    return false;
  } catch (e) {
    return e.message.includes('length') || e.message.includes('Invalid') ||
           e.message.includes('size') || e.message.includes('negative');
  }
});

test('空数组指定totalLength', () => {
  const result = Buffer.concat([], 10);
  // 空数组时即使指定totalLength也返回空Buffer
  return result.length === 0;
});

test('未指定totalLength时自动计算', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4, 5]);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 5;
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
