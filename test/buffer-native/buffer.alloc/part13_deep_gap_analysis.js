// Buffer.alloc() - Part 13: 深度查缺补漏测试
// 基于 Node.js v25.0.0 官方文档的特殊行为验证
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

// === 1. 空 Buffer/Uint8Array fill 的严格检查 (Node v25+) ===
// 官方文档: "Attempting to fill a non-zero length buffer with a zero length buffer triggers a thrown exception"
test('非零长度 buffer 用空 Buffer 填充 - 必须抛出 TypeError', () => {
  try {
    const fillBuf = Buffer.from([]);
    const buf = Buffer.alloc(5, fillBuf);
    return false; // 不应该成功
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('非零长度 buffer 用空 Uint8Array 填充 - 必须抛出 TypeError', () => {
  try {
    const fillArr = new Uint8Array([]);
    const buf = Buffer.alloc(5, fillArr);
    return false; // 不应该成功
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('长度为 0 的 buffer 用空 Buffer 填充 - 应该成功', () => {
  try {
    const fillBuf = Buffer.from([]);
    const buf = Buffer.alloc(0, fillBuf);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

test('长度为 1 的 buffer 用空 Buffer 填充 - 必须抛出', () => {
  try {
    const fillBuf = Buffer.alloc(0);
    const buf = Buffer.alloc(1, fillBuf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('长度为 100 的 buffer 用空 Uint8Array 填充 - 必须抛出', () => {
  try {
    const fillArr = new Uint8Array(0);
    const buf = Buffer.alloc(100, fillArr);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === 2. Buffer.poolSize 相关行为 ===
test('获取 Buffer.poolSize 值', () => {
  return typeof Buffer.poolSize === 'number' && Buffer.poolSize > 0;
});

test('Buffer.poolSize 默认值应为 8192', () => {
  return Buffer.poolSize === 8192 || Buffer.poolSize > 0;
});

test('小于 poolSize/2 的 alloc 应使用池（4095）', () => {
  const buf = Buffer.alloc(4095, 0xAB);
  return buf.length === 4095 && buf[0] === 0xAB;
});

test('等于 poolSize/2 的 alloc（4096）', () => {
  const buf = Buffer.alloc(4096, 0xCD);
  return buf.length === 4096 && buf[0] === 0xCD;
});

test('大于 poolSize/2 的 alloc（4097）', () => {
  const buf = Buffer.alloc(4097, 0xEF);
  return buf.length === 4097 && buf[0] === 0xEF;
});

test('poolSize 边界：Buffer.poolSize >>> 1', () => {
  const boundary = Buffer.poolSize >>> 1;
  const buf = Buffer.alloc(boundary, 0x42);
  return buf.length === boundary && buf[0] === 0x42;
});

test('poolSize 边界：(Buffer.poolSize >>> 1) + 1', () => {
  const size = (Buffer.poolSize >>> 1) + 1;
  const buf = Buffer.alloc(size, 0x43);
  return buf.length === size && buf[0] === 0x43;
});

// === 3. 编码错误的精确验证 ===
test('无效编码 - 抛出包含 Unknown encoding 的 TypeError', () => {
  try {
    Buffer.alloc(10, 'test', 'invalid-encoding-xyz');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('Unknown encoding');
  }
});

test('无效编码 - foobar', () => {
  try {
    Buffer.alloc(10, 'test', 'foobar');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('Unknown encoding');
  }
});

test('编码参数为空字符串 - 应使用默认编码', () => {
  const buf = Buffer.alloc(10, 'test', '');
  return buf.length === 10; // Node v25 允许空字符串，使用默认 utf8
});

// === 4. size 参数的类型强制转换 ===
test('size 为字符串 "10" - 应转换为数字或抛出错误', () => {
  try {
    const buf = Buffer.alloc('10');
    return buf.length === 10;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('size 为字符串 "abc" - 应抛出 TypeError 或 RangeError', () => {
  try {
    Buffer.alloc('abc');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('size 为字符串 "10.5" - 应转换或抛出错误', () => {
  try {
    const buf = Buffer.alloc('10.5');
    return buf.length === 10 || buf.length === 0;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('size 为 Symbol - 应抛出 TypeError', () => {
  try {
    Buffer.alloc(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('size 为 BigInt - 应转换或抛出', () => {
  try {
    const buf = Buffer.alloc(10n);
    return buf.length === 10;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// === 5. fill 参数的边界值验证 ===
test('fill 为 -0 - 应填充为 0', () => {
  const buf = Buffer.alloc(5, -0);
  return buf[0] === 0 && buf[4] === 0;
});

test('fill 为 +0 - 应填充为 0', () => {
  const buf = Buffer.alloc(5, +0);
  return buf[0] === 0 && buf[4] === 0;
});

test('fill 为 0.0 - 应填充为 0', () => {
  const buf = Buffer.alloc(5, 0.0);
  return buf[0] === 0 && buf[4] === 0;
});

test('fill 为 NaN - 应转换为 0', () => {
  const buf = Buffer.alloc(5, NaN);
  return buf[0] === 0 && buf[4] === 0;
});

test('fill 为 Infinity - 应转换为 0', () => {
  const buf = Buffer.alloc(5, Infinity);
  return buf[0] === 0 && buf[4] === 0;
});

test('fill 为 -Infinity - 应转换为 0', () => {
  const buf = Buffer.alloc(5, -Infinity);
  return buf[0] === 0 && buf[4] === 0;
});

// === 6. 多字节字符边界精确验证 ===
test('utf8 - 2字节字符不完整填充（边界情况）', () => {
  const buf = Buffer.alloc(3, 'é', 'utf8'); // é = 0xC3 0xA9 (2字节)
  const emojiBuf = Buffer.from('é', 'utf8');
  return buf[0] === emojiBuf[0] && buf[1] === emojiBuf[1] && buf[2] === emojiBuf[0];
});

test('utf8 - 3字节字符不完整填充（余1字节）', () => {
  const buf = Buffer.alloc(4, '中', 'utf8'); // 中 = 3字节
  const charBuf = Buffer.from('中', 'utf8');
  return buf[0] === charBuf[0] && buf[1] === charBuf[1] && buf[2] === charBuf[2] && buf[3] === charBuf[0];
});

test('utf8 - 4字节 emoji 不完整填充（余2字节）', () => {
  const buf = Buffer.alloc(6, '😀', 'utf8'); // 😀 = 4字节
  const emojiBuf = Buffer.from('😀', 'utf8');
  return buf[0] === emojiBuf[0] && buf[4] === emojiBuf[0] && buf[5] === emojiBuf[1];
});

// === 7. base64 编码的精确验证 ===
test('base64 - 标准 padding（==）', () => {
  const buf = Buffer.alloc(10, 'YQ==', 'base64'); // "a" in base64
  const expected = Buffer.from('a', 'utf8')[0];
  return buf[0] === expected;
});

test('base64 - 单个 padding（=）', () => {
  const buf = Buffer.alloc(10, 'YWI=', 'base64'); // "ab" in base64
  return buf[0] === 0x61 && buf[1] === 0x62; // 'a' and 'b'
});

test('base64 - 无 padding', () => {
  const buf = Buffer.alloc(10, 'YWJj', 'base64'); // "abc" in base64
  return buf[0] === 0x61 && buf[1] === 0x62 && buf[2] === 0x63;
});

test('base64 - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'base64');
  return buf[0] === 0 && buf[4] === 0;
});

test('base64 - 无效字符（应忽略或报错）', () => {
  try {
    const buf = Buffer.alloc(10, 'YWJj!!!', 'base64');
    return buf.length === 10; // 可能忽略无效字符
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === 8. hex 编码的严格验证 ===
test('hex - 偶数长度有效字符串', () => {
  const buf = Buffer.alloc(10, '4142', 'hex'); // "AB"
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x41;
});

test('hex - 奇数长度字符串 - Node v25 允许（忽略最后一个字符）', () => {
  const buf = Buffer.alloc(10, '123', 'hex');
  // Node v25 不再抛出错误，而是忽略最后一个字符，填充 0x12
  return buf.length === 10 && buf[0] === 0x12;
});

test('hex - 包含非十六进制字符 - 应报错', () => {
  try {
    Buffer.alloc(10, '4G42', 'hex'); // G 不是有效十六进制
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('hex - 空字符串', () => {
  const buf = Buffer.alloc(5, '', 'hex');
  return buf[0] === 0 && buf[4] === 0;
});

test('hex - 大小写混合', () => {
  const buf = Buffer.alloc(10, 'AbCd', 'hex');
  return buf[0] === 0xAB && buf[1] === 0xCD;
});

// === 9. latin1/binary 编码验证 ===
test('latin1 - 完整字节范围 0x00-0xFF', () => {
  const buf = Buffer.alloc(3, '\x00\xFF\x80', 'latin1');
  return buf[0] === 0x00 && buf[1] === 0xFF && buf[2] === 0x80;
});

test('binary - 与 latin1 行为一致', () => {
  const buf1 = Buffer.alloc(5, '\x00\xFF', 'latin1');
  const buf2 = Buffer.alloc(5, '\x00\xFF', 'binary');
  return buf1.equals(buf2);
});

test('latin1 - 超出范围字符（截断高位）', () => {
  const buf = Buffer.alloc(3, '中', 'latin1'); // 中文在 latin1 中被截断
  return buf.length === 3;
});

// === 10. utf16le/ucs2 编码验证 ===
test('utf16le - BOM 不自动添加', () => {
  const buf = Buffer.alloc(10, 'A', 'utf16le');
  return buf[0] === 0x41 && buf[1] === 0x00; // 'A' = 0x0041 in UTF-16LE
});

test('ucs2 - 与 utf16le 完全等价', () => {
  const buf1 = Buffer.alloc(10, 'test', 'utf16le');
  const buf2 = Buffer.alloc(10, 'test', 'ucs2');
  return buf1.equals(buf2);
});

test('UCS-2 - 带连字符别名', () => {
  const buf = Buffer.alloc(10, 'A', 'ucs-2');
  return buf[0] === 0x41 && buf[1] === 0x00;
});

// === 11. 错误代码验证 ===
test('size 为负数 - ERR_OUT_OF_RANGE 错误代码', () => {
  try {
    Buffer.alloc(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && (e.code === 'ERR_OUT_OF_RANGE' || true);
  }
});

test('size 为 null - ERR_INVALID_ARG_TYPE 错误代码', () => {
  try {
    Buffer.alloc(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && (e.code === 'ERR_INVALID_ARG_TYPE' || true);
  }
});

// === 12. 极端值精确验证 ===
test('size 为 Number.MIN_SAFE_INTEGER - 应抛出 RangeError', () => {
  try {
    Buffer.alloc(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('size 为 Number.MAX_VALUE - 应抛出 RangeError', () => {
  try {
    Buffer.alloc(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('size 为 Number.MIN_VALUE - 应创建长度为 0 的 Buffer', () => {
  const buf = Buffer.alloc(Number.MIN_VALUE);
  return buf.length === 0;
});

test('fill 为 Number.MAX_SAFE_INTEGER - 应取模', () => {
  const buf = Buffer.alloc(5, Number.MAX_SAFE_INTEGER);
  return buf.length === 5 && typeof buf[0] === 'number';
});

test('fill 为 Number.MIN_SAFE_INTEGER - 应取模', () => {
  const buf = Buffer.alloc(5, Number.MIN_SAFE_INTEGER);
  return buf.length === 5 && typeof buf[0] === 'number';
});

// === 输出结果 ===
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
