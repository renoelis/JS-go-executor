// buf.writeDoubleBE/LE - Round 2: Documentation Coverage Tests
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

// 参数缺失测试 - value 缺失时转换为 undefined -> NaN
test('writeDoubleBE 缺少 value 参数写入 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE();
  const readBack = buf.readDoubleBE();
  return Number.isNaN(readBack);
});

test('writeDoubleLE 缺少 value 参数写入 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE();
  const readBack = buf.readDoubleLE();
  return Number.isNaN(readBack);
});

// 与 readDouble 的往返测试
test('writeDoubleBE 与 readDoubleBE 往返一致', () => {
  const buf = Buffer.alloc(8);
  const values = [0, 1, -1, 3.14, -2.718, 123.456, -987.654];

  for (const val of values) {
    buf.writeDoubleBE(val);
    const readBack = buf.readDoubleBE();
    if (Math.abs(readBack - val) > 1e-10) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE 与 readDoubleLE 往返一致', () => {
  const buf = Buffer.alloc(8);
  const values = [0, 1, -1, 3.14, -2.718, 123.456, -987.654];

  for (const val of values) {
    buf.writeDoubleLE(val);
    const readBack = buf.readDoubleLE();
    if (Math.abs(readBack - val) > 1e-10) {
      return false;
    }
  }
  return true;
});

test('writeDoubleBE 不能读取为 writeDoubleLE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456);
  const readAsLE = buf.readDoubleLE();
  return readAsLE !== 123.456;
});

test('writeDoubleLE 不能读取为 writeDoubleBE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(123.456);
  const readAsBE = buf.readDoubleBE();
  return readAsBE !== 123.456;
});

// undefined 作为 value
test('writeDoubleBE value 为 undefined 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(undefined);
  const readBack = buf.readDoubleBE();
  return Number.isNaN(readBack);
});

test('writeDoubleLE value 为 undefined 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(undefined);
  const readBack = buf.readDoubleLE();
  return Number.isNaN(readBack);
});

// null 作为 value
test('writeDoubleBE value 为 null 转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(null);
  const readBack = buf.readDoubleBE();
  return readBack === 0;
});

test('writeDoubleLE value 为 null 转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(null);
  const readBack = buf.readDoubleLE();
  return readBack === 0;
});

// 数组作为 value（取第一个元素）
test('writeDoubleBE value 为数组转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE([1, 2, 3]);
  const readBack = buf.readDoubleBE();
  return Number.isNaN(readBack);
});

test('writeDoubleLE value 为数组转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE([1, 2, 3]);
  const readBack = buf.readDoubleLE();
  return Number.isNaN(readBack);
});

// 对象作为 value
test('writeDoubleBE value 为对象转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE({});
  const readBack = buf.readDoubleBE();
  return Number.isNaN(readBack);
});

test('writeDoubleLE value 为对象转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE({});
  const readBack = buf.readDoubleLE();
  return Number.isNaN(readBack);
});

// offset 为 undefined（应该默认为 0）
test('writeDoubleBE offset 为 undefined 默认为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeDoubleBE(3.14, undefined);
  const readBack = buf.readDoubleBE(0);
  return result === 8 && Math.abs(readBack - 3.14) < 0.0001;
});

test('writeDoubleLE offset 为 undefined 默认为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeDoubleLE(3.14, undefined);
  const readBack = buf.readDoubleLE(0);
  return result === 8 && Math.abs(readBack - 3.14) < 0.0001;
});

// offset 为 null - Node v25.0.0 要求必须是 number 类型
test('writeDoubleBE offset 为 null 抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleBE(2.718, null);
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('offset');
  }
});

test('writeDoubleLE offset 为 null 抛出错误', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleLE(2.718, null);
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('offset');
  }
});

// 同一位置多次写入
test('writeDoubleBE 同一位置多次写入最后一次生效', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1.1, 0);
  buf.writeDoubleBE(2.2, 0);
  buf.writeDoubleBE(3.3, 0);
  const readBack = buf.readDoubleBE(0);
  return Math.abs(readBack - 3.3) < 0.0001;
});

test('writeDoubleLE 同一位置多次写入最后一次生效', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(1.1, 0);
  buf.writeDoubleLE(2.2, 0);
  buf.writeDoubleLE(3.3, 0);
  const readBack = buf.readDoubleLE(0);
  return Math.abs(readBack - 3.3) < 0.0001;
});

// 写入后 buffer 长度不变
test('writeDoubleBE 不改变 buffer 长度', () => {
  const buf = Buffer.alloc(16);
  const lenBefore = buf.length;
  buf.writeDoubleBE(123.456, 0);
  return buf.length === lenBefore;
});

test('writeDoubleLE 不改变 buffer 长度', () => {
  const buf = Buffer.alloc(16);
  const lenBefore = buf.length;
  buf.writeDoubleLE(123.456, 0);
  return buf.length === lenBefore;
});

// 链式调用返回值
test('writeDoubleBE 返回值可用于链式写入', () => {
  const buf = Buffer.alloc(24);
  const offset1 = buf.writeDoubleBE(1.1, 0);
  const offset2 = buf.writeDoubleBE(2.2, offset1);
  const offset3 = buf.writeDoubleBE(3.3, offset2);

  return offset1 === 8 && offset2 === 16 && offset3 === 24 &&
         Math.abs(buf.readDoubleBE(0) - 1.1) < 0.0001 &&
         Math.abs(buf.readDoubleBE(8) - 2.2) < 0.0001 &&
         Math.abs(buf.readDoubleBE(16) - 3.3) < 0.0001;
});

test('writeDoubleLE 返回值可用于链式写入', () => {
  const buf = Buffer.alloc(24);
  const offset1 = buf.writeDoubleLE(1.1, 0);
  const offset2 = buf.writeDoubleLE(2.2, offset1);
  const offset3 = buf.writeDoubleLE(3.3, offset2);

  return offset1 === 8 && offset2 === 16 && offset3 === 24 &&
         Math.abs(buf.readDoubleLE(0) - 1.1) < 0.0001 &&
         Math.abs(buf.readDoubleLE(8) - 2.2) < 0.0001 &&
         Math.abs(buf.readDoubleLE(16) - 3.3) < 0.0001;
});

// 写入数值边界值（非特殊值）
test('writeDoubleBE 写入非常大的整数', () => {
  const buf = Buffer.alloc(8);
  const value = 1e20;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE();
  return readBack === value;
});

test('writeDoubleLE 写入非常大的整数', () => {
  const buf = Buffer.alloc(8);
  const value = 1e20;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE();
  return readBack === value;
});

test('writeDoubleBE 写入非常小的负数', () => {
  const buf = Buffer.alloc(8);
  const value = -1e20;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE();
  return readBack === value;
});

test('writeDoubleLE 写入非常小的负数', () => {
  const buf = Buffer.alloc(8);
  const value = -1e20;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE();
  return readBack === value;
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
