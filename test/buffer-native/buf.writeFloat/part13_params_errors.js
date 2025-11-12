// buf.writeFloatBE/LE() - 参数组合和错误消息深度测试
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

// 参数数量测试
test('writeFloatBE 0个参数写入 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE();
  const value = buf.readFloatBE(0);
  return isNaN(value);
});

test('writeFloatLE 0个参数写入 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE();
  const value = buf.readFloatLE(0);
  return isNaN(value);
});

test('writeFloatBE 1个参数使用默认 offset=0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(5.5);
  return result === 4 && buf.readFloatBE(0) === 5.5;
});

test('writeFloatLE 1个参数使用默认 offset=0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(5.5);
  return result === 4 && buf.readFloatLE(0) === 5.5;
});

test('writeFloatBE 3个参数忽略第3个', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeFloatBE(5.5, 0, 'extra');
  return result === 4 && buf.readFloatBE(0) === 5.5;
});

test('writeFloatLE 3个参数忽略第3个', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeFloatLE(5.5, 0, 'extra');
  return result === 4 && buf.readFloatLE(0) === 5.5;
});

test('writeFloatBE 多余参数都被忽略', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeFloatBE(5.5, 0, 'a', 'b', 'c', 123);
  return result === 4 && buf.readFloatBE(0) === 5.5;
});

test('writeFloatLE 多余参数都被忽略', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeFloatLE(5.5, 0, 'a', 'b', 'c', 123);
  return result === 4 && buf.readFloatLE(0) === 5.5;
});

// 错误类型验证
test('writeFloatBE offset 越界抛出 RangeError', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatBE(1.5, 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeFloatLE offset 越界抛出 RangeError', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatLE(1.5, 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeFloatBE this 非 Buffer 抛出错误', () => {
  try {
    Buffer.prototype.writeFloatBE.call({}, 1.5, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('writeFloatLE this 非 Buffer 抛出错误', () => {
  try {
    Buffer.prototype.writeFloatLE.call({}, 1.5, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('writeFloatBE offset 为字符串抛出 TypeError', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(1.5, 'abc');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('writeFloatLE offset 为字符串抛出 TypeError', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(1.5, 'abc');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 错误消息内容验证
test('writeFloatBE offset 越界错误消息包含 offset', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatBE(1.5, 10);
    return false;
  } catch (e) {
    return e.message.toLowerCase().includes('offset');
  }
});

test('writeFloatLE offset 越界错误消息包含 offset', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatLE(1.5, 10);
    return false;
  } catch (e) {
    return e.message.toLowerCase().includes('offset');
  }
});

test('writeFloatBE offset 为小数错误消息包含 integer', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatBE(1.5, 2.5);
    return false;
  } catch (e) {
    return e.message.toLowerCase().includes('integer');
  }
});

test('writeFloatLE offset 为小数错误消息包含 integer', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeFloatLE(1.5, 2.5);
    return false;
  } catch (e) {
    return e.message.toLowerCase().includes('integer');
  }
});

// Buffer 状态测试
test('writeFloatBE 在已填充的 buffer 上覆盖写入', () => {
  const buf = Buffer.alloc(4, 0xff);
  buf.writeFloatBE(1.0, 0);
  return buf[0] === 0x3f && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 在已填充的 buffer 上覆盖写入', () => {
  const buf = Buffer.alloc(4, 0xff);
  buf.writeFloatLE(1.0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0x3f;
});

test('writeFloatBE 在部分已写入的 buffer 上写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatBE(1.5, 0);
  buf.writeFloatBE(2.5, 0);
  const value = buf.readFloatBE(0);
  return value === 2.5;
});

test('writeFloatLE 在部分已写入的 buffer 上写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatLE(1.5, 0);
  buf.writeFloatLE(2.5, 0);
  const value = buf.readFloatLE(0);
  return value === 2.5;
});

// 特殊 offset 值的组合
test('writeFloatBE offset=0 value=0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(0, 0);
  return result === 4 && buf.readFloatBE(0) === 0;
});

test('writeFloatLE offset=0 value=0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(0, 0);
  return result === 4 && buf.readFloatLE(0) === 0;
});

test('writeFloatBE offset=最大值 value=Infinity', () => {
  const buf = Buffer.allocUnsafe(10);
  const result = buf.writeFloatBE(Infinity, 6);
  return result === 10 && buf.readFloatBE(6) === Infinity;
});

test('writeFloatLE offset=最大值 value=Infinity', () => {
  const buf = Buffer.allocUnsafe(10);
  const result = buf.writeFloatLE(Infinity, 6);
  return result === 10 && buf.readFloatLE(6) === Infinity;
});

test('writeFloatBE offset=0 value=NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(NaN, 0);
  return result === 4 && isNaN(buf.readFloatBE(0));
});

test('writeFloatLE offset=0 value=NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(NaN, 0);
  return result === 4 && isNaN(buf.readFloatLE(0));
});

// 方法调用方式
test('writeFloatBE 使用 call 调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = Buffer.prototype.writeFloatBE.call(buf, 3.14, 0);
  return result === 4 && Math.abs(buf.readFloatBE(0) - 3.14) < 0.01;
});

test('writeFloatLE 使用 call 调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = Buffer.prototype.writeFloatLE.call(buf, 3.14, 0);
  return result === 4 && Math.abs(buf.readFloatLE(0) - 3.14) < 0.01;
});

test('writeFloatBE 使用 apply 调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = Buffer.prototype.writeFloatBE.apply(buf, [2.71, 0]);
  return result === 4 && Math.abs(buf.readFloatBE(0) - 2.71) < 0.01;
});

test('writeFloatLE 使用 apply 调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = Buffer.prototype.writeFloatLE.apply(buf, [2.71, 0]);
  return result === 4 && Math.abs(buf.readFloatLE(0) - 2.71) < 0.01;
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
