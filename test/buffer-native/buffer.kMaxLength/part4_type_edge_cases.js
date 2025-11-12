// buffer.kMaxLength - Part 4: Type Conversions and Edge Cases
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

// 数字类型边界测试
test('Buffer.alloc 使用字符串形式的 kMaxLength', () => {
  try {
    Buffer.alloc(kMaxLength.toString());
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError || e instanceof TypeError;
  }
});

test('Buffer.alloc 使用浮点数接近 kMaxLength', () => {
  try {
    Buffer.alloc(kMaxLength - 0.5);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.alloc 使用浮点数 kMaxLength + 0.5', () => {
  try {
    Buffer.alloc(kMaxLength + 0.5);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.alloc 使用科学计数法表示 kMaxLength', () => {
  try {
    Buffer.alloc(9.007199254740991e15);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.alloc 使用 Number.MAX_VALUE', () => {
  try {
    Buffer.alloc(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('Buffer.alloc 使用 Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(Number.MIN_VALUE);
  return buf.length === 0;
});

// 对象类型测试
test('Buffer.alloc 使用对象包装的数字', () => {
  try {
    Buffer.alloc(new Number(kMaxLength));
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError || e instanceof TypeError;
  }
});

test('Buffer.alloc 使用 null', () => {
  try {
    Buffer.alloc(null);
    return false;
  } catch (e) {
    return e instanceof TypeError || e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('Buffer.alloc 使用 undefined', () => {
  try {
    Buffer.alloc(undefined);
    return false;
  } catch (e) {
    return e instanceof TypeError || e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

// ArrayBuffer 和 TypedArray 测试
test('Buffer.from(ArrayBuffer) 不受 kMaxLength 约束（受内存限制）', () => {
  const ab = new ArrayBuffer(1024);
  const buf = Buffer.from(ab);
  return buf.length === 1024;
});

test('Buffer.from(Uint8Array) 不受 kMaxLength 约束（受内存限制）', () => {
  const u8 = new Uint8Array(1024);
  const buf = Buffer.from(u8);
  return buf.length === 1024;
});

test('创建超大 TypedArray 长度会失败', () => {
  try {
    new Uint8Array(kMaxLength);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

// 字符串编码边界测试
test('Buffer.from(超长字符串) 不会超过 kMaxLength', () => {
  try {
    const longStr = 'a'.repeat(1000000);
    const buf = Buffer.from(longStr);
    return buf.length === 1000000 && buf.length < kMaxLength;
  } catch (e) {
    return e.message.includes('memory');
  }
});

test('Buffer.byteLength 计算超长字符串', () => {
  const longStr = 'a'.repeat(1000000);
  const len = Buffer.byteLength(longStr);
  return len === 1000000 && len < kMaxLength;
});

test('Buffer.byteLength 使用不同编码', () => {
  const str = 'hello';
  const utf8Len = Buffer.byteLength(str, 'utf8');
  const hexLen = Buffer.byteLength(str, 'hex');
  return utf8Len === 5 && hexLen === 2;
});

// 边界值精度测试
test('kMaxLength 和 kMaxLength - 1 可以区分', () => {
  return kMaxLength !== kMaxLength - 1 && kMaxLength > kMaxLength - 1;
});

test('kMaxLength 和 kMaxLength + 1 可以区分', () => {
  return kMaxLength !== kMaxLength + 1 && kMaxLength < kMaxLength + 1;
});

test('kMaxLength 的精度足够表示所有有效索引', () => {
  const testVal = kMaxLength - 100;
  return testVal + 100 === kMaxLength;
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
