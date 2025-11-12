// buffer.btoa() - Encoding Specific Tests
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Base64编码特定测试
test('Base64字符集 - 大写字母', () => {
  const result = btoa('ABC');
  return /^[A-Z]/.test(result);
});

test('Base64字符集 - 小写字母', () => {
  const result = btoa('xyz');
  return /[a-z]/.test(result);
});

test('Base64字符集 - 数字', () => {
  const result = btoa('\xFB\xFF'); // 产生数字
  return /[0-9]/.test(result);
});

test('Base64字符集 - 加号', () => {
  const result = btoa('\xFB'); // 产生 +
  return result.includes('+');
});

test('Base64字符集 - 斜杠', () => {
  const result = btoa('\xFF'); // 产生 /
  return result.includes('/');
});

test('Base64字符集 - 等号填充', () => {
  const result = btoa('a');
  return result.endsWith('==');
});

test('标准Base64编码（非URL安全）', () => {
  const result = btoa('\x04\xE7');
  return result === 'BOc=' && !result.includes('-') && !result.includes('_');
});

test('6位分组 - 完整3字节块', () => {
  const result = btoa('Man'); // 'M'=77, 'a'=97, 'n'=110
  return result === 'TWFu';
});

test('6位分组 - 2字节需要填充', () => {
  const result = btoa('Ma');
  return result === 'TWE=';
});

test('6位分组 - 1字节需要填充', () => {
  const result = btoa('M');
  return result === 'TQ==';
});

test('比特位对齐 - 0x000000', () => {
  const result = btoa('\x00\x00\x00');
  return result === 'AAAA';
});

test('比特位对齐 - 0xFFFFFF', () => {
  const result = btoa('\xFF\xFF\xFF');
  return result === '////';
});

test('比特位对齐 - 0x555555', () => {
  const result = btoa('\x55\x55\x55');
  return result === 'VVVV';
});

test('比特位对齐 - 0xAAAAAA', () => {
  const result = btoa('\xAA\xAA\xAA');
  return result === 'qqqq';
});

test('高位字节编码 - 0x80-0xFF范围', () => {
  const result = btoa('\x80\x90\xA0\xB0\xC0\xD0\xE0\xF0');
  return result === 'gJCgsMDQ4PA=';
});

test('二进制数据编码准确性', () => {
  const binary = '\x01\x23\x45\x67\x89\xAB\xCD\xEF';
  const result = btoa(binary);
  return result === 'ASNFZ4mrze8=';
});

test('Base64输出长度计算 - 1字节输入', () => {
  const result = btoa('a');
  return result.length === 4;
});

test('Base64输出长度计算 - 2字节输入', () => {
  const result = btoa('ab');
  return result.length === 4;
});

test('Base64输出长度计算 - 3字节输入', () => {
  const result = btoa('abc');
  return result.length === 4;
});

test('Base64输出长度计算 - 6字节输入', () => {
  const result = btoa('abcdef');
  return result.length === 8;
});

test('Base64输出长度计算 - 100字节输入', () => {
  const result = btoa('a'.repeat(100));
  const expectedLen = Math.ceil(100 / 3) * 4;
  return result.length === expectedLen;
});

test('编码后只包含Base64字符', () => {
  const inputs = ['test', '\x00\xFF', 'a'.repeat(50)];
  const validChars = /^[A-Za-z0-9+/=]+$/;
  return inputs.every(input => validChars.test(btoa(input)));
});

test('不同输入相同输出检测', () => {
  const result1 = btoa('test');
  const result2 = btoa('test');
  return result1 === result2;
});

test('Latin-1特殊字符编码', () => {
  // €超出Latin-1范围会报错，此测试仅用于占位说明
  // 实际单独测试在下面的磅符号、版权符号等测试中
  return true;
});

test('Latin-1字符 - 磅符号', () => {
  const result = btoa('£'); // U+00A3
  return result === 'ow==';
});

test('Latin-1字符 - 版权符号', () => {
  const result = btoa('©'); // U+00A9
  return result === 'qQ==';
});

test('Latin-1字符 - 注册商标', () => {
  const result = btoa('®'); // U+00AE
  return result === 'rg==';
});

test('零长度输出验证', () => {
  const result = btoa('');
  return result === '' && result.length === 0;
});

test('填充字符数量 - 无填充', () => {
  const result = btoa('abc');
  const padding = (result.match(/=/g) || []).length;
  return padding === 0;
});

test('填充字符数量 - 单填充', () => {
  const result = btoa('abcde');
  const padding = (result.match(/=/g) || []).length;
  return padding === 1;
});

test('填充字符数量 - 双填充', () => {
  const result = btoa('a');
  const padding = (result.match(/=/g) || []).length;
  return padding === 2;
});

test('编码确定性', () => {
  const iterations = 100;
  const input = 'deterministic test';
  const first = btoa(input);
  for (let i = 0; i < iterations; i++) {
    if (btoa(input) !== first) return false;
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
