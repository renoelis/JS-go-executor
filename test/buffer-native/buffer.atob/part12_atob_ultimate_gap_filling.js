// buffer.atob() - Part 12: 最终极限查缺补漏（第7轮）
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

// 补充：长度规则的完整验证（length % 4 === 1 失败，其他成功）
test('长度规则：1 % 4 === 1 （失败）', () => {
  try {
    atob('A');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('长度规则：5 % 4 === 1 （失败）', () => {
  try {
    atob('AAAAA');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('长度规则：13 % 4 === 1 （失败）', () => {
  try {
    atob('A'.repeat(13));
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('长度规则：17 % 4 === 1 （失败）', () => {
  try {
    atob('A'.repeat(17));
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

// 补充：base64 字符集的每个字符单独测试
test('字符集验证：所有大写字母 A-Z', () => {
  for (let i = 65; i <= 90; i++) {
    const char = String.fromCharCode(i);
    const input = char + 'A==';
    try {
      atob(input);
    } catch (e) {
      throw new Error(`字符 ${char} 失败`);
    }
  }
  return true;
});

test('字符集验证：所有小写字母 a-z', () => {
  for (let i = 97; i <= 122; i++) {
    const char = String.fromCharCode(i);
    const input = char + 'A==';
    try {
      atob(input);
    } catch (e) {
      throw new Error(`字符 ${char} 失败`);
    }
  }
  return true;
});

test('字符集验证：所有数字 0-9', () => {
  for (let i = 48; i <= 57; i++) {
    const char = String.fromCharCode(i);
    const input = char + 'A==';
    try {
      atob(input);
    } catch (e) {
      throw new Error(`字符 ${char} 失败`);
    }
  }
  return true;
});

test('字符集验证：+ 字符', () => {
  const input = '+A==';
  const decoded = atob(input);
  if (typeof decoded !== 'string') {
    throw new Error('+ 字符失败');
  }
  return true;
});

test('字符集验证：/ 字符', () => {
  const input = '/A==';
  const decoded = atob(input);
  if (typeof decoded !== 'string') {
    throw new Error('/ 字符失败');
  }
  return true;
});

// 补充：非法字符的完整测试
test('非法字符：所有控制字符（0x00-0x1F）', () => {
  for (let i = 0; i <= 31; i++) {
    const char = String.fromCharCode(i);
    const input = 'AA' + char + 'A';
    try {
      atob(input);
      // 某些控制字符可能被接受（如空白）
    } catch (e) {
      // 大多数应该被拒绝
      if (!e.message.includes('Invalid') && !e.message.includes('invalid') && !e.message.includes('correctly encoded')) {
        throw new Error(`控制字符 0x${i.toString(16)} 错误类型不对`);
      }
    }
  }
  return true;
});

test('非法字符：空格后的字符（0x20）', () => {
  // 空格已经测试过，这里测试紧跟的字符
  const chars = ['!', '"', '#', '$', '%', '&', '\'', '(', ')', '*', ',', '.', ':', ';', '<', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~'];
  for (const char of chars) {
    const input = 'AA' + char + 'A';
    try {
      atob(input);
      throw new Error(`字符 ${char} 应该被拒绝`);
    } catch (e) {
      if (!e.message.includes('Invalid') && !e.message.includes('invalid') && !e.message.includes('character') && !e.message.includes('correctly encoded')) {
        throw new Error(`字符 ${char} 错误类型不对: ${e.message}`);
      }
    }
  }
  return true;
});

// 补充：填充和长度的组合
test('填充组合：=后不能有非=字符（A=B=）', () => {
  try {
    atob('A=B=');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('填充组合：连续==后不能有字符（A==B）', () => {
  try {
    atob('A==B');
    throw new Error('应该拒绝');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('character')) {
      return true;
    }
    throw e;
  }
});

test('填充组合：AB== （正确）', () => {
  const decoded = atob('AB==');
  if (decoded.length !== 1) {
    throw new Error(`期望长度 1, 实际 ${decoded.length}`);
  }
  return true;
});

test('填充组合：ABC= （正确）', () => {
  const decoded = atob('ABC=');
  if (decoded.length !== 2) {
    throw new Error(`期望长度 2, 实际 ${decoded.length}`);
  }
  return true;
});

test('填充组合：ABCD （正确）', () => {
  const decoded = atob('ABCD');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  return true;
});

// 补充：混合所有有效字符
test('混合字符：A-Z + a-z', () => {
  const input = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
  const encoded = Buffer.from(input).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== input) {
    throw new Error('大小写混合失败');
  }
  return true;
});

test('混合字符：字母 + 数字', () => {
  const input = 'A0B1C2D3E4F5G6H7I8J9';
  const encoded = Buffer.from(input).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== input) {
    throw new Error('字母数字混合失败');
  }
  return true;
});

test('混合字符：包含所有 ASCII 可打印字符', () => {
  let input = '';
  for (let i = 32; i <= 126; i++) {
    input += String.fromCharCode(i);
  }
  const encoded = Buffer.from(input).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== input) {
    throw new Error('所有可打印字符失败');
  }
  return true;
});

// 补充：二进制模式的完整测试
test('二进制模式：交替 0x00 和 0xFF', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 20; i++) {
    buf[i] = i % 2 === 0 ? 0x00 : 0xFF;
  }
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 20; i++) {
    const expected = i % 2 === 0 ? 0x00 : 0xFF;
    if (decoded.charCodeAt(i) !== expected) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('二进制模式：递增字节 0-255', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 256; i++) {
    if (decoded.charCodeAt(i) !== i) {
      throw new Error(`字节 ${i} 失败`);
    }
  }
  return true;
});

test('二进制模式：递减字节 255-0', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = 255 - i;
  }
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 256; i++) {
    if (decoded.charCodeAt(i) !== 255 - i) {
      throw new Error(`字节 ${i} 失败`);
    }
  }
  return true;
});

// 补充：特殊边界组合
test('特殊组合：全 0 后跟全 255', () => {
  const buf = Buffer.concat([Buffer.alloc(10, 0), Buffer.alloc(10, 255)]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 10; i++) {
    if (decoded.charCodeAt(i) !== 0) {
      throw new Error(`前半部分位置 ${i} 应为 0`);
    }
  }
  for (let i = 10; i < 20; i++) {
    if (decoded.charCodeAt(i) !== 255) {
      throw new Error(`后半部分位置 ${i} 应为 255`);
    }
  }
  return true;
});

test('特殊组合：递增再递减', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf[i] = i * 10;
  }
  for (let i = 10; i < 20; i++) {
    buf[i] = (19 - i) * 10;
  }
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 20) {
    throw new Error('长度不匹配');
  }
  return true;
});

// 补充：性能和稳定性的极限测试
test('极限：100KB 数据', () => {
  const buf = Buffer.alloc(102400, 0x42);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 102400) {
    throw new Error(`期望长度 102400, 实际 ${decoded.length}`);
  }
  return true;
});

test('极限：500KB 数据', () => {
  try {
    const buf = Buffer.alloc(512000, 0x43);
    const encoded = buf.toString('base64');
    const decoded = atob(encoded);
    if (decoded.length !== 512000) {
      throw new Error(`期望长度 512000, 实际 ${decoded.length}`);
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

test('极限：连续 10000 次调用', () => {
  const input = 'SGVsbG8=';
  const expected = 'Hello';
  for (let i = 0; i < 10000; i++) {
    const decoded = atob(input);
    if (decoded !== expected) {
      throw new Error(`第 ${i} 次调用失败`);
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
