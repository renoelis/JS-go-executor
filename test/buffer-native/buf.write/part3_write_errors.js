// buf.write() - 错误处理测试
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
test('第一个参数不是字符串 - number', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write(123);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('第一个参数不是字符串 - object', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('第一个参数不是字符串 - array', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write([1, 2, 3]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('第一个参数不是字符串 - null', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('第一个参数不是字符串 - undefined', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset 参数错误
test('offset 为负数', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 超出 Buffer 长度', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 11);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 等于 Buffer 长度', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 10);
  return written === 0;
});

test('offset 为 NaN', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为 Infinity', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为小数会抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 2.7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为字符串数字会被当作 encoding', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', '3');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

// length 参数错误
test('length 为负数', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('length 为 NaN', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('length 为 Infinity', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 0, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('length 为小数会抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 0, 3.7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// encoding 参数错误
test('不支持的编码', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 'unknown');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('编码为 null 使用默认编码', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 5, null);
  return written === 5;
});

test('编码为空字符串使用默认编码', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', '');
  return written === 5;
});

// this 不是 Buffer
test('this 不是 Buffer - 普通对象', () => {
  try {
    Buffer.prototype.write.call({}, 'hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('this 不是 Buffer - null', () => {
  try {
    Buffer.prototype.write.call(null, 'hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('this 不是 Buffer - undefined', () => {
  try {
    Buffer.prototype.write.call(undefined, 'hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset + length 超出范围
test('offset + length 超出 Buffer 长度', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello world', 8, 10);
  return written === 2;
});

test('hex 编码 - 无效字符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('gg', 'hex');
  return written === 0;
});

test('base64 编码 - 无效字符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('!!!', 'base64');
  return written >= 0;
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
