// buffer.kMaxLength - Part 3: Buffer Methods and Operations
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

// Buffer.concat 边界测试
test('Buffer.concat 总长度超过 kMaxLength 抛出错误', () => {
  try {
    const buf1 = Buffer.alloc(100);
    const buf2 = Buffer.alloc(100);
    Buffer.concat([buf1, buf2], kMaxLength + 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.concat 使用 kMaxLength 作为长度抛出错误', () => {
  try {
    const buf = Buffer.alloc(100);
    Buffer.concat([buf], kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError || e.message.includes('memory');
  }
});

test('Buffer.concat 正常长度工作正常', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 6 && result[0] === 1 && result[5] === 6;
});

test('Buffer.concat 指定有效长度', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([buf1, buf2], 4);
  return result.length === 4;
});

// slice 和 subarray 边界测试
test('buffer.slice 使用超大 start 参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(kMaxLength);
  return slice.length === 0;
});

test('buffer.slice 使用超大 end 参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(0, kMaxLength);
  return slice.length === 5;
});

test('buffer.subarray 使用超大 start 参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(kMaxLength);
  return sub.length === 0;
});

test('buffer.subarray 使用超大 end 参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, kMaxLength);
  return sub.length === 5;
});

test('buffer.slice 使用负数索引和 kMaxLength', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(-2, kMaxLength);
  return slice.length === 2 && slice[0] === 4;
});

// fill 方法边界测试
test('buffer.fill 使用超大 offset 参数静默忽略', () => {
  const buf = Buffer.alloc(10);
  buf.fill(1, kMaxLength);
  return buf[0] === 0 && buf[9] === 0;
});

test('buffer.fill 使用超出 buffer 范围的 end 也会抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.fill(1, 0, 1000);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.fill 使用合理范围内的参数正常工作', () => {
  const buf = Buffer.alloc(10);
  buf.fill(255, 2, 8);
  return buf[0] === 0 && buf[2] === 255 && buf[7] === 255 && buf[9] === 0;
});

// copy 方法边界测试
test('buffer.copy 使用超大 targetStart', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.alloc(10);
  const copied = buf1.copy(buf2, kMaxLength);
  return copied === 0;
});

test('buffer.copy 使用超大 sourceStart 会抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.alloc(10);
    buf1.copy(buf2, 0, kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.copy 使用大于源长度的 sourceEnd 会被截断', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.alloc(10);
  const copied = buf1.copy(buf2, 0, 0, 1000);
  return copied === 3 && buf2[0] === 1 && buf2[2] === 3;
});

// write 方法边界测试
test('buffer.write 使用超大 offset 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.write('hello', kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.write 使用超大 length 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.write('hello', 0, kMaxLength);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('buffer.write 正常写入', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0);
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
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
