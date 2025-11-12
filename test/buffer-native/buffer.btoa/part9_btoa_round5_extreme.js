// buffer.btoa() - Round 5: Extreme Cases & Historical Behavior
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 第5轮：极端场景和历史行为挑刺
test('极长字符串 - 10000字节', () => {
  const input = 'a'.repeat(10000);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input && decoded.length === 10000;
});

test('极长字符串 - 50000字节', () => {
  const input = 'b'.repeat(50000);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input && decoded.length === 50000;
});

test('极长二进制数据 - 全0x00', () => {
  const input = '\x00'.repeat(10000);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded.length === 10000 && decoded === input;
});

test('极长二进制数据 - 全0xFF', () => {
  const input = '\xFF'.repeat(10000);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded.length === 10000 && decoded === input;
});

test('极长二进制数据 - 随机字节', () => {
  let random = '';
  for (let i = 0; i < 5000; i++) {
    random += String.fromCharCode(Math.floor(Math.random() * 256));
  }
  const result = btoa(random);
  const decoded = atob(result);
  return decoded === random;
});

test('边界组合 - 全部Latin-1字符集', () => {
  let all = '';
  for (let i = 0; i <= 0xFF; i++) {
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

test('边界组合 - 重复全字符集', () => {
  let repeated = '';
  for (let rep = 0; rep < 3; rep++) {
    for (let i = 0; i <= 0xFF; i++) {
      repeated += String.fromCharCode(i);
    }
  }
  const result = btoa(repeated);
  const decoded = atob(result);
  return decoded.length === 768 && decoded === repeated;
});

test('极端填充 - 大量单字节输入', () => {
  const inputs = [];
  for (let i = 0; i < 100; i++) {
    inputs.push(String.fromCharCode(i % 256));
  }
  return inputs.every(input => {
    const result = btoa(input);
    return result.endsWith('==') && atob(result) === input;
  });
});

test('极端填充 - 大量双字节输入', () => {
  const results = [];
  for (let i = 0; i < 50; i++) {
    const input = String.fromCharCode(i) + String.fromCharCode(i + 1);
    const result = btoa(input);
    results.push(result.endsWith('=') && !result.endsWith('=='));
  }
  return results.every(r => r);
});

test('编码错误临界点 - U+00FF vs U+0100', () => {
  try {
    btoa('\u00FF'); // 应该成功
    btoa('\u0100'); // 应该失败
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('编码错误临界点 - 批量边界测试', () => {
  for (let i = 0; i <= 0xFF; i++) {
    const char = String.fromCharCode(i);
    try {
      const result = btoa(char);
      atob(result);
    } catch (e) {
      return false;
    }
  }
  for (let i = 0x100; i < 0x110; i++) {
    const char = String.fromCharCode(i);
    try {
      btoa(char);
      return false;
    } catch (e) {
      // 预期错误
    }
  }
  return true;
});

test('内存效率 - 多次编码不泄露', () => {
  const input = 'memory test';
  for (let i = 0; i < 1000; i++) {
    btoa(input);
  }
  return true;
});

test('内存效率 - 大字符串反复编码', () => {
  const input = 'x'.repeat(10000);
  for (let i = 0; i < 10; i++) {
    btoa(input);
  }
  return true;
});

test('Unicode代理项边界 - 0xD7FF（有效）', () => {
  try {
    btoa('\uD7FF');
    return false; // 超出Latin-1
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('Unicode代理项边界 - 0xD800（代理对开始）', () => {
  try {
    btoa('\uD800');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('Unicode代理项边界 - 0xDFFF（代理对结束）', () => {
  try {
    btoa('\uDFFF');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('Unicode代理项边界 - 0xE000（有效）', () => {
  try {
    btoa('\uE000');
    return false; // 超出Latin-1
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('特殊Unicode范围 - BMP基本多文种平面字符', () => {
  try {
    btoa('\u4E00'); // 中文"一"
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('特殊Unicode范围 - Latin扩展A', () => {
  try {
    btoa('\u0100'); // Ā
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('特殊Unicode范围 - Latin扩展B', () => {
  try {
    btoa('\u0180'); // ƀ
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('Base64标准兼容 - RFC4648测试向量', () => {
  const vectors = [
    { input: '', output: '' },
    { input: 'f', output: 'Zg==' },
    { input: 'fo', output: 'Zm8=' },
    { input: 'foo', output: 'Zm9v' },
    { input: 'foob', output: 'Zm9vYg==' },
    { input: 'fooba', output: 'Zm9vYmE=' },
    { input: 'foobar', output: 'Zm9vYmFy' }
  ];
  return vectors.every(v => btoa(v.input) === v.output);
});

test('MIME Base64区别 - 无换行符（Node标准）', () => {
  const long = 'x'.repeat(1000);
  const result = btoa(long);
  return !result.includes('\n') && !result.includes('\r\n');
});

test('URL安全Base64区别 - 使用+和/（非URL安全）', () => {
  const data = '\xFB\xFF';
  const result = btoa(data);
  return result.includes('+') || result.includes('/');
});

test('历史兼容 - 浏览器API签名', () => {
  return typeof btoa === 'function' && btoa.length === 1;
});

test('历史兼容 - 抛出DOMException类型错误', () => {
  try {
    btoa('\u0100');
    return false;
  } catch (e) {
    return e.name === 'InvalidCharacterError';
  }
});

test('历史兼容 - 错误消息格式', () => {
  try {
    btoa('测试');
    return false;
  } catch (e) {
    return typeof e.message === 'string' && e.message.length > 0;
  }
});

test('Latin-1别名验证 - ISO-8859-1范围', () => {
  // Latin-1 = ISO-8859-1 = 0x00-0xFF
  let iso = '';
  for (let i = 0; i <= 0xFF; i++) {
    iso += String.fromCharCode(i);
  }
  const result = btoa(iso);
  const decoded = atob(result);
  return decoded === iso;
});

test('二进制安全性 - NULL字节处理', () => {
  const withNull = 'before\x00after';
  const result = btoa(withNull);
  const decoded = atob(result);
  return decoded === withNull && decoded.indexOf('\x00') === 6;
});

test('二进制安全性 - 高位字节不截断', () => {
  const highBytes = '\x80\x81\x82\xFD\xFE\xFF';
  const result = btoa(highBytes);
  const decoded = atob(result);
  return decoded.charCodeAt(0) === 0x80 && decoded.charCodeAt(5) === 0xFF;
});

test('二进制安全性 - 字节顺序保持', () => {
  const ordered = '\x01\x02\x03\x04\x05';
  const result = btoa(ordered);
  const decoded = atob(result);
  for (let i = 0; i < 5; i++) {
    if (decoded.charCodeAt(i) !== i + 1) return false;
  }
  return true;
});

test('多字节编码陷阱 - UTF-8混淆', () => {
  // btoa 不接受 UTF-8 编码的字符串
  try {
    btoa('€'); // U+20AC，如果被误解为UTF-8会是3字节
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('latin1') || e.message.includes('range');
  }
});

test('参数处理 - 单参数要求', () => {
  try {
    btoa();
    return false;
  } catch (e) {
    return true; // 应该抛出错误或转换为undefined字符串
  }
});

test('参数处理 - 额外参数忽略', () => {
  const result = btoa('test', 'extra', 'ignored');
  return result === 'dGVzdA==';
});

test('字符串强制转换 - Symbol处理', () => {
  try {
    const sym = Symbol('test');
    btoa(sym);
    return false; // Symbol 不能隐式转换为字符串
  } catch (e) {
    return true; // 应该抛出TypeError
  }
});

test('性能基准 - 短字符串快速编码', () => {
  const start = Date.now();
  for (let i = 0; i < 10000; i++) {
    btoa('test');
  }
  const duration = Date.now() - start;
  return duration < 1000;
});

test('性能基准 - 中等字符串编码', () => {
  const input = 'x'.repeat(1000);
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    btoa(input);
  }
  const duration = Date.now() - start;
  return duration < 1000;
});

test('一致性验证 - 并发调用', () => {
  const input = 'concurrent test';
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(btoa(input));
  }
  return results.every(r => r === results[0]);
});

test('边界安全 - 最大安全Latin-1字符', () => {
  const safe = '\x00\x7F\x80\xFE\xFF';
  const result = btoa(safe);
  const decoded = atob(result);
  return decoded === safe;
});

test('编码格式严格性 - 标准Base64字符集', () => {
  const input = 'strict format test';
  const result = btoa(input);
  return /^[A-Za-z0-9+/]+=*$/.test(result);
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
