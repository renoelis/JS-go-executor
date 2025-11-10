// buf.readInt8() - 查缺补漏测试
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

// 负零测试
test('offset = -0（应被接受，等同于 0）', () => {
  const buf = Buffer.from([127, 100]);
  return buf.readInt8(-0) === 127;
});

test('offset = -0 等同于 0', () => {
  const buf = Buffer.from([50]);
  return buf.readInt8(-0) === buf.readInt8(0);
});

// 空字符串测试
test('offset = "" 空字符串（应抛出错误）', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8('');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 其他整数浮点数
test('offset = 2.0（应被接受）', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  return buf.readInt8(2.0) === 30;
});

test('offset = 3.0（应被接受）', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  return buf.readInt8(3.0) === 40;
});

// 函数作为参数
test('offset = function(){}（应抛出错误）', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(function(){});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = () => 0（应抛出错误）', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(() => 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Date 对象
test('offset = new Date()（应抛出错误）', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(new Date());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 正则表达式
test('offset = /test/（应抛出错误）', () => {
  try {
    const buf = Buffer.from([127]);
    buf.readInt8(/test/);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Number 特殊值
test('offset = Number.MAX_VALUE（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.MIN_VALUE（接近0的最小正数，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.EPSILON（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(Number.EPSILON);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 多参数调用
test('传入多个参数（应只使用第一个）', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  return buf.readInt8(1, 2, 3) === 20;
});

test('传入多个参数（第一个有效）', () => {
  const buf = Buffer.from([50, 60, 70]);
  return buf.readInt8(0, 999, 'ignore') === 50;
});

// Buffer 状态测试
test('读取后修改 Buffer 不影响已读取的值', () => {
  const buf = Buffer.from([100]);
  const val1 = buf.readInt8(0);
  buf.writeInt8(50, 0);
  const val2 = buf.readInt8(0);
  return val1 === 100 && val2 === 50;
});

test('修改 Buffer 后重新读取', () => {
  const buf = Buffer.alloc(3);
  buf.writeInt8(10, 0);
  buf.writeInt8(20, 1);
  buf.writeInt8(30, 2);
  
  buf.writeInt8(-10, 0);
  buf.writeInt8(-20, 1);
  
  return buf.readInt8(0) === -10 && buf.readInt8(1) === -20 && buf.readInt8(2) === 30;
});

// 极端 offset 值
test('offset = 0x7FFFFFFF（大整数，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(0x7FFFFFFF);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -2147483648（最小 32 位整数，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(-2147483648);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 精度测试
test('返回值精度：-128', () => {
  const buf = Buffer.from([0x80]);
  const val = buf.readInt8(0);
  return val === -128 && typeof val === 'number';
});

test('返回值精度：127', () => {
  const buf = Buffer.from([0x7F]);
  const val = buf.readInt8(0);
  return val === 127 && typeof val === 'number';
});

// offset 为科学计数法
test('offset = 1e0（应被接受）', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf.readInt8(1e0) === 20;
});

test('offset = 2e0（应被接受）', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf.readInt8(2e0) === 30;
});

test('offset = 1e1（10，应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20]);
    buf.readInt8(1e1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1.5e0（1.5，应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20, 30]);
    buf.readInt8(1.5e0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 二进制位模式验证
test('0x00 到 0x7F 映射到 0 到 127', () => {
  const buf = Buffer.from([0x00, 0x01, 0x7E, 0x7F]);
  return buf.readInt8(0) === 0 && 
         buf.readInt8(1) === 1 && 
         buf.readInt8(2) === 126 && 
         buf.readInt8(3) === 127;
});

test('0x80 到 0xFF 映射到 -128 到 -1', () => {
  const buf = Buffer.from([0x80, 0x81, 0xFE, 0xFF]);
  return buf.readInt8(0) === -128 && 
         buf.readInt8(1) === -127 && 
         buf.readInt8(2) === -2 && 
         buf.readInt8(3) === -1;
});

// 连续操作一致性
test('连续读取同一位置100次，结果一致', () => {
  const buf = Buffer.from([123]);
  let consistent = true;
  for (let i = 0; i < 100; i++) {
    if (buf.readInt8(0) !== 123) {
      consistent = false;
      break;
    }
  }
  return consistent;
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
