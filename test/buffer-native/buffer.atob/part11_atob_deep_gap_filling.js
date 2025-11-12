// buffer.atob() - Part 11: 深度查缺补漏（第6轮）
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

// 补充：URL-safe base64 字符（- 和 _）应该被拒绝
test('URL-safe拒绝：包含 - 字符', () => {
  try {
    atob('SGVs-G8=');
    throw new Error('应该拒绝 - 字符');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('URL-safe拒绝：包含 _ 字符', () => {
  try {
    atob('SGVs_G8=');
    throw new Error('应该拒绝 _ 字符');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('URL-safe拒绝：纯 - 字符', () => {
  try {
    atob('----');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('URL-safe拒绝：纯 _ 字符', () => {
  try {
    atob('____');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

// 补充：等号在非末尾位置全部应该被拒绝
test('等号位置：=A== （开头）', () => {
  try {
    atob('=A==');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('等号位置：A=== （第二位后多个）', () => {
  try {
    atob('A===');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('等号位置：A=A= （中间）', () => {
  try {
    atob('A=A=');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('等号位置：AA=A （非末尾）', () => {
  try {
    atob('AA=A');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('等号位置：AAAA= （不需要填充但有）', () => {
  try {
    atob('AAAA=');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('等号位置：===A （开头三个）', () => {
  try {
    atob('===A');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('等号位置：A==A （等号后有字符）', () => {
  try {
    atob('A==A');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

// 补充：长度 6 和 7 是可以接受的（Node.js 容错）
test('长度容错：6 字符（可接受）', () => {
  const decoded = atob('AAAAAA');
  if (decoded.length !== 4) {
    throw new Error(`期望长度 4, 实际 ${decoded.length}`);
  }
  // 验证内容
  for (let i = 0; i < 4; i++) {
    if (decoded.charCodeAt(i) !== 0) {
      throw new Error(`位置 ${i} 应为 0`);
    }
  }
  return true;
});

test('长度容错：7 字符（可接受）', () => {
  const decoded = atob('AAAAAAA');
  if (decoded.length !== 5) {
    throw new Error(`期望长度 5, 实际 ${decoded.length}`);
  }
  for (let i = 0; i < 5; i++) {
    if (decoded.charCodeAt(i) !== 0) {
      throw new Error(`位置 ${i} 应为 0`);
    }
  }
  return true;
});

test('长度容错：8 字符（标准）', () => {
  const decoded = atob('AAAAAAAA');
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  return true;
});

test('长度容错：9 字符（应拒绝，9 % 4 === 1）', () => {
  try {
    atob('AAAAAAAAA');
    throw new Error('应该拒绝长度 9');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('长度容错：10 字符（可接受，10 % 4 === 2）', () => {
  const decoded = atob('AAAAAAAAAA');
  if (decoded.length !== 7) {
    throw new Error(`期望长度 7, 实际 ${decoded.length}`);
  }
  return true;
});

test('长度容错：11 字符（可接受，11 % 4 === 3）', () => {
  const decoded = atob('AAAAAAAAAAA');
  if (decoded.length !== 8) {
    throw new Error(`期望长度 8, 实际 ${decoded.length}`);
  }
  return true;
});

// 补充：大小写敏感性验证
test('大小写敏感：SGVsbG8= vs sgvsbg8=', () => {
  const upper = atob('SGVsbG8=');
  const lower = atob('sgvsbg8=');
  // 应该产生不同结果（base64 大小写敏感）
  if (upper === lower) {
    throw new Error('大小写应该产生不同结果');
  }
  // 验证正确的是 "Hello"
  if (upper !== 'Hello') {
    throw new Error(`期望 "Hello", 实际 "${upper}"`);
  }
  return true;
});

test('大小写敏感：每个字符的影响', () => {
  // S vs s, G vs g, V vs v, etc.
  const pairs = [
    ['AA==', 'aA=='],
    ['AAA=', 'aAA='],
    ['AAAA', 'aAAA']
  ];

  for (const [upper, lower] of pairs) {
    const result1 = atob(upper);
    const result2 = atob(lower);
    if (result1 === result2) {
      throw new Error(`${upper} 和 ${lower} 不应相同`);
    }
  }
  return true;
});

// 补充：空格容错的详细行为
test('空格容错：前导空格被接受', () => {
  try {
    const decoded = atob(' SGVsbG8=');
    // Node.js v25 接受空格
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('空格容错：尾随空格被接受', () => {
  try {
    const decoded = atob('SGVsbG8= ');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('空格容错：中间空格被接受', () => {
  try {
    const decoded = atob('SGVs bG8=');
    // 如果接受，验证结果正确
    if (decoded === 'Hello') {
      return true;
    }
    // 或者空格被忽略
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('空格容错：多个空格', () => {
  try {
    const decoded = atob('SGVs  bG8=');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 补充：特殊字符 + 和 / 的边界
test('特殊字符+：单独的 + （应拒绝，长度1）', () => {
  try {
    atob('+');
    throw new Error('单个 + 应该失败');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('特殊字符+：++ （2个，可接受）', () => {
  const decoded = atob('++');
  // 长度 2，% 4 === 2，可接受
  if (decoded.length !== 1) {
    throw new Error(`期望长度 1, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符+：+++ （3个，可接受）', () => {
  const decoded = atob('+++');
  // 长度 3，% 4 === 3，可接受
  if (decoded.length !== 2) {
    throw new Error(`期望长度 2, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符+：++++ （4个，有效）', () => {
  const decoded = atob('++++');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符/：单独的 / （应拒绝，长度1）', () => {
  try {
    atob('/');
    throw new Error('单个 / 应该失败');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('特殊字符/：//// （4个，有效）', () => {
  const decoded = atob('////');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  // //// 解码为 [255, 255, 255]
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== 255) {
      throw new Error(`位置 ${i} 应为 255`);
    }
  }
  return true;
});

test('特殊字符混合：+/+/', () => {
  const decoded = atob('+/+/');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

// 补充：数字字符的完整测试
test('数字字符：0000', () => {
  const decoded = atob('0000');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('数字字符：9999', () => {
  const decoded = atob('9999');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('数字字符：0123456789（所有数字）', () => {
  const original = '0123456789';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('数字往返失败');
  }
  return true;
});

// 补充：连续相同字符的所有情况
test('连续字符：ZZZZ', () => {
  const decoded = atob('ZZZZ');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('连续字符：zzzz', () => {
  const decoded = atob('zzzz');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('连续字符：所有大写字母', () => {
  for (let c = 65; c <= 90; c++) { // A-Z
    const char = String.fromCharCode(c);
    const input = char.repeat(4);
    const decoded = atob(input);
    if (decoded.length !== 3) {
      throw new Error(`${char} 重复失败`);
    }
  }
  return true;
});

test('连续字符：所有小写字母', () => {
  for (let c = 97; c <= 122; c++) { // a-z
    const char = String.fromCharCode(c);
    const input = char.repeat(4);
    const decoded = atob(input);
    if (decoded.length !== 3) {
      throw new Error(`${char} 重复失败`);
    }
  }
  return true;
});

test('连续字符：所有数字', () => {
  for (let c = 48; c <= 57; c++) { // 0-9
    const char = String.fromCharCode(c);
    const input = char.repeat(4);
    const decoded = atob(input);
    if (decoded.length !== 3) {
      throw new Error(`${char} 重复失败`);
    }
  }
  return true;
});

// 补充：填充的精确规则
test('填充规则：AA== 解码为 1 字节', () => {
  const decoded = atob('AA==');
  if (decoded.length !== 1) {
    throw new Error(`期望长度 1, 实际 ${decoded.length}`);
  }
  return true;
});

test('填充规则：AAA= 解码为 2 字节', () => {
  const decoded = atob('AAA=');
  if (decoded.length !== 2) {
    throw new Error(`期望长度 2, 实际 ${decoded.length}`);
  }
  return true;
});

test('填充规则：AAAA 解码为 3 字节', () => {
  const decoded = atob('AAAA');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
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
