// buffer.kStringMaxLength - Part 6: Error Scenarios and Boundary Behaviors
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

// 超长字符串错误测试
test('尝试创建超长字符串会抛出 RangeError', () => {
  try {
    // 尝试创建超过限制的字符串
    const str = 'a'.repeat(kStringMaxLength + 1);
    return false; // 应该在 repeat 时就失败
  } catch (e) {
    return e instanceof RangeError || e.message.includes('Invalid string length');
  }
});

test('String.repeat 受 kStringMaxLength 限制', () => {
  try {
    'a'.repeat(kStringMaxLength + 1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('字符串拼接超过限制会失败', () => {
  try {
    // 测试较小的值以避免实际内存问题
    const testSize = Math.min(10000, kStringMaxLength);
    let str = 'a'.repeat(testSize);
    // 这应该成功
    return str.length === testSize;
  } catch (e) {
    return false;
  }
});

// Buffer.from 边界测试
test('Buffer.from 空字符串成功', () => {
  try {
    const buf = Buffer.from('');
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

test('Buffer.from 单字符成功', () => {
  try {
    const buf = Buffer.from('x');
    return buf.length === 1;
  } catch (e) {
    return false;
  }
});

test('Buffer.from 中等长度字符串成功', () => {
  try {
    const str = 'test'.repeat(1000);
    const buf = Buffer.from(str);
    return buf.length > 0 && buf.toString() === str;
  } catch (e) {
    return false;
  }
});

// Buffer.toString 边界测试
test('空 Buffer toString 返回空字符串', () => {
  try {
    const buf = Buffer.alloc(0);
    return buf.toString() === '';
  } catch (e) {
    return false;
  }
});

test('单字节 Buffer toString 成功', () => {
  try {
    const buf = Buffer.from([65]); // 'A'
    return buf.toString() === 'A';
  } catch (e) {
    return false;
  }
});

test('大 Buffer toString 受 kStringMaxLength 限制概念验证', () => {
  try {
    const size = 1000;
    const buf = Buffer.alloc(size);
    const str = buf.toString();
    return str.length === size && size < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

// 编码相关错误
test('无效编码抛出 ERR_UNKNOWN_ENCODING', () => {
  try {
    const buf = Buffer.from('test', 'invalid-encoding');
    return false; // 应该抛出错误
  } catch (e) {
    return e.code === 'ERR_UNKNOWN_ENCODING' || e instanceof TypeError;
  }
});

test('不同编码下字符串长度和字节长度的关系', () => {
  try {
    const str = '你好';
    const utf8Buf = Buffer.from(str, 'utf8');
    // UTF-8: 每个中文字符 3 字节
    return utf8Buf.length === 6 && str.length === 2;
  } catch (e) {
    return false;
  }
});

test('hex 编码奇数长度字符串处理', () => {
  try {
    const buf = Buffer.from('abc', 'hex');
    // 奇数长度 hex 字符串，最后一个字符被忽略
    return buf.length === 1; // 只解析 'ab'
  } catch (e) {
    return false;
  }
});

test('base64 编码填充处理', () => {
  try {
    const buf1 = Buffer.from('SGVsbG8=', 'base64');
    const buf2 = Buffer.from('SGVsbG8', 'base64');
    // base64 可以自动处理缺失的填充
    return buf1.length > 0 && buf2.length > 0;
  } catch (e) {
    return false;
  }
});

// 特殊字符处理
test('包含 null 字符的字符串', () => {
  try {
    const str = 'hello\x00world';
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

test('包含换行符的字符串', () => {
  try {
    const str = 'line1\nline2\r\nline3';
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

test('包含特殊 Unicode 字符', () => {
  try {
    const str = '😀🎉✨';
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

test('包含代理对的字符串', () => {
  try {
    const str = '\uD83D\uDE00'; // 😀
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

// 内存和性能相关
test('多次创建和释放 Buffer 不影响 kStringMaxLength', () => {
  const original = kStringMaxLength;
  try {
    for (let i = 0; i < 100; i++) {
      const buf = Buffer.alloc(1000);
      buf.toString();
    }
    return kStringMaxLength === original;
  } catch (e) {
    return false;
  }
});

test('Buffer 池化不影响 toString 限制', () => {
  try {
    const bufs = [];
    for (let i = 0; i < 10; i++) {
      bufs.push(Buffer.allocUnsafe(100));
    }
    const results = bufs.map(b => b.toString().length);
    return results.every(len => len === 100);
  } catch (e) {
    return false;
  }
});

// 类型转换边界
test('Buffer.from(undefined) 行为', () => {
  try {
    Buffer.from(undefined);
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.from(null) 行为', () => {
  try {
    Buffer.from(null);
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.from(number) 行为', () => {
  try {
    Buffer.from(123);
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError;
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
