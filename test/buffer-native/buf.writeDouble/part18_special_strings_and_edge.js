// buf.writeDoubleBE/LE - 特殊字符串和边界测试
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

// 空字符串转换为 0
test('writeDoubleBE value 为空字符串转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('');
  const result = buf.readDoubleBE();
  return result === 0;
});

test('writeDoubleLE value 为空字符串转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('');
  const result = buf.readDoubleLE();
  return result === 0;
});

// 空格字符串转换为 0
test('writeDoubleBE value 为空格字符串转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('   ');
  const result = buf.readDoubleBE();
  return result === 0;
});

test('writeDoubleLE value 为制表符转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('\t\t');
  const result = buf.readDoubleLE();
  return result === 0;
});

// 非数字字符串转换为 NaN
test('writeDoubleBE value 为 "abc" 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('abc');
  const result = buf.readDoubleBE();
  return Number.isNaN(result);
});

test('writeDoubleLE value 为 "hello" 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('hello');
  const result = buf.readDoubleLE();
  return Number.isNaN(result);
});

// 部分数字字符串转换为 NaN
test('writeDoubleBE value 为 "123abc" 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('123abc');
  const result = buf.readDoubleBE();
  return Number.isNaN(result);
});

test('writeDoubleLE value 为 "45.6xyz" 转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('45.6xyz');
  const result = buf.readDoubleLE();
  return Number.isNaN(result);
});

// 多余参数应被忽略
test('writeDoubleBE 忽略多余参数', () => {
  const buf = Buffer.alloc(8);
  const ret = buf.writeDoubleBE(3.14, 0, 999, 'extra', {}, []);
  return ret === 8;
});

test('writeDoubleLE 忽略多余参数', () => {
  const buf = Buffer.alloc(8);
  const ret = buf.writeDoubleLE(2.718, 0, 888, true, false);
  return ret === 8;
});

// 科学计数法边界
test('writeDoubleBE 写入 1e-308', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1e-308);
  const result = buf.readDoubleBE();
  return result === 1e-308;
});

test('writeDoubleLE 写入 1e308', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(1e308);
  const result = buf.readDoubleLE();
  return result === 1e308;
});

test('writeDoubleBE 写入 1e309 得到 Infinity', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1e309);
  const result = buf.readDoubleBE();
  return result === Infinity;
});

test('writeDoubleLE 写入 -1e309 得到 -Infinity', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-1e309);
  const result = buf.readDoubleLE();
  return result === -Infinity;
});

// Subnormal numbers (非规格化数)
test('writeDoubleBE 写入 MIN_VALUE/2 得到 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.MIN_VALUE / 2);
  const result = buf.readDoubleBE();
  return result === 0;
});

test('writeDoubleLE 写入最小规格化数', () => {
  const buf = Buffer.alloc(8);
  const minNormal = 2.2250738585072014e-308;
  buf.writeDoubleLE(minNormal);
  const result = buf.readDoubleLE();
  return result === minNormal;
});

// offset 为对象应该报错
test('writeDoubleBE offset 为对象报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.23, { valueOf: () => 2 });
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('offset');
  }
});

test('writeDoubleLE offset 为对象报错', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.23, { toString: () => '4' });
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('offset');
  }
});

// 负零的字节表示不同于正零
test('writeDoubleBE 写入 0 和 -0 字节不同', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeDoubleBE(0);
  buf2.writeDoubleBE(-0);
  // 检查符号位
  return buf1[0] !== buf2[0]; // 符号位应该不同
});

test('writeDoubleLE 写入 0 和 -0 字节不同', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeDoubleLE(0);
  buf2.writeDoubleLE(-0);
  // LE 格式符号位在最后一个字节
  return buf1[7] !== buf2[7];
});

// 验证负零的特性
test('writeDoubleBE 负零读取后保持负零特性', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-0);
  const result = buf.readDoubleBE();
  return Object.is(result, -0);
});

test('writeDoubleLE 负零读取后保持负零特性', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-0);
  const result = buf.readDoubleLE();
  return Object.is(result, -0);
});

// Number() 包装
test('writeDoubleBE value 为 Number("123.456")', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number('123.456'));
  const result = buf.readDoubleBE();
  return Math.abs(result - 123.456) < 0.0001;
});

test('writeDoubleLE value 为 Number(true)', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number(true));
  const result = buf.readDoubleLE();
  return result === 1;
});

// 特殊前缀字符串
test('writeDoubleBE value 为 "+123.45"', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('+123.45');
  const result = buf.readDoubleBE();
  return Math.abs(result - 123.45) < 0.01;
});

test('writeDoubleLE value 为 "-456.78"', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('-456.78');
  const result = buf.readDoubleLE();
  return Math.abs(result - (-456.78)) < 0.01;
});

// 带前导零的字符串
test('writeDoubleBE value 为 "0123" (十进制)', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('0123');
  const result = buf.readDoubleBE();
  return result === 123; // JavaScript 中前导零不表示八进制
});

test('writeDoubleLE value 为 "007"', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('007');
  const result = buf.readDoubleLE();
  return result === 7;
});

// Function 作为 value
test('writeDoubleBE value 为函数转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(function() {});
  const result = buf.readDoubleBE();
  return Number.isNaN(result);
});

test('writeDoubleLE value 为箭头函数转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(() => {});
  const result = buf.readDoubleLE();
  return Number.isNaN(result);
});

// Symbol 作为 value（应该报错或转为 NaN）
test('writeDoubleBE value 为 Symbol 报错或 NaN', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleBE(Symbol('test'));
    const result = buf.readDoubleBE();
    return Number.isNaN(result);
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('number');
  }
});

test('writeDoubleLE value 为 Symbol 报错或 NaN', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleLE(Symbol.iterator);
    const result = buf.readDoubleLE();
    return Number.isNaN(result);
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('number');
  }
});

// 特殊数字字符串格式
test('writeDoubleBE value 为 "Infinity" 字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('Infinity');
  const result = buf.readDoubleBE();
  return result === Infinity;
});

test('writeDoubleLE value 为 "-Infinity" 字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('-Infinity');
  const result = buf.readDoubleLE();
  return result === -Infinity;
});

test('writeDoubleBE value 为 "NaN" 字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('NaN');
  const result = buf.readDoubleBE();
  return Number.isNaN(result);
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
