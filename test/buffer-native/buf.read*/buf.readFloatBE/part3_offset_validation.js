// buf.readFloatBE() - Offset 参数完整验证
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

// offset 默认值测试
test('offset 默认值为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123.456, 0);
  return Math.abs(buf.readFloatBE() - 123.456) < 0.001;
});

// offset 边界值测试
test('offset = buf.length - 4（最大有效值）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(999.999, 4);
  return Math.abs(buf.readFloatBE(4) - 999.999) < 0.001;
});

test('offset = buf.length - 3（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = buf.length（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(4);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = buf.length + 1（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 负数 offset
test('offset = -1（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -100（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(-100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// undefined/null offset
test('offset = undefined（应使用默认值 0）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(777.777, 0);
  return Math.abs(buf.readFloatBE(undefined) - 777.777) < 0.001;
});

test('offset = null（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// NaN offset
test('offset = NaN（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 字符串 offset
test('offset = "0"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = "abc"（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE('abc');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 浮点数 offset
test('offset = 0.5（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1.9（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(1.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 其他无效类型
test('offset = 对象（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = 数组（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE([0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = 布尔值 true（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = 布尔值 false（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 极大的 offset
test('offset = Number.MAX_SAFE_INTEGER（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = -Infinity（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 空 Buffer
test('空 Buffer 读取（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 长度不足 4 字节（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
