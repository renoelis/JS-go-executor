// buffer.kMaxLength - Part 12: Error Handling and Validation
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 错误类型验证
test('Buffer.alloc 超大值抛出 RangeError', () => {
  try {
    Buffer.alloc(kMaxLength + 1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('Buffer.alloc 超大值错误码为 ERR_OUT_OF_RANGE', () => {
  try {
    Buffer.alloc(kMaxLength + 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('Buffer.alloc 负数抛出 RangeError', () => {
  try {
    Buffer.alloc(-1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('Buffer.alloc NaN 抛出 TypeError', () => {
  try {
    Buffer.alloc(NaN);
    return false;
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('Buffer.alloc undefined 抛出 TypeError', () => {
  try {
    Buffer.alloc(undefined);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.alloc null 抛出 TypeError', () => {
  try {
    Buffer.alloc(null);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.alloc 字符串抛出 TypeError', () => {
  try {
    Buffer.alloc('hello');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.alloc 对象抛出 TypeError', () => {
  try {
    Buffer.alloc({});
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.alloc 数组抛出 TypeError', () => {
  try {
    Buffer.alloc([10]);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Buffer.from 错误处理
test('Buffer.from 不支持的类型抛出 TypeError', () => {
  try {
    Buffer.from(123);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.from 不支持的编码抛出 TypeError', () => {
  try {
    Buffer.from('hello', 'invalid-encoding');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.from null 抛出 TypeError', () => {
  try {
    Buffer.from(null);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.from undefined 抛出 TypeError', () => {
  try {
    Buffer.from(undefined);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 边界索引访问
test('访问超出范围的索引返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[100] === undefined;
});

test('访问负数索引返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[-1] === undefined;
});

test('设置超出范围的索引静默忽略', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[100] = 99;
  return buf.length === 3;
});

test('访问 kMaxLength 索引返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[kMaxLength] === undefined;
});

// slice 边界测试
test('slice 起始大于结束返回空 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(2, 1);
  return sliced.length === 0;
});

test('slice 负数索引正常工作', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(-2);
  return sliced.length === 2 && sliced[0] === 4;
});

test('slice 超大正数索引返回空 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(kMaxLength);
  return sliced.length === 0;
});

test('slice 超大负数索引从头开始', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(-kMaxLength);
  return sliced.length === 3;
});

// fill 边界测试
test('fill 起始大于结束不修改 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.fill(255, 5, 2);
  return buf[3] === 0;
});

test('fill 负数 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.fill(255, -3);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('fill 空值填充为 0', () => {
  const buf = Buffer.alloc(10, 'x');
  buf.fill('', 0, 5);
  return buf[0] === 0 && buf[5] !== 0;
});

// write 边界测试
test('write 超出范围的 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.write('hello', 100);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('write 字符串过长会被截断', () => {
  const buf = Buffer.alloc(3);
  const written = buf.write('hello');
  return written === 3 && buf.toString() === 'hel';
});

test('write 负数 offset 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.write('hello', -1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

// copy 边界测试
test('copy 目标偏移超出范围返回 0', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.alloc(10);
  const copied = buf1.copy(buf2, 100);
  return copied === 0;
});

test('copy 源范围无效抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.alloc(10);
    buf1.copy(buf2, 0, 10, 20);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('copy 负数 targetStart 抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.alloc(10);
    buf1.copy(buf2, -1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
