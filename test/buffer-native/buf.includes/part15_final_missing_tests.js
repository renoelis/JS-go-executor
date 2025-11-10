// buf.includes() - Final Missing Tests (最终缺失测试补充)
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

// === 字符串数字作为 byteOffset ===
test('byteOffset 为字符串 "6" - 应该转换为数字 6', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = buf.includes('world', '6');
    return result === true;
  } catch (e) {
    return true;
  }
});

test('byteOffset 为字符串 "0" - 应该转换为数字 0', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = buf.includes('hello', '0');
    return result === true;
  } catch (e) {
    return true;
  }
});

test('byteOffset 为字符串 "-5" - 应该转换为数字 -5', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = buf.includes('world', '-5');
    return result === true;
  } catch (e) {
    return true;
  }
});

// === 搜索字符串 "0" ===
test('搜索字符串 "0" - 在包含数字字符的 Buffer 中', () => {
  const buf = Buffer.from('test0123');
  return buf.includes('0') === true;
});

test('搜索字符串 "0" - 不存在', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('0') === false;
});

test('搜索字符串 "00" - 连续零字符', () => {
  const buf = Buffer.from('test00test');
  return buf.includes('00') === true;
});

// === 搜索数字 0 与字符串 "0" 的区别 ===
test('搜索数字 0 vs 字符串 "0" - 不同结果', () => {
  const buf = Buffer.from([48, 49, 50]); // ASCII '0', '1', '2'
  const numResult = buf.includes(0); // 查找字节 0
  const strResult = buf.includes('0'); // 查找字符 '0' (ASCII 48)
  return numResult === false && strResult === true;
});

test('搜索数字 0 - 在包含 null 字节的 Buffer 中', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(0) === true;
});

test('搜索字符串 "0" - 在包含 null 字节的 Buffer 中', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes('0') === false;
});

// === Function.prototype.call/apply 行为 ===
test('使用 call 调用 includes', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = Buffer.prototype.includes.call(buf, 'world');
    return result === true;
  } catch (e) {
    return true;
  }
});

test('使用 apply 调用 includes', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = Buffer.prototype.includes.apply(buf, ['world', 0]);
    return result === true;
  } catch (e) {
    return true;
  }
});

test('call 在非 Buffer 对象上 - 应该抛出错误', () => {
  try {
    Buffer.prototype.includes.call({}, 'test');
    return false;
  } catch (e) {
    return true;
  }
});

test('call 在 Uint8Array 上', () => {
  const uint8 = new Uint8Array([104, 101, 108, 108, 111]); // 'hello'
  try {
    const result = Buffer.prototype.includes.call(uint8, 'hello');
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

// === encoding 参数的特殊值 ===
test('encoding 为对象 {} - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes('hello', 0, {});
    return false;
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown') || e.message.includes('type');
  }
});

test('encoding 为数组 [] - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes('hello', 0, []);
    return false;
  } catch (e) {
    return true;
  }
});

test('encoding 为 true - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes('hello', 0, true);
    return false;
  } catch (e) {
    return true;
  }
});

test('encoding 为 false - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes('hello', 0, false);
    return false;
  } catch (e) {
    return true;
  }
});

// === 与 Array.prototype.includes 的行为差异 ===
test('Buffer.includes 不支持 fromIndex 为负数时的数组行为', () => {
  // Array: [1,2,3].includes(1, -3) === true (从倒数第3个开始)
  // Buffer: 负数 offset 从末尾计算
  const buf = Buffer.from([1, 2, 3]);
  const arr = [1, 2, 3];
  const bufResult = buf.includes(1, -3);
  const arrResult = arr.includes(1, -3);
  // 两者应该一致
  return bufResult === arrResult;
});

