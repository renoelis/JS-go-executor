// buf.writeFloatBE/LE() - 性能和并发场景深度测试
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

// 大规模写入性能测试
test('writeFloatBE 百万次写入不抛错', () => {
  const buf = Buffer.allocUnsafe(4000000);
  try {
    for (let i = 0; i < 1000000; i++) {
      buf.writeFloatBE(i * 0.001, i * 4);
    }
    return true;
  } catch (e) {
    return false;
  }
});

test('writeFloatLE 百万次写入不抛错', () => {
  const buf = Buffer.allocUnsafe(4000000);
  try {
    for (let i = 0; i < 1000000; i++) {
      buf.writeFloatLE(i * 0.001, i * 4);
    }
    return true;
  } catch (e) {
    return false;
  }
});

// 交替 BE/LE 写入
test('交替使用 writeFloatBE 和 writeFloatLE 10000次', () => {
  const buf = Buffer.allocUnsafe(80000);
  try {
    for (let i = 0; i < 10000; i++) {
      if (i % 2 === 0) {
        buf.writeFloatBE(i * 0.1, i * 8);
      } else {
        buf.writeFloatLE(i * 0.1, i * 8);
      }
    }
    return true;
  } catch (e) {
    return false;
  }
});

// 重叠位置连续写入
test('writeFloatBE 在重叠位置连续写入1000次', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    for (let i = 0; i < 1000; i++) {
      buf.writeFloatBE(i * 0.1, 0);
      buf.writeFloatBE(i * 0.2, 2);
    }
    return true;
  } catch (e) {
    return false;
  }
});

test('writeFloatLE 在重叠位置连续写入1000次', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    for (let i = 0; i < 1000; i++) {
      buf.writeFloatLE(i * 0.1, 0);
      buf.writeFloatLE(i * 0.2, 2);
    }
    return true;
  } catch (e) {
    return false;
  }
});

// 非对齐地址写入
test('writeFloatBE 非4字节对齐地址写入性能', () => {
  const buf = Buffer.allocUnsafe(10000);
  try {
    for (let i = 0; i < 1000; i++) {
      buf.writeFloatBE(i * 0.1, i * 10 + 1);
    }
    return true;
  } catch (e) {
    return false;
  }
});

test('writeFloatLE 非4字节对齐地址写入性能', () => {
  const buf = Buffer.allocUnsafe(10000);
  try {
    for (let i = 0; i < 1000; i++) {
      buf.writeFloatLE(i * 0.1, i * 10 + 1);
    }
    return true;
  } catch (e) {
    return false;
  }
});

test('writeFloatBE 奇数 offset 写入', () => {
  const buf = Buffer.allocUnsafe(10000);
  try {
    for (let i = 0; i < 1000; i++) {
      const offset = i * 10 + 1;
      if (offset + 4 <= buf.length) {
        buf.writeFloatBE(i * 0.1, offset);
      }
    }
    return true;
  } catch (e) {
    return false;
  }
});

test('writeFloatLE 奇数 offset 写入', () => {
  const buf = Buffer.allocUnsafe(10000);
  try {
    for (let i = 0; i < 1000; i++) {
      const offset = i * 10 + 1;
      if (offset + 4 <= buf.length) {
        buf.writeFloatLE(i * 0.1, offset);
      }
    }
    return true;
  } catch (e) {
    return false;
  }
});

// 特殊值大量写入
test('writeFloatBE 写入1000个 NaN', () => {
  const buf = Buffer.allocUnsafe(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeFloatBE(NaN, i * 4);
  }
  return Array.from({length: 1000}, (_, i) => buf.readFloatBE(i * 4)).every(v => isNaN(v));
});

test('writeFloatLE 写入1000个 NaN', () => {
  const buf = Buffer.allocUnsafe(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeFloatLE(NaN, i * 4);
  }
  return Array.from({length: 1000}, (_, i) => buf.readFloatLE(i * 4)).every(v => isNaN(v));
});

