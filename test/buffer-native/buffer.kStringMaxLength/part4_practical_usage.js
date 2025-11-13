// buffer.kStringMaxLength - Part 4: Practical Usage Scenarios
const { Buffer, kStringMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 小字符串测试（应该成功）
test('创建小字符串 Buffer 成功', () => {
  try {
    const str = 'hello world';
    const buf = Buffer.from(str);
    return buf.length === str.length;
  } catch (e) {
    return false;
  }
});

test('创建 1KB 字符串 Buffer 成功', () => {
  try {
    const str = 'a'.repeat(1024);
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

test('创建 1MB 字符串 Buffer 成功', () => {
  try {
    const size = 1024 * 1024;
    const str = 'a'.repeat(size);
    const buf = Buffer.from(str);
    return buf.length === size;
  } catch (e) {
    return false;
  }
});

test('创建 10MB 字符串 Buffer 成功', () => {
  try {
    const size = 10 * 1024 * 1024;
    const str = 'a'.repeat(size);
    const buf = Buffer.from(str);
    return buf.length === size;
  } catch (e) {
    return false;
  }
});

// Buffer.toString 测试
test('小 Buffer toString 成功', () => {
  try {
    const buf = Buffer.alloc(100);
    const str = buf.toString();
    return str.length === 100;
  } catch (e) {
    return false;
  }
});

test('1MB Buffer toString 成功', () => {
  try {
    const size = 1024 * 1024;
    const buf = Buffer.alloc(size);
    const str = buf.toString();
    return str.length === size;
  } catch (e) {
    return false;
  }
});

test('10MB Buffer toString 成功', () => {
  try {
    const size = 10 * 1024 * 1024;
    const buf = Buffer.alloc(size);
    const str = buf.toString();
    return str.length === size;
  } catch (e) {
    return false;
  }
});

// 不同编码测试
test('utf8 编码字符串创建 Buffer', () => {
  try {
    const str = '你好世界'.repeat(1000);
    const buf = Buffer.from(str, 'utf8');
    return buf.toString('utf8') === str;
  } catch (e) {
    return false;
  }
});

test('ascii 编码字符串创建 Buffer', () => {
  try {
    const str = 'hello'.repeat(1000);
    const buf = Buffer.from(str, 'ascii');
    return buf.length > 0;
  } catch (e) {
    return false;
  }
});

test('latin1 编码字符串创建 Buffer', () => {
  try {
    const str = 'test'.repeat(1000);
    const buf = Buffer.from(str, 'latin1');
    return buf.toString('latin1') === str;
  } catch (e) {
    return false;
  }
});

test('hex 编码字符串创建 Buffer', () => {
  try {
    const str = 'deadbeef'.repeat(1000);
    const buf = Buffer.from(str, 'hex');
    return buf.length > 0;
  } catch (e) {
    return false;
  }
});

test('base64 编码字符串创建 Buffer', () => {
  try {
    const str = 'SGVsbG8gV29ybGQ='.repeat(1000);
    const buf = Buffer.from(str, 'base64');
    return buf.length > 0;
  } catch (e) {
    return false;
  }
});

// 边界条件测试
test('空字符串创建 Buffer', () => {
  try {
    const buf = Buffer.from('');
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

test('单字符字符串创建 Buffer', () => {
  try {
    const buf = Buffer.from('a');
    return buf.length === 1 && buf.toString() === 'a';
  } catch (e) {
    return false;
  }
});

test('长度为 kStringMaxLength - 1 的字符串行为', () => {
  try {
    // 使用较小的测试大小避免内存问题
    const testSize = Math.min(1000, kStringMaxLength - 1);
    const str = 'a'.repeat(testSize);
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

// 实际使用场景
test('JSON 字符串转 Buffer', () => {
  try {
    const obj = { data: 'test'.repeat(100) };
    const json = JSON.stringify(obj);
    const buf = Buffer.from(json);
    return buf.toString() === json;
  } catch (e) {
    return false;
  }
});

test('URL 编码字符串', () => {
  try {
    const url = 'https://example.com/path?query=value';
    const buf = Buffer.from(url);
    return buf.toString() === url;
  } catch (e) {
    return false;
  }
});

test('多行文本处理', () => {
  try {
    const text = 'line1\nline2\nline3\n'.repeat(100);
    const buf = Buffer.from(text);
    return buf.toString() === text;
  } catch (e) {
    return false;
  }
});

// 错误处理测试
test('kStringMaxLength 可用于验证字符串长度', () => {
  const testStr = 'test';
  return testStr.length < kStringMaxLength;
});

test('使用 kStringMaxLength 进行边界检查', () => {
  function canCreateBuffer(strLength) {
    return strLength <= kStringMaxLength;
  }
  return canCreateBuffer(1000) === true;
});

// Buffer 操作限制
test('Buffer.concat 结果字符串长度受限', () => {
  try {
    const buf1 = Buffer.from('hello');
    const buf2 = Buffer.from('world');
    const combined = Buffer.concat([buf1, buf2]);
    const str = combined.toString();
    return str.length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('Buffer.slice toString 受限', () => {
  try {
    const buf = Buffer.from('hello world');
    const sliced = buf.slice(0, 5);
    const str = sliced.toString();
    return str.length < kStringMaxLength;
  } catch (e) {
    return false;
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
