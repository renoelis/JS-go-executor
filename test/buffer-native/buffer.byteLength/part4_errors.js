// Buffer.byteLength() - Error Tests
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

// 无效输入类型
test('undefined 作为输入应抛出错误', () => {
  try {
    Buffer.byteLength(undefined);
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('string') || e.message.includes('Buffer') || e.message.includes('ArrayBuffer');
  }
});

test('null 作为输入应抛出错误', () => {
  try {
    Buffer.byteLength(null);
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('string') || e.message.includes('Buffer') || e.message.includes('ArrayBuffer');
  }
});

test('数字作为输入应抛出错误', () => {
  try {
    Buffer.byteLength(123);
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('string') || e.message.includes('Buffer') || e.message.includes('ArrayBuffer');
  }
});

test('布尔值作为输入应抛出错误', () => {
  try {
    Buffer.byteLength(true);
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('string') || e.message.includes('Buffer') || e.message.includes('ArrayBuffer');
  }
});

test('对象作为输入应抛出错误', () => {
  try {
    Buffer.byteLength({});
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('string') || e.message.includes('Buffer') || e.message.includes('ArrayBuffer');
  }
});

test('数组作为输入应抛出错误', () => {
  try {
    Buffer.byteLength([1, 2, 3]);
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('string') || e.message.includes('Buffer') || e.message.includes('ArrayBuffer');
  }
});

test('函数作为输入应抛出错误', () => {
  try {
    Buffer.byteLength(function() {});
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('string') || e.message.includes('Buffer') || e.message.includes('ArrayBuffer');
  }
});

test('Symbol 作为输入应抛出错误', () => {
  try {
    Buffer.byteLength(Symbol('test'));
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('string') || e.message.includes('Buffer') || e.message.includes('ArrayBuffer') || e.message.includes('symbol');
  }
});

// 无效编码（Node.js v25.0.0 会回退到默认 utf8，不抛出错误）
test('无效编码名称回退到 utf8', () => {
  const len = Buffer.byteLength('hello', 'invalid-encoding');
  // 无效编码会回退到 utf8
  return len === 5;
});

test('空字符串作为编码回退到 utf8', () => {
  const len = Buffer.byteLength('hello', '');
  // 空编码会回退到 utf8
  return len === 5;
});

test('数字作为编码回退到 utf8', () => {
  const len = Buffer.byteLength('hello', 123);
  // 数字编码会被转换为字符串或回退到 utf8
  return len === 5;
});

test('对象作为编码回退到 utf8', () => {
  const len = Buffer.byteLength('hello', {});
  // 对象编码会被转换为字符串或回退到 utf8
  return len === 5;
});

test('null 作为编码（应使用默认编码）', () => {
  const len = Buffer.byteLength('hello', null);
  // null 应该被处理为默认 utf8
  return len === 5;
});

test('undefined 作为编码（应使用默认编码）', () => {
  const len = Buffer.byteLength('hello', undefined);
  // undefined 应该使用默认 utf8
  return len === 5;
});

// 特殊字符串输入
test('包含 null 字节的字符串', () => {
  const len = Buffer.byteLength('hello\x00world');
  return len === 11;
});

test('包含非法 UTF-8 序列', () => {
  // 单独的高代理项
  const str = '\uD800';
  const len = Buffer.byteLength(str);
  // Node 会将其编码为替换字符
  return len >= 3;
});

test('包含非法 UTF-8 序列 - 低代理项', () => {
  const str = '\uDC00';
  const len = Buffer.byteLength(str);
  return len >= 3;
});

// 边界值测试
test('非常长的字符串', () => {
  const str = 'a'.repeat(1000000);
  const len = Buffer.byteLength(str);
  return len === 1000000;
});

test('非法 hex 字符', () => {
  const len = Buffer.byteLength('xyz', 'hex');
  // 'x' 是合法 hex 字符，'yz' 会被忽略，'x' 单个字符被忽略
  // 实际返回 1（可能 'x' 被解析为部分字节）
  return len === 1;
});

test('base64 包含非法字符', () => {
  const len = Buffer.byteLength('!!!', 'base64');
  // '!' 在某些实现中可能被部分解析
  return len === 2;
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
