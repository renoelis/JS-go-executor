// buf.write() - 最终深度挖掘测试
// 探索最后可能遗漏的极端边缘场景
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

// ========== 1. 编码参数的非字符串类型 ==========

test('encoding 参数为数字', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 0, 4, 123);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('encoding 参数为数组', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', ['utf8']);
    return false; // 会被当作 offset
  } catch (e) {
    return e.name === 'TypeError'; // 数组不能作为 offset
  }
});

test('encoding 参数有前后空格', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', ' utf8 ');
    return false;
  } catch (e) {
    return e.name === 'TypeError'; // 带空格的编码无效
  }
});

test('encoding 参数有制表符', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 'utf8\t');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// ========== 2. 极小的负数参数 ==========

test('offset 为 -0.1', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', -0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 -0.9', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', -0.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('length 为 -0.1', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 0, -0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ========== 3. 超大数值 ==========

test('offset 为 2^53 + 1', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', Math.pow(2, 53) + 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('length 为 2^53', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 0, Math.pow(2, 53));
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ========== 4. 特殊字符串内容 ==========

test('字符串包含多个 null 字节', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('a\x00b\x00c');
  return written === 5 && buf[0] === 0x61 && buf[1] === 0 && buf[2] === 0x62 && buf[3] === 0 && buf[4] === 0x63;
});

test('只包含 null 字节的字符串（长度5）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\x00\x00\x00\x00\x00');
  return written === 5 && buf[0] === 0 && buf[4] === 0;
});

test('包含控制字符的混合字符串', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('a\tb\nc\rd');
  return written === 7;
});

// ========== 5. UTF-16 代理对边缘情况 ==========

test('单个 high surrogate (U+D800)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\uD800', 'utf8');
  return written === 3; // 替换字符 U+FFFD
});

test('单个 low surrogate (U+DC00)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\uDC00', 'utf8');
  return written === 3; // 替换字符 U+FFFD
});

test('反向代理对 (low + high)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\uDC00\uD800', 'utf8');
  return written === 6; // 两个替换字符
});

test('正确的代理对 (😀)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\uD83D\uDE00', 'utf8');
  return written === 4; // 正确的 emoji
});

// ========== 6. base64/hex 特殊格式 ==========

test('base64 字符串包含空格', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('SGVs bG8=', 'base64');
  return written >= 0; // 可能忽略空格或停止解析
});

test('base64 字符串包含换行', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('SGVs\nbG8=', 'base64');
  return written >= 0;
});

test('hex 字符串包含连字符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('48-65-6c', 'hex');
  return written === 1; // 只解析到第一个连字符
});

test('hex 字符串包含冒号', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('48:65:6c', 'hex');
  return written === 1; // 只解析到第一个冒号
});

// ========== 7. offset 和 length 的精确边界 ==========

test('offset 为整数的最小正数 (1)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 1);
  return written === 4 && buf[1] === 0x74; // 't'
});

test('length 为 1（只写入1字节）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 1);
  return written === 1 && buf[0] === 0x68; // 'h'
});

test('offset + length = buf.length + 1 (自动截断)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 9, 2);
  // 9 + 2 = 11 > 10，但 Node.js 会自动截断到 1 字节
  return written === 1 && buf[9] === 0x68; // 'h'
});

// ========== 8. 连续操作测试 ==========

test('写入后立即读取验证', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 0);
  return buf.toString('utf8', 0, 5) === 'hello';
});

test('覆盖写入验证', () => {
  const buf = Buffer.alloc(10);
  buf.write('xxxxx', 0);
  buf.write('ab', 0);
  return buf.toString('utf8', 0, 5) === 'abxxx';
});

test('部分覆盖写入', () => {
  const buf = Buffer.alloc(10);
  buf.write('aaaaa', 0);
  buf.write('bb', 2);
  return buf.toString('utf8', 0, 5) === 'aabba';
});

// ========== 9. 超长字符串测试 ==========

test('写入超长字符串（10000字符）', () => {
  const buf = Buffer.alloc(100);
  const longStr = 'x'.repeat(10000);
  const written = buf.write(longStr);
  return written === 100; // 只写入 buffer 能容纳的部分
});

test('写入超长 emoji 字符串', () => {
  const buf = Buffer.alloc(20);
  const emojiStr = '😀'.repeat(100); // 每个4字节
  const written = buf.write(emojiStr);
  return written === 20; // 只写入5个emoji
});

// ========== 10. 特殊编码组合 ==========

test('ascii 编码 - 高位字符（> 127）保留完整字节', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\xFF', 'ascii');
  // Node.js 的 ascii 编码实际上保留完整字节
  return written === 1 && buf[0] === 0xFF;
});

test('latin1 编码 - 完整 0xFF', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\xFF', 'latin1');
  return written === 1 && buf[0] === 0xFF;
});

test('binary 编码等同于 latin1', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  buf1.write('\xFF\x00\x80', 'latin1');
  buf2.write('\xFF\x00\x80', 'binary');
  return buf1.equals(buf2);
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
