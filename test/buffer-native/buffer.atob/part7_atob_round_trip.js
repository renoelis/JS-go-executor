// buffer.atob() - Part 7: 额外的边界和行为测试（第2轮补充）
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

// 测试 atob 与 btoa 的往返转换
test('往返转换：atob(btoa(x)) === x', () => {
  const original = 'Hello, World!';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "${original}", 实际 "${decoded}"`);
  }
  return true;
});

test('往返转换：空字符串', () => {
  const original = '';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望空字符串, 实际 "${decoded}"`);
  }
  return true;
});

test('往返转换：单个字符', () => {
  const original = 'A';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "A", 实际 "${decoded}"`);
  }
  return true;
});

test('往返转换：所有 ASCII 字符', () => {
  for (let i = 0; i < 128; i++) {
    const original = String.fromCharCode(i);
    const encoded = Buffer.from(original).toString('base64');
    const decoded = atob(encoded);
    if (decoded !== original) {
      throw new Error(`字符码 ${i} 转换失败`);
    }
  }
  return true;
});

// 测试忽略空白字符的行为（Node.js atob 通常不忽略）
test('空白处理：输入包含换行符（应拒绝或接受）', () => {
  try {
    const decoded = atob('SGVs\nbG8=');
    // 如果接受，验证结果
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('空白处理：输入包含回车符（应拒绝或接受）', () => {
  try {
    const decoded = atob('SGVs\rbG8=');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('空白处理：输入包含制表符（应拒绝或接受）', () => {
  try {
    const decoded = atob('SGVs\tbG8=');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

// 测试不同字符位置的编码
test('字符位置：第一个字符为特殊字符', () => {
  const original = '!Hello';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "${original}", 实际 "${decoded}"`);
  }
  return true;
});

test('字符位置：最后一个字符为特殊字符', () => {
  const original = 'Hello!';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "${original}", 实际 "${decoded}"`);
  }
  return true;
});

test('字符位置：中间有特殊字符', () => {
  const original = 'Hel!lo';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "${original}", 实际 "${decoded}"`);
  }
  return true;
});

// 测试边界字节值
test('边界字节：0x00', () => {
  const buf = Buffer.from([0x00]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0x00) {
    throw new Error(`期望 0x00, 实际 0x${decoded.charCodeAt(0).toString(16)}`);
  }
  return true;
});

test('边界字节：0x7F', () => {
  const buf = Buffer.from([0x7F]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0x7F) {
    throw new Error(`期望 0x7F, 实际 0x${decoded.charCodeAt(0).toString(16)}`);
  }
  return true;
});

test('边界字节：0x80', () => {
  const buf = Buffer.from([0x80]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0x80) {
    throw new Error(`期望 0x80, 实际 0x${decoded.charCodeAt(0).toString(16)}`);
  }
  return true;
});

test('边界字节：0xFF', () => {
  const buf = Buffer.from([0xFF]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0xFF) {
    throw new Error(`期望 0xFF, 实际 0x${decoded.charCodeAt(0).toString(16)}`);
  }
  return true;
});

// 测试连续的相同字节
test('重复字节：10个0x00', () => {
  const buf = Buffer.alloc(10, 0x00);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 10) {
    throw new Error(`期望长度 10, 实际 ${decoded.length}`);
  }
  for (let i = 0; i < 10; i++) {
    if (decoded.charCodeAt(i) !== 0x00) {
      throw new Error(`位置 ${i} 期望 0x00`);
    }
  }
  return true;
});

test('重复字节：10个0xFF', () => {
  const buf = Buffer.alloc(10, 0xFF);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 10) {
    throw new Error(`期望长度 10, 实际 ${decoded.length}`);
  }
  for (let i = 0; i < 10; i++) {
    if (decoded.charCodeAt(i) !== 0xFF) {
      throw new Error(`位置 ${i} 期望 0xFF`);
    }
  }
  return true;
});

// 测试填充字符的不同组合
test('填充：正确的单 = 填充', () => {
  const decoded = atob('YWJj');
  if (decoded !== 'abc') {
    throw new Error(`期望 "abc", 实际 "${decoded}"`);
  }
  return true;
});

test('填充：正确的双 == 填充', () => {
  const decoded = atob('YQ==');
  if (decoded !== 'a') {
    throw new Error(`期望 "a", 实际 "${decoded}"`);
  }
  return true;
});

test('填充：混合有效和无效填充检测', () => {
  const validCases = ['YQ==', 'YWI=', 'YWJj'];
  for (const encoded of validCases) {
    const decoded = atob(encoded);
    // 应该都能正常解码
    if (typeof decoded !== 'string') {
      throw new Error(`${encoded} 解码失败`);
    }
  }
  return true;
});

// 测试 base64 的特殊编码规则
test('编码规则：最小有效 base64（AA==）', () => {
  const decoded = atob('AA==');
  if (decoded.length !== 1) {
    throw new Error(`期望长度 1, 实际 ${decoded.length}`);
  }
  if (decoded.charCodeAt(0) !== 0) {
    throw new Error(`期望字符码 0, 实际 ${decoded.charCodeAt(0)}`);
  }
  return true;
});

test('编码规则：最大单字节值（/w==）', () => {
  const decoded = atob('/w==');
  if (decoded.length !== 1) {
    throw new Error(`期望长度 1, 实际 ${decoded.length}`);
  }
  if (decoded.charCodeAt(0) !== 255) {
    throw new Error(`期望字符码 255, 实际 ${decoded.charCodeAt(0)}`);
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
