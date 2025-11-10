// buf.fill() 最终补充测试
// 补充官方文档中提到但现有测试未完全覆盖的场景

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

// === 1. value 强制转换为 uint32 的边界测试 ===

test('value 为 256 应填充 0 (256 & 255 = 0)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(256);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 为 511 应填充 255 (511 & 255 = 255)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(511);
  const expected = Buffer.from([255, 255, 255, 255, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 为 512 应填充 0 (512 & 255 = 0)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(512);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 为 0xFFFFFFFF 应填充 255', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0xFFFFFFFF);
  const expected = Buffer.from([255, 255, 255, 255, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 2. 空值强制转换测试（官方文档明确说明） ===

test('空字符串应强制转换为 0', () => {
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

// === 3. 多字节字符精确截断测试 ===

test('\\u0222 在 5 字节缓冲区中的精确填充', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('\u0222');
  // \u0222 在 UTF-8 中是 0xC8 0xA2
  const expected = Buffer.from([0xc8, 0xa2, 0xc8, 0xa2, 0xc8]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('\\u0222 在 3 字节缓冲区中的截断', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.fill('\u0222');
  // 应该是 c8 a2 c8 (1.5 个字符)
  const expected = Buffer.from([0xc8, 0xa2, 0xc8]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('\\u0222 在 4 字节缓冲区中的填充', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill('\u0222');
  // 应该是 c8 a2 c8 a2 (2 个完整字符)
  const expected = Buffer.from([0xc8, 0xa2, 0xc8, 0xa2]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 4. hex 编码无效字符处理（官方示例） ===

test('hex 编码 "a" 应抛出异常（奇数长度）', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('a', 'hex');
    return {
      pass: false,
      expected: 'should throw exception for odd-length hex',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value'),
      expected: 'exception about invalid hex',
      actual: e.message
    };
  }
});

test('hex 编码 "aazz" 应截断到 "aa"', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('aazz', 'hex');
  // 'zz' 是无效的 hex，应该截断到 'aa'
  const expected = Buffer.from([0xaa, 0xaa, 0xaa, 0xaa, 0xaa]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('hex 编码 "zz" 应抛出异常（完全无效）', () => {
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
      pass: e.message.includes('invalid') || e.message.includes('hex') || e.message.includes('value'),
      expected: 'exception about invalid hex',
      actual: e.message
    };
  }
});

// === 5. offset/end 参数的边界组合 ===

test('offset 超出 buffer.length 应不填充', () => {
  const buf = Buffer.allocUnsafe(5);
  const original = Buffer.from(buf);
  buf.fill(0xFF, 10);
  return {
    pass: buf.equals(original),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

test('end 超出 buffer.length 应抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(0xFF, 0, 100);
    return {
      pass: false,
      expected: 'should throw exception for end > length',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('out of range'),
      expected: 'exception about out of range',
      actual: e.message
    };
  }
});

test('offset = end 应不填充', () => {
  const buf = Buffer.allocUnsafe(5);
  const original = Buffer.from(buf);
  buf.fill(0xFF, 3, 3);
  return {
    pass: buf.equals(original),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

test('offset > end 应不填充', () => {
  const buf = Buffer.allocUnsafe(5);
  const original = Buffer.from(buf);
  buf.fill(0xFF, 4, 2);
  return {
    pass: buf.equals(original),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

// === 6. 返回值验证 ===

test('fill 应返回原 buffer 引用', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.fill(0xFF);
  return {
    pass: result === buf,
    expected: 'same reference',
    actual: result === buf ? 'same reference' : 'different reference'
  };
});

test('链式调用应返回正确的 buffer', () => {
  const buf = Buffer.allocUnsafe(10);
  const result = buf.fill(1, 0, 5).fill(2, 5, 10);
  const expected = Buffer.from([1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
  return {
    pass: result === buf && buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 7. 编码参数位置测试（官方文档的不同签名） ===

test('fill(value, encoding) - 编码作为第二参数', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill('616263', 'hex');
  const expected = Buffer.from('abcabc');
  return {
    pass: buf.equals(expected),
    expected: expected.toString('hex'),
    actual: buf.toString('hex')
  };
});

test('fill(value, offset, encoding) - 编码作为第三参数', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('616263', 2, 'hex');
  const slice = buf.slice(2);
  return {
    pass: slice.toString().startsWith('abc'),
    expected: 'starts with abc',
    actual: slice.toString().substring(0, 6)
  };
});

test('fill(value, offset, end, encoding) - 编码作为第四参数', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('616263', 0, 6, 'hex');
  const slice = buf.slice(0, 6);
  const expected = Buffer.from('abcabc');
  return {
    pass: slice.equals(expected),
    expected: expected.toString('hex'),
    actual: slice.toString('hex')
  };
});

// === 8. 特殊编码测试 ===

test('utf8 编码（默认）应正确处理', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  buf1.fill('test');
  buf2.fill('test', 'utf8');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: `default: ${buf1.toString('hex')}, utf8: ${buf2.toString('hex')}`
  };
});

test('latin1 编码应正确处理高位字符', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('\xFF', 'latin1');
  const expected = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('ascii 编码应正确处理', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('test', 'ascii');
  return {
    pass: buf.toString('ascii').startsWith('test'),
    expected: 'starts with test',
    actual: buf.toString('ascii')
  };
});

// === 9. TypedArray 作为 value 的测试 ===

test('Uint8Array 作为 value 应正确填充', () => {
  const buf = Buffer.allocUnsafe(10);
  const arr = new Uint8Array([1, 2, 3]);
  buf.fill(arr);
  const expected = Buffer.from([1, 2, 3, 1, 2, 3, 1, 2, 3, 1]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('Int8Array 作为 value 应正确填充', () => {
  const buf = Buffer.allocUnsafe(10);
  const arr = new Int8Array([-1, -2, -3]);
  buf.fill(arr);
  // Int8Array 的负数会被转换为对应的无符号值
  const expected = Buffer.from([255, 254, 253, 255, 254, 253, 255, 254, 253, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 10. 零长度 buffer 填充测试 ===

test('零长度 buffer 填充应不抛出异常', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.fill(0xFF);
    return {
      pass: buf.length === 0,
      expected: 'zero length buffer',
      actual: `length: ${buf.length}`
    };
  } catch (e) {
    return {
      pass: false,
      expected: 'should not throw',
      actual: e.message
    };
  }
});

test('零长度 buffer 填充字符串应不抛出异常', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.fill('test');
    return {
      pass: buf.length === 0,
      expected: 'zero length buffer',
      actual: `length: ${buf.length}`
    };
  } catch (e) {
    return {
      pass: false,
      expected: 'should not throw',
      actual: e.message
    };
  }
});

// === 11. 负数 offset/end 错误测试 ===

test('负数 offset 应抛出 ERR_OUT_OF_RANGE', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0xFF, -1);
    return {
      pass: false,
      expected: 'should throw ERR_OUT_OF_RANGE',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('out of range') || e.message.includes('index'),
      expected: 'ERR_OUT_OF_RANGE or similar',
      actual: e.message
    };
  }
});

test('负数 end 应抛出 ERR_INDEX_OUT_OF_RANGE', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0xFF, 0, -1);
    return {
      pass: false,
      expected: 'should throw ERR_INDEX_OUT_OF_RANGE',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('out of range') || e.message.includes('index'),
      expected: 'ERR_INDEX_OUT_OF_RANGE or similar',
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
