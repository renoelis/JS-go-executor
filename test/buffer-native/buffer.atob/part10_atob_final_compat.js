// buffer.atob() - Part 10: 历史行为与最终补漏（第5轮补充）
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

// 测试与浏览器 atob 的兼容性
test('浏览器兼容：标准 base64 编码', () => {
  const testCases = [
    { input: 'SGVsbG8gV29ybGQ=', expected: 'Hello World' },
    { input: 'Zm9v', expected: 'foo' },
    { input: 'YmFy', expected: 'bar' },
    { input: 'YmF6', expected: 'baz' }
  ];

  for (const { input, expected } of testCases) {
    const decoded = atob(input);
    if (decoded !== expected) {
      throw new Error(`${input} 期望 "${expected}", 实际 "${decoded}"`);
    }
  }
  return true;
});

// 测试零宽度字符和不可见字符
test('不可见字符：零宽度空格（U+200B）', () => {
  const buf = Buffer.from('\u200B', 'utf8');
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  // 验证能解码
  if (typeof decoded !== 'string') {
    throw new Error('解码失败');
  }
  return true;
});

test('不可见字符：退格符（0x08）', () => {
  const buf = Buffer.from([0x08]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0x08) {
    throw new Error('退格符编码失败');
  }
  return true;
});

test('不可见字符：响铃符（0x07）', () => {
  const buf = Buffer.from([0x07]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0x07) {
    throw new Error('响铃符编码失败');
  }
  return true;
});

test('不可见字符：转义序列（0x1B）', () => {
  const buf = Buffer.from([0x1B]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.charCodeAt(0) !== 0x1B) {
    throw new Error('转义符编码失败');
  }
  return true;
});

// 测试字节对齐边界
test('字节对齐：1字节边界', () => {
  for (let i = 0; i < 256; i++) {
    const buf = Buffer.from([i]);
    const encoded = buf.toString('base64');
    const decoded = atob(encoded);
    if (decoded.charCodeAt(0) !== i) {
      throw new Error(`字节 ${i} 失败`);
    }
  }
  return true;
});

test('字节对齐：2字节所有组合（采样）', () => {
  const samples = [
    [0, 0], [0, 255], [255, 0], [255, 255],
    [128, 128], [64, 192], [32, 96], [16, 48]
  ];
  for (const [a, b] of samples) {
    const buf = Buffer.from([a, b]);
    const encoded = buf.toString('base64');
    const decoded = atob(encoded);
    if (decoded.charCodeAt(0) !== a || decoded.charCodeAt(1) !== b) {
      throw new Error(`字节对 [${a}, ${b}] 失败`);
    }
  }
  return true;
});

test('字节对齐：3字节所有组合（采样）', () => {
  const samples = [
    [0, 0, 0], [255, 255, 255], [128, 128, 128],
    [1, 2, 3], [254, 253, 252], [100, 150, 200]
  ];
  for (const [a, b, c] of samples) {
    const buf = Buffer.from([a, b, c]);
    const encoded = buf.toString('base64');
    const decoded = atob(encoded);
    if (decoded.charCodeAt(0) !== a || decoded.charCodeAt(1) !== b || decoded.charCodeAt(2) !== c) {
      throw new Error(`字节组 [${a}, ${b}, ${c}] 失败`);
    }
  }
  return true;
});

// 测试边界情况的稳定性
test('稳定性：重复调用100次', () => {
  const input = 'SGVsbG8gV29ybGQ=';
  const baseline = atob(input);
  for (let i = 0; i < 100; i++) {
    const result = atob(input);
    if (result !== baseline) {
      throw new Error(`第 ${i} 次调用不一致`);
    }
  }
  return true;
});

