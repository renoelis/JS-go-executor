// buffer.btoa() - require('buffer') Import Tests
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 测试通过 require('buffer') 导入 btoa
test('require buffer模块导入btoa', () => {
  const { btoa } = require('buffer');
  return typeof btoa === 'function';
});

test('require buffer模块btoa基本功能', () => {
  const { btoa } = require('buffer');
  const result = btoa('hello');
  return result === 'aGVsbG8=';
});

test('require buffer模块btoa与全局btoa一致', () => {
  const { btoa: moduleBtoa } = require('buffer');
  const globalResult = btoa('test');
  const moduleResult = moduleBtoa('test');
  return globalResult === moduleResult;
});

test('require buffer默认导出包含btoa', () => {
  const buffer = require('buffer');
  return typeof buffer.btoa === 'function';
});

test('buffer模块btoa处理二进制数据', () => {
  const { btoa } = require('buffer');
  const result = btoa('\x00\xFF\x80');
  return result === 'AP+A';
});

test('buffer模块btoa处理Latin-1字符', () => {
  const { btoa } = require('buffer');
  const result = btoa('\xA0\xB0\xC0');
  return result === 'oLDA';
});

test('解构导入btoa正确性', () => {
  const { btoa: b64encode } = require('buffer');
  const result = b64encode('JavaScript');
  return result === 'SmF2YVNjcmlwdA==';
});

test('混合导入Buffer和btoa', () => {
  const { Buffer, btoa } = require('buffer');
  const str = 'mixed test';
  const btoaResult = btoa(str);
  const bufferResult = Buffer.from(str, 'binary').toString('base64');
  return btoaResult === bufferResult;
});

test('buffer模块btoa错误处理', () => {
  const { btoa } = require('buffer');
  try {
    btoa('\u0100'); // 非Latin-1字符
    return false;
  } catch (e) {
    return e.name === 'InvalidCharacterError';
  }
});

test('多次require获得同一btoa函数', () => {
  const { btoa: btoa1 } = require('buffer');
  const { btoa: btoa2 } = require('buffer');
  return btoa1 === btoa2;
});

test('buffer模块btoa与atob往返', () => {
  const { btoa, atob } = require('buffer');
  const original = 'roundtrip test';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('require buffer导入的btoa属性检查', () => {
  const { btoa } = require('buffer');
  return btoa.length === 1 && btoa.name === 'btoa';
});

test('buffer模块btoa处理空字符串', () => {
  const { btoa } = require('buffer');
  const result = btoa('');
  return result === '';
});

test('buffer模块btoa处理特殊ASCII', () => {
  const { btoa } = require('buffer');
  const result = btoa('\t\n\r !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
  return typeof result === 'string' && result.length > 0;
});

test('buffer模块导出类型验证', () => {
  const buffer = require('buffer');
  return typeof buffer === 'object' && 
         typeof buffer.Buffer === 'function' &&
         typeof buffer.btoa === 'function' &&
         typeof buffer.atob === 'function';
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
