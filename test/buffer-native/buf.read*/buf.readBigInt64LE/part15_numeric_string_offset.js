// buf.readBigInt64LE() - 数字字符串 offset 测试
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

// 字符串形式的整数 offset
test('offset = "0"（应抛出错误或转换）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(100n, 0);
    buf.readBigInt64LE("0");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "8"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigInt64LE(200n, 8);
    buf.readBigInt64LE("8");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "1.0"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigInt64LE("1.0");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "-1"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE("-1");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 十六进制字符串
test('offset = "0x0"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE("0x0");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "0x8"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigInt64LE("0x8");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 八进制字符串
test('offset = "0o10"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigInt64LE("0o10");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 二进制字符串
test('offset = "0b1000"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigInt64LE("0b1000");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 科学计数法字符串
test('offset = "1e2"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(200);
    buf.readBigInt64LE("1e2");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "1E1"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(20);
    buf.readBigInt64LE("1E1");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 带空格的字符串
test('offset = " 0 "（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(" 0 ");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "\\t8\\n"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigInt64LE("\t8\n");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 特殊字符串值
test('offset = "NaN"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE("NaN");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "Infinity"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE("Infinity");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "-Infinity"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE("-Infinity");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 混合字符
test('offset = "8px"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigInt64LE("8px");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = "abc123"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(200);
    buf.readBigInt64LE("abc123");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
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
