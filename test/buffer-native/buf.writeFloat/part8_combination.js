// buf.writeFloatBE/LE() - 组合场景和交叉测试
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

// 连续写入不同位置
test('writeFloatBE 连续写入多个位置', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeFloatBE(1.1, 0);
  buf.writeFloatBE(2.2, 4);
  buf.writeFloatBE(3.3, 8);
  buf.writeFloatBE(4.4, 12);
  const v1 = buf.readFloatBE(0);
  const v2 = buf.readFloatBE(4);
  const v3 = buf.readFloatBE(8);
  const v4 = buf.readFloatBE(12);
  return Math.abs(v1 - 1.1) < 0.01 && Math.abs(v2 - 2.2) < 0.01 &&
         Math.abs(v3 - 3.3) < 0.01 && Math.abs(v4 - 4.4) < 0.01;
});

test('writeFloatLE 连续写入多个位置', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeFloatLE(1.1, 0);
  buf.writeFloatLE(2.2, 4);
  buf.writeFloatLE(3.3, 8);
  buf.writeFloatLE(4.4, 12);
  const v1 = buf.readFloatLE(0);
  const v2 = buf.readFloatLE(4);
  const v3 = buf.readFloatLE(8);
  const v4 = buf.readFloatLE(12);
  return Math.abs(v1 - 1.1) < 0.01 && Math.abs(v2 - 2.2) < 0.01 &&
         Math.abs(v3 - 3.3) < 0.01 && Math.abs(v4 - 4.4) < 0.01;
});

// BE 和 LE 混合写入
test('混合使用 writeFloatBE 和 writeFloatLE', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatBE(1.23, 0);
  buf.writeFloatLE(4.56, 4);
  const v1 = buf.readFloatBE(0);
  const v2 = buf.readFloatLE(4);
  return Math.abs(v1 - 1.23) < 0.01 && Math.abs(v2 - 4.56) < 0.01;
});

// 使用返回值继续写入
test('writeFloatBE 使用返回值作为下一个 offset', () => {
  const buf = Buffer.allocUnsafe(12);
  let offset = 0;
  offset = buf.writeFloatBE(1.1, offset);
  offset = buf.writeFloatBE(2.2, offset);
  offset = buf.writeFloatBE(3.3, offset);
  return offset === 12 && Math.abs(buf.readFloatBE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatBE(4) - 2.2) < 0.01 && Math.abs(buf.readFloatBE(8) - 3.3) < 0.01;
});

test('writeFloatLE 使用返回值作为下一个 offset', () => {
  const buf = Buffer.allocUnsafe(12);
  let offset = 0;
  offset = buf.writeFloatLE(1.1, offset);
  offset = buf.writeFloatLE(2.2, offset);
  offset = buf.writeFloatLE(3.3, offset);
  return offset === 12 && Math.abs(buf.readFloatLE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatLE(4) - 2.2) < 0.01 && Math.abs(buf.readFloatLE(8) - 3.3) < 0.01;
});

// 特殊值组合
test('writeFloatBE 写入 Infinity 后写入正常值', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatBE(Infinity, 0);
  buf.writeFloatBE(3.14, 4);
  return buf.readFloatBE(0) === Infinity && Math.abs(buf.readFloatBE(4) - 3.14) < 0.01;
});

test('writeFloatLE 写入 NaN 后写入正常值', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatLE(NaN, 0);
  buf.writeFloatLE(2.71, 4);
  return isNaN(buf.readFloatLE(0)) && Math.abs(buf.readFloatLE(4) - 2.71) < 0.01;
});

// offset 为字符串数字
test('writeFloatBE offset 为字符串数字会抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(5.5, '4');
    return false;
  } catch (e) {
    return e.message.includes('type') || e.message.includes('number');
  }
});

test('writeFloatLE offset 为字符串数字会抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(5.5, '4');
    return false;
  } catch (e) {
    return e.message.includes('type') || e.message.includes('number');
  }
});

// 非法字符串 offset
test('writeFloatBE offset 为非法字符串抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(5.5, 'abc');
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE offset 为非法字符串抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(5.5, 'abc');
    return false;
  } catch (e) {
    return true;
  }
});

// 写入后立即读取
test('writeFloatBE 写入后立即用相同方法读取', () => {
  const buf = Buffer.allocUnsafe(4);
  const values = [0, 1, -1, 3.14, -2.71, 123.456, -987.654];
  return values.every(val => {
    buf.writeFloatBE(val, 0);
    const read = buf.readFloatBE(0);
    return Math.abs(read - val) < 0.01 || (isNaN(val) && isNaN(read));
  });
});

test('writeFloatLE 写入后立即用相同方法读取', () => {
  const buf = Buffer.allocUnsafe(4);
  const values = [0, 1, -1, 3.14, -2.71, 123.456, -987.654];
  return values.every(val => {
    buf.writeFloatLE(val, 0);
    const read = buf.readFloatLE(0);
    return Math.abs(read - val) < 0.01 || (isNaN(val) && isNaN(read));
  });
});

// 重叠写入
test('writeFloatBE 部分重叠写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatBE(1.11, 0);
  buf.writeFloatBE(2.22, 2);
  const v1 = buf.readFloatBE(0);
  const v2 = buf.readFloatBE(2);
  return typeof v1 === 'number' && typeof v2 === 'number';
});

test('writeFloatLE 部分重叠写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatLE(1.11, 0);
  buf.writeFloatLE(2.22, 2);
  const v1 = buf.readFloatLE(0);
  const v2 = buf.readFloatLE(2);
  return typeof v1 === 'number' && typeof v2 === 'number';
});

// 数组形式的 offset
test('writeFloatBE offset 为数组会抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(5.5, [4]);
    return false;
  } catch (e) {
    return e.message.includes('type') || e.message.includes('number');
  }
});

test('writeFloatLE offset 为对象会转换为 NaN 抛出错误', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(5.5, {});
    return false;
  } catch (e) {
    return true;
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
