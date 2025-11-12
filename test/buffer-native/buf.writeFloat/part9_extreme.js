// buf.writeFloatBE/LE() - 极端场景和压力测试
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

// 极大 offset
test('writeFloatBE 大 offset 值仍然检查边界', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(5.5, 1000000);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('buffer bounds');
  }
});

test('writeFloatLE 大 offset 值仍然检查边界', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(5.5, 1000000);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('buffer bounds');
  }
});

// offset 为 Infinity
test('writeFloatBE offset 为 Infinity 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(5.5, Infinity);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 Infinity 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(5.5, Infinity);
    return false;
  } catch (e) {
    return true;
  }
});

// offset 为 NaN
test('writeFloatBE offset 为 NaN 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(5.5, NaN);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为 NaN 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(5.5, NaN);
    return false;
  } catch (e) {
    return true;
  }
});

// 大 buffer 压力测试
test('writeFloatBE 在大 buffer 中连续写入', () => {
  const buf = Buffer.allocUnsafe(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeFloatBE(i * 0.1, i * 4);
  }
  return buf.readFloatBE(0) === 0 && Math.abs(buf.readFloatBE(3996) - 99.9) < 0.1;
});

test('writeFloatLE 在大 buffer 中连续写入', () => {
  const buf = Buffer.allocUnsafe(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeFloatLE(i * 0.1, i * 4);
  }
  return buf.readFloatLE(0) === 0 && Math.abs(buf.readFloatLE(3996) - 99.9) < 0.1;
});

// 多种特殊值
test('writeFloatBE 写入所有特殊浮点值', () => {
  const buf = Buffer.allocUnsafe(32);
  const values = [0, -0, 1, -1, Infinity, -Infinity, NaN];
  values.forEach((val, i) => {
    buf.writeFloatBE(val, i * 4);
  });
  const v0 = buf.readFloatBE(0);
  const v1 = buf.readFloatBE(4);
  const v2 = buf.readFloatBE(8);
  const v3 = buf.readFloatBE(12);
  const v4 = buf.readFloatBE(16);
  const v5 = buf.readFloatBE(20);
  const v6 = buf.readFloatBE(24);
  return v0 === 0 && v2 === 1 && v3 === -1 &&
         v4 === Infinity && v5 === -Infinity && isNaN(v6);
});

test('writeFloatLE 写入所有特殊浮点值', () => {
  const buf = Buffer.allocUnsafe(32);
  const values = [0, -0, 1, -1, Infinity, -Infinity, NaN];
  values.forEach((val, i) => {
    buf.writeFloatLE(val, i * 4);
  });
  const v0 = buf.readFloatLE(0);
  const v1 = buf.readFloatLE(4);
  const v2 = buf.readFloatLE(8);
  const v3 = buf.readFloatLE(12);
  const v4 = buf.readFloatLE(16);
  const v5 = buf.readFloatLE(20);
  const v6 = buf.readFloatLE(24);
  return v0 === 0 && v2 === 1 && v3 === -1 &&
         v4 === Infinity && v5 === -Infinity && isNaN(v6);
});

// 边界值的精确表示
test('writeFloatBE 单精度边界值精确写入和读取', () => {
  const buf = Buffer.allocUnsafe(4);
  const values = [
    Math.pow(2, -126),
    Math.pow(2, 127),
    1 + Math.pow(2, -23)
  ];
  return values.every(val => {
    buf.writeFloatBE(val, 0);
    const read = buf.readFloatBE(0);
    const relativeError = Math.abs((read - val) / val);
    return relativeError < 1e-6;
  });
});

test('writeFloatLE 单精度边界值精确写入和读取', () => {
  const buf = Buffer.allocUnsafe(4);
  const values = [
    Math.pow(2, -126),
    Math.pow(2, 127),
    1 + Math.pow(2, -23)
  ];
  return values.every(val => {
    buf.writeFloatLE(val, 0);
    const read = buf.readFloatLE(0);
    const relativeError = Math.abs((read - val) / val);
    return relativeError < 1e-6;
  });
});

// 连续相同值写入
test('writeFloatBE 连续写入相同值', () => {
  const buf = Buffer.allocUnsafe(16);
  for (let i = 0; i < 4; i++) {
    buf.writeFloatBE(3.14159, i * 4);
  }
  return [0, 4, 8, 12].every(offset => {
    const val = buf.readFloatBE(offset);
    return Math.abs(val - 3.14159) < 0.00001;
  });
});

test('writeFloatLE 连续写入相同值', () => {
  const buf = Buffer.allocUnsafe(16);
  for (let i = 0; i < 4; i++) {
    buf.writeFloatLE(3.14159, i * 4);
  }
  return [0, 4, 8, 12].every(offset => {
    const val = buf.readFloatLE(offset);
    return Math.abs(val - 3.14159) < 0.00001;
  });
});

// 负索引行为
test('writeFloatBE offset 为 -0 等同于 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(7.77, -0);
  return result === 4 && Math.abs(buf.readFloatBE(0) - 7.77) < 0.01;
});

test('writeFloatLE offset 为 -0 等同于 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(7.77, -0);
  return result === 4 && Math.abs(buf.readFloatLE(0) - 7.77) < 0.01;
});

// 科学计数法值
test('writeFloatBE 科学计数法表示的值', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.writeFloatBE(1.23e5, 0);
  buf.writeFloatBE(4.56e-5, 4);
  buf.writeFloatBE(7.89e10, 8);
  const v1 = buf.readFloatBE(0);
  const v2 = buf.readFloatBE(4);
  const v3 = buf.readFloatBE(8);
  return Math.abs(v1 - 1.23e5) < 1 &&
         Math.abs(v2 - 4.56e-5) < 1e-9 &&
         Math.abs(v3 - 7.89e10) < 1e6;
});

test('writeFloatLE 科学计数法表示的值', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.writeFloatLE(1.23e5, 0);
  buf.writeFloatLE(4.56e-5, 4);
  buf.writeFloatLE(7.89e10, 8);
  const v1 = buf.readFloatLE(0);
  const v2 = buf.readFloatLE(4);
  const v3 = buf.readFloatLE(8);
  return Math.abs(v1 - 1.23e5) < 1 &&
         Math.abs(v2 - 4.56e-5) < 1e-9 &&
         Math.abs(v3 - 7.89e10) < 1e6;
});

// 非正规化数
test('writeFloatBE 非正规化数写入', () => {
  const buf = Buffer.allocUnsafe(4);
  const denormal = 1e-40;
  buf.writeFloatBE(denormal, 0);
  const read = buf.readFloatBE(0);
  return read >= 0 && read < 1e-38;
});

test('writeFloatLE 非正规化数写入', () => {
  const buf = Buffer.allocUnsafe(4);
  const denormal = 1e-40;
  buf.writeFloatLE(denormal, 0);
  const read = buf.readFloatLE(0);
  return read >= 0 && read < 1e-38;
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
