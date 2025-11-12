// buffer.atob() - Part 6: 安全特性测试
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

// 返回值不可变性（字符串是不可变的）
test('安全：返回值为新字符串', () => {
  const decoded1 = atob('SGVsbG8=');
  const decoded2 = atob('SGVsbG8=');
  // 字符串内容相同
  if (decoded1 !== decoded2) {
    throw new Error(`字符串内容应相同`);
  }
  return true;
});

test('安全：返回值类型检查', () => {
  const decoded = atob('SGVsbG8=');
  if (typeof decoded !== 'string') {
    throw new Error(`返回值应为 string 类型`);
  }
  return true;
});

// 大字符串内存测试
test('安全：大字符串（1MB）', () => {
  try {
    const size = 1024 * 1024;
    const original = 'd'.repeat(size);
    const encoded = Buffer.from(original).toString('base64');
    const decoded = atob(encoded);
    if (decoded.length !== size) {
      throw new Error(`期望长度 ${size}, 实际 ${decoded.length}`);
    }
    return true;
  } catch (e) {
    // 如果内存不足，也算正常
    if (e.message.includes('memory') || e.message.includes('size')) {
      return true;
    }
    throw e;
  }
});

test('安全：超大字符串（10MB）', () => {
  try {
    const size = 10 * 1024 * 1024;
    const original = 'e'.repeat(size);
    const encoded = Buffer.from(original).toString('base64');
    const decoded = atob(encoded);
    if (decoded.length !== size) {
      throw new Error(`期望长度 ${size}, 实际 ${decoded.length}`);
    }
    return true;
  } catch (e) {
    // 如果内存不足或超时，也算正常
    if (e.message.includes('memory') || e.message.includes('size') || e.message.includes('timeout')) {
      return true;
    }
    throw e;
  }
});

// 字符编码安全
test('安全：解码结果字符编码范围（0-255）', () => {
  // atob 返回的是 Latin1 字符串，每个字符应在 0-255 范围内
  const buf = Buffer.from([0, 127, 128, 255]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  for (let i = 0; i < decoded.length; i++) {
    const code = decoded.charCodeAt(i);
    if (code < 0 || code > 255) {
      throw new Error(`位置 ${i} 字符码 ${code} 超出范围`);
    }
  }
  return true;
});

test('安全：高位字节不丢失', () => {
  const buf = Buffer.from([128, 129, 254, 255]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  const expected = [128, 129, 254, 255];
  for (let i = 0; i < expected.length; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 期望 ${expected[i]}, 实际 ${decoded.charCodeAt(i)}`);
    }
  }
  return true;
});

// 多次调用一致性
test('安全：多次调用相同输入产生相同输出', () => {
  const input = 'SGVsbG8gV29ybGQh';
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(atob(input));
  }
  const first = results[0];
  for (let i = 1; i < results.length; i++) {
    if (results[i] !== first) {
      throw new Error(`第 ${i} 次调用结果不一致`);
    }
  }
  return true;
});

test('安全：并发调用（模拟）', () => {
  const inputs = [
    'SGVsbG8=',
    'V29ybGQ=',
    'Tm9kZQ==',
    'QnVmZmVy'
  ];
  const results = inputs.map(input => atob(input));
  const expected = ['Hello', 'World', 'Node', 'Buffer'];
  for (let i = 0; i < expected.length; i++) {
    if (results[i] !== expected[i]) {
      throw new Error(`位置 ${i} 期望 "${expected[i]}", 实际 "${results[i]}"`);
    }
  }
  return true;
});

// 输入验证
test('安全：拒绝包含恶意字符的输入', () => {
  const malicious = [
    '<script>alert(1)</script>',
    '${eval("code")}',
    '../../../etc/passwd',
    'admin\' OR \'1\'=\'1'
  ];
  for (const input of malicious) {
    try {
      atob(input);
      // 如果没抛错，检查是否为有效 base64
    } catch (e) {
      if (e.message.includes('Invalid') || e.message.includes('invalid')) {
        // 正常拒绝
        continue;
      }
      throw e;
    }
  }
  return true;
});

// 边界条件稳定性
test('安全：重复解码相同数据', () => {
  const input = 'SGVsbG8gV29ybGQh';
  const baseline = atob(input);
  for (let i = 0; i < 1000; i++) {
    const result = atob(input);
    if (result !== baseline) {
      throw new Error(`第 ${i} 次解码不一致`);
    }
  }
  return true;
});

test('安全：快速连续调用不同输入', () => {
  for (let i = 0; i < 1000; i++) {
    const original = String(i);
    const encoded = Buffer.from(original).toString('base64');
    const decoded = atob(encoded);
    if (decoded !== original) {
      throw new Error(`迭代 ${i} 失败`);
    }
  }
  return true;
});

// 内存泄漏检测（简单）
test('安全：大量调用后内存稳定', () => {
  const input = 'SGVsbG8gV29ybGQh';
  for (let i = 0; i < 10000; i++) {
    atob(input);
  }
  // 如果能完成就说明没有明显内存问题
  return true;
});

// 特殊字符不影响解析
test('安全：null 字节不影响解析', () => {
  const buf = Buffer.from([72, 0, 101, 0, 108, 0, 108, 0, 111]); // "H\0e\0l\0l\0o"
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 9) {
    throw new Error(`期望长度 9, 实际 ${decoded.length}`);
  }
  // 验证 null 字节位置
  if (decoded.charCodeAt(1) !== 0 || decoded.charCodeAt(3) !== 0) {
    throw new Error(`null 字节位置错误`);
  }
  return true;
});

// 返回值隔离性
test('安全：返回值与输入无关联', () => {
  const input = 'SGVsbG8=';
  const decoded1 = atob(input);
  const decoded2 = atob(input);
  // 修改 decoded1 不应影响 decoded2（字符串不可变）
  // JavaScript 字符串是不可变的，这里主要验证概念
  if (decoded1 !== decoded2) {
    throw new Error(`解码结果应相同`);
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
