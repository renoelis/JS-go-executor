// Buffer.isEncoding - part10: 返回值类型与严格性测试
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

// 返回值类型检查
test('utf8 返回值应是布尔类型 true', () => {
  const result = Buffer.isEncoding('utf8');
  return result === true && typeof result === 'boolean';
});

test('unknown 返回值应是布尔类型 false', () => {
  const result = Buffer.isEncoding('unknown');
  return result === false && typeof result === 'boolean';
});

test('null 返回值应是布尔类型 false', () => {
  const result = Buffer.isEncoding(null);
  return result === false && typeof result === 'boolean';
});

test('utf8 不应返回 truthy 值而是真正的 true', () => {
  const result = Buffer.isEncoding('utf8');
  return result === true && result !== 1;
});

test('unknown 不应返回 falsy 值而是真正的 false', () => {
  const result = Buffer.isEncoding('unknown');
  return result === false && result !== 0 && result !== null;
});

// 严格相等性测试
test('hex 使用 === 比较应返回 true', () => {
  return (Buffer.isEncoding('hex') === true) === true;
});

test('unknown 使用 === 比较应返回 false', () => {
  return (Buffer.isEncoding('unknown') === false) === true;
});

test('utf8 使用 == 比较应返回 true', () => {
  return (Buffer.isEncoding('utf8') == true) === true;
});

test('unknown 使用 == 比较应返回 false', () => {
  return (Buffer.isEncoding('unknown') == false) === true;
});

// 否定测试
test('!Buffer.isEncoding("unknown") 应为 true', () => {
  return !Buffer.isEncoding('unknown') === true;
});

test('!Buffer.isEncoding("utf8") 应为 false', () => {
  return !Buffer.isEncoding('utf8') === false;
});

test('!!Buffer.isEncoding("utf8") 应为 true', () => {
  return !!Buffer.isEncoding('utf8') === true;
});

test('!!Buffer.isEncoding("unknown") 应为 false', () => {
  return !!Buffer.isEncoding('unknown') === false;
});

// 条件语句中的使用
test('utf8 在 if 语句中应为真', () => {
  if (Buffer.isEncoding('utf8')) {
    return true;
  }
  return false;
});

test('unknown 在 if 语句中应为假', () => {
  if (Buffer.isEncoding('unknown')) {
    return false;
  }
  return true;
});

test('utf8 在三元运算符中应返回真值分支', () => {
  return Buffer.isEncoding('utf8') ? true : false;
});

test('unknown 在三元运算符中应返回假值分支', () => {
  return Buffer.isEncoding('unknown') ? false : true;
});

// 逻辑运算符
test('utf8 && true 应返回 true', () => {
  return (Buffer.isEncoding('utf8') && true) === true;
});

test('unknown || false 应返回 false', () => {
  return (Buffer.isEncoding('unknown') || false) === false;
});

test('utf8 || false 应返回 true', () => {
  return (Buffer.isEncoding('utf8') || false) === true;
});

test('unknown && true 应返回 false', () => {
  return (Buffer.isEncoding('unknown') && true) === false;
});

// 与其他类型比较
test('utf8 !== 1 应为 true', () => {
  return Buffer.isEncoding('utf8') !== 1;
});

test('unknown !== 0 应为 true', () => {
  return Buffer.isEncoding('unknown') !== 0;
});

test('utf8 !== "true" 应为 true', () => {
  return Buffer.isEncoding('utf8') !== 'true';
});

test('unknown !== "" 应为 true', () => {
  return Buffer.isEncoding('unknown') !== '';
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
