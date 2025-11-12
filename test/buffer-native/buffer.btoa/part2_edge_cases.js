// buffer.btoa() - Part 2: Edge Cases and Error Handling
const { btoa } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 错误处理测试 - 超出 Latin-1 范围的字符
test('InvalidCharacterError: 包含中文字符', () => {
  try {
    btoa('你好');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.name === 'InvalidCharacterError' || e.message.includes('Invalid');
  }
});

test('InvalidCharacterError: 包含 Emoji', () => {
  try {
    btoa('😀');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.name === 'InvalidCharacterError' || e.message.includes('Invalid');
  }
});

test('InvalidCharacterError: 包含日文', () => {
  try {
    btoa('こんにちは');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.name === 'InvalidCharacterError' || e.message.includes('Invalid');
  }
});

test('InvalidCharacterError: 包含韩文', () => {
  try {
    btoa('안녕');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.name === 'InvalidCharacterError' || e.message.includes('Invalid');
  }
});

test('InvalidCharacterError: 包含俄文扩展字符', () => {
  try {
    btoa('Привет');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.name === 'InvalidCharacterError' || e.message.includes('Invalid');
  }
});

test('InvalidCharacterError: Unicode 字符 U+0100', () => {
  try {
    btoa(String.fromCharCode(0x0100));
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.name === 'InvalidCharacterError' || e.message.includes('Invalid');
  }
});

test('InvalidCharacterError: 混合 ASCII 和 Unicode', () => {
  try {
    btoa('Hello世界');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.name === 'InvalidCharacterError' || e.message.includes('Invalid');
  }
});

// null 和 undefined 测试
test('null 参数转为字符串 "null"', () => {
  const result = btoa(null);
  return result === 'bnVsbA==';
});

test('undefined 参数转为字符串 "undefined"', () => {
  const result = btoa(undefined);
  return result === 'dW5kZWZpbmVk';
});

// 边界情况
test('Latin-1 边界 - 所有字节 0x00-0xFF', () => {
  let str = '';
  for (let i = 0; i <= 0xFF; i++) {
    str += String.fromCharCode(i);
  }
  const result = btoa(str);
  return result.length > 0;
});

test('超长字符串', () => {
  const longStr = 'A'.repeat(100000);
  const result = btoa(longStr);
  return result.length > 100000;
});

test('全零字节', () => {
  const str = '\0\0\0';
  const result = btoa(str);
  return result === 'AAAA';
});

test('全 0xFF 字节', () => {
  const str = String.fromCharCode(0xFF, 0xFF, 0xFF);
  const result = btoa(str);
  return result === '////';
});

// 与 atob 的往返测试
test('btoa(atob(x)) === x', () => {
  const { atob } = require('buffer');
  const original = 'SGVsbG8gV29ybGQ=';
  const decoded = atob(original);
  const encoded = btoa(decoded);
  return encoded === original;
});

test('atob(btoa(x)) === x (Latin-1)', () => {
  const { atob } = require('buffer');
  const original = String.fromCharCode(0x00, 0x7F, 0x80, 0xFF);
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

// 特殊序列
test('编码产生 + 字符', () => {
  const str = String.fromCharCode(0xFB);
  const result = btoa(str);
  return result.indexOf('+') >= 0 || result === '+w==';
});

test('编码产生 / 字符', () => {
  const str = String.fromCharCode(0xFF);
  const result = btoa(str);
  return result.indexOf('/') >= 0 || result === '/w==';
});

test('编码产生连续 = 填充', () => {
  const result = btoa('A');
  return result === 'QQ==' && result.endsWith('==');
});

test('编码产生单个 = 填充', () => {
  const result = btoa('Hi');
  return result === 'SGk=' && result.endsWith('=') && !result.endsWith('==');
});

test('编码无填充（长度是 3 的倍数）', () => {
  const result = btoa('ABC');
  return result === 'QUJD' && !result.includes('=');
});

// 二进制数据
test('编码二进制数据', () => {
  const binary = String.fromCharCode(0x00, 0x01, 0x02, 0x03, 0x04, 0x05);
  const result = btoa(binary);
  return result === 'AAECAwQF';
});

test('编码随机二进制序列', () => {
  const binary = String.fromCharCode(0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0);
  const result = btoa(binary);
  return result.length > 0 && !result.includes('undefined');
});

// 控制字符
test('编码所有控制字符 (0x00-0x1F)', () => {
  let str = '';
  for (let i = 0; i <= 0x1F; i++) {
    str += String.fromCharCode(i);
  }
  const result = btoa(str);
  return result.length > 0;
});

test('编码 DEL 字符 (0x7F)', () => {
  const result = btoa(String.fromCharCode(0x7F));
  return result === 'fw==';
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
