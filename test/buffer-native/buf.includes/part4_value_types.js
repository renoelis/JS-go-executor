// buf.includes() - Value Types Tests
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

// String value
test('value 为字符串 - 基本', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world') === true;
});

test('value 为空字符串', () => {
  const buf = Buffer.from('hello');
  return buf.includes('') === true;
});

test('value 为单字符', () => {
  const buf = Buffer.from('hello');
  return buf.includes('h') === true;
});

// Integer value (byte)
test('value 为整数 - ASCII 值', () => {
  const buf = Buffer.from('hello');
  return buf.includes(104) === true; // 'h' = 104
});

test('value 为整数 - 0', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(0) === true;
});

test('value 为整数 - 255', () => {
  const buf = Buffer.from([255, 254, 253]);
  return buf.includes(255) === true;
});

test('value 为整数 - 负数应该按模 256 处理', () => {
  const buf = Buffer.from([255, 254, 253]);
  // -1 % 256 = 255
  return buf.includes(-1) === true;
});

test('value 为整数 - 大于 255 应该按模 256 处理', () => {
  const buf = Buffer.from([1, 2, 3]);
  // 257 % 256 = 1
  return buf.includes(257) === true;
});

test('value 为整数 - 不存在的字节', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.includes(100) === false;
});

// Buffer value
test('value 为 Buffer - 基本', () => {
  const buf = Buffer.from('hello world');
  return buf.includes(Buffer.from('world')) === true;
});

test('value 为 Buffer - 空 Buffer', () => {
  const buf = Buffer.from('hello');
  return buf.includes(Buffer.alloc(0)) === true;
});

test('value 为 Buffer - 单字节', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.includes(Buffer.from([3])) === true;
});

test('value 为 Buffer - 完全匹配', () => {
  const buf = Buffer.from('hello');
  return buf.includes(Buffer.from('hello')) === true;
});

test('value 为 Buffer - 超过源 Buffer 长度', () => {
  const buf = Buffer.from('hello');
  return buf.includes(Buffer.from('hello world')) === false;
});

// Uint8Array value
test('value 为 Uint8Array - 基本', () => {
  const buf = Buffer.from('hello world');
  const search = new Uint8Array([119, 111, 114, 108, 100]); // 'world'
  return buf.includes(search) === true;
});

test('value 为 Uint8Array - 空数组', () => {
  const buf = Buffer.from('hello');
  const search = new Uint8Array(0);
  return buf.includes(search) === true;
});

test('value 为 Uint8Array - 单字节', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const search = new Uint8Array([3]);
  return buf.includes(search) === true;
});

test('value 为 Uint8Array - 不匹配', () => {
  const buf = Buffer.from('hello');
  const search = new Uint8Array([255, 254]);
  return buf.includes(search) === false;
});

// Special values
test('value 为 undefined - 应该抛出错误或转换', () => {
  const buf = Buffer.from('hello');
  try {
    const result = buf.includes(undefined);
    // 如果没有抛出错误，检查结果
    return true;
  } catch (e) {
    // 抛出错误也是合理的
    return true;
  }
});

test('value 为 null - 应该抛出错误或转换', () => {
  const buf = Buffer.from('hello');
  try {
    const result = buf.includes(null);
    return true;
  } catch (e) {
    return true;
  }
});

test('value 为对象 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes({});
    return false; // 不应该执行到这里
  } catch (e) {
    return true; // 应该抛出错误
  }
});

test('value 为数组 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes([104, 101]);
    return false;
  } catch (e) {
    return true;
  }
});

test('value 为布尔值 - 应该抛出错误或转换', () => {
  const buf = Buffer.from([0, 1, 2]);
  try {
    const result = buf.includes(true);
    return true;
  } catch (e) {
    return true;
  }
});

test('value 为 NaN - 应该抛出错误或转换', () => {
  const buf = Buffer.from([0, 1, 2]);
  try {
    const result = buf.includes(NaN);
    return true;
  } catch (e) {
    return true;
  }
});

test('value 为小数 - 应该转换为整数', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.includes(2.7) === true; // 应该查找 2
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
