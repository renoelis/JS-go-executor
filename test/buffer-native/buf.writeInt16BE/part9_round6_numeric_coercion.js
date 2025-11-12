// buf.writeInt16BE() - 第6轮补充：数值强制转换和截断行为深度测试
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

// 小数截断测试
test('小数向下截断 - 正数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(3.14, 0);
  return buf.readInt16BE(0) === 3;
});

test('小数向下截断 - 接近整数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(3.9999, 0);
  return buf.readInt16BE(0) === 3;
});

test('小数向下截断 - 负数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-2.5, 0);
  return buf.readInt16BE(0) === -2;
});

test('小数向下截断 - 负数接近整数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-2.9999, 0);
  return buf.readInt16BE(0) === -2;
});

test('offset 为小数会被截断或抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    const result = buf.writeInt16BE(100, 2.5);
    // Node 可能接受并截断，或者抛出错误
    return result === 4;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('must be');
  }
});

test('offset 为负小数抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE(100, -2.5);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('negative') || e.message.includes('range');
  }
});

// 超范围值的错误处理（Node v25.0.0 会抛出错误）
test('值为 32768 (超过最大值1) 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(32768, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('值为 32769 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(32769, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('值为 -32769 (超过最小值1) 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(-32769, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('值为 65535 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(65535, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('值为 65536 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(65536, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('值为 65537 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(65537, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('值为 100000 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(100000, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('值为 -100000 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(-100000, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

// 字符串转数字
test('字符串数字转换 - 正整数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE('1234', 0);
  return buf.readInt16BE(0) === 1234;
});

test('字符串数字转换 - 负整数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE('-1234', 0);
  return buf.readInt16BE(0) === -1234;
});

test('字符串小数转换', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE('3.14', 0);
  return buf.readInt16BE(0) === 3;
});

test('字符串前导空格', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE('  100', 0);
  return buf.readInt16BE(0) === 100;
});

test('字符串后缀非数字转为 NaN 再转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE('100abc', 0);
  return buf.readInt16BE(0) === 0 || buf.readInt16BE(0) === 100;
});

test('空字符串转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE('', 0);
  return buf.readInt16BE(0) === 0;
});

// 布尔值转换
test('布尔值 true 转为 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(true, 0);
  return buf.readInt16BE(0) === 1;
});

test('布尔值 false 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(false, 0);
  return buf.readInt16BE(0) === 0;
});

// BigInt 转换（可能抛出错误或截断）
test('BigInt 小值可能被接受', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(BigInt(100), 0);
    return buf.readInt16BE(0) === 100;
  } catch (e) {
    // BigInt 可能不被直接接受
    return e.message.includes('Cannot') || e.message.includes('convert');
  }
});

test('BigInt 大值可能被截断或抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(BigInt(1000000), 0);
    return true;
  } catch (e) {
    return e.message.includes('Cannot') || e.message.includes('convert') || e.message.includes('range');
  }
});

// 特殊对象 valueOf
test('对象有 valueOf 返回数字', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf: () => 1234
  };
  buf.writeInt16BE(obj, 0);
  return buf.readInt16BE(0) === 1234;
});

test('对象 valueOf 返回字符串数字', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf: () => '5678'
  };
  buf.writeInt16BE(obj, 0);
  return buf.readInt16BE(0) === 5678;
});

test('对象 valueOf 和 toString 都存在', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf: () => 100,
    toString: () => '200'
  };
  buf.writeInt16BE(obj, 0);
  // valueOf 优先
  return buf.readInt16BE(0) === 100;
});

test('对象只有 toString', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    toString: () => '300'
  };
  buf.writeInt16BE(obj, 0);
  return buf.readInt16BE(0) === 300;
});

// Date 对象
test('Date 对象转为时间戳毫秒数（截断到 Int16）', () => {
  const buf = Buffer.alloc(4);
  const date = new Date(1234);
  buf.writeInt16BE(date, 0);
  return buf.readInt16BE(0) === 1234;
});

test('Date 对象大时间戳抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    const date = new Date(100000);
    buf.writeInt16BE(date, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

// 数组的特殊情况
test('多元素数组根据类型转换规则', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt16BE([100, 200, 300], 0);
    // 数组转数字可能是 NaN 或取第一个元素，具体看实现
    return true;
  } catch (e) {
    // 也可能抛出类型错误
    return e.message.includes('type') || e.message.includes('range');
  }
});

test('数组包含非数字元素', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(['abc'], 0);
  return buf.readInt16BE(0) === 0;
});

// 符号和特殊情况
test('正零和负零都写入相同', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt16BE(+0, 0);
  buf2.writeInt16BE(-0, 0);
  return buf1[0] === buf2[0] && buf1[1] === buf2[1] &&
         buf1[0] === 0x00 && buf1[1] === 0x00;
});

// 极小的小数
test('极小的正小数截断为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0.0001, 0);
  return buf.readInt16BE(0) === 0;
});

test('极小的负小数截断为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-0.0001, 0);
  return buf.readInt16BE(0) === 0;
});

// 科学计数法
test('科学计数法小值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(1e2, 0);
  return buf.readInt16BE(0) === 100;
});

test('科学计数法大值抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(1e10, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
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
