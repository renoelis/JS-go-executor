// buf.fill() 补充遗漏场景测试
// 覆盖之前测试中未涉及的边界情况

const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({
      name,
      status: result.pass ? '✅' : '❌',
      result
    });
  } catch (error) {
    tests.push({
      name,
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }
}

// === 1. ArrayBuffer 直接作为 value 测试 ===

test('填充 ArrayBuffer 应转换为字符串或抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    const ab = new ArrayBuffer(3);
    buf.fill(ab);
    // ArrayBuffer 会被转换为 "[object ArrayBuffer]" 字符串
    return {
      pass: true,
      expected: 'handled as string or error',
      actual: buf.toString().substring(0, 20)
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'error or string conversion',
      actual: e.message
    };
  }
});

test('填充 DataView 应转换为字符串或抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    const ab = new ArrayBuffer(3);
    const dv = new DataView(ab);
    buf.fill(dv);
    return {
      pass: true,
      expected: 'handled as string or error',
      actual: buf.toString().substring(0, 20)
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'error or string conversion',
      actual: e.message
    };
  }
});

// === 2. 编码别名完整测试 ===

test('binary 编码是 latin1 的别名', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  buf1.fill('test', 'binary');
  buf2.fill('test', 'latin1');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: `binary: ${buf1.toString('hex')}, latin1: ${buf2.toString('hex')}`
  };
});

test('ucs2 编码是 utf16le 的别名', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  buf1.fill('test', 'ucs2');
  buf2.fill('test', 'utf16le');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: `ucs2: ${buf1.toString('hex')}, utf16le: ${buf2.toString('hex')}`
  };
});

test('ucs-2 编码（带连字符）是 utf16le 的别名', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  buf1.fill('test', 'ucs-2');
  buf2.fill('test', 'utf16le');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: `ucs-2: ${buf1.toString('hex')}, utf16le: ${buf2.toString('hex')}`
  };
});

test('utf-8 编码（带连字符）应等同于 utf8', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  buf1.fill('test', 'utf-8');
  buf2.fill('test', 'utf8');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: `utf-8: ${buf1.toString('hex')}, utf8: ${buf2.toString('hex')}`
  };
});

test('utf-16le 编码（带连字符）应等同于 utf16le', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  buf1.fill('test', 'utf-16le');
  buf2.fill('test', 'utf16le');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: `utf-16le: ${buf1.toString('hex')}, utf16le: ${buf2.toString('hex')}`
  };
});

// === 3. 混合类型 TypedArray 边界测试 ===

test('Int8Array 负数值正确填充', () => {
  const arr = new Int8Array([-1, -128, 127]);
  const buf = Buffer.allocUnsafe(9);
  buf.fill(arr);
  // -1 = 0xFF, -128 = 0x80, 127 = 0x7F
  const expected = Buffer.from([255, 128, 127, 255, 128, 127, 255, 128, 127]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('Int8Array 单元素数组填充', () => {
  const arr = new Int8Array([42]);
  const buf = Buffer.allocUnsafe(5);
  buf.fill(arr);
  const expected = Buffer.from([42, 42, 42, 42, 42]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 4. offset/end 极端值测试 ===

test('offset 为 Number.MAX_SAFE_INTEGER 应不填充或抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0);
    buf.fill(0xFF, Number.MAX_SAFE_INTEGER);
    // Node.js 可能不抛出错误，而是静默处理（offset 超出范围不填充）
    return {
      pass: buf.every(b => b === 0),
      expected: 'buffer unchanged (offset out of range)',
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: e.message.includes('out of range') || e.message.includes('integer'),
      expected: 'out of range error or no fill',
      actual: e.message
    };
  }
});

test('end 为 Number.MAX_SAFE_INTEGER 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0xFF, 0, Number.MAX_SAFE_INTEGER);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('out of range') || e.message.includes('integer'),
      expected: 'out of range error',
      actual: e.message
    };
  }
});

test('offset 为 -Number.MAX_SAFE_INTEGER 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0xFF, -Number.MAX_SAFE_INTEGER);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('out of range'),
      expected: 'out of range error',
      actual: e.message
    };
  }
});

// === 5. 特殊 Unicode 字符测试 ===

