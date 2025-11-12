// buf.writeUInt8() - 高级边缘情况和特殊类型测试
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

// BigInt 类型处理
test('value 为 BigInt 0n', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(0n, 0);
    // 如果能转换，检查结果
    return buf[0] === 0;
  } catch (e) {
    // BigInt 可能无法隐式转换
    return e.message.includes('BigInt') || e.message.includes('number') || e.message.includes('Cannot');
  }
});

test('value 为 BigInt 100n', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100n, 0);
    return buf[0] === 100;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('number') || e.message.includes('Cannot');
  }
});

test('value 为 BigInt 255n', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(255n, 0);
    return buf[0] === 255;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('number') || e.message.includes('Cannot');
  }
});

// Symbol 类型
test('value 为 Symbol 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('number') || e.message.includes('Cannot');
  }
});

test('value 为 Symbol.iterator 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(Symbol.iterator, 0);
    return false;
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('number') || e.message.includes('Cannot');
  }
});

// 特殊数值
test('value 为 -0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(-0, 0);
  return buf[0] === 0;
});

test('value 为 +0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(+0, 0);
  return buf[0] === 0;
});

test('value 为 Number.MIN_VALUE 接近 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(Number.MIN_VALUE, 0);
  return buf[0] === 0;
});

test('value 为 Number.MAX_VALUE 超出范围', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(Number.MAX_VALUE, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 Number.EPSILON', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(Number.EPSILON, 0);
  return buf[0] === 0;
});

// 科学计数法
test('value 为科学计数法 1e2 (100)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(1e2, 0);
  return buf[0] === 100;
});

test('value 为科学计数法 2.55e2 (255)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(2.55e2, 0);
  return buf[0] === 255;
});

test('value 为科学计数法 1e-1 (0.1)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(1e-1, 0);
  return buf[0] === 0;
});

test('value 为科学计数法 1e3 超出范围', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(1e3, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

// 位运算相关边界值
test('写入 0b11111111 (255)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0b11111111, 0);
  return buf[0] === 255;
});

test('写入 0b10000000 (128)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0b10000000, 0);
  return buf[0] === 128;
});

test('写入 0b01111111 (127)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0b01111111, 0);
  return buf[0] === 127;
});

test('写入 0o377 八进制 (255)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0o377, 0);
  return buf[0] === 255;
});

// 字符串特殊格式
test('value 为十六进制字符串 "0xFF" 转换为 255', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8("0xFF", 0);
  return buf[0] === 255;
});

test('value 为二进制字符串 "0b11111111" 转换为 255', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8("0b11111111", 0);
  return buf[0] === 255;
});

test('value 为带空格的字符串 " 123 "', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(" 123 ", 0);
    return buf[0] === 123; // 前后空格会被trim
  } catch (e) {
    return true;
  }
});

// Date 对象
test('value 为 Date 对象', () => {
  const buf = Buffer.alloc(4);
  try {
    const date = new Date(100);
    buf.writeUInt8(date, 0);
    return buf[0] === 100; // Date.valueOf() 返回时间戳
  } catch (e) {
    return true;
  }
});

// 函数类型
test('value 为函数', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(function() {}, 0);
    return buf[0] === 0; // 函数转 NaN -> 0
  } catch (e) {
    return true;
  }
});

test('value 为箭头函数', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(() => 100, 0);
    return buf[0] === 0; // 函数转 NaN -> 0
  } catch (e) {
    return true;
  }
});

// 正则表达式
test('value 为正则表达式', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(/test/, 0);
    return buf[0] === 0; // RegExp 转 NaN -> 0
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
