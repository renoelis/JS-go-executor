// Buffer.isEncoding - part8: 无参数和参数数量测试
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

// 无参数调用
test('无参数调用应返回 false', () => {
  return Buffer.isEncoding() === false;
});

// 多个参数（只使用第一个）
test('两个参数 utf8 和 hex 应只使用第一个返回 true', () => {
  return Buffer.isEncoding('utf8', 'hex') === true;
});

test('两个参数 hex 和 utf8 应只使用第一个返回 true', () => {
  return Buffer.isEncoding('hex', 'utf8') === true;
});

test('两个参数 unknown 和 utf8 应只使用第一个返回 false', () => {
  return Buffer.isEncoding('unknown', 'utf8') === false;
});

test('三个参数应只使用第一个', () => {
  return Buffer.isEncoding('utf8', 'hex', 'base64') === true;
});

test('多个参数第一个是 null 应返回 false', () => {
  return Buffer.isEncoding(null, 'utf8') === false;
});

test('多个参数第一个是 undefined 应返回 false', () => {
  return Buffer.isEncoding(undefined, 'utf8') === false;
});

// 参数为 arguments 对象
test('使用 arguments 对象调用应正确处理', () => {
  function testArgs() {
    return Buffer.isEncoding(arguments[0]);
  }
  return testArgs('utf8') === true;
});

test('使用 arguments 对象传入 null 应返回 false', () => {
  function testArgs() {
    return Buffer.isEncoding(arguments[0]);
  }
  return testArgs(null) === false;
});

test('使用 arguments 对象传入无参数应返回 false', () => {
  function testArgs() {
    return Buffer.isEncoding(arguments[0]);
  }
  return testArgs() === false;
});

// 使用 apply 和 call
test('使用 call 方法调用 isEncoding 传入 utf8', () => {
  return Buffer.isEncoding.call(Buffer, 'utf8') === true;
});

test('使用 call 方法调用 isEncoding 传入 null', () => {
  return Buffer.isEncoding.call(Buffer, null) === false;
});

test('使用 apply 方法调用 isEncoding 传入 utf8', () => {
  return Buffer.isEncoding.apply(Buffer, ['utf8']) === true;
});

test('使用 apply 方法调用 isEncoding 传入 hex', () => {
  return Buffer.isEncoding.apply(Buffer, ['hex']) === true;
});

test('使用 apply 方法调用 isEncoding 传入空数组', () => {
  return Buffer.isEncoding.apply(Buffer, []) === false;
});

test('使用 apply 方法调用 isEncoding 传入多个参数', () => {
  return Buffer.isEncoding.apply(Buffer, ['utf8', 'hex', 'base64']) === true;
});

// bind 测试
test('使用 bind 创建的函数应正常工作', () => {
  const boundIsEncoding = Buffer.isEncoding.bind(Buffer);
  return boundIsEncoding('utf8') === true;
});

test('使用 bind 创建的函数传入 hex 应返回 true', () => {
  const boundIsEncoding = Buffer.isEncoding.bind(Buffer);
  return boundIsEncoding('hex') === true;
});

test('使用 bind 创建的函数传入 null 应返回 false', () => {
  const boundIsEncoding = Buffer.isEncoding.bind(Buffer);
  return boundIsEncoding(null) === false;
});

test('使用 bind 预设参数应正确处理', () => {
  const boundIsEncodingUtf8 = Buffer.isEncoding.bind(Buffer, 'utf8');
  return boundIsEncodingUtf8() === true;
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