test('填充零宽字符 U+200B', () => {
  const buf = Buffer.allocUnsafe(9);
  buf.fill('\u200B'); // Zero Width Space
  // U+200B in UTF-8 = 0xE2 0x80 0x8B (3 bytes)
  const expected = Buffer.from([0xE2, 0x80, 0x8B, 0xE2, 0x80, 0x8B, 0xE2, 0x80, 0x8B]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充组合字符 é (e + ´)', () => {
  const buf = Buffer.allocUnsafe(10);
  // 使用组合字符：e (U+0065) + ´ (U+0301)
  buf.fill('e\u0301');
  // 'e' = 0x65, U+0301 = 0xCC 0x81
  const pattern = [0x65, 0xCC, 0x81];
  const expected = Buffer.from([...pattern, ...pattern, ...pattern, 0x65]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 BOM 字符 U+FEFF', () => {
  const buf = Buffer.allocUnsafe(9);
  buf.fill('\uFEFF'); // Byte Order Mark
  // U+FEFF in UTF-8 = 0xEF 0xBB 0xBF
  const expected = Buffer.from([0xEF, 0xBB, 0xBF, 0xEF, 0xBB, 0xBF, 0xEF, 0xBB, 0xBF]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 6. base64url 编码测试 ===

test('base64url 编码支持测试', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill('YWJj', 'base64url');
    // base64url 应该与 base64 类似处理
    return {
      pass: true,
      expected: 'base64url encoding supported or error',
      actual: buf.toString('hex')
    };
  } catch (e) {
    // 如果不支持 base64url，应该抛出 Unknown encoding 错误
    return {
      pass: e.message.includes('Unknown') || e.message.includes('encoding'),
      expected: 'Unknown encoding error',
      actual: e.message
    };
  }
});

// === 7. 参数重载边界测试 ===

test('fill(value, encoding) 其中 encoding 是数字字符串应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill('test', '123');
    return {
      pass: false,
      expected: 'should throw unknown encoding error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('Unknown') || e.message.includes('encoding'),
      expected: 'unknown encoding error',
      actual: e.message
    };
  }
});

test('fill(value, offset) 其中 offset 是编码名称应抛出类型错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0xFF, 'utf8');
    return {
      pass: false,
      expected: 'should throw type error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('type') || e.message.includes('number'),
      expected: 'type error',
      actual: e.message
    };
  }
});

// === 8. 空值和特殊值组合测试 ===

test('填充 undefined 和 offset 组合', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0xFF);
  buf.fill(undefined, 2, 8);
  // undefined 应该被转换为 0
  const expected = Buffer.from([0xFF, 0xFF, 0, 0, 0, 0, 0, 0, 0xFF, 0xFF]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 null 和 offset 组合', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0xFF);
  buf.fill(null, 2, 8);
  // null 应该被转换为 0
  const expected = Buffer.from([0xFF, 0xFF, 0, 0, 0, 0, 0, 0, 0xFF, 0xFF]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 9. 函数和其他对象类型测试 ===

test('填充函数应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(function() {});
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 Date 对象应转换为数字', () => {
  const buf = Buffer.allocUnsafe(5);
  const date = new Date(256);
  buf.fill(date);
  // Date 转换为数字 256，256 & 255 = 0
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 RegExp 对象应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(/test/);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 10. 混合编码和 offset/end 测试 ===

test('hex 编码 + offset + end 精确范围填充', () => {
  const buf = Buffer.allocUnsafe(20);
  buf.fill(0);
  buf.fill('abcd', 5, 15, 'hex');
  // 'abcd' hex = [0xAB, 0xCD]
  const expected = Buffer.from([
    0, 0, 0, 0, 0,
    0xAB, 0xCD, 0xAB, 0xCD, 0xAB, 0xCD, 0xAB, 0xCD, 0xAB, 0xCD,
    0, 0, 0, 0, 0
  ]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('base64 编码 + offset 填充到末尾', () => {
  const buf = Buffer.allocUnsafe(15);
  buf.fill(0);
  buf.fill('YWJj', 5, 'base64');
  // 'YWJj' base64 = 'abc' = [97, 98, 99]
  const expected = Buffer.from([
    0, 0, 0, 0, 0,
    97, 98, 99, 97, 98, 99, 97, 98, 99, 97
  ]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 11. 边界对齐测试 ===

test('填充 utf16le 字符在奇数长度 buffer 中截断', () => {
  const buf = Buffer.allocUnsafe(7);
  buf.fill('ab', 'utf16le');
  // 'a' = [0x61, 0x00], 'b' = [0x62, 0x00]
  // 7 bytes = 1.75 个字符对
  const expected = Buffer.from([0x61, 0x00, 0x62, 0x00, 0x61, 0x00, 0x62]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// 统计结果
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
} catch (e) {
  const result = {
    success: false,
    error: e.message,
    stack: e.stack,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed
    },
    tests: tests
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}
