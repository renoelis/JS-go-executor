// buf.compare() - Part 3: 错误处理和边界测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result.pass) {
      tests.push({ name, status: '✅', details: result.message });
    } else {
      tests.push({ name, status: '❌', details: result.message });
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// ============================================================================
// 1. 错误参数测试
// ============================================================================

test('无参数调用 - 应该抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare();
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('必需') || e.message.includes('required'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('传入 null - 应该抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(null);
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('Buffer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('传入 undefined - 应该抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(undefined);
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('Buffer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('传入字符串 - 应该抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare('test');
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('Buffer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('传入数字 - 应该抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(123);
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('Buffer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('传入普通对象 - 应该抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare({ length: 4 });
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('Buffer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

// ============================================================================
// 2. TypedArray 支持测试
// ============================================================================

test('与 Uint8Array 比较', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  const result = buf.compare(arr);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('与 Uint16Array 比较', () => {
  const buf = Buffer.from([0x01, 0x00, 0x02, 0x00]);
  const arr = new Uint16Array([1, 2]);
  const result = buf.compare(Buffer.from(arr.buffer));
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('与 Int8Array 比较', () => {
  const buf = Buffer.from([255, 254]);
  const arr = new Int8Array([-1, -2]);
  const result = buf.compare(Buffer.from(arr.buffer));
  return {
    pass: result === 0,
    message: `期望 0 (字节表示相同), 得到 ${result}`
  };
});

// ============================================================================
// 3. 特殊数值参数测试 - Node.js 会严格验证参数必须是整数
// ============================================================================

test('NaN 作为 targetStart - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, NaN, 5, 0, 5);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('integer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('Infinity 作为 targetEnd - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, 0, Infinity, 0, 5);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('integer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('-Infinity 作为 sourceStart - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, 0, 5, -Infinity, 5);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('integer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('小数作为索引参数 - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('ello');
  try {
    buf1.compare(buf2, 0.9, 4.9, 0.1, 4.1);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('integer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

// ============================================================================
// 4. 极端长度测试
// ============================================================================

test('单字节 buffer 比较', () => {
  const buf1 = Buffer.from([0x42]);
  const buf2 = Buffer.from([0x42]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('较大 buffer 比较 (1024 字节)', () => {
  const buf1 = Buffer.alloc(1024, 0xAA);
  const buf2 = Buffer.alloc(1024, 0xAA);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('较大 buffer 最后一个字节不同', () => {
  const buf1 = Buffer.alloc(1024, 0xAA);
  const buf2 = Buffer.alloc(1024, 0xAA);
  buf2[1023] = 0xBB;
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
  };
});

// ============================================================================
// 5. 不同编码的数据比较
// ============================================================================

test('UTF-8 编码的中文字符', () => {
  const buf1 = Buffer.from('你好世界', 'utf8');
  const buf2 = Buffer.from('你好世界', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('emoji 字符比较', () => {
  const buf1 = Buffer.from('😀😃😄', 'utf8');
  const buf2 = Buffer.from('😀😃😄', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('hex 编码比较', () => {
  const buf1 = Buffer.from('48656c6c6f', 'hex');
  const buf2 = Buffer.from('Hello', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('base64 编码比较', () => {
  const buf1 = Buffer.from('SGVsbG8=', 'base64');
  const buf2 = Buffer.from('Hello', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

// ============================================================================
// 6. 二进制数据比较
// ============================================================================

test('全零字节', () => {
  const buf1 = Buffer.alloc(10, 0x00);
  const buf2 = Buffer.alloc(10, 0x00);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('全 0xFF 字节', () => {
  const buf1 = Buffer.alloc(10, 0xFF);
  const buf2 = Buffer.alloc(10, 0xFF);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('混合二进制数据', () => {
  const buf1 = Buffer.from([0x00, 0xFF, 0x80, 0x7F, 0x01]);
  const buf2 = Buffer.from([0x00, 0xFF, 0x80, 0x7F, 0x01]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

// ============================================================================
// 输出结果
// ============================================================================

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

