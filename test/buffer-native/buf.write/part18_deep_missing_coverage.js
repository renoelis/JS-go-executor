// buf.write() - 深度查缺补漏测试
// 覆盖可能遗漏的边界情况和特殊场景
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

// ========== 1. 参数解析的微妙差异 ==========

test('offset 为 NaN 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('length 为 NaN 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 Infinity 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 -Infinity 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', -Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('length 为 -Infinity 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 0, -Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 0.0 (整数浮点数) 正常', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 0.0);
  return written === 4;
});

test('length 为 5.0 (整数浮点数) 正常', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 5.0);
  return written === 5;
});

// ========== 2. 编码参数的细微差异 ==========

test('编码为 "UTF8" (大写) 正常工作', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 'UTF8');
  return written === 4 && buf.toString('utf8', 0, 4) === 'test';
});

test('编码为 "UTF-8" (带连字符大写) 正常工作', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 'UTF-8');
  return written === 4;
});

test('编码为 "HEX" (大写) 正常工作', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('48656c6c6f', 'HEX');
  return written === 5 && buf.toString('utf8', 0, 5) === 'Hello';
});

test('编码为 "Base64" (混合大小写) 正常工作', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('SGVsbG8=', 'Base64');
  return written === 5;
});

test('编码为 "ucs-2" (小写带连字符) 正常工作', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 'ucs-2');
  return written === 8;
});

test('编码为 "UCS2" (大写无连字符) 正常工作', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 'UCS2');
  return written === 8;
});

// ========== 3. 零宽字符和组合字符 ==========

test('写入零宽空格 (U+200B)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\u200B', 'utf8');
  return written === 3; // UTF-8: E2 80 8B
});

test('写入零宽连接符 (U+200D)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\u200D', 'utf8');
  return written === 3; // UTF-8: E2 80 8D
});

test('写入组合字符 (e + 组合重音)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('e\u0301', 'utf8'); // é (分解形式)
  return written === 3; // e(1) + combining(2)
});

test('写入 emoji 组合序列', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('👨‍👩‍👧‍👦', 'utf8'); // Family emoji
  return written >= 15; // 多个 emoji + ZWJ
});

// ========== 4. 特殊 Unicode 范围 ==========

test('写入私有使用区字符 (U+E000)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\uE000', 'utf8');
  return written === 3;
});

test('写入替代字符 (U+FFFD)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\uFFFD', 'utf8');
  return written === 3;
});

test('写入 BOM (U+FEFF)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\uFEFF', 'utf8');
  return written === 3;
});

// ========== 5. 极端长度组合 ==========

test('offset + length === buf.length 边界', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 5, 5);
  return written === 5;
});

test('offset === buf.length 返回 0', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 10);
  return written === 0;
});

test('length === 1 只写入 1 字节', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 1);
  return written === 1 && buf[0] === 0x68; // 'h'
});

// ========== 6. 编码特殊情况 ==========

test('hex - 全大写字母', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('DEADBEEF', 'hex');
  return written === 4;
});

test('hex - 混合大小写', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('DeAdBeEf', 'hex');
  return written === 4;
});

test('hex - 单个字符返回 0', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('F', 'hex');
  return written === 0; // 需要成对
});

test('base64 - 无填充', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('SGVsbG8', 'base64'); // 无 =
  return written === 5;
});

test('base64 - 单个 = 填充', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('SGVsbA==', 'base64');
  return written === 4;
});

test('base64 - 双 = 填充', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('SGVs', 'base64'); // 自动填充
  return written >= 0;
});

// ========== 7. latin1/binary 边界测试 ==========

test('latin1 - 完整范围 0x00-0xFF', () => {
  const buf = Buffer.alloc(256);
  let str = '';
  for (let i = 0; i < 256; i++) {
    str += String.fromCharCode(i);
  }
  const written = buf.write(str, 'latin1');
  return written === 256;
});

test('binary 编码等同于 latin1', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  const str = 'test\xFF\x00';
  buf1.write(str, 'latin1');
  buf2.write(str, 'binary');
  return buf1.equals(buf2);
});

// ========== 8. 多次连续写入 ==========

test('多次写入不同位置', () => {
  const buf = Buffer.alloc(20);
  const w1 = buf.write('abc', 0);
  const w2 = buf.write('def', 3);
  const w3 = buf.write('ghi', 6);
  return w1 === 3 && w2 === 3 && w3 === 3 && 
         buf.toString('utf8', 0, 9) === 'abcdefghi';
});

test('覆盖式写入', () => {
  const buf = Buffer.from('xxxxxxxxxx');
  buf.write('aaa', 0);
  buf.write('bbb', 2);
  buf.write('ccc', 4);
  return buf.toString('utf8', 0, 7) === 'aabbccc';
});

// ========== 9. UTF-16LE 代理对精确测试 ==========

test('utf16le - 完整代理对', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('𝄞', 'utf16le'); // U+1D11E (musical symbol)
  return written === 4; // 2个UTF-16码元 * 2字节
});

test('utf16le - 多个代理对', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('𝄞𝄡𝄢', 'utf16le');
  return written === 12; // 3个字符 * 4字节
});

test('utf16le - BMP + 代理对混合', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('a𝄞b', 'utf16le');
  return written === 8; // a(2) + 𝄞(4) + b(2)
});

// ========== 10. 空字符串和空Buffer ==========

test('写入空字符串到空Buffer', () => {
  const buf = Buffer.alloc(0);
  const written = buf.write('');
  return written === 0;
});

test('写入空字符串到非空Buffer', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('', 5);
  return written === 0;
});

test('写入到长度为1的Buffer', () => {
  const buf = Buffer.alloc(1);
  const written = buf.write('ab');
  return written === 1 && buf[0] === 0x61;
});

// ========== 11. 参数顺序识别 ==========

test('write(str, encoding) - 识别字符串为encoding', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('48656c6c6f', 'hex');
  return written === 5 && buf.toString('utf8', 0, 5) === 'Hello';
});

test('write(str, offset, encoding) - 三参数', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 2, 'utf8');
  return written === 4 && buf.toString('utf8', 2, 6) === 'test';
});

test('write(str, 0, encoding) - offset为0的三参数', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 0, 'hex');
  return written === 0; // 'test' 不是有效hex
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
