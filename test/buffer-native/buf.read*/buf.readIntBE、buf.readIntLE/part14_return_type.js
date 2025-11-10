// buf.readIntBE/readIntLE - 返回值类型和特性测试
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

// 返回值类型
test('readIntBE 返回值是 number 类型', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readIntBE(0, 2);
  return typeof result === 'number';
});

test('readIntLE 返回值是 number 类型', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const result = buf.readIntLE(0, 2);
  return typeof result === 'number';
});

test('readIntBE 返回值不是 bigint 类型', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readIntBE(0, 4);
  return typeof result !== 'bigint';
});

test('readIntLE 返回值不是 string 类型', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const result = buf.readIntLE(0, 4);
  return typeof result !== 'string';
});

test('readIntBE 返回值不是 object 类型', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readIntBE(0, 2);
  return typeof result !== 'object';
});

test('readIntLE 返回值不是 boolean 类型', () => {
  const buf = Buffer.from([0x01, 0x00]);
  const result = buf.readIntLE(0, 2);
  return typeof result !== 'boolean';
});

// Number 特性
test('readIntBE 返回值可以进行数学运算', () => {
  const buf = Buffer.from([0x00, 0x64]); // 100
  const result = buf.readIntBE(0, 2);
  return result + 50 === 150 && result * 2 === 200;
});

test('readIntLE 返回值可以比较', () => {
  const buf = Buffer.from([0x64, 0x00]); // 100 in LE
  const result = buf.readIntLE(0, 2);
  return result > 50 && result < 200 && result === 100;
});

test('readIntBE 返回值可以转换为字符串', () => {
  const buf = Buffer.from([0x04, 0xD2]); // 1234
  const result = buf.readIntBE(0, 2);
  const str = result.toString();
  return typeof str === 'string' && str === '1234';
});

test('readIntLE 返回值可以调用 Number 方法', () => {
  const buf = Buffer.from([0x39, 0x30]); // 12345 in LE
  const result = buf.readIntLE(0, 2);
  const fixed = result.toFixed(2);
  return fixed === '12345.00';
});

// 整数特性
test('readIntBE 返回值是整数', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const result = buf.readIntBE(0, 3);
  return Number.isInteger(result);
});

test('readIntLE 返回值是整数', () => {
  const buf = Buffer.from([0x56, 0x34, 0x12]);
  const result = buf.readIntLE(0, 3);
  return Number.isInteger(result);
});

test('readIntBE 返回值不是有限数（对整数始终为 true）', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readIntBE(0, 2);
  return Number.isFinite(result);
});

test('readIntLE 返回值不是 NaN', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  const result = buf.readIntLE(0, 2);
  return !Number.isNaN(result);
});

// 零值
test('readIntBE 零返回值', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  const result = buf.readIntBE(0, 3);
  return typeof result === 'number' && result === 0;
});

test('readIntLE 零返回值', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const result = buf.readIntLE(0, 4);
  return typeof result === 'number' && result === 0;
});

// 正数和负数
test('readIntBE 正数返回值', () => {
  const buf = Buffer.from([0x7F, 0xFF]); // 最大正数 (2字节)
  const result = buf.readIntBE(0, 2);
  return result === 32767 && result > 0;
});

test('readIntLE 正数返回值', () => {
  const buf = Buffer.from([0xFF, 0x7F]); // 最大正数 (2字节 LE)
  const result = buf.readIntLE(0, 2);
  return result === 32767 && result > 0;
});

test('readIntBE 负数返回值', () => {
  const buf = Buffer.from([0x80, 0x00]); // 最小负数 (2字节)
  const result = buf.readIntBE(0, 2);
  return result === -32768 && result < 0;
});

test('readIntLE 负数返回值', () => {
  const buf = Buffer.from([0x00, 0x80]); // 最小负数 (2字节 LE)
  const result = buf.readIntLE(0, 2);
  return result === -32768 && result < 0;
});

test('readIntBE -1 返回值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  const result = buf.readIntBE(0, 3);
  return result === -1;
});

test('readIntLE -1 返回值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const result = buf.readIntLE(0, 4);
  return result === -1;
});

// 返回值的数学属性
test('readIntBE 返回值符号正确（正数）', () => {
  const buf = Buffer.from([0x01, 0x00]);
  const result = buf.readIntBE(0, 2);
  return Math.sign(result) === 1;
});

test('readIntLE 返回值符号正确（负数）', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  const result = buf.readIntLE(0, 2);
  return Math.sign(result) === -1;
});

test('readIntBE 返回值符号正确（零）', () => {
  const buf = Buffer.from([0x00, 0x00]);
  const result = buf.readIntBE(0, 2);
  return Math.sign(result) === 0;
});

// 返回值可以用作数组索引
test('readIntBE 返回值可用作数组索引', () => {
  const buf = Buffer.from([0x00, 0x02]); // 2
  const index = buf.readIntBE(0, 2);
  const arr = [10, 20, 30, 40];
  return arr[index] === 30;
});

test('readIntLE 返回值可用作对象键', () => {
  const buf = Buffer.from([0x05, 0x00]); // 5
  const key = buf.readIntLE(0, 2);
  const obj = { 5: 'value' };
  return obj[key] === 'value';
});

// 返回值的比较
test('readIntBE 返回值严格相等', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x12, 0x34]);
  return buf1.readIntBE(0, 2) === buf2.readIntBE(0, 2);
});

test('readIntLE 返回值严格相等', () => {
  const buf1 = Buffer.from([0x34, 0x12]);
  const buf2 = Buffer.from([0x34, 0x12]);
  return buf1.readIntLE(0, 2) === buf2.readIntLE(0, 2);
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
