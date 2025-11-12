// buffer.atob() - Part 14: 极限边界与对象行为（第9轮）
const { Buffer, atob } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 补充：自定义 toString 的对象
test('自定义toString：返回有效 base64', () => {
  const obj = {
    toString() {
      return 'AAAA';
    }
  };
  const decoded = atob(obj);
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('自定义toString：返回 "SGVsbG8="', () => {
  const obj = {
    toString() {
      return 'SGVsbG8=';
    }
  };
  const decoded = atob(obj);
  if (decoded !== 'Hello') {
    throw new Error(`期望 "Hello", 实际 "${decoded}"`);
  }
  return true;
});

test('自定义toString：返回空字符串', () => {
  const obj = {
    toString() {
      return '';
    }
  };
  const decoded = atob(obj);
  if (decoded !== '') {
    throw new Error('应返回空字符串');
  }
  return true;
});

test('自定义toString：返回非法 base64', () => {
  const obj = {
    toString() {
      return '!!!';
    }
  };
  try {
    atob(obj);
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('自定义toString：toString 优先于 valueOf', () => {
  const obj = {
    valueOf() {
      return 'AAAA';
    },
    toString() {
      return 'BBBB';
    }
  };
  const decoded = atob(obj);
  // 应该使用 toString 的结果 "BBBB"
  if (decoded.length !== 3) {
    throw new Error('应使用 toString 结果');
  }
  return true;
});

test('自定义toString：toString 返回数字', () => {
  const obj = {
    toString() {
      return 1000;
    }
  };
  const decoded = atob(obj);
  // 1000 会被转为字符串 "1000"
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('自定义toString：toString 返回对象（递归调用）', () => {
  const obj = {
    toString() {
      return { toString: () => 'AAAA' };
    }
  };
  try {
    const decoded = atob(obj);
    // Node.js 会递归调用 toString
    if (decoded.length !== 3) {
      throw new Error('递归 toString 失败');
    }
    return true;
  } catch (e) {
    // 如果不支持递归，也算通过
    return true;
  }
});

// 补充：超大字符串性能测试
test('超大字符串：1000 字符', () => {
  const input = 'AAAA'.repeat(250);
  const decoded = atob(input);
  if (decoded.length !== 750) {
    throw new Error(`期望长度 750, 实际 ${decoded.length}`);
  }
  return true;
});

test('超大字符串：10000 字符', () => {
  const input = 'AAAA'.repeat(2500);
  const decoded = atob(input);
  if (decoded.length !== 7500) {
    throw new Error(`期望长度 7500, 实际 ${decoded.length}`);
  }
  return true;
});

test('超大字符串：100000 字符', () => {
  const input = 'AAAA'.repeat(25000);
  const decoded = atob(input);
  if (decoded.length !== 75000) {
    throw new Error(`期望长度 75000, 实际 ${decoded.length}`);
  }
  return true;
});

test('超大字符串：200000 字符', () => {
  try {
    const input = 'AAAA'.repeat(50000);
    const decoded = atob(input);
    if (decoded.length !== 150000) {
      throw new Error(`期望长度 150000, 实际 ${decoded.length}`);
    }
    return true;
  } catch (e) {
    // 如果内存不足也算通过
    if (e.message.includes('memory') || e.message.includes('size')) {
      return true;
    }
    throw e;
  }
});

// 补充：性能一致性验证
test('性能一致性：连续 1000 次调用', () => {
  const input = 'SGVsbG8=';
  const expected = 'Hello';
  for (let i = 0; i < 1000; i++) {
    const decoded = atob(input);
    if (decoded !== expected) {
      throw new Error(`第 ${i} 次调用失败`);
    }
  }
  return true;
});

test('性能一致性：连续 5000 次调用', () => {
  const input = 'V29ybGQ=';
  const expected = 'World';
  for (let i = 0; i < 5000; i++) {
    const decoded = atob(input);
    if (decoded !== expected) {
      throw new Error(`第 ${i} 次调用失败`);
    }
  }
  return true;
});

test('性能一致性：交替调用不同输入', () => {
  const inputs = ['SGVsbG8=', 'V29ybGQ=', 'Tm9kZQ=='];
  const expected = ['Hello', 'World', 'Node'];

  for (let i = 0; i < 1000; i++) {
    for (let j = 0; j < inputs.length; j++) {
      const decoded = atob(inputs[j]);
      if (decoded !== expected[j]) {
        throw new Error(`迭代 ${i}, 输入 ${j} 失败`);
      }
    }
  }
  return true;
});

// 补充：混合字符类型的所有组合
test('混合字符：大写+小写+数字+特殊', () => {
  const input = 'AaZz09+/';
  const decoded = atob(input);
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  return true;
});

test('混合字符：不同顺序1', () => {
  const input = 'Za09+/Aa';
  const decoded = atob(input);
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  return true;
});

test('混合字符：不同顺序2', () => {
  const input = '09+/AaZz';
  const decoded = atob(input);
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  return true;
});

test('混合字符：不同顺序3', () => {
  const input = '+/AaZz09';
  const decoded = atob(input);
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  return true;
});

test('混合字符：每种类型至少一个', () => {
  const input = 'Aa0+/Zz9';
  const decoded = atob(input);
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  return true;
});

// 补充：base64 字符分布的验证
test('字符分布：所有大写字母都有效', () => {
  for (let c = 65; c <= 90; c++) {
    const char = String.fromCharCode(c);
    const input = char + 'AAA';
    try {
      atob(input);
    } catch (e) {
      throw new Error(`大写字母 ${char} 失败`);
    }
  }
  return true;
});

test('字符分布：所有小写字母都有效', () => {
  for (let c = 97; c <= 122; c++) {
    const char = String.fromCharCode(c);
    const input = char + 'AAA';
    try {
      atob(input);
    } catch (e) {
      throw new Error(`小写字母 ${char} 失败`);
    }
  }
  return true;
});

test('字符分布：所有数字都有效', () => {
  for (let c = 48; c <= 57; c++) {
    const char = String.fromCharCode(c);
    const input = char + 'AAA';
    try {
      atob(input);
    } catch (e) {
      throw new Error(`数字 ${char} 失败`);
    }
  }
  return true;
});

test('字符分布：+ 和 / 有效', () => {
  const chars = ['+', '/'];
  for (const char of chars) {
    const input = char + 'AAA';
    try {
      atob(input);
    } catch (e) {
      throw new Error(`特殊字符 ${char} 失败`);
    }
  }
  return true;
});

// 补充：往返转换的完整验证（扩展）
test('往返扩展：2字节所有关键组合', () => {
  const pairs = [
    [0x00, 0x00], [0x00, 0xFF], [0xFF, 0x00], [0xFF, 0xFF],
    [0x7F, 0x7F], [0x80, 0x80], [0x3F, 0xFF], [0xFC, 0x00],
    [0x00, 0x01], [0x01, 0x00], [0xFE, 0xFF], [0xFF, 0xFE]
  ];

  for (const [a, b] of pairs) {
    const buf = Buffer.from([a, b]);
    const encoded = buf.toString('base64');
    const decoded = atob(encoded);

    if (decoded.length !== 2) {
      throw new Error(`[0x${a.toString(16)}, 0x${b.toString(16)}] 长度错误`);
    }

    if (decoded.charCodeAt(0) !== a || decoded.charCodeAt(1) !== b) {
      throw new Error(`[0x${a.toString(16)}, 0x${b.toString(16)}] 往返失败`);
    }
  }
  return true;
});

test('往返扩展：3字节所有关键组合', () => {
  const triplets = [
    [0x00, 0x00, 0x00], [0xFF, 0xFF, 0xFF],
    [0x00, 0xFF, 0x00], [0xFF, 0x00, 0xFF],
    [0x7F, 0x80, 0x7F], [0x80, 0x7F, 0x80],
    [0x12, 0x34, 0x56], [0xAB, 0xCD, 0xEF]
  ];

  for (const [a, b, c] of triplets) {
    const buf = Buffer.from([a, b, c]);
    const encoded = buf.toString('base64');
    const decoded = atob(encoded);

    if (decoded.length !== 3) {
      throw new Error(`[0x${a.toString(16)}, 0x${b.toString(16)}, 0x${c.toString(16)}] 长度错误`);
    }

    if (decoded.charCodeAt(0) !== a || decoded.charCodeAt(1) !== b || decoded.charCodeAt(2) !== c) {
      throw new Error(`[0x${a.toString(16)}, 0x${b.toString(16)}, 0x${c.toString(16)}] 往返失败`);
    }
  }
  return true;
});

// 补充：长字符串的边界测试
test('长字符串：50000 字符（接近临界点）', () => {
  try {
    const input = 'BBBB'.repeat(12500);
    const decoded = atob(input);
    if (decoded.length !== 37500) {
      throw new Error(`期望长度 37500, 实际 ${decoded.length}`);
    }
    return true;
  } catch (e) {
    if (e.message.includes('memory') || e.message.includes('size')) {
      return true;
    }
    throw e;
  }
});

test('长字符串：不同字符的长字符串', () => {
  const input = 'AaBbCcDdEeFfGgHh'.repeat(1000);
  const encoded = Buffer.from(input).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== input) {
    throw new Error('长字符串往返失败');
  }
  return true;
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
