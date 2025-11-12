// Buffer.isEncoding - part5: 字符串强制转换行为
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

// 可能被隐式转换为字符串的对象
test('具有 toString 方法的对象返回 utf8 应返回 false（对象不会自动转换）', () => {
  const obj = {
    toString: function() { return 'utf8'; }
  };
  return Buffer.isEncoding(obj) === false;
});

test('具有 toString 方法的对象返回 hex 应返回 false（对象不会自动转换）', () => {
  const obj = {
    toString: function() { return 'hex'; }
  };
  return Buffer.isEncoding(obj) === false;
});

test('具有 toString 方法的对象返回 unknown 应返回 false', () => {
  const obj = {
    toString: function() { return 'unknown'; }
  };
  return Buffer.isEncoding(obj) === false;
});

test('具有 toString 方法的对象返回空字符串应返回 false', () => {
  const obj = {
    toString: function() { return ''; }
  };
  return Buffer.isEncoding(obj) === false;
});

test('具有 toString 方法但返回数字的对象应返回 false', () => {
  const obj = {
    toString: function() { return 123; }
  };
  return Buffer.isEncoding(obj) === false;
});

test('具有 toString 方法但返回 null 的对象应返回 false', () => {
  const obj = {
    toString: function() { return null; }
  };
  return Buffer.isEncoding(obj) === false;
});

test('具有 toString 方法但抛出异常的对象应返回 false', () => {
  const obj = {
    toString: function() { throw new Error('toString error'); }
  };
  return Buffer.isEncoding(obj) === false;
});

// String 对象（包装器）
test('String 对象 new String("utf8") 应返回 false（对象不会自动转换）', () => {
  return Buffer.isEncoding(new String('utf8')) === false;
});

test('String 对象 new String("hex") 应返回 false（对象不会自动转换）', () => {
  return Buffer.isEncoding(new String('hex')) === false;
});

test('String 对象 new String("unknown") 应返回 false', () => {
  return Buffer.isEncoding(new String('unknown')) === false;
});

test('String 对象 new String("") 应返回 false', () => {
  return Buffer.isEncoding(new String('')) === false;
});

// valueOf 方法
test('具有 valueOf 和 toString 方法的对象应返回 false', () => {
  const obj = {
    valueOf: function() { return 'unknown'; },
    toString: function() { return 'utf8'; }
  };
  return Buffer.isEncoding(obj) === false;
});

// 特殊字符串表示
test('字符串 "null" 应返回 false', () => {
  return Buffer.isEncoding('null') === false;
});

test('字符串 "undefined" 应返回 false', () => {
  return Buffer.isEncoding('undefined') === false;
});

test('字符串 "NaN" 应返回 false', () => {
  return Buffer.isEncoding('NaN') === false;
});

test('字符串 "true" 应返回 false', () => {
  return Buffer.isEncoding('true') === false;
});

test('字符串 "false" 应返回 false', () => {
  return Buffer.isEncoding('false') === false;
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
