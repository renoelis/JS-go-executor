// buffer.btoa() - Edge Cases Tests
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 边界情况测试
test('极短输入 - 单字节', () => {
  const result = btoa('x');
  return result === 'eA==';
});

test('极短输入 - 双字节', () => {
  const result = btoa('xy');
  return result === 'eHk=';
});

test('长字符串 - 300字符', () => {
  const input = 'a'.repeat(300);
  const result = btoa(input);
  return result.length === 400; // Base64 增长约 4/3
});

test('长字符串 - 1000字符', () => {
  const input = 'b'.repeat(1000);
  const result = btoa(input);
  return result.length > 1300 && result.length < 1400;
});

test('长字符串 - 10000字符', () => {
  const input = 'c'.repeat(10000);
  const result = btoa(input);
  return result.length > 13000 && result.length < 14000;
});

test('所有控制字符（0x00-0x1F）', () => {
  let control = '';
  for (let i = 0; i <= 0x1F; i++) {
    control += String.fromCharCode(i);
  }
  const result = btoa(control);
  return result.length > 0;
});

test('所有DEL和高位控制字符（0x7F-0x9F）', () => {
  let control = '';
  for (let i = 0x7F; i <= 0x9F; i++) {
    control += String.fromCharCode(i);
  }
  const result = btoa(control);
  return result.length > 0;
});

test('Latin-1补充字符（0xA0-0xFF）', () => {
  let latin1Ext = '';
  for (let i = 0xA0; i <= 0xFF; i++) {
    latin1Ext += String.fromCharCode(i);
  }
  const result = btoa(latin1Ext);
  return result.length > 0;
});

test('所有Base64填充情况 - 无填充', () => {
  const result = btoa('abc');
  return result === 'YWJj' && !result.includes('=');
});

test('所有Base64填充情况 - 单填充', () => {
  const result = btoa('abcd');
  return result === 'YWJjZA==' && result.endsWith('==');
});

test('所有Base64填充情况 - 双填充', () => {
  const result = btoa('abcde');
  return result === 'YWJjZGU=' && result.endsWith('=') && !result.endsWith('==');
});

test('连续空格', () => {
  const result = btoa('     ');
  return result === 'ICAgICA=';
});

test('连续换行符', () => {
  const result = btoa('\n\n\n\n\n');
  return result === 'CgoKCgo=';
});

test('混合空白字符', () => {
  const result = btoa(' \t\n\r\f\v');
  return result === 'IAkKDQwL';
});

test('ASCII边界字符 - 0x00', () => {
  const result = btoa('\x00');
  return result === 'AA==';
});

test('ASCII边界字符 - 0x7F', () => {
  const result = btoa('\x7F');
  return result === 'fw==';
});

test('Latin-1边界字符 - 0x80', () => {
  const result = btoa('\x80');
  return result === 'gA==';
});

test('Latin-1边界字符 - 0xFF', () => {
  const result = btoa('\xFF');
  return result === '/w==';
});

test('重复模式识别 - 相同字节', () => {
  const result = btoa('\x00\x00\x00\x00');
  return result === 'AAAAAA==';
});

test('重复模式识别 - 0xFF', () => {
  const result = btoa('\xFF\xFF\xFF\xFF');
  return result === '/////w==';
});

test('交替模式', () => {
  const result = btoa('\x00\xFF\x00\xFF');
  return result === 'AP8A/w==';
});

test('递增序列', () => {
  const result = btoa('\x00\x01\x02\x03\x04\x05');
  return result === 'AAECAwQF';
});

test('递减序列', () => {
  const result = btoa('\x05\x04\x03\x02\x01\x00');
  return result === 'BQQDAgEA';
});

test('二进制安全 - 包含所有字节值', () => {
  let allBytes = '';
  for (let i = 0; i < 256; i++) {
    allBytes += String.fromCharCode(i);
  }
  const result = btoa(allBytes);
  const decoded = atob(result);
  return decoded.length === 256;
});

test('可逆性验证', () => {
  const original = 'Test string with special chars: !@#$%^&*()';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('空字符串往返', () => {
  const encoded = btoa('');
  const decoded = atob(encoded);
  return decoded === '';
});

test('特殊格式 - JSON字符串', () => {
  const json = '{"key":"value"}';
  const result = btoa(json);
  return result === 'eyJrZXkiOiJ2YWx1ZSJ9';
});

test('特殊格式 - URL路径', () => {
  const url = '/path/to/resource?param=value';
  const result = btoa(url);
  return result.length > 0 && atob(result) === url;
});

test('Base64输出字符集验证', () => {
  const result = btoa('test data for charset check');
  const validChars = /^[A-Za-z0-9+/]*={0,2}$/;
  return validChars.test(result);
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
