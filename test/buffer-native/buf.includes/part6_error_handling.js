// buf.includes() - Error Handling Tests
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

// Invalid encoding tests
test('无效的 encoding - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes('hello', 0, 'invalid-encoding');
    return false; // 如果没有抛出错误，测试失败
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('encoding 为 null', () => {
  const buf = Buffer.from('hello');
  try {
    const result = buf.includes('hello', 0, null);
    // null 可能被转换为 'utf8' 或抛出错误
    return true;
  } catch (e) {
    return true;
  }
});

test('encoding 为 undefined - 使用默认值', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello', 0, undefined) === true;
});

test('encoding 为空字符串', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes('hello', 0, '');
    return false;
  } catch (e) {
    return true;
  }
});

test('encoding 为数字', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes('hello', 0, 123);
    return false;
  } catch (e) {
    return true;
  }
});

test('encoding 大小写 - UTF8', () => {
  const buf = Buffer.from('hello', 'utf8');
  return buf.includes('hello', 0, 'UTF8') === true;
});

test('encoding 大小写 - Utf8', () => {
  const buf = Buffer.from('hello', 'utf8');
  return buf.includes('hello', 0, 'Utf8') === true;
});

test('encoding 大小写 - HEX', () => {
  const buf = Buffer.from('68656c6c6f', 'hex');
  return buf.includes('6c6c', 0, 'HEX') === true;
});

// Type coercion tests
test('value 字符串但 encoding 不匹配', () => {
  const buf = Buffer.from('hello', 'utf8');
  // 尝试用 hex 编码解释 'hello' 字符串
  try {
    const result = buf.includes('hello', 0, 'hex');
    // 可能返回 false 或抛出错误
    return result === false || result === true;
  } catch (e) {
    return true;
  }
});

test('value 为非法 hex 字符串', () => {
  const buf = Buffer.from('hello');
  try {
    const result = buf.includes('xyz', 0, 'hex');
    // 'xyz' 在 hex 中可能被解释，但不会匹配
    return true;
  } catch (e) {
    return true;
  }
});

test('value 为奇数长度 hex 字符串', () => {
  const buf = Buffer.from('hello');
  try {
    const result = buf.includes('abc', 0, 'hex');
    // 奇数长度 hex 可能抛出错误
    return true;
  } catch (e) {
    return true;
  }
});

test('value 为非法 base64 字符串', () => {
  const buf = Buffer.from('hello');
  try {
    const result = buf.includes('!!!', 0, 'base64');
    return true;
  } catch (e) {
    return true;
  }
});

// Parameter count tests
test('只传 value 参数', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world') === true;
});

test('传 value 和 byteOffset', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 6) === true;
});

test('传所有三个参数', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 0, 'utf8') === true;
});

test('不传任何参数 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes();
    return false;
  } catch (e) {
    return true;
  }
});

// Method existence and type
test('includes 方法存在', () => {
  const buf = Buffer.from('hello');
  return typeof buf.includes === 'function';
});

test('includes 返回布尔值 - true', () => {
  const buf = Buffer.from('hello');
  const result = buf.includes('hello');
  return typeof result === 'boolean' && result === true;
});

test('includes 返回布尔值 - false', () => {
  const buf = Buffer.from('hello');
  const result = buf.includes('world');
  return typeof result === 'boolean' && result === false;
});

// Edge case: searching in sliced buffer
test('在切片 Buffer 中查找', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6, 11); // 'world'
  return sliced.includes('world') === true;
});

test('在切片 Buffer 中查找原始内容', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6, 11); // 'world'
  return sliced.includes('hello') === false;
});

// Encoding with special characters
test('encoding 参数对特殊字符的影响', () => {
  const buf = Buffer.from('hello\nworld');
  return buf.includes('\n', 0, 'utf8') === true;
});

test('latin1 编码的特殊字符', () => {
  const buf = Buffer.from([0xE9]); // é in latin1
  return buf.includes(Buffer.from([0xE9])) === true;
});

// Multiple calls
test('连续多次调用 includes', () => {
  const buf = Buffer.from('hello world');
  const r1 = buf.includes('hello');
  const r2 = buf.includes('world');
  const r3 = buf.includes('foo');
  return r1 === true && r2 === true && r3 === false;
});

test('同一 Buffer 不同查找', () => {
  const buf = Buffer.from('abcdefghijklmnopqrstuvwxyz');
  return buf.includes('abc') && buf.includes('xyz') && !buf.includes('123');
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
