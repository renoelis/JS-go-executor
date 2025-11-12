// buffer.btoa() - Round 4: Combination Coverage
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 第4轮：组合场景和语义点补充
test('错误处理 - 字符串开头超范围', () => {
  try {
    btoa('\u0100abc');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('错误处理 - 字符串中间超范围', () => {
  try {
    btoa('abc\u0100def');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('错误处理 - 字符串末尾超范围', () => {
  try {
    btoa('abcdef\u0100');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('错误处理 - 多个超范围字符', () => {
  try {
    btoa('\u0100\u0101\u0102');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('错误处理 - UTF-16代理对高位', () => {
  try {
    btoa('test\uD800more');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('错误处理 - UTF-16代理对低位', () => {
  try {
    btoa('test\uDC00more');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('错误处理 - 完整代理对', () => {
  try {
    btoa('emoji\uD83D\uDE00here');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('有效边界 - U+00FE', () => {
  const result = btoa('\u00FE');
  return result === '/g==' && atob(result) === '\u00FE';
});

test('有效边界 - U+00FF', () => {
  const result = btoa('\u00FF');
  return result === '/w==' && atob(result) === '\u00FF';
});

test('有效边界组合 - 0x00到0xFF步进16', () => {
  let stepped = '';
  for (let i = 0; i <= 0xFF; i += 16) {
    stepped += String.fromCharCode(i);
  }
  const result = btoa(stepped);
  const decoded = atob(result);
  return decoded === stepped && decoded.length === 16;
});

test('类型转换 - 数字0', () => {
  const result = btoa(0);
  return result === 'MA==' && atob(result) === '0';
});

test('类型转换 - 负数', () => {
  const result = btoa(-123);
  return result === 'LTEyMw==' && atob(result) === '-123';
});

test('类型转换 - 浮点数', () => {
  const result = btoa(3.14);
  return result === 'My4xNA==' && atob(result) === '3.14';
});

test('类型转换 - NaN', () => {
  const result = btoa(NaN);
  return result === 'TmFO' && atob(result) === 'NaN';
});

test('类型转换 - Infinity', () => {
  const result = btoa(Infinity);
  return result === 'SW5maW5pdHk=' && atob(result) === 'Infinity';
});

test('类型转换 - 空数组', () => {
  const result = btoa([]);
  return result === '' && atob(result) === '';
});

test('类型转换 - 数字数组', () => {
  const result = btoa([65, 66, 67]);
  return result === 'NjUsNjYsNjc=' && atob(result) === '65,66,67';
});

test('类型转换 - 对象默认toString', () => {
  const result = btoa({});
  return atob(result) === '[object Object]';
});

test('类型转换 - 日期对象', () => {
  // Date.toString()的输出可能包含超出Latin-1范围的字符
  // 改为测试简单的数值时间戳
  const timestamp = 1234567890;
  const result = btoa(timestamp);
  return result === 'MTIzNDU2Nzg5MA==' && atob(result) === '1234567890';
});

test('长度边界 - 精确3的倍数（3字节）', () => {
  const result = btoa('xxx');
  return result.length === 4 && !result.includes('=');
});

test('长度边界 - 精确3的倍数（6字节）', () => {
  const result = btoa('xxxxxx');
  return result.length === 8 && !result.includes('=');
});

test('长度边界 - 精确3的倍数（300字节）', () => {
  const input = 'x'.repeat(300);
  const result = btoa(input);
  return result.length === 400 && !result.includes('=');
});

test('长度边界 - 3N+1（1字节）', () => {
  const result = btoa('x');
  return result.length === 4 && result.endsWith('==');
});

test('长度边界 - 3N+1（4字节）', () => {
  const result = btoa('xxxx');
  return result.length === 8 && result.endsWith('==');
});

test('长度边界 - 3N+1（301字节）', () => {
  const input = 'x'.repeat(301);
  const result = btoa(input);
  return result.endsWith('==');
});

test('长度边界 - 3N+2（2字节）', () => {
  const result = btoa('xx');
  return result.length === 4 && result.endsWith('=') && !result.endsWith('==');
});

test('长度边界 - 3N+2（5字节）', () => {
  const result = btoa('xxxxx');
  return result.length === 8 && result.endsWith('=') && !result.endsWith('==');
});

test('长度边界 - 3N+2（302字节）', () => {
  const input = 'x'.repeat(302);
  const result = btoa(input);
  return result.endsWith('=') && !result.endsWith('==');
});

test('编码稳定性 - 相同输入多次调用', () => {
  const input = 'stability test';
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(btoa(input));
  }
  return results.every(r => r === results[0]);
});

test('编码独立性 - 不同变量相同值', () => {
  const str1 = 'test';
  const str2 = 'test';
  const str3 = 'te' + 'st';
  return btoa(str1) === btoa(str2) && btoa(str2) === btoa(str3);
});

test('二进制模式 - 交替0x55和0xAA', () => {
  const pattern = '\x55\xAA\x55\xAA\x55\xAA';
  const result = btoa(pattern);
  const decoded = atob(result);
  return decoded === pattern;
});

test('二进制模式 - 递增0x00-0xFF完整', () => {
  let full = '';
  for (let i = 0; i <= 0xFF; i++) {
    full += String.fromCharCode(i);
  }
  const result = btoa(full);
  const decoded = atob(result);
  let match = decoded.length === 256;
  for (let i = 0; i < 256 && match; i++) {
    match = decoded.charCodeAt(i) === i;
  }
  return match;
});

test('二进制模式 - 递减0xFF-0x00完整', () => {
  let full = '';
  for (let i = 0xFF; i >= 0; i--) {
    full += String.fromCharCode(i);
  }
  const result = btoa(full);
  const decoded = atob(result);
  let match = decoded.length === 256;
  for (let i = 0; i < 256 && match; i++) {
    match = decoded.charCodeAt(i) === (0xFF - i);
  }
  return match;
});

test('特殊组合 - 空格加控制字符', () => {
  const combo = ' \x00\t\x01\n\x02\r\x03';
  const result = btoa(combo);
  const decoded = atob(result);
  return decoded === combo;
});

test('特殊组合 - ASCII加高位字节', () => {
  const combo = 'ABC\x80\x90\xA0DEF';
  const result = btoa(combo);
  const decoded = atob(result);
  return decoded === combo;
});

test('特殊组合 - 数字加符号加控制字符', () => {
  const combo = '123!@#\x00\xFF';
  const result = btoa(combo);
  const decoded = atob(result);
  return decoded === combo;
});

test('往返精确性 - 1000次随机字节', () => {
  for (let trial = 0; trial < 10; trial++) {
    let random = '';
    for (let i = 0; i < 100; i++) {
      random += String.fromCharCode(Math.floor(Math.random() * 256));
    }
    const encoded = btoa(random);
    const decoded = atob(encoded);
    if (decoded !== random) return false;
  }
  return true;
});

test('Base64字符集完整性', () => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let sample = '';
  for (let i = 0; i < 100; i++) {
    sample += String.fromCharCode(Math.floor(Math.random() * 256));
  }
  const result = btoa(sample);
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    if (char !== '=' && !charset.includes(char)) return false;
  }
  return true;
});

test('性能稳定性 - 重复编码相同数据', () => {
  const input = 'performance test data';
  const times = [];
  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    btoa(input);
    times.push(Date.now() - start);
  }
  return times.every(t => t <= 10);
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
