// buffer.atob() - Part 13: 终极深度查缺补漏（第8轮）
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

// 补充：长度 0 的特殊情况
test('长度0：空字符串', () => {
  const decoded = atob('');
  if (decoded !== '') {
    throw new Error(`期望空字符串, 实际 "${decoded}"`);
  }
  if (decoded.length !== 0) {
    throw new Error(`期望长度 0, 实际 ${decoded.length}`);
  }
  return true;
});

test('长度0：空数组转字符串', () => {
  const decoded = atob([]);
  if (decoded !== '') {
    throw new Error(`期望空字符串`);
  }
  return true;
});

test('长度0：空字符串数组', () => {
  const decoded = atob(['']);
  if (decoded !== '') {
    throw new Error(`期望空字符串`);
  }
  return true;
});

// 补充：特殊值能成功解码的情况
test('特殊值：null 转为 "null" (长度4)', () => {
  const decoded = atob(null);
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  // "null" 是有效的 base64（长度4，% 4 === 0）
  return true;
});

test('特殊值：true 转为 "true" (长度4)', () => {
  const decoded = atob(true);
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊值：数字 10 转为 "10" (长度2)', () => {
  const decoded = atob(10);
  if (decoded.length !== 1) {
    throw new Error(`期望长度 1, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊值：数字 100 转为 "100" (长度3)', () => {
  const decoded = atob(100);
  if (decoded.length !== 2) {
    throw new Error(`期望长度 2, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊值：数字 1000 转为 "1000" (长度4)', () => {
  const decoded = atob(1000);
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊值：NaN 转为 "NaN" (长度3)', () => {
  const decoded = atob(NaN);
  if (decoded.length !== 2) {
    throw new Error(`期望长度 2, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊值：Infinity 转为 "Infinity" (长度8)', () => {
  const decoded = atob(Infinity);
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊值：数组 ["AAAA"] 转为 "AAAA"', () => {
  const decoded = atob(['AAAA']);
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊值：数组 ["SGVsbG8="] 正确解码', () => {
  const decoded = atob(['SGVsbG8=']);
  if (decoded !== 'Hello') {
    throw new Error(`期望 "Hello", 实际 "${decoded}"`);
  }
  return true;
});

// 补充：+ 和 / 在不同位置的完整测试
test('特殊字符位置：+ 在第1位', () => {
  const decoded = atob('+AAA');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符位置：+ 在第2位', () => {
  const decoded = atob('A+AA');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符位置：+ 在第3位', () => {
  const decoded = atob('AA+A');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符位置：+ 在第4位', () => {
  const decoded = atob('AAA+');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符位置：/ 在第1位', () => {
  const decoded = atob('/AAA');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符位置：/ 在第2位', () => {
  const decoded = atob('A/AA');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符位置：/ 在第3位', () => {
  const decoded = atob('AA/A');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('特殊字符位置：/ 在第4位', () => {
  const decoded = atob('AAA/');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

// 补充：base64 值域的完整验证
test('Base64值域：AAAA 解码为 [0x00, 0x00, 0x00]', () => {
  const decoded = atob('AAAA');
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== 0x00) {
      throw new Error(`位置 ${i} 期望 0x00, 实际 0x${decoded.charCodeAt(i).toString(16)}`);
    }
  }
  return true;
});

test('Base64值域：ZZZZ 解码正确', () => {
  const decoded = atob('ZZZZ');
  const expected = [0x65, 0x96, 0x59];
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('Base64值域：aaaa 解码正确', () => {
  const decoded = atob('aaaa');
  const expected = [0x69, 0xa6, 0x9a];
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('Base64值域：zzzz 解码正确', () => {
  const decoded = atob('zzzz');
  const expected = [0xcf, 0x3c, 0xf3];
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('Base64值域：0000 解码正确', () => {
  const decoded = atob('0000');
  const expected = [0xd3, 0x4d, 0x34];
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('Base64值域：9999 解码正确', () => {
  const decoded = atob('9999');
  const expected = [0xf7, 0xdf, 0x7d];
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('Base64值域：++++ 解码正确', () => {
  const decoded = atob('++++');
  const expected = [0xfb, 0xef, 0xbe];
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('Base64值域：//// 解码为 [0xFF, 0xFF, 0xFF]', () => {
  const decoded = atob('////');
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== 0xFF) {
      throw new Error(`位置 ${i} 期望 0xFF, 实际 0x${decoded.charCodeAt(i).toString(16)}`);
    }
  }
  return true;
});

// 补充：填充与解码长度的精确关系
test('填充关系：AAAA (0个=) -> 3字节', () => {
  const decoded = atob('AAAA');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

test('填充关系：AAA= (1个=) -> 2字节', () => {
  const decoded = atob('AAA=');
  if (decoded.length !== 2) {
    throw new Error(`期望长度 2, 实际 ${decoded.length}`);
  }
  return true;
});

test('填充关系：AA== (2个=) -> 1字节', () => {
  const decoded = atob('AA==');
  if (decoded.length !== 1) {
    throw new Error(`期望长度 1, 实际 ${decoded.length}`);
  }
  return true;
});

test('填充关系：AAAAAAAA (0个=) -> 6字节', () => {
  const decoded = atob('AAAAAAAA');
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  return true;
});

test('填充关系：AAAAAAA= (1个=) -> 5字节', () => {
  const decoded = atob('AAAAAAA=');
  if (decoded.length !== 5) {
    throw new Error(`期望长度 5, 实际 ${decoded.length}`);
  }
  return true;
});

test('填充关系：AAAAAA== (2个=) -> 4字节', () => {
  const decoded = atob('AAAAAA==');
  if (decoded.length !== 4) {
    throw new Error(`期望长度 4, 实际 ${decoded.length}`);
  }
  return true;
});

// 补充：往返转换的完整验证
test('往返：1字节数据完整往返', () => {
  for (let i = 0; i < 256; i++) {
    const buf = Buffer.from([i]);
    const encoded = buf.toString('base64');
    const decoded = atob(encoded);
    if (decoded.length !== 1) {
      throw new Error(`字节 ${i} 解码长度错误`);
    }
    if (decoded.charCodeAt(0) !== i) {
      throw new Error(`字节 ${i} 往返失败`);
    }
  }
  return true;
});

test('往返：不同长度数据的填充规则', () => {
  for (let len = 1; len <= 20; len++) {
    const buf = Buffer.alloc(len, 0x42);
    const encoded = buf.toString('base64');
    const decoded = atob(encoded);
    if (decoded.length !== len) {
      throw new Error(`长度 ${len} 往返失败`);
    }

    // 验证填充规则
    const paddingCount = (encoded.match(/=/g) || []).length;
    const expectedPadding = len % 3 === 1 ? 2 : (len % 3 === 2 ? 1 : 0);
    if (paddingCount !== expectedPadding) {
      throw new Error(`长度 ${len} 填充错误: 期望 ${expectedPadding}, 实际 ${paddingCount}`);
    }
  }
  return true;
});

// 补充：错误恢复能力
test('错误恢复：单次错误后正常调用', () => {
  try {
    atob('!!!');
  } catch (e) {
    // 预期错误
  }

  const decoded = atob('SGVsbG8=');
  if (decoded !== 'Hello') {
    throw new Error('错误后恢复失败');
  }
  return true;
});

test('错误恢复：连续5次错误后正常调用', () => {
  for (let i = 0; i < 5; i++) {
    try {
      atob('!!!');
    } catch (e) {
      // 预期错误
    }
  }

  const decoded = atob('V29ybGQ=');
  if (decoded !== 'World') {
    throw new Error('连续错误后恢复失败');
  }
  return true;
});

test('错误恢复：不同错误类型混合', () => {
  const errors = ['!!!', 'A=B=', 'A', '中文'];
  for (const bad of errors) {
    try {
      atob(bad);
    } catch (e) {
      // 预期错误
    }
  }

  const decoded = atob('Tm9kZQ==');
  if (decoded !== 'Node') {
    throw new Error('混合错误后恢复失败');
  }
  return true;
});

// 补充：字符串操作的影响
test('字符串操作：toLowerCase 改变结果', () => {
  const original = 'SGVsbG8=';
  const lower = original.toLowerCase();

  const decoded1 = atob(original);
  const decoded2 = atob(lower);

  // 应该产生不同结果（大小写敏感）
  if (decoded1 === decoded2) {
    throw new Error('toLowerCase 应该改变结果');
  }

  // 验证原始的是 "Hello"
  if (decoded1 !== 'Hello') {
    throw new Error('原始解码错误');
  }

  return true;
});

test('字符串操作：toUpperCase 改变结果', () => {
  const original = 'SGVsbG8=';
  const upper = original.toUpperCase();

  const decoded1 = atob(original);
  const decoded2 = atob(upper);

  if (decoded1 === decoded2) {
    throw new Error('toUpperCase 应该改变结果');
  }

  return true;
});

test('字符串操作：trim 不改变有效 base64', () => {
  const withSpaces = '  SGVsbG8=  ';
  const trimmed = 'SGVsbG8=';

  const decoded1 = atob(withSpaces);
  const decoded2 = atob(trimmed);

  // Node.js 会忽略空格，结果应该相同
  if (decoded1 !== decoded2) {
    throw new Error('trim 后结果应该相同');
  }

  if (decoded1 !== 'Hello') {
    throw new Error('解码错误');
  }

  return true;
});

// 补充：解码长度的数学计算验证
test('数学计算：解码长度公式 floor(len * 3 / 4)', () => {
  for (let inputLen = 0; inputLen <= 20; inputLen++) {
    if (inputLen % 4 === 1) continue; // 跳过失败的

    const input = 'A'.repeat(inputLen);
    const decoded = atob(input);
    const expected = Math.floor(inputLen * 3 / 4);

    if (decoded.length !== expected) {
      throw new Error(`输入长度 ${inputLen}: 期望 ${expected}, 实际 ${decoded.length}`);
    }
  }
  return true;
});

// 补充：特定字节产生 + 和 / 的验证
test('特定字节：0xF8-0xFB 产生 +', () => {
  const bytes = [0xF8, 0xF9, 0xFA, 0xFB];
  for (const byte of bytes) {
    const buf = Buffer.from([byte]);
    const encoded = buf.toString('base64');
    if (!encoded.includes('+')) {
      throw new Error(`0x${byte.toString(16)} 应该产生 +`);
    }
    // 验证能正确往返
    const decoded = atob(encoded);
    if (decoded.charCodeAt(0) !== byte) {
      throw new Error(`0x${byte.toString(16)} 往返失败`);
    }
  }
  return true;
});

test('特定字节：0xFC-0xFF 产生 /', () => {
  const bytes = [0xFC, 0xFD, 0xFE, 0xFF];
  for (const byte of bytes) {
    const buf = Buffer.from([byte]);
    const encoded = buf.toString('base64');
    if (!encoded.includes('/')) {
      throw new Error(`0x${byte.toString(16)} 应该产生 /`);
    }
    // 验证能正确往返
    const decoded = atob(encoded);
    if (decoded.charCodeAt(0) !== byte) {
      throw new Error(`0x${byte.toString(16)} 往返失败`);
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
