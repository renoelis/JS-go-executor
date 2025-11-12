// buf.writeFloatBE/LE() - offset 参数深度边界测试
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

// 极大 offset 值
test('writeFloatBE offset 为 Number.MAX_SAFE_INTEGER 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(1.5, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 Number.MAX_SAFE_INTEGER 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(1.5, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatBE offset 为 Number.MAX_VALUE 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(1.5, Number.MAX_VALUE);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 Number.MAX_VALUE 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(1.5, Number.MAX_VALUE);
    return false;
  } catch (e) {
    return true;
  }
});

// 极小 offset 值
test('writeFloatBE offset 为 Number.MIN_VALUE 会被当作 0', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    const result = buf.writeFloatBE(1.5, Number.MIN_VALUE);
    return result === 4;
  } catch (e) {
    return e.message.includes('integer');
  }
});

test('writeFloatLE offset 为 Number.MIN_VALUE 会被当作 0', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    const result = buf.writeFloatLE(1.5, Number.MIN_VALUE);
    return result === 4;
  } catch (e) {
    return e.message.includes('integer');
  }
});

test('writeFloatBE offset 为 -Number.MAX_VALUE 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(1.5, -Number.MAX_VALUE);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 -Number.MAX_VALUE 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(1.5, -Number.MAX_VALUE);
    return false;
  } catch (e) {
    return true;
  }
});

// 2^n 边界值
test('writeFloatBE offset 为 2^32 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(1.5, Math.pow(2, 32));
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 2^32 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(1.5, Math.pow(2, 32));
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatBE offset 为 2^31 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(1.5, Math.pow(2, 31));
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 2^31 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(1.5, Math.pow(2, 31));
    return false;
  } catch (e) {
    return true;
  }
});

// 接近最大有效 offset
test('writeFloatBE offset 为 buf.length - 3 抛出错误（需要4字节）', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatBE(1.5, buf.length - 3);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 buf.length - 3 抛出错误（需要4字节）', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatLE(1.5, buf.length - 3);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatBE offset 为 buf.length - 2 抛出错误', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatBE(1.5, buf.length - 2);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 buf.length - 2 抛出错误', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatLE(1.5, buf.length - 2);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatBE offset 为 buf.length - 1 抛出错误', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatBE(1.5, buf.length - 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 buf.length - 1 抛出错误', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatLE(1.5, buf.length - 1);
    return false;
  } catch (e) {
    return true;
  }
});

// 负数边界
test('writeFloatBE offset 为 -1 抛出错误', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatBE(1.5, -1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('offset');
  }
});

test('writeFloatLE offset 为 -1 抛出错误', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatLE(1.5, -1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('offset');
  }
});

test('writeFloatBE offset 为 -0.1 抛出错误（非整数）', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatBE(1.5, -0.1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 -0.1 抛出错误（非整数）', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatLE(1.5, -0.1);
    return false;
  } catch (e) {
    return true;
  }
});

// 边界值精确测试
test('writeFloatBE 在 1024 字节 buffer 的每个有效 offset', () => {
  const buf = Buffer.allocUnsafe(1024);
  let success = true;
  for (let i = 0; i <= 1020; i += 4) {
    try {
      const result = buf.writeFloatBE(i * 0.1, i);
      if (result !== i + 4) {
        success = false;
        break;
      }
    } catch (e) {
      success = false;
      break;
    }
  }
  return success;
});

test('writeFloatLE 在 1024 字节 buffer 的每个有效 offset', () => {
  const buf = Buffer.allocUnsafe(1024);
  let success = true;
  for (let i = 0; i <= 1020; i += 4) {
    try {
      const result = buf.writeFloatLE(i * 0.1, i);
      if (result !== i + 4) {
        success = false;
        break;
      }
    } catch (e) {
      success = false;
      break;
    }
  }
  return success;
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
