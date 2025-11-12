// buffer.atob() - Part 9: 极端场景与兼容性（第4轮补充）
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

// 测试所有可能的填充组合
test('填充组合：无填充 + 完整3字节', () => {
  const inputs = ['YWJj', 'ZGVm', 'Z2hp']; // abc, def, ghi
  for (const input of inputs) {
    const decoded = atob(input);
    if (decoded.length !== 3) {
      throw new Error(`${input} 解码长度错误`);
    }
  }
  return true;
});

test('填充组合：单填充 + 2字节', () => {
  const inputs = ['YWI=', 'ZGU=', 'Z2g=']; // ab, de, gh
  for (const input of inputs) {
    const decoded = atob(input);
    if (decoded.length !== 2) {
      throw new Error(`${input} 解码长度错误`);
    }
  }
  return true;
});

test('填充组合：双填充 + 1字节', () => {
  const inputs = ['YQ==', 'ZA==', 'Zw==']; // a, d, g
  for (const input of inputs) {
    const decoded = atob(input);
    if (decoded.length !== 1) {
      throw new Error(`${input} 解码长度错误`);
    }
  }
  return true;
});

// 测试不同长度的重复模式
test('重复模式：短重复（3字节）', () => {
  const original = 'aaa';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('短重复失败');
  }
  return true;
});

test('重复模式：中重复（30字节）', () => {
  const original = 'a'.repeat(30);
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('中重复失败');
  }
  return true;
});

test('重复模式：长重复（300字节）', () => {
  const original = 'b'.repeat(300);
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('长重复失败');
  }
  return true;
});

// 测试交替模式
test('交替模式：ABABAB...', () => {
  const original = 'ABABAB'.repeat(10);
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('交替模式失败');
  }
  return true;
});

test('交替模式：01010101...', () => {
  const original = '01'.repeat(20);
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('二进制交替失败');
  }
  return true;
});

// 测试 ASCII 边界
test('ASCII边界：0x20-0x2F（空格到/）', () => {
  let original = '';
  for (let i = 0x20; i <= 0x2F; i++) {
    original += String.fromCharCode(i);
  }
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('ASCII 0x20-0x2F 失败');
  }
  return true;
});

test('ASCII边界：0x30-0x3F（0-9到?）', () => {
  let original = '';
  for (let i = 0x30; i <= 0x3F; i++) {
    original += String.fromCharCode(i);
  }
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('ASCII 0x30-0x3F 失败');
  }
  return true;
});

test('ASCII边界：0x40-0x4F（@-O）', () => {
  let original = '';
  for (let i = 0x40; i <= 0x4F; i++) {
    original += String.fromCharCode(i);
  }
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('ASCII 0x40-0x4F 失败');
  }
  return true;
});

test('ASCII边界：0x50-0x5F（P-_）', () => {
  let original = '';
  for (let i = 0x50; i <= 0x5F; i++) {
    original += String.fromCharCode(i);
  }
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('ASCII 0x50-0x5F 失败');
  }
  return true;
});

test('ASCII边界：0x60-0x6F（`-o）', () => {
  let original = '';
  for (let i = 0x60; i <= 0x6F; i++) {
    original += String.fromCharCode(i);
  }
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('ASCII 0x60-0x6F 失败');
  }
  return true;
});

test('ASCII边界：0x70-0x7E（p-~）', () => {
  let original = '';
  for (let i = 0x70; i <= 0x7E; i++) {
    original += String.fromCharCode(i);
  }
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('ASCII 0x70-0x7E 失败');
  }
  return true;
});

// 测试扩展 ASCII（Latin1）
test('扩展ASCII：0x80-0x8F', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    buf[i] = 0x80 + i;
  }
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 16; i++) {
    if (decoded.charCodeAt(i) !== 0x80 + i) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('扩展ASCII：0xA0-0xAF', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    buf[i] = 0xA0 + i;
  }
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 16; i++) {
    if (decoded.charCodeAt(i) !== 0xA0 + i) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('扩展ASCII：0xC0-0xCF', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    buf[i] = 0xC0 + i;
  }
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 16; i++) {
    if (decoded.charCodeAt(i) !== 0xC0 + i) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('扩展ASCII：0xE0-0xEF', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    buf[i] = 0xE0 + i;
  }
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 16; i++) {
    if (decoded.charCodeAt(i) !== 0xE0 + i) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

// 测试随机字节序列
test('随机序列：伪随机10字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0x13, 0x57]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  const expected = [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0x13, 0x57];
  for (let i = 0; i < expected.length; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

test('随机序列：连续递增', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 20; i++) {
    buf[i] = i * 10;
  }
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < 20; i++) {
    if (decoded.charCodeAt(i) !== i * 10) {
      throw new Error(`位置 ${i} 失败`);
    }
  }
  return true;
});

// 测试特殊用例
test('特殊用例：JSON 数据', () => {
  const original = '{"key":"value"}';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('JSON 编码失败');
  }
  return true;
});

test('特殊用例：URL', () => {
  const original = 'https://example.com/path?query=value';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('URL 编码失败');
  }
  return true;
});

test('特殊用例：Base64 自身', () => {
  const original = 'SGVsbG8gV29ybGQ=';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error('Base64 字符串编码失败');
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
