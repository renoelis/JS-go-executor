// Buffer.isEncoding - part19: 最终查缺补漏与极端验证
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 全局对象和特殊环境变量
test('globalThis 对象', () => {
  return Buffer.isEncoding(globalThis) === false;
});

test('process 对象 (如果存在)', () => {
  try {
    return Buffer.isEncoding(process) === false;
  } catch {
    return true; // 在浏览器环境中 process 可能不存在
  }
});

test('Buffer 构造函数本身', () => {
  return Buffer.isEncoding(Buffer) === false;
});

// JSON 相关测试
test('JSON 对象', () => {
  return Buffer.isEncoding(JSON) === false;
});

test('JSON.stringify 结果', () => {
  return Buffer.isEncoding(JSON.stringify({encoding: 'utf8'})) === false;
});

test('JSON.parse 结果对象', () => {
  const parsed = JSON.parse('{"encoding": "utf8"}');
  return Buffer.isEncoding(parsed) === false;
});

// Math 对象相关
test('Math 对象', () => {
  return Buffer.isEncoding(Math) === false;
});

test('Math.PI', () => {
  return Buffer.isEncoding(Math.PI) === false;
});

test('Math.E', () => {
  return Buffer.isEncoding(Math.E) === false;
});

// 日期和时间相关
test('特定日期对象', () => {
  return Buffer.isEncoding(new Date('2024-01-01')) === false;
});

test('无效日期对象', () => {
  return Buffer.isEncoding(new Date('invalid')) === false;
});

test('Date.now() 结果', () => {
  return Buffer.isEncoding(Date.now()) === false;
});

// 编码名的变形和相似字符串深度测试
test('unicode 小写 (不是编码名)', () => {
  return Buffer.isEncoding('unicode') === false;
});

test('encoding 单词本身', () => {
  return Buffer.isEncoding('encoding') === false;
});

test('charset 字符集名称', () => {
  return Buffer.isEncoding('charset') === false;
});

test('mime 类型字符串', () => {
  return Buffer.isEncoding('text/plain') === false;
});

// 相似但不正确的编码名
test('utf-16le (Node.js也支持这种格式)', () => {
  return Buffer.isEncoding('utf-16le') === true;
});

test('utf8le (错误后缀)', () => {
  return Buffer.isEncoding('utf8le') === false;
});

test('utf8be (错误后缀)', () => {
  return Buffer.isEncoding('utf8be') === false;
});

test('base32 (不支持的编码)', () => {
  return Buffer.isEncoding('base32') === false;
});

test('base58 (不支持的编码)', () => {
  return Buffer.isEncoding('base58') === false;
});

// 网络和 Web 相关字符串
test('http 协议名', () => {
  return Buffer.isEncoding('http') === false;
});

test('https 协议名', () => {
  return Buffer.isEncoding('https') === false;
});

test('ftp 协议名', () => {
  return Buffer.isEncoding('ftp') === false;
});

test('mime type charset', () => {
  return Buffer.isEncoding('text/html; charset=utf-8') === false;
});

// Node.js 特定对象和函数
test('require 函数 (如果存在)', () => {
  try {
    return Buffer.isEncoding(require) === false;
  } catch {
    return true; // 在某些环境中可能不存在
  }
});

test('module 对象 (如果存在)', () => {
  try {
    return Buffer.isEncoding(module) === false;
  } catch {
    return true;
  }
});

test('exports 对象 (如果存在)', () => {
  try {
    return Buffer.isEncoding(exports) === false;
  } catch {
    return true;
  }
});

// 特殊字符组合的编码相似名称
test('UTF‐8 (不同的连字符)', () => {
  return Buffer.isEncoding('UTF‐8') === false; // U+2010 HYPHEN
});

test('UTF−8 (负号)', () => {
  return Buffer.isEncoding('UTF−8') === false; // U+2212 MINUS SIGN
});

test('UTF—8 (em dash)', () => {
  return Buffer.isEncoding('UTF—8') === false; // U+2014 EM DASH
});

test('UTF–8 (en dash)', () => {
  return Buffer.isEncoding('UTF–8') === false; // U+2013 EN DASH
});

// 全角和半角字符混合
test('全角UTF8', () => {
  return Buffer.isEncoding('ＵＴＦ８') === false;
});

test('混合全角半角', () => {
  return Buffer.isEncoding('ＵＴＦ8') === false;
});

// 特殊标点和符号
test('编码名带引号', () => {
  return Buffer.isEncoding('"utf8"') === false;
});

test('编码名带单引号', () => {
  return Buffer.isEncoding("'utf8'") === false;
});

test('编码名带反引号', () => {
  return Buffer.isEncoding('`utf8`') === false;
});

test('编码名带括号', () => {
  return Buffer.isEncoding('(utf8)') === false;
});

test('编码名带方括号', () => {
  return Buffer.isEncoding('[utf8]') === false;
});

test('编码名带花括号', () => {
  return Buffer.isEncoding('{utf8}') === false;
});

// 环境特定测试
test('console 对象', () => {
  return Buffer.isEncoding(console) === false;
});

test('setTimeout 函数', () => {
  return Buffer.isEncoding(setTimeout) === false;
});

test('clearTimeout 函数', () => {
  return Buffer.isEncoding(clearTimeout) === false;
});

// 错误和异常对象的深度测试
test('自定义错误对象', () => {
  function CustomError() {
    this.message = 'utf8';
    this.name = 'CustomError';
  }
  // 直接使用简单的对象继承，避免使用Object.create
  CustomError.prototype.toString = function() {
    return this.message;
  };
  return Buffer.isEncoding(new CustomError()) === false;
});

test('语法错误对象', () => {
  return Buffer.isEncoding(new SyntaxError('utf8')) === false;
});

test('范围错误对象', () => {
  return Buffer.isEncoding(new RangeError('utf8')) === false;
});

// 特殊数值字符串
test('十六进制编码相似', () => {
  return Buffer.isEncoding('0x75746638') === false; // 'utf8' in hex
});

test('Base64 编码的 utf8', () => {
  return Buffer.isEncoding('dXRmOA==') === false; // base64 of 'utf8'
});

// 内置对象方法
test('Object.toString', () => {
  return Buffer.isEncoding(Object.prototype.toString) === false;
});

test('Array.isArray', () => {
  return Buffer.isEncoding(Array.isArray) === false;
});

test('String.fromCharCode', () => {
  return Buffer.isEncoding(String.fromCharCode) === false;
});

// 正则表达式复杂测试
test('复杂正则表达式', () => {
  const regex = /^(utf-?8|ascii|hex|base64)$/i;
  return Buffer.isEncoding(regex) === false;
});

test('正则匹配编码名', () => {
  const regex = /utf8/;
  return Buffer.isEncoding(regex.source) === true; // regex.source 是 'utf8'
});

// 最终一致性验证
test('与 Buffer 实例方法的一致性检查', () => {
  // 验证 Buffer.isEncoding 与 Buffer 实际编码行为的一致性
  const validEncodings = ['utf8', 'hex', 'base64', 'ascii', 'latin1', 'binary', 'utf16le', 'ucs2', 'base64url'];
  let consistent = true;
  
  for (const enc of validEncodings) {
    const isValidByCheck = Buffer.isEncoding(enc);
    let isValidByUsage = true;
    
    try {
      Buffer.from('test', enc);
    } catch (e) {
      isValidByUsage = false;
    }
    
    if (isValidByCheck !== isValidByUsage) {
      consistent = false;
      break;
    }
  }
  
  return consistent;
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
