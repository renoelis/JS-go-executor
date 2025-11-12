// Buffer.alloc() - Part 4: Error Handling Tests
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

// 参数类型错误
test('size 为负数 - 抛出 RangeError', () => {
  try {
    Buffer.alloc(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('size 为负数（大负数） - 抛出 RangeError', () => {
  try {
    Buffer.alloc(-1000);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('size 为 NaN - 抛出 TypeError 或 RangeError', () => {
  try {
    Buffer.alloc(NaN);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('size 为 Infinity - 抛出 RangeError', () => {
  try {
    Buffer.alloc(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('size 为 -Infinity - 抛出 RangeError', () => {
  try {
    Buffer.alloc(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('size 为 null - 抛出 TypeError 或转换为 0', () => {
  try {
    const buf = Buffer.alloc(null);
    return buf.length === 0;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('size 为字符串 10 - 可能转换或抛出错误', () => {
  try {
    const buf = Buffer.alloc('10');
    return buf.length === 10 || buf.length === 0;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('size 为字符串 abc - 抛出 TypeError 或转换', () => {
  try {
    Buffer.alloc('abc');
    return true;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('size 为布尔值 true - 可能转换为 1', () => {
  try {
    const buf = Buffer.alloc(true);
    return buf.length === 1 || buf.length === 0;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('size 为对象 {} - 抛出 TypeError', () => {
  try {
    Buffer.alloc({});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('size 为数组 [10] - 可能转换或抛出错误', () => {
  try {
    Buffer.alloc([10]);
    return true;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('size 为小数 10.5 - 应向下取整或抛出错误', () => {
  try {
    const buf = Buffer.alloc(10.5);
    return buf.length === 10;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('size 为小数 10.9 - 应向下取整或抛出错误', () => {
  try {
    const buf = Buffer.alloc(10.9);
    return buf.length === 10;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 边界值错误
test('size 超过最大安全整数 - 抛出 RangeError', () => {
  try {
    Buffer.alloc(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('size 为极大值 2^31 - 可能成功或 RangeError', () => {
  try {
    const buf = Buffer.alloc(Math.pow(2, 31));
    return buf.length === Math.pow(2, 31);
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('size 为 2^30 - 可能成功或抛出错误', () => {
  try {
    const buf = Buffer.alloc(Math.pow(2, 30));
    return buf.length === Math.pow(2, 30);
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 编码错误
test('无效的编码名称 - 应静默处理或抛出错误', () => {
  try {
    const buf = Buffer.alloc(10, 'test', 'invalid_encoding');
    return buf.length === 10;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('编码参数为数字 - 应抛出错误或忽略', () => {
  try {
    const buf = Buffer.alloc(10, 'test', 123);
    return buf.length === 10;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('编码参数为对象 - 应抛出错误或忽略', () => {
  try {
    const buf = Buffer.alloc(10, 'test', {});
    return buf.length === 10;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('编码参数为 null - 应使用默认编码', () => {
  try {
    const buf = Buffer.alloc(10, 'test', null);
    return buf.length === 10;
  } catch (e) {
    return false;
  }
});

// fill 参数与编码不匹配
test('hex 编码但 fill 包含非十六进制字符 - 应报错或处理', () => {
  try {
    const buf = Buffer.alloc(10, 'xyz', 'hex');
    return buf.length === 10;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('base64 编码但 fill 不是有效 base64 - 应处理', () => {
  try {
    const buf = Buffer.alloc(10, 'YWJj', 'base64');
    return buf.length === 10;
  } catch (e) {
    return false;
  }
});

test('hex 编码奇数长度 - 应报错', () => {
  try {
    const buf = Buffer.alloc(10, '123', 'hex');
    return buf.length === 10;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 无参数调用
test('无参数调用 - 抛出 TypeError', () => {
  try {
    Buffer.alloc();
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 多余参数
test('传入 4 个参数 - 应忽略多余参数', () => {
  try {
    const buf = Buffer.alloc(5, 0, 'utf8', 'extra');
    return buf.length === 5;
  } catch (e) {
    return false;
  }
});

// size 为 0 边界
test('size 为 0.0 - 应创建空 Buffer', () => {
  try {
    const buf = Buffer.alloc(0.0);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

test('size 为 -0 - 应创建空 Buffer', () => {
  try {
    const buf = Buffer.alloc(-0);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

// fill 为非常规类型
test('fill 为 null - 应使用默认填充', () => {
  try {
    const buf = Buffer.alloc(5, null);
    return buf.length === 5;
  } catch (e) {
    return false;
  }
});

test('fill 为数组 - 应抛出错误或处理', () => {
  try {
    const buf = Buffer.alloc(5, [1, 2, 3]);
    return buf.length === 5;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('fill 为对象 - 转换为 0', () => {
  try {
    const buf = Buffer.alloc(5, {});
    return buf.length === 5 && buf[0] === 0;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('fill 为函数 - 转换为 0', () => {
  try {
    const buf = Buffer.alloc(5, () => {});
    return buf.length === 5 && buf[0] === 0;
  } catch (e) {
    return e.name === 'TypeError';
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
