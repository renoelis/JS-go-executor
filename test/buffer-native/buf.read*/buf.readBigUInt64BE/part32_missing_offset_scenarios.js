// buf.readBigUInt64BE() - 遗漏的 offset 场景测试
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

// 测试 offset 为十六进制字符串（Node.js v25 不再自动转换）
test('offset 为十六进制字符串 "0x10" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(24);
    buf.readBigUInt64BE("0x10");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为十六进制字符串 "0x8" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigUInt64BE("0x8");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为十六进制字符串 "0x0" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE("0x0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 offset 为八进制字符串（Node.js v25 不再自动转换）
test('offset 为八进制字符串 "0o10" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigUInt64BE("0o10");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为八进制字符串 "0o0" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE("0o0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 offset 为二进制字符串（Node.js v25 不再自动转换）
test('offset 为二进制字符串 "0b1000" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigUInt64BE("0b1000");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为二进制字符串 "0b0" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE("0b0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 offset 为空字符串（Node.js v25 不再自动转换）
test('offset 为空字符串 "" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE("");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 offset 为空白字符串（Node.js v25 不再自动转换）
test('offset 为空格字符串 " " 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE(" ");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为制表符字符串 "\\t" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE("\t");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为换行符字符串 "\\n" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE("\n");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 offset 为日期对象（Node.js v25 不再自动转换）
test('offset 为 Date 对象应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    const date = new Date(8);
    buf.readBigUInt64BE(date);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为 Date(0) 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    const date = new Date(0);
    buf.readBigUInt64BE(date);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试多种 NaN 的表示
test('offset 为 Number.NaN 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE(Number.NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为 0/0 (NaN) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE(0/0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为 parseFloat("abc") (NaN) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE(parseFloat("abc"));
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 测试多种 Infinity 的表示
test('offset 为 Number.POSITIVE_INFINITY 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE(Number.POSITIVE_INFINITY);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 1/0 (Infinity) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE(1/0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 Number.NEGATIVE_INFINITY 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE(Number.NEGATIVE_INFINITY);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 -1/0 (-Infinity) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE(-1/0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 测试 offset 为正则表达式
test('offset 为正则表达式 /8/ 应通过 valueOf 转换', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(1234n, 8);
    // 正则表达式的 valueOf 返回自身，toString 返回字符串
    const regex = /8/;
    buf.readBigUInt64BE(regex);
    return false; // 应该抛出错误或转换失败
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 测试 offset 为布尔值（Node.js v25 不再自动转换）
test('offset 为 Boolean(true) 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(9);
    buf.readBigUInt64BE(Boolean(true));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为 Boolean(false) 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64BE(Boolean(false));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 offset 为负零
test('offset 为 -0 应等同于 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1111n, 0);
  return buf.readBigUInt64BE(-0) === 1111n;
});

// 测试 offset 为科学计数法字符串（Node.js v25 不再自动转换）
test('offset 为科学计数法字符串 "8e0" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.readBigUInt64BE("8e0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为科学计数法字符串 "1e1" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(18);
    buf.readBigUInt64BE("1e1");
    return false;
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
