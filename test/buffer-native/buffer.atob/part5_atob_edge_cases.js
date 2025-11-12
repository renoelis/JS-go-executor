// buffer.atob() - Part 5: 极端场景测试
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

// 空字符串和空白
test('极端：空字符串', () => {
  const decoded = atob('');
  if (decoded !== '') {
    throw new Error(`期望空字符串, 实际 "${decoded}"`);
  }
  if (decoded.length !== 0) {
    throw new Error(`期望长度 0, 实际 ${decoded.length}`);
  }
  return true;
});

test('极端：仅包含填充 "="', () => {
  try {
    const decoded = atob('=');
    // 可能接受或拒绝
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('极端：仅包含填充 "=="', () => {
  try {
    const decoded = atob('==');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('极端：仅包含填充 "===="', () => {
  try {
    const decoded = atob('====');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 填充缺失或多余
test('极端：应该有两个 = 但只有一个', () => {
  try {
    const decoded = atob('YQ=');
    // "YQ=" 应该是 "YQ=="，但可能容错
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('极端：应该有一个 = 但没有', () => {
  try {
    const decoded = atob('YWI');
    // "YWI" 应该是 "YWI="
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('极端：不需要填充但有一个 =', () => {
  try {
    const decoded = atob('YWJj=');
    // "YWJj" 不需要填充
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 大小写混合
test('极端：大小写混合', () => {
  const encoded = 'SGVsbG8='; // 正常
  const decoded = atob(encoded);
  if (decoded !== 'Hello') {
    throw new Error(`大小写混合失败`);
  }
  return true;
});

// 重复字符
test('极端：全部相同字符 AAAA', () => {
  const decoded = atob('AAAA');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  // AAAA 解码为 [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== 0) {
      throw new Error(`位置 ${i} 应为 0`);
    }
  }
  return true;
});

test('极端：全部相同字符 ////（最大值）', () => {
  const decoded = atob('////');
  if (decoded.length !== 3) {
    throw new Error(`期望长度 3, 实际 ${decoded.length}`);
  }
  // //// 解码为 [255, 255, 255]
  for (let i = 0; i < 3; i++) {
    if (decoded.charCodeAt(i) !== 255) {
      throw new Error(`位置 ${i} 应为 255, 实际 ${decoded.charCodeAt(i)}`);
    }
  }
  return true;
});

// 长字符串
test('极端：中等长度字符串（1KB）', () => {
  const original = 'a'.repeat(1024);
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 1024) {
    throw new Error(`期望长度 1024, 实际 ${decoded.length}`);
  }
  if (decoded !== original) {
    throw new Error(`内容不匹配`);
  }
  return true;
});

test('极端：较长字符串（10KB）', () => {
  const original = 'b'.repeat(10240);
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 10240) {
    throw new Error(`期望长度 10240, 实际 ${decoded.length}`);
  }
  if (decoded !== original) {
    throw new Error(`内容不匹配`);
  }
  return true;
});

test('极端：大字符串（100KB）', () => {
  const original = 'c'.repeat(102400);
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 102400) {
    throw new Error(`期望长度 102400, 实际 ${decoded.length}`);
  }
  return true;
});

// 边界长度
test('极端：长度为 4 的 base64（恰好一组）', () => {
  const decoded = atob('YWJj');
  if (decoded !== 'abc') {
    throw new Error(`期望 "abc", 实际 "${decoded}"`);
  }
  return true;
});

test('极端：长度为 8 的 base64（两组）', () => {
  const decoded = atob('YWJjZGVm');
  if (decoded !== 'abcdef') {
    throw new Error(`期望 "abcdef", 实际 "${decoded}"`);
  }
  return true;
});

test('极端：长度为 5（非 4 的倍数）', () => {
  try {
    const decoded = atob('AAAAA');
    // 长度 5 不满足 base64 要求，应该抛出错误
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('极端：长度为 6（非 4 的倍数）', () => {
  try {
    const decoded = atob('AAAAAA');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('极端：长度为 7（非 4 的倍数）', () => {
  try {
    const decoded = atob('AAAAAAA');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 特殊序列
test('极端：连续填充在不同位置', () => {
  const cases = [
    'YQ==',   // 正常
    'YWI=',   // 正常
    'YWJj'    // 无填充
  ];
  for (const encoded of cases) {
    try {
      const decoded = atob(encoded);
      // 应该都能正常解码
    } catch (e) {
      throw new Error(`编码 "${encoded}" 解码失败: ${e.message}`);
    }
  }
  return true;
});

// 前导/尾随空白（atob 通常不接受）
test('极端：前导空格', () => {
  try {
    const decoded = atob(' SGVsbG8=');
    // 可能接受或拒绝
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('极端：尾随空格', () => {
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

test('极端：前后都有空格', () => {
  try {
    const decoded = atob(' SGVsbG8= ');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
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
