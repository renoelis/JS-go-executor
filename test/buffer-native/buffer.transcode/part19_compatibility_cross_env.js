// buffer.transcode() - Part 19: Compatibility and Cross Environment Tests
const { Buffer, transcode } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 不同模块导入方式兼容性
test('require("buffer").transcode 存在', () => {
  const bufferModule = require('buffer');
  return typeof bufferModule.transcode === 'function';
});

test('解构导入的 transcode', () => {
  const { transcode: t } = require('buffer');
  const source = Buffer.from('Test', 'utf8');
  const result = t(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 8;
});

// Buffer 方法兼容性验证
test('与 Buffer.from() 的兼容性', () => {
  const originalText = 'Hello World';
  const utf8Buffer = Buffer.from(originalText, 'utf8');
  const utf16Buffer = transcode(utf8Buffer, 'utf8', 'utf16le');
  const backToUtf8 = transcode(utf16Buffer, 'utf16le', 'utf8');
  return backToUtf8.toString('utf8') === originalText;
});

test('与 Buffer.alloc() 的兼容性', () => {
  const buf = Buffer.alloc(10, 0x41); // 填充 'A'
  const result = transcode(buf, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 20;
});

test('与 Buffer.allocUnsafe() 的兼容性', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0x42); // 填充 'B'
  const result = transcode(buf, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 10;
});

// TypedArray 兼容性
test('Uint8Array 视图兼容性', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view.fill(0x43); // 填充 'C'
  const result = transcode(view, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 20;
});

test('Uint8Array.subarray() 兼容性', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57]); // "Hello W"
  const sub = arr.subarray(0, 5); // "Hello"
  const result = transcode(sub, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 10;
});

test('带 byteOffset 的 Uint8Array', () => {
  const ab = new ArrayBuffer(20);
  const fullView = new Uint8Array(ab);
  fullView.set([0x48, 0x65, 0x6C, 0x6C, 0x6F], 5); // 在偏移5处写入 "Hello"
  
  const offsetView = new Uint8Array(ab, 5, 5);
  const result = transcode(offsetView, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 10;
});

// 编码名称兼容性
test('编码名称大小写不敏感 - 全大写', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'UTF8', 'UTF16LE');
  return result instanceof Buffer && result.length === 8;
});

test('编码名称大小写不敏感 - 混合', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'Utf8', 'Utf16Le');
  return result instanceof Buffer && result.length === 8;
});

test('编码名称别名 - ucs-2', () => {
  const source = Buffer.from('Test', 'utf8');
  const result1 = transcode(source, 'utf8', 'ucs2');
  const result2 = transcode(source, 'utf8', 'ucs-2');
  return result1.equals(result2);
});

test('编码名称别名 - utf-8', () => {
  const source = Buffer.from('Test', 'latin1');
  const result1 = transcode(source, 'latin1', 'utf8');
  const result2 = transcode(source, 'latin1', 'utf-8');
  return result1.equals(result2);
});

test('编码名称别名 - utf-16le', () => {
  const source = Buffer.from('Test', 'utf8');
  const result1 = transcode(source, 'utf8', 'utf16le');
  const result2 = transcode(source, 'utf8', 'utf-16le');
  return result1.equals(result2);
});

// 与其他 Buffer 方法的交互
test('transcode 结果可用于 Buffer.concat()', () => {
  const source1 = Buffer.from('Hello', 'utf8');
  const source2 = Buffer.from('World', 'utf8');
  const result1 = transcode(source1, 'utf8', 'utf16le');
  const result2 = transcode(source2, 'utf8', 'utf16le');
  const concatenated = Buffer.concat([result1, result2]);
  return concatenated.length === 20;
});

test('transcode 结果可用于 Buffer.compare()', () => {
  const source = Buffer.from('Same', 'utf8');
  const result1 = transcode(source, 'utf8', 'utf16le');
  const result2 = transcode(source, 'utf8', 'utf16le');
  return Buffer.compare(result1, result2) === 0;
});

test('transcode 结果可用于 .equals()', () => {
  const source = Buffer.from('Equal', 'utf8');
  const result1 = transcode(source, 'utf8', 'latin1');
  const result2 = transcode(source, 'utf8', 'latin1');
  return result1.equals(result2);
});

test('transcode 结果可用于 .slice()', () => {
  const source = Buffer.from('Slicing', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const sliced = result.slice(0, 4);
  return sliced.length === 4;
});

test('transcode 结果可用于 .toString()', () => {
  const source = Buffer.from('ToString', 'utf8');
  const result = transcode(source, 'utf8', 'latin1');
  return result.toString('latin1') === 'ToString';
});

// 数值表示兼容性
test('十六进制字符串兼容性', () => {
  const hex = '48656c6c6f'; // "Hello"
  const source = Buffer.from(hex, 'hex');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 10;
});

test('Base64 字符串兼容性', () => {
  const base64 = 'SGVsbG8='; // "Hello"
  const source = Buffer.from(base64, 'base64');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 10;
});

// 特殊值处理兼容性
test('空字符串编码名称处理', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, '', 'utf16le');
    return false;
  } catch (e) {
    return true; // 应该抛出错误
  }
});

test('null 编码名称处理', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, null, 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('undefined 编码名称处理', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, undefined, 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 国际化兼容性
test('多语言字符处理 - 中日韩', () => {
  const source = Buffer.from('中文日本語한국어', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const backToUtf8 = transcode(result, 'utf16le', 'utf8');
  return backToUtf8.toString('utf8') === '中文日本語한국어';
});

test('多语言字符处理 - 欧洲语言', () => {
  const source = Buffer.from('Español Français Deutsch', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const backToUtf8 = transcode(result, 'utf16le', 'utf8');
  return backToUtf8.toString('utf8') === 'Español Français Deutsch';
});

// 错误兼容性
test('错误对象类型兼容性', () => {
  try {
    transcode('not a buffer', 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e instanceof TypeError && e.message.includes('Buffer');
  }
});

test('编码错误消息兼容性', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, 'invalid', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || 
           e.message.includes('ILLEGAL_ARGUMENT') ||
           e.message.includes('Unknown encoding');
  }
});

// 版本兼容性测试（模拟不同Node版本行为）
test('Node.js Buffer API 兼容性验证', () => {
  // 验证 transcode 函数的基本 API 契约
  const source = Buffer.from('API Test', 'utf8');
  
  // 1. 返回 Buffer 实例
  const result = transcode(source, 'utf8', 'utf16le');
  if (!(result instanceof Buffer)) return false;
  
  // 2. 长度符合预期
  if (result.length !== 16) return false;
  
  // 3. 可以再次转码
  const backResult = transcode(result, 'utf16le', 'utf8');
  if (backResult.toString('utf8') !== 'API Test') return false;
  
  return true;
});

// 内存视图兼容性
test('ArrayBuffer 视图兼容性', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  const text = 'Hello';
  
  for (let i = 0; i < text.length; i++) {
    view[i] = text.charCodeAt(i);
  }
  
  const result = transcode(view.subarray(0, 5), 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 10;
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