test('writeFloatBE 写入1000个 Infinity', () => {
  const buf = Buffer.allocUnsafe(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeFloatBE(Infinity, i * 4);
  }
  return Array.from({length: 1000}, (_, i) => buf.readFloatBE(i * 4)).every(v => v === Infinity);
});

test('writeFloatLE 写入1000个 Infinity', () => {
  const buf = Buffer.allocUnsafe(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeFloatLE(Infinity, i * 4);
  }
  return Array.from({length: 1000}, (_, i) => buf.readFloatLE(i * 4)).every(v => v === Infinity);
});

// 混合值大量写入
test('writeFloatBE 混合写入正数、负数、零、特殊值各1000个', () => {
  const buf = Buffer.allocUnsafe(16000);
  const values = [1.5, -2.5, 0, -0];
  let offset = 0;
  try {
    for (let i = 0; i < 1000; i++) {
      for (const val of values) {
        buf.writeFloatBE(val, offset);
        offset += 4;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
});

test('writeFloatLE 混合写入正数、负数、零、特殊值各1000个', () => {
  const buf = Buffer.allocUnsafe(16000);
  const values = [1.5, -2.5, 0, -0];
  let offset = 0;
  try {
    for (let i = 0; i < 1000; i++) {
      for (const val of values) {
        buf.writeFloatLE(val, offset);
        offset += 4;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
});

// 递增递减值写入
test('writeFloatBE 写入递增值序列10000个', () => {
  const buf = Buffer.allocUnsafe(40000);
  for (let i = 0; i < 10000; i++) {
    buf.writeFloatBE(i * 0.01, i * 4);
  }
  return buf.readFloatBE(0) === 0 && Math.abs(buf.readFloatBE(39996) - 99.99) < 0.1;
});

test('writeFloatLE 写入递增值序列10000个', () => {
  const buf = Buffer.allocUnsafe(40000);
  for (let i = 0; i < 10000; i++) {
    buf.writeFloatLE(i * 0.01, i * 4);
  }
  return buf.readFloatLE(0) === 0 && Math.abs(buf.readFloatLE(39996) - 99.99) < 0.1;
});

test('writeFloatBE 写入递减值序列10000个', () => {
  const buf = Buffer.allocUnsafe(40000);
  for (let i = 0; i < 10000; i++) {
    buf.writeFloatBE(10000 - i * 0.01, i * 4);
  }
  return buf.readFloatBE(0) === 10000 && Math.abs(buf.readFloatBE(39996) - 9900.01) < 1;
});

test('writeFloatLE 写入递减值序列10000个', () => {
  const buf = Buffer.allocUnsafe(40000);
  for (let i = 0; i < 10000; i++) {
    buf.writeFloatLE(10000 - i * 0.01, i * 4);
  }
  return buf.readFloatLE(0) === 10000 && Math.abs(buf.readFloatLE(39996) - 9900.01) < 1;
});

// 随机 offset 写入（确保不重复）
test('writeFloatBE 随机 offset 写入1000次', () => {
  const buf = Buffer.allocUnsafe(10000);
  const mapping = new Map();
  for (let i = 0; i < 1000; i++) {
    const offset = Math.floor(Math.random() * 2499) * 4;
    mapping.set(offset, i * 0.1);
    buf.writeFloatBE(i * 0.1, offset);
  }
  let pass = true;
  for (const [offset, expectedValue] of mapping.entries()) {
    const value = buf.readFloatBE(offset);
    if (Math.abs(value - expectedValue) >= 0.02) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('writeFloatLE 随机 offset 写入1000次', () => {
  const buf = Buffer.allocUnsafe(10000);
  const mapping = new Map();
  for (let i = 0; i < 1000; i++) {
    const offset = Math.floor(Math.random() * 2499) * 4;
    mapping.set(offset, i * 0.1);
    buf.writeFloatLE(i * 0.1, offset);
  }
  let pass = true;
  for (const [offset, expectedValue] of mapping.entries()) {
    const value = buf.readFloatLE(offset);
    if (Math.abs(value - expectedValue) >= 0.02) {
      pass = false;
      break;
    }
  }
  return pass;
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
