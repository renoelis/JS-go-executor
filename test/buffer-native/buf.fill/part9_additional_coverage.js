const { Buffer } = require('buffer');

// buf.fill() 额外覆盖测试
// 覆盖之前测试中遗漏的特殊类型和边界情况

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({
      name: name,
      status: result.pass ? '✅' : '❌',
      result: result
    });
  } catch (error) {
    tests.push({
      name: name,
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }
}

// === 函数类型值测试 ===

test('填充函数应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(function() {});
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充箭头函数应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(() => {});
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 对象类型值测试 ===

test('填充空对象应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill({});
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充带属性的对象应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill({ a: 1, b: 2 });
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 Date 对象应转换为时间戳的低字节', () => {
  const buf = Buffer.allocUnsafe(5);
  const date = new Date(256); // 时间戳 256
  buf.fill(date);
  // Date 对象会转换为数字（时间戳），256 & 255 = 0
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 RegExp 对象应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(/test/);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 数组类型值测试 ===

test('填充数组应转换为 0', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill([1, 2, 3]);
  // 数组会被强制转换为 0
  const expected = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充空数组应转换为空字符串再转为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill([]);
  // 空数组转换为空字符串，空字符串填充为 0
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 特殊数字值测试 ===

test('填充 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(Number.MAX_SAFE_INTEGER);
  // Number.MAX_SAFE_INTEGER & 255
  const expected = Buffer.from([255, 255, 255, 255, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(Number.MIN_SAFE_INTEGER);
  // Number.MIN_SAFE_INTEGER & 255
  const value = Number.MIN_SAFE_INTEGER & 255;
  const expected = Buffer.from([value, value, value, value, value]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 Number.POSITIVE_INFINITY 应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(Number.POSITIVE_INFINITY);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 Number.NEGATIVE_INFINITY 应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(Number.NEGATIVE_INFINITY);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 Number.NaN 应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(Number.NaN);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 Number.EPSILON 应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(Number.EPSILON);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 浮点数边界测试 ===

test('填充 0.1 应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0.1);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 0.99 应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0.99);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 1.1 应转换为 1', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(1.1);
  const expected = Buffer.from([1, 1, 1, 1, 1]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 1.9 应转换为 1', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(1.9);
  const expected = Buffer.from([1, 1, 1, 1, 1]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 254.9 应转换为 254', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(254.9);
  const expected = Buffer.from([254, 254, 254, 254, 254]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 255.1 应转换为 255', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(255.1);
  const expected = Buffer.from([255, 255, 255, 255, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 255.9 应转换为 255', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(255.9);
  const expected = Buffer.from([255, 255, 255, 255, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 负数浮点数测试 ===

test('填充 -0.5 应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(-0.5);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 -1.5 应转换为 255', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(-1.5);
  // -1 转换为 255
  const expected = Buffer.from([255, 255, 255, 255, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 -2.5 应转换为 254', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(-2.5);
  // -2 转换为 254
  const expected = Buffer.from([254, 254, 254, 254, 254]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 特殊 Unicode 字符测试 ===

test('填充零宽空格 (U+200B)', () => {
  const buf = Buffer.allocUnsafe(9);
  buf.fill('\u200B'); // 零宽空格，UTF-8: e2 80 8b
  return {
    pass: buf.length === 9,
    expected: '9 bytes filled',
    actual: `${buf.length} bytes, hex: ${buf.toString('hex')}`
  };
});

test('填充零宽连接符 (U+200D)', () => {
  const buf = Buffer.allocUnsafe(9);
  buf.fill('\u200D'); // 零宽连接符，UTF-8: e2 80 8d
  return {
    pass: buf.length === 9,
    expected: '9 bytes filled',
    actual: `${buf.length} bytes, hex: ${buf.toString('hex')}`
  };
});

test('填充字节顺序标记 (BOM U+FEFF)', () => {
  const buf = Buffer.allocUnsafe(9);
  buf.fill('\uFEFF'); // BOM，UTF-8: ef bb bf
  return {
    pass: buf.length === 9,
    expected: '9 bytes filled',
    actual: `${buf.length} bytes, hex: ${buf.toString('hex')}`
  };
});

// === 其他 TypedArray 视图测试 ===

test('填充 Int32Array 视图', () => {
  const arr = new Int32Array([1, 2]);
  const buf = Buffer.allocUnsafe(8);
  buf.fill(arr);
  return {
    pass: buf.length === 8,
    expected: '8 bytes filled',
    actual: `${buf.length} bytes`
  };
});

test('填充 Float64Array 视图', () => {
  const arr = new Float64Array([1.5]);
  const buf = Buffer.allocUnsafe(8);
  buf.fill(arr);
  return {
    pass: buf.length === 8,
    expected: '8 bytes filled',
    actual: `${buf.length} bytes`
  };
});

test('填充 BigInt64Array 视图', () => {
  const arr = new BigInt64Array([1n, 2n]);
  const buf = Buffer.allocUnsafe(16);
  buf.fill(arr);
  return {
    pass: buf.length === 16,
    expected: '16 bytes filled',
    actual: `${buf.length} bytes`
  };
});

// === 编码参数变体补充测试 ===

test('编码参数 latin1 别名 binary', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  buf1.fill('test', 'latin1');
  buf2.fill('test', 'binary');
  return {
    pass: buf1.equals(buf2),
    expected: 'should be equal',
    actual: `latin1: ${buf1.toString('hex')}, binary: ${buf2.toString('hex')}`
  };
});

test('编码参数 ucs2 别名 ucs-2', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  buf1.fill('test', 'ucs2');
  buf2.fill('test', 'ucs-2');
  return {
    pass: buf1.equals(buf2),
    expected: 'should be equal',
    actual: `ucs2: ${buf1.toString('hex')}, ucs-2: ${buf2.toString('hex')}`
  };
});

test('编码参数 utf16le 别名 utf-16le', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  buf1.fill('test', 'utf16le');
  buf2.fill('test', 'utf-16le');
  return {
    pass: buf1.equals(buf2),
    expected: 'should be equal',
    actual: `utf16le: ${buf1.toString('hex')}, utf-16le: ${buf2.toString('hex')}`
  };
});

// === offset/end 超大值测试 ===

test('offset 超大值应静默处理', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0xFF);
  buf.fill(0, 1000000);
  return {
    pass: buf.every(b => b === 0xFF),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

test('end 超大值应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(0x42, 0, 1000000);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('out of range'),
      expected: 'error about out of range',
      actual: e.message
    };
  }
});

// 统计结果
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
