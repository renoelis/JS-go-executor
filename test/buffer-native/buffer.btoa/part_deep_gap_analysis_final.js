// buffer.btoa() - 深度查缺补漏测试 (最终版)
// 专门针对可能遗漏的边界情况和极端场景

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// === 1. 函数属性的深度验证 ===

test('全局btoa与require btoa行为一致性', () => {
  const { btoa: moduleBtoa } = require('buffer');
  const testData = 'test consistency';
  return btoa(testData) === moduleBtoa(testData);
});

test('btoa函数length属性存在且正确', () => {
  return btoa.length === 1;
});

test('btoa函数name属性存在且正确', () => {
  return btoa.name === 'btoa';
});

test('btoa函数toString输出验证', () => {
  const str = btoa.toString();
  return str.includes('function') && str.includes('btoa');
});

// === 2. 参数处理的极端情况 ===

test('调用无参数时有适当错误', () => {
  try {
    btoa();
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('null参数转换行为', () => {
  const result = btoa(null);
  return result === btoa('null');
});

test('undefined参数转换行为', () => {
  const result = btoa(undefined);
  return result === btoa('undefined');
});

test('数字参数转换行为', () => {
  const result = btoa(123);
  return result === btoa('123');
});

test('布尔参数转换行为', () => {
  const result1 = btoa(true);
  const result2 = btoa(false);
  return result1 === btoa('true') && result2 === btoa('false');
});

test('数组参数转换行为', () => {
  const result = btoa([1,2,3]);
  return result === btoa('1,2,3');
});

test('对象参数转换行为', () => {
  const obj = { toString: () => 'custom' };
  const result = btoa(obj);
  return result === btoa('custom');
});

// === 3. 字符编码边界的精细测试 ===

test('Latin-1边界字符精确测试 - 0x80', () => {
  const result = btoa('\x80');
  return result === 'gA==';
});

test('Latin-1边界字符精确测试 - 0xFE', () => {
  const result = btoa('\xFE');
  return result === '/g==';
});

test('Latin-1边界字符精确测试 - 0xFF', () => {
  const result = btoa('\xFF');
  return result === '/w==';
});

test('所有Latin-1字符完整映射验证', () => {
  for (let i = 0; i <= 255; i++) {
    const char = String.fromCharCode(i);
    const encoded = btoa(char);
    const decoded = atob(encoded);
    if (decoded.charCodeAt(0) !== i) return false;
  }
  return true;
});

// === 4. 字符串长度和padding的边界情况 ===

test('长度为1字符的padding验证', () => {
  const result = btoa('a');
  return result === 'YQ==' && result.endsWith('==');
});

test('长度为2字符的padding验证', () => {
  const result = btoa('ab');
  return result === 'YWI=' && result.endsWith('=') && !result.endsWith('==');
});

test('长度为3字符无padding验证', () => {
  const result = btoa('abc');
  return result === 'YWJj' && !result.includes('=');
});

test('空字符串padding验证', () => {
  const result = btoa('');
  return result === '' && !result.includes('=');
});

// === 5. 特殊字符组合的深度测试 ===

test('连续控制字符组合', () => {
  const input = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F';
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input;
});

test('高位字节交替模式', () => {
  const input = '\x80\x7F\x80\x7F\x80\x7F';
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input;
});

test('字节值渐变序列', () => {
  let input = '';
  for (let i = 0; i <= 255; i += 17) { // 0, 17, 34, ..., 255
    input += String.fromCharCode(i);
  }
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input;
});

// === 6. Base64输出格式的细节验证 ===

test('Base64字符集完整性验证', () => {
  const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const longInput = Array.from({length: 256}, (_, i) => String.fromCharCode(i)).join('');
  const result = btoa(longInput);
  
  for (let char of result) {
    if (!validChars.includes(char)) return false;
  }
  return true;
});

test('Base64输出无非法字符验证', () => {
  const input = 'Test with various chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
  const result = btoa(input);
  const invalidChars = [' ', '\t', '\n', '\r', '-', '_'];
  
  for (let char of invalidChars) {
    if (result.includes(char)) return false;
  }
  return true;
});

// === 7. 错误条件的细致测试 ===

test('Unicode字符错误检测 - U+0100', () => {
  try {
    btoa('\u0100');
    return false;
  } catch (e) {
    return e.message.includes('character') || e.message.includes('Latin1') || e.message.includes('range');
  }
});

test('Unicode字符错误检测 - U+1F600 (Emoji)', () => {
  try {
    btoa('😀');
    return false;
  } catch (e) {
    return e.message.includes('character') || e.message.includes('range');
  }
});

test('高Unicode字符错误 - U+1D11E (Musical Symbol)', () => {
  try {
    btoa('𝄞');
    return false;
  } catch (e) {
    return e.message.includes('character') || e.message.includes('range');
  }
});

// === 8. 内存和性能边界测试 ===

test('中等长度字符串性能稳定性', () => {
  const input = 'A'.repeat(10000);
  const startTime = Date.now();
  const result = btoa(input);
  const endTime = Date.now();
  
  return (endTime - startTime) < 1000 && result.length === Math.ceil(10000 / 3) * 4;
});

test('特殊字符重复模式', () => {
  const patterns = ['\x00\xFF', '\x55\xAA', '\x80\x7F'];
  
  for (let pattern of patterns) {
    const input = pattern.repeat(1000);
    const result = btoa(input);
    const decoded = atob(result);
    if (decoded !== input) return false;
  }
  return true;
});

// === 9. 与其他Base64实现的兼容性验证 ===

test('与Buffer.from()的兼容性验证', () => {
  const { Buffer } = require('buffer');
  const testData = 'Hello, World! 123 @#$%^&*()';
  
  const btoaResult = btoa(testData);
  const bufferResult = Buffer.from(testData, 'binary').toString('base64');
  
  return btoaResult === bufferResult;
});

test('二进制数据兼容性验证', () => {
  const { Buffer } = require('buffer');
  let binaryData = '';
  
  for (let i = 0; i < 256; i++) {
    binaryData += String.fromCharCode(i);
  }
  
  const btoaResult = btoa(binaryData);
  const bufferResult = Buffer.from(binaryData, 'binary').toString('base64');
  
  return btoaResult === bufferResult;
});

// === 10. 函数调用上下文测试 ===

test('apply调用方式验证', () => {
  const result = btoa.apply(null, ['test']);
  return result === btoa('test');
});

test('call调用方式验证', () => {
  const result = btoa.call(null, 'test');
  return result === btoa('test');
});

test('bind调用方式验证', () => {
  const boundBtoa = btoa.bind(null);
  const result = boundBtoa('test');
  return result === btoa('test');
});

// === 11. 边界条件的数学验证 ===

test('Base64长度计算公式验证 - 各种长度', () => {
  for (let len = 0; len <= 100; len++) {
    const input = 'x'.repeat(len);
    const result = btoa(input);
    const expectedLength = Math.ceil(len / 3) * 4;
    if (result.length !== expectedLength) return false;
  }
  return true;
});

test('三字节对齐的完美编码验证', () => {
  const lengths = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
  
  for (let len of lengths) {
    const input = 'A'.repeat(len);
    const result = btoa(input);
    // 三字节对齐时不应有padding
    if (result.includes('=')) return false;
    if (result.length !== len / 3 * 4) return false;
  }
  return true;
});

// === 12. 更深层的边界情况补充 ===

test('连续最大Latin-1字符', () => {
  const input = '\xFF'.repeat(100);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input && decoded.length === 100;
});

test('连续最小字符', () => {
  const input = '\x00'.repeat(100);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input && decoded.length === 100;
});

test('交替极值字符模式', () => {
  let input = '';
  for (let i = 0; i < 100; i++) {
    input += i % 2 === 0 ? '\x00' : '\xFF';
  }
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input;
});

test('稀疏字符分布测试', () => {
  const sparse = [0, 1, 127, 128, 254, 255];
  let input = '';
  for (let i = 0; i < 100; i++) {
    input += String.fromCharCode(sparse[i % sparse.length]);
  }
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input;
});

test('单字节重复极限测试', () => {
  const singleBytes = [0, 85, 170, 255]; // 0x00, 0x55, 0xAA, 0xFF
  
  for (let byte of singleBytes) {
    const char = String.fromCharCode(byte);
    const input = char.repeat(1000);
    const result = btoa(input);
    const decoded = atob(result);
    if (decoded !== input) return false;
  }
  return true;
});

// === 13. 特殊编程场景测试 ===

test('require buffer btoa与全局btoa行为对比', () => {
  const { btoa: moduleBtoa } = require('buffer');
  const testCases = ['', 'a', 'ab', 'abc', '\x00', '\xFF', 'Hello World!'];
  
  for (let testCase of testCases) {
    if (btoa(testCase) !== moduleBtoa(testCase)) return false;
  }
  return true;
});

test('错误对象类型一致性', () => {
  try {
    btoa('\u0100');
    return false;
  } catch (globalError) {
    try {
      const { btoa: moduleBtoa } = require('buffer');
      moduleBtoa('\u0100');
      return false;
    } catch (moduleError) {
      // 两个错误应该有相同的特征
      return globalError.name === moduleError.name || 
             (globalError.message.includes('character') && moduleError.message.includes('character'));
    }
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
