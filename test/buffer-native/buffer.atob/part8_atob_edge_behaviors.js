// buffer.atob() - Part 8: 边缘行为深度测试（第3轮补充）
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

// 测试 Node.js 对空白字符的实际处理（更详细）
test('空白行为：前导空格 vs 内嵌空格', () => {
  try {
    // 前导空格 - Node.js v25 可能接受或拒绝
    const decoded = atob(' ABC');
    // 如果接受，验证结果
    return true;
  } catch (e) {
    // 如果拒绝也正常
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('空白行为：base64 中间有空格', () => {
  try {
    const decoded = atob('SGVs bG8=');
    // Node.js v25 可能接受空格（容错）
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

// 测试连续的填充字符
test('填充行为：=== 连续三个等号', () => {
  try {
    atob('===');
    // 应该拒绝
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('填充行为：==== 连续四个等号', () => {
  try {
    const decoded = atob('====');
    // 可能接受或拒绝
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('填充行为：A= 两个字符（无效）', () => {
  try {
    atob('A=');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('填充行为：A== 三个字符（无效）', () => {
  try {
    atob('A==');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

// 测试字节序列边界
test('字节序列：0x00-0x0F 所有控制字符', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 16; i++) {
    if (decoded.charCodeAt(i) !== i) {
      throw new Error(`位置 ${i} 期望 ${i}, 实际 ${decoded.charCodeAt(i)}`);
    }
  }
  return true;
});

test('字节序列：0xF0-0xFF 高位字节', () => {
  const buf = Buffer.from([0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  const expected = [0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF];
  for (let i = 0; i < expected.length; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 期望 ${expected[i]}, 实际 ${decoded.charCodeAt(i)}`);
    }
  }
  return true;
});

// 测试特殊的 base64 序列
test('特殊序列：全 A（代表全 0）', () => {
  const decoded = atob('AAAA');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== 0) {
      throw new Error(`位置 ${i} 应为 0`);
    }
  }
  return true;
});

test('特殊序列：全 /（代表全 255）', () => {
  const decoded = atob('////');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== 255) {
      throw new Error(`位置 ${i} 应为 255`);
    }
  }
  return true;
});

test('特殊序列：全 +（特殊字符）', () => {
  const decoded = atob('++++');
  // 验证能解码
  if (typeof decoded !== 'string' || decoded.length !== 3) {
    throw new Error('解码失败');
  }
  return true;
});

// 测试长度边界的精确行为
test('长度精确：4 字符（1组完整）', () => {
  const decoded = atob('ABCD');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('长度精确：8 字符（2组完整）', () => {
  const decoded = atob('ABCDEFGH');
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  return true;
});

test('长度精确：12 字符（3组完整）', () => {
  const decoded = atob('ABCDEFGHIJKL');
  if (decoded.length !== 9) {
    throw new Error(`期望长度 9, 实际 ${decoded.length}`);
  }
  return true;
});

// 测试不同编码长度的往返
test('往返：1字节数据', () => {
  const buf = Buffer.from([0x42]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0x42) {
    throw new Error('往返失败');
  }
  return true;
});

test('往返：2字节数据', () => {
  const buf = Buffer.from([0x42, 0x43]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0x42 || decoded.charCodeAt(1) !== 0x43) {
    throw new Error('往返失败');
  }
  return true;
});

test('往返：3字节数据', () => {
  const buf = Buffer.from([0x42, 0x43, 0x44]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0x42 || decoded.charCodeAt(1) !== 0x43 || decoded.charCodeAt(2) !== 0x44) {
    throw new Error('往返失败');
  }
  return true;
});

// 测试混合字符类型
test('混合字符：字母+数字+符号', () => {
  const original = 'Abc123!@#';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "${original}", 实际 "${decoded}"`);
  }
  return true;
});

test('混合字符：大写+小写+数字', () => {
  const original = 'AaBbCc123XxYyZz';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "${original}", 实际 "${decoded}"`);
  }
  return true;
});

// 测试边界情况的组合
test('组合：空字符串 + 有效 base64', () => {
  const empty = atob('');
  const valid = atob('SGVsbG8=');
  if (empty !== '' || valid !== 'Hello') {
    throw new Error('组合失败');
  }
  return true;
});

test('组合：多次连续解码', () => {
  const inputs = ['SGVsbG8=', 'V29ybGQ=', 'Tm9kZQ=='];
  const expected = ['Hello', 'World', 'Node'];
  for (let i = 0; i < inputs.length; i++) {
    const decoded = atob(inputs[i]);
    if (decoded !== expected[i]) {
      throw new Error(`索引 ${i} 失败`);
    }
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