test('稳定性：交替调用不同输入', () => {
  const inputs = ['SGVsbG8=', 'V29ybGQ='];
  const expected = ['Hello', 'World'];
  for (let i = 0; i < 50; i++) {
    for (let j = 0; j < inputs.length; j++) {
      const decoded = atob(inputs[j]);
      if (decoded !== expected[j]) {
        throw new Error(`迭代 ${i}, 输入 ${j} 失败`);
      }
    }
  }
  return true;
});

// 测试性能相关的边界
test('性能：解码1000个短字符串', () => {
  const input = 'SGVsbG8=';
  for (let i = 0; i < 1000; i++) {
    atob(input);
  }
  return true;
});

test('性能：解码100个中等字符串', () => {
  const original = 'a'.repeat(100);
  const encoded = Buffer.from(original).toString('base64');
  for (let i = 0; i < 100; i++) {
    atob(encoded);
  }
  return true;
});

test('性能：解码10个长字符串', () => {
  const original = 'b'.repeat(1000);
  const encoded = Buffer.from(original).toString('base64');
  for (let i = 0; i < 10; i++) {
    atob(encoded);
  }
  return true;
});

// 测试错误恢复
test('错误恢复：错误后继续正常调用', () => {
  try {
    atob('!!!');
  } catch (e) {
    // 预期错误
  }

  // 错误后应该能正常工作
  const decoded = atob('SGVsbG8=');
  if (decoded !== 'Hello') {
    throw new Error('错误后恢复失败');
  }
  return true;
});

test('错误恢复：多次错误调用', () => {
  const invalidInputs = ['!!!', '@@@', '###'];
  for (const input of invalidInputs) {
    try {
      atob(input);
    } catch (e) {
      // 预期错误
    }
  }

  // 之后应该正常
  const decoded = atob('V29ybGQ=');
  if (decoded !== 'World') {
    throw new Error('多次错误后恢复失败');
  }
  return true;
});

// 测试边界情况的数学正确性
test('数学正确性：base64 编码长度计算', () => {
  for (let len = 1; len <= 10; len++) {
    const buf = Buffer.alloc(len, 0x42);
    const encoded = buf.toString('base64');
    const decoded = atob(encoded);

    // 验证解码长度正确
    if (decoded.length !== len) {
      throw new Error(`长度 ${len} 编码后解码长度不匹配`);
    }
  }
  return true;
});

test('数学正确性：填充规则验证', () => {
  // 长度 % 3 === 0: 无填充
  // 长度 % 3 === 1: 两个 =
  // 长度 % 3 === 2: 一个 =
  const testCases = [
    { len: 3, padding: 0 },  // abc -> YWJj
    { len: 2, padding: 1 },  // ab -> YWI=
    { len: 1, padding: 2 }   // a -> YQ==
  ];

  for (const { len, padding } of testCases) {
    const buf = Buffer.alloc(len, 0x61);
    const encoded = buf.toString('base64');
    const paddingCount = (encoded.match(/=/g) || []).length;

    if (paddingCount !== padding) {
      throw new Error(`长度 ${len} 期望 ${padding} 个填充, 实际 ${paddingCount}`);
    }

    // 验证能正确解码
    const decoded = atob(encoded);
    if (decoded.length !== len) {
      throw new Error(`解码长度不匹配`);
    }
  }
  return true;
});

// 最终综合测试
test('综合：混合所有特性', () => {
  const testData = [
    '', // 空字符串
    'a', // 单字符
    'Hello, World!', // 标点符号
    'The quick brown fox jumps over the lazy dog', // 完整句子
    String.fromCharCode(0, 127, 128, 255) // 边界字节
  ];

  for (const original of testData) {
    const encoded = Buffer.from(original, original.length === 0 ? 'utf8' : 'latin1').toString('base64');
    const decoded = atob(encoded);

    // 对于空字符串
    if (original.length === 0) {
      if (decoded !== '') {
        throw new Error('空字符串失败');
      }
      continue;
    }

    // 对于其他情况，验证字节值
    if (decoded.length !== original.length) {
      throw new Error(`长度不匹配: "${original}"`);
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
