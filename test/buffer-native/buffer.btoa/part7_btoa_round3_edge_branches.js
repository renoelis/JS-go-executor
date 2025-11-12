// buffer.btoa() - Round 3: Advanced Edge Cases
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 第3轮：对照Node实际行为的边缘分支测试
test('字符串包含NUL字符序列', () => {
  const result = btoa('\x00\x00\x00');
  return result === 'AAAA' && atob(result) === '\x00\x00\x00';
});

test('最小有效输入 - 单个非ASCII字符', () => {
  const result = btoa('\x80');
  return result === 'gA==' && atob(result) === '\x80';
});

test('Latin-1边界字符序列', () => {
  const result = btoa('\x7F\x80\xFE\xFF');
  return result === 'f4D+/w==' && atob(result) === '\x7F\x80\xFE\xFF';
});

test('全零字节不同长度', () => {
  const inputs = ['\x00', '\x00\x00', '\x00\x00\x00', '\x00\x00\x00\x00'];
  const expected = ['AA==', 'AAA=', 'AAAA', 'AAAAAA=='];
  return inputs.every((input, i) => btoa(input) === expected[i]);
});

test('全0xFF字节不同长度', () => {
  const inputs = ['\xFF', '\xFF\xFF', '\xFF\xFF\xFF', '\xFF\xFF\xFF\xFF'];
  const expected = ['/w==', '//8=', '////', '/////w=='];
  return inputs.every((input, i) => btoa(input) === expected[i]);
});

test('交替字节模式0x00和0xFF', () => {
  const result = btoa('\x00\xFF\x00\xFF\x00\xFF');
  return result === 'AP8A/wD/' && atob(result) === '\x00\xFF\x00\xFF\x00\xFF';
});

test('ASCII可见字符完整范围（0x20-0x7E）', () => {
  let ascii = '';
  for (let i = 0x20; i <= 0x7E; i++) {
    ascii += String.fromCharCode(i);
  }
  const result = btoa(ascii);
  const decoded = atob(result);
  return decoded === ascii && decoded.length === 95;
});

test('控制字符完整范围（0x00-0x1F，0x7F）', () => {
  let control = '';
  for (let i = 0; i <= 0x1F; i++) {
    control += String.fromCharCode(i);
  }
  control += '\x7F';
  const result = btoa(control);
  const decoded = atob(result);
  return decoded.length === 33;
});

test('Latin-1扩展字符顺序编码', () => {
  let extended = '';
  for (let i = 0x80; i <= 0xFF; i++) {
    extended += String.fromCharCode(i);
  }
  const result = btoa(extended);
  const decoded = atob(result);
  return decoded.length === 128;
});

test('混合所有字节值按序', () => {
  let all = '';
  for (let i = 0; i < 256; i++) {
    all += String.fromCharCode(i);
  }
  const result = btoa(all);
  const decoded = atob(result);
  let valid = decoded.length === 256;
  for (let i = 0; i < 256 && valid; i++) {
    valid = decoded.charCodeAt(i) === i;
  }
  return valid;
});

test('Base64输出长度公式验证 - 多个长度', () => {
  for (let len = 0; len <= 100; len++) {
    const input = 'x'.repeat(len);
    const result = btoa(input);
    const expectedLen = Math.ceil(len / 3) * 4;
    if (result.length !== expectedLen) return false;
  }
  return true;
});

test('空白字符组合', () => {
  const whitespace = ' \t\n\r\f\v';
  const result = btoa(whitespace);
  const decoded = atob(result);
  return decoded === whitespace;
});

test('可打印+不可打印混合', () => {
  const mixed = 'Hello\x00World\xFF!';
  const result = btoa(mixed);
  const decoded = atob(result);
  return decoded === mixed;
});

test('数字字符串0-9完整', () => {
  const result = btoa('0123456789');
  return result === 'MDEyMzQ1Njc4OQ==' && atob(result) === '0123456789';
});

