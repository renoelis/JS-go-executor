// buf.readBigInt64BE() - 方法链式调用和组合测试
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

// 读取后的值可以继续操作
test('读取后进行 BigInt 运算', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n, 0);
  const value = buf.readBigInt64BE(0);
  return value + 50n === 150n;
});

test('读取后进行 BigInt 比较', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(200n, 0);
  const value = buf.readBigInt64BE(0);
  return value > 100n && value < 300n;
});

test('读取后转换为 Number', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(123n, 0);
  const value = buf.readBigInt64BE(0);
  return Number(value) === 123;
});

test('读取后转换为 String', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(456n, 0);
  const value = buf.readBigInt64BE(0);
  return String(value) === '456';
});

test('读取后使用 toString', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(789n, 0);
  const value = buf.readBigInt64BE(0);
  return value.toString() === '789';
});

test('读取后使用 toString(16) 转十六进制', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(255n, 0);
  const value = buf.readBigInt64BE(0);
  return value.toString(16) === 'ff';
});

test('读取后使用 toString(2) 转二进制', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(8n, 0);
  const value = buf.readBigInt64BE(0);
  return value.toString(2) === '1000';
});

// 多次读取组合
test('读取多个值并求和', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64BE(10n, 0);
  buf.writeBigInt64BE(20n, 8);
  buf.writeBigInt64BE(30n, 16);
  
  const sum = buf.readBigInt64BE(0) + buf.readBigInt64BE(8) + buf.readBigInt64BE(16);
  return sum === 60n;
});

test('读取多个值并比较', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(100n, 0);
  buf.writeBigInt64BE(200n, 8);
  
  return buf.readBigInt64BE(0) < buf.readBigInt64BE(8);
});

test('读取值并用于数组索引', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(2n, 0);
  const arr = ['a', 'b', 'c', 'd'];
  const index = Number(buf.readBigInt64BE(0));
  return arr[index] === 'c';
});

// 读取后用于条件判断
test('读取值用于 if 条件', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0n, 0);
  const value = buf.readBigInt64BE(0);
  if (value === 0n) {
    return true;
  }
  return false;
});

test('读取值用于 switch 条件', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(1n, 0);
  const value = buf.readBigInt64BE(0);
  switch (value) {
    case 0n:
      return false;
    case 1n:
      return true;
    default:
      return false;
  }
});

test('读取值用于三元运算符', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n, 0);
  const value = buf.readBigInt64BE(0);
  const result = value > 50n ? 'large' : 'small';
  return result === 'large';
});

// 读取后用于循环
test('读取值用于 for 循环次数', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(5n, 0);
  const count = Number(buf.readBigInt64BE(0));
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += i;
  }
  return sum === 10; // 0+1+2+3+4
});

test('读取值用于 while 循环条件', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(3n, 0);
  let value = buf.readBigInt64BE(0);
  let count = 0;
  while (value > 0n) {
    count++;
    value--;
  }
  return count === 3;
});

// 读取后用于对象属性
test('读取值用于对象键', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(42n, 0);
  const value = buf.readBigInt64BE(0);
  const obj = { [value]: 'answer' };
  return obj['42'] === 'answer';
});

test('读取值用于对象值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(999n, 0);
  const value = buf.readBigInt64BE(0);
  const obj = { number: value };
  return obj.number === 999n;
});

// 读取后用于函数参数
test('读取值作为函数参数', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(10n, 0);
  const value = buf.readBigInt64BE(0);
  
  function multiply(x) {
    return x * 2n;
  }
  
  return multiply(value) === 20n;
});

test('读取值作为回调函数参数', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(5n, 0);
  const value = buf.readBigInt64BE(0);
  
  const result = [1n, 2n, 3n].map(x => x * value);
  return result[0] === 5n && result[1] === 10n && result[2] === 15n;
});

// 读取后用于解构
test('读取值用于数组解构', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(11n, 0);
  buf.writeBigInt64BE(22n, 8);
  
  const [a, b] = [buf.readBigInt64BE(0), buf.readBigInt64BE(8)];
  return a === 11n && b === 22n;
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
