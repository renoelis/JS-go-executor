// buf[index] - Part 6: Missing Coverage Tests
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

// BigInt 值写入测试（应该抛出错误）
test('写入 BigInt 1n 抛出错误', () => {
  const buf = Buffer.alloc(1);
  try {
    buf[0] = 1n;
    return false;
  } catch (e) {
    return e.message.includes('BigInt');
  }
});

test('写入 BigInt 255n 抛出错误', () => {
  const buf = Buffer.alloc(1);
  try {
    buf[0] = 255n;
    return false;
  } catch (e) {
    return e.message.includes('BigInt');
  }
});

test('写入 BigInt 0n 抛出错误', () => {
  const buf = Buffer.alloc(1);
  try {
    buf[0] = 0n;
    return false;
  } catch (e) {
    return e.message.includes('BigInt');
  }
});

// 特殊属性名索引测试
test('访问 "length" 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['length'] === 3;
});

test('修改 "length" 属性（不生效）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const originalLength = buf.length;
  buf['length'] = 10;
  return buf.length === originalLength;
});

test('访问 "byteLength" 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['byteLength'] === 3;
});

test('访问 "buffer" 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf['buffer'] !== undefined;
});

test('访问 "byteOffset" 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf['byteOffset'] === 'number';
});

// 特殊字符串索引
test('使用 "0" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['0'] === 65;
});

test('使用 "+0" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['+0'] === undefined;
});

test('使用 "-0" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['-0'] === undefined;
});

test('使用 "2.0" 字符串索引', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf['2.0'] === undefined;
});

// 极端索引值
test('使用 2^32 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[Math.pow(2, 32)] === undefined;
});

test('使用 2^31 - 1 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[Math.pow(2, 31) - 1] === undefined;
});

test('使用 -2^31 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf[-Math.pow(2, 31)] === undefined;
});

// 写入极端值
test('写入 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(1);
  buf[0] = Number.MAX_SAFE_INTEGER;
  return buf[0] === (Number.MAX_SAFE_INTEGER & 0xFF);
});

test('写入 Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(1);
  buf[0] = Number.MIN_SAFE_INTEGER;
  return buf[0] === (Number.MIN_SAFE_INTEGER & 0xFF);
});

// 连续越界写入
test('连续越界写入不影响长度', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[3] = 4;
  buf[4] = 5;
  buf[5] = 6;
  buf[10] = 10;
  return buf.length === 3 && buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 数组方法返回的索引
test('使用 indexOf 返回值作为索引', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const idx = buf.indexOf(30);
  return buf[idx] === 30;
});

test('使用 lastIndexOf 返回值作为索引', () => {
  const buf = Buffer.from([10, 20, 30, 20, 50]);
  const idx = buf.lastIndexOf(20);
  return buf[idx] === 20;
});

// 特殊数值边界
test('写入 0.5（向下取整）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 0.5;
  return buf[0] === 0;
});

test('写入 0.9（向下取整）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 0.9;
  return buf[0] === 0;
});

test('写入 254.1（向下取整）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 254.1;
  return buf[0] === 254;
});

test('写入 254.9（向下取整）', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 254.9;
  return buf[0] === 254;
});

// 混合类型索引
test('使用计算表达式作为索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[1 + 1] === 30;
});

test('使用位运算结果作为索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[3 & 1] === 20;
});

test('使用三元运算结果作为索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  const idx = true ? 1 : 2;
  return buf[idx] === 20;
});

// 写入计算值
test('写入位运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 0xFF & 0xAB;
  return buf[0] === 0xAB;
});

test('写入移位运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 1 << 7;
  return buf[0] === 128;
});

test('写入算术运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 100 + 100;
  return buf[0] === 200;
});

// 读取后的类型
test('读取值的类型是 number', () => {
  const buf = Buffer.from([65]);
  return typeof buf[0] === 'number';
});

test('读取越界值的类型是 undefined', () => {
  const buf = Buffer.from([65]);
  return typeof buf[10] === 'undefined';
});

// 连续读取相同索引
test('连续读取相同索引值一致', () => {
  const buf = Buffer.from([123]);
  return buf[0] === 123 && buf[0] === 123 && buf[0] === 123;
});

// 写入后立即读取
test('写入后立即读取值正确', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 99;
  const val = buf[0];
  return val === 99;
});

test('连续写入同一索引保留最后值', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 10;
  buf[0] = 20;
  buf[0] = 30;
  return buf[0] === 30;
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