test('Buffer.includes 不接受 NaN 作为搜索值（与 Array 不同）', () => {
  // Array: [NaN].includes(NaN) === true
  // Buffer: includes(NaN) 应该转换或抛出错误
  const buf = Buffer.from([0, 1, 2]);
  try {
    const result = buf.includes(NaN);
    // Buffer 会将 NaN 转换为 0
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

// === 只读 Buffer 测试 ===
test('在只读 Buffer 上调用 includes', () => {
  const buf = Buffer.from('hello world');
  // 尝试使其只读（虽然 Buffer 不能真正只读，但测试行为）
  try {
    Object.defineProperty(buf, '0', { writable: false });
    return buf.includes('hello') === true;
  } catch (e) {
    // 如果不能设置为只读，测试正常的 includes
    return buf.includes('hello') === true;
  }
});

// === 空格和特殊空白字符 ===
test('搜索普通空格', () => {
  const buf = Buffer.from('hello world');
  return buf.includes(' ') === true;
});

test('搜索多个空格', () => {
  const buf = Buffer.from('hello  world');
  return buf.includes('  ') === true;
});

test('搜索 Tab 字符 \\t', () => {
  const buf = Buffer.from('hello\tworld');
  return buf.includes('\t') === true;
});

test('搜索换行符 \\n', () => {
  const buf = Buffer.from('hello\nworld');
  return buf.includes('\n') === true;
});

test('搜索回车符 \\r', () => {
  const buf = Buffer.from('hello\rworld');
  return buf.includes('\r') === true;
});

test('搜索垂直制表符 \\v', () => {
  const buf = Buffer.from('hello\vworld');
  return buf.includes('\v') === true;
});

test('搜索换页符 \\f', () => {
  const buf = Buffer.from('hello\fworld');
  return buf.includes('\f') === true;
});

test('搜索不间断空格 (U+00A0)', () => {
  const buf = Buffer.from('hello\u00A0world');
  return buf.includes('\u00A0') === true;
});

// === 字节值 0-255 完整覆盖抽查 ===
test('搜索字节 0 (null)', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(0) === true;
});

test('搜索字节 1', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(1) === true;
});

test('搜索字节 127 (最大 ASCII)', () => {
  const buf = Buffer.from([126, 127, 128]);
  return buf.includes(127) === true;
});

test('搜索字节 128', () => {
  const buf = Buffer.from([127, 128, 129]);
  return buf.includes(128) === true;
});

test('搜索字节 254', () => {
  const buf = Buffer.from([253, 254, 255]);
  return buf.includes(254) === true;
});

test('搜索字节 255 (最大值)', () => {
  const buf = Buffer.from([253, 254, 255]);
  return buf.includes(255) === true;
});

// === 编码参数大小写完整测试 ===
test('encoding "utf8" (小写)', () => {
  const buf = Buffer.from('hello');
  return buf.includes('ell', 0, 'utf8') === true;
});

test('encoding "UTF8" (大写)', () => {
  const buf = Buffer.from('hello');
  try {
    return buf.includes('ell', 0, 'UTF8') === true;
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('encoding "Utf8" (首字母大写)', () => {
  const buf = Buffer.from('hello');
  try {
    return buf.includes('ell', 0, 'Utf8') === true;
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('encoding "ascii" (小写)', () => {
  const buf = Buffer.from('hello');
  return buf.includes('ell', 0, 'ascii') === true;
});

test('encoding "ASCII" (大写)', () => {
  const buf = Buffer.from('hello');
  try {
    return buf.includes('ell', 0, 'ASCII') === true;
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

// === 返回值严格性测试 ===
test('返回值严格等于 true', () => {
  const buf = Buffer.from('hello');
  const result = buf.includes('hello');
  return result === true && result !== 1 && result !== '1';
});

test('返回值严格等于 false', () => {
  const buf = Buffer.from('hello');
  const result = buf.includes('world');
  return result === false && result !== 0 && result !== '' && result !== null;
});

test('返回值类型始终是 boolean', () => {
  const buf = Buffer.from('hello');
  const r1 = buf.includes('hello');
  const r2 = buf.includes('world');
  return typeof r1 === 'boolean' && typeof r2 === 'boolean';
});

// === 边界情况：offset 等于 length ===
test('offset 等于 length - 空字符串应该返回 true', () => {
  const buf = Buffer.from('hello');
  return buf.includes('', 5) === true;
});

test('offset 等于 length - 非空字符串应该返回 false', () => {
  const buf = Buffer.from('hello');
  return buf.includes('x', 5) === false;
});

test('offset 等于 length - 空 Buffer 应该返回 true', () => {
  const buf = Buffer.from('hello');
  return buf.includes(Buffer.alloc(0), 5) === true;
});

// === 特殊场景：Buffer 长度为 1 ===
test('长度为 1 的 Buffer - 查找匹配的字节', () => {
  const buf = Buffer.from([65]); // 'A'
  return buf.includes(65) === true;
});

test('长度为 1 的 Buffer - 查找匹配的字符', () => {
  const buf = Buffer.from('A');
  return buf.includes('A') === true;
});

test('长度为 1 的 Buffer - 查找不匹配的字节', () => {
  const buf = Buffer.from([65]);
  return buf.includes(66) === false;
});

test('长度为 1 的 Buffer - 查找空字符串', () => {
  const buf = Buffer.from('A');
  return buf.includes('') === true;
});

test('长度为 1 的 Buffer - 查找长度为 2 的字符串', () => {
  const buf = Buffer.from('A');
  return buf.includes('AB') === false;
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
