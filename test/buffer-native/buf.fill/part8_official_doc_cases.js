const { Buffer } = require('buffer');

// buf.fill() 官方文档用例测试
// 基于 Node.js v25.0.0 官方文档的所有示例和说明

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({
      name: name,
      status: result.pass ? '✅' : '❌',
      result: result
    });
  } catch (error) {
    tests.push({
      name: name,
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }
}

// === 官方文档示例 1: 基本填充 ===

test('官方示例 - 填充 ASCII 字符 h', () => {
  const b = Buffer.allocUnsafe(50).fill('h');
  return {
    pass: b.toString() === 'h'.repeat(50),
    expected: 'h'.repeat(50),
    actual: b.toString()
  };
});

test('官方示例 - 填充空字符串应填充 0', () => {
  const c = Buffer.allocUnsafe(5).fill('');
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: c.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(c).join(',')
  };
});

// === 官方文档示例 2: 多字节字符截断 ===

test('官方示例 - \\u0222 双字节字符截断', () => {
  const buf = Buffer.allocUnsafe(5).fill('\u0222');
  // 应该是 c8 a2 c8 a2 c8
  const expected = Buffer.from([0xc8, 0xa2, 0xc8, 0xa2, 0xc8]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 官方文档示例 3: 无效字符处理 ===

test('官方示例 - 填充单个字符 a', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('a');
  const expected = Buffer.from([0x61, 0x61, 0x61, 0x61, 0x61]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('官方示例 - 部分有效 hex 字符串 aazz', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('aazz', 'hex');
  // 应该截断到 aa，然后重复填充
  const expected = Buffer.from([0xaa, 0xaa, 0xaa, 0xaa, 0xaa]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('官方示例 - 完全无效 hex 字符串 zz 应抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('zz', 'hex');
    return {
      pass: false,
      expected: 'should throw exception',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value') || e.message.includes('hex'),
      expected: 'exception about invalid hex',
      actual: e.message
    };
  }
});

// === value 强制转换为 uint32 测试 ===

test('value 强制转换 - 大于 255 的数字使用 value & 255', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(256); // 256 & 255 = 0
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 强制转换 - 257 & 255 = 1', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(257);
  const expected = Buffer.from([1, 1, 1, 1, 1]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 强制转换 - 300 & 255 = 44', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(300);
  const expected = Buffer.from([44, 44, 44, 44, 44]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 强制转换 - 1000 & 255 = 232', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(1000);
  const expected = Buffer.from([232, 232, 232, 232, 232]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 空值强制转换为 0 测试 ===

test('空字符串强制转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('');
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('空 Uint8Array 应抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(new Uint8Array(0));
    return {
      pass: false,
      expected: 'should throw exception',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value'),
      expected: 'exception about invalid value',
      actual: e.message
    };
  }
});

test('空 Buffer 应抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(Buffer.alloc(0));
    return {
      pass: false,
      expected: 'should throw exception',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value'),
      expected: 'exception about invalid value',
      actual: e.message
    };
  }
});

// === 返回值测试 ===

test('fill 返回 Buffer 引用', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.fill(42);
  return {
    pass: result === buf,
    expected: 'same reference',
    actual: result === buf ? 'same reference' : 'different reference'
  };
});

// === offset 和 end 边界测试 ===

test('offset 和 end 未指定时填充整个 buffer', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x42);
  return {
    pass: buf.every(b => b === 0x42),
    expected: 'all bytes should be 0x42',
    actual: Array.from(buf).join(',')
  };
});

test('offset 为 0 时从头开始填充', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x42, 0);
  return {
    pass: buf.every(b => b === 0x42),
    expected: 'all bytes should be 0x42',
    actual: Array.from(buf).join(',')
  };
});

test('end 等于 buf.length 时填充到末尾', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x42, 0, buf.length);
  return {
    pass: buf.every(b => b === 0x42),
    expected: 'all bytes should be 0x42',
    actual: Array.from(buf).join(',')
  };
});

// === encoding 参数测试 ===

test('encoding 默认为 utf8', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  buf1.fill('hello', 0, 5);
  buf2.fill('hello', 0, 5, 'utf8');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: `buf1: ${buf1.toString('hex')}, buf2: ${buf2.toString('hex')}`
  };
});

test('encoding 支持 hex', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill('616263', 'hex'); // 'abc' in hex
  return {
    pass: buf.toString() === 'abcabc',
    expected: 'abcabc',
    actual: buf.toString()
  };
});

test('encoding 支持 base64', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill('YWJj', 'base64'); // 'abc' in base64
  return {
    pass: buf.toString().startsWith('abc'),
    expected: 'should start with abc',
    actual: buf.toString()
  };
});

// === 负数 offset/end 抛出 ERR_INDEX_OUT_OF_RANGE ===

test('负数 offset 应抛出 ERR_INDEX_OUT_OF_RANGE', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(1, -1);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('out of range') || e.message.includes('index'),
      expected: 'error about out of range',
      actual: e.message
    };
  }
});

test('负数 end 应抛出 ERR_INDEX_OUT_OF_RANGE', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(1, 0, -1);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('out of range') || e.message.includes('index'),
      expected: 'error about out of range',
      actual: e.message
    };
  }
});

// === 非零长度 buffer 填充零长度 buffer/Uint8Array 触发异常 ===

test('非零长度 buffer 填充零长度 buffer 触发异常', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(Buffer.alloc(0));
    return {
      pass: false,
      expected: 'should throw exception',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value'),
      expected: 'exception about invalid value',
      actual: e.message
    };
  }
});

test('非零长度 buffer 填充零长度 Uint8Array 触发异常', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(new Uint8Array(0));
    return {
      pass: false,
      expected: 'should throw exception',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value'),
      expected: 'exception about invalid value',
      actual: e.message
    };
  }
});

// === 无效字符串 value 触发异常 ===

test('无效 hex 编码字符串触发异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('gg', 'hex'); // 'gg' 不是有效的 hex
    return {
      pass: false,
      expected: 'should throw exception',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value') || e.message.includes('hex'),
      expected: 'exception about invalid value',
      actual: e.message
    };
  }
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
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