test('字母大小写完整', () => {
  const result = btoa('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
  const decoded = atob(result);
  return decoded === 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
});

test('特殊符号集合', () => {
  const symbols = '`~!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?';
  const result = btoa(symbols);
  const decoded = atob(result);
  return decoded === symbols;
});

test('重复单字节模式 - 0xAA', () => {
  const result = btoa('\xAA\xAA\xAA\xAA\xAA\xAA');
  return result === 'qqqqqqqq' && atob(result) === '\xAA\xAA\xAA\xAA\xAA\xAA';
});

test('重复单字节模式 - 0x55', () => {
  const result = btoa('\x55\x55\x55\x55\x55\x55');
  return result === 'VVVVVVVV' && atob(result) === '\x55\x55\x55\x55\x55\x55';
});

test('递增序列0x00-0x0F', () => {
  let seq = '';
  for (let i = 0; i <= 0x0F; i++) {
    seq += String.fromCharCode(i);
  }
  const result = btoa(seq);
  const decoded = atob(result);
  return decoded === seq;
});

test('递减序列0xFF-0xF0', () => {
  let seq = '';
  for (let i = 0xFF; i >= 0xF0; i--) {
    seq += String.fromCharCode(i);
  }
  const result = btoa(seq);
  const decoded = atob(result);
  return decoded === seq;
});

test('二进制随机模式', () => {
  const binary = '\x12\x34\x56\x78\x9A\xBC\xDE\xF0';
  const result = btoa(binary);
  return result === 'EjRWeJq83vA=' && atob(result) === binary;
});

test('Base64填充一致性 - 模3余0', () => {
  const inputs = ['abc', 'abcdef', 'abcdefghi'];
  return inputs.every(input => {
    const result = btoa(input);
    return !result.includes('=');
  });
});

test('Base64填充一致性 - 模3余1', () => {
  const inputs = ['a', 'abcd', 'abcdefg'];
  return inputs.every(input => {
    const result = btoa(input);
    return result.endsWith('==');
  });
});

test('Base64填充一致性 - 模3余2', () => {
  const inputs = ['ab', 'abcde', 'abcdefgh'];
  return inputs.every(input => {
    const result = btoa(input);
    return result.endsWith('=') && !result.endsWith('==');
  });
});

test('连续相同字符不同长度', () => {
  for (let len = 1; len <= 10; len++) {
    const input = 'a'.repeat(len);
    const result = btoa(input);
    const decoded = atob(result);
    if (decoded !== input) return false;
  }
  return true;
});

test('中等长度随机字符串', () => {
  let random = '';
  for (let i = 0; i < 50; i++) {
    random += String.fromCharCode(Math.floor(Math.random() * 256));
  }
  const result = btoa(random);
  const decoded = atob(result);
  return decoded === random;
});

test('Latin-1所有可打印字符（0x20-0xFF）', () => {
  let printable = '';
  for (let i = 0x20; i <= 0xFF; i++) {
    if (i !== 0x7F) {
      printable += String.fromCharCode(i);
    }
  }
  const result = btoa(printable);
  const decoded = atob(result);
  return decoded === printable;
});

test('往返转换保持字节精确度', () => {
  const samples = [
    '\x00', '\xFF', '\x80', '\x7F',
    '\x00\xFF', '\xFF\x00',
    '\x01\x23\x45\x67\x89\xAB\xCD\xEF'
  ];
  return samples.every(sample => {
    const encoded = btoa(sample);
    const decoded = atob(encoded);
    if (decoded.length !== sample.length) return false;
    for (let i = 0; i < sample.length; i++) {
      if (decoded.charCodeAt(i) !== sample.charCodeAt(i)) return false;
    }
    return true;
  });
});

test('Base64输出无意外空格或换行', () => {
  const inputs = ['a'.repeat(100), 'b'.repeat(200), 'c'.repeat(500)];
  return inputs.every(input => {
    const result = btoa(input);
    return !/[\s\n\r\t]/.test(result);
  });
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
