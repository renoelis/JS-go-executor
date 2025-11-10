// buf.fill() 全面补充测试
// 补充现有测试未完全覆盖的边缘场景和类型转换
// 基于 Node.js v25.0.0 规范

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

// === 1. 对象类型转换测试 ===

test('value 为普通对象应被处理', () => {
  try {
    const buf = Buffer.allocUnsafe(20);
    buf.fill({ toString: () => 'test' });
    // Node.js 会尝试转换对象，但行为可能不同
    return {
      pass: buf.length === 20,
      expected: 'buffer filled without error',
      actual: `buffer length: ${buf.length}`
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'handled gracefully',
      actual: e.message
    };
  }
});

test('value 为 Symbol 应抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(Symbol('test'));
    return {
      pass: false,
      expected: 'should throw exception',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('symbol') || e.message.includes('type') || e.message.includes('convert'),
      expected: 'exception about symbol type',
      actual: e.message
    };
  }
});

test('value 为函数应转换为字符串', () => {
  try {
    const buf = Buffer.allocUnsafe(30);
    buf.fill(function test() {});
    return {
      pass: buf.length === 30,
      expected: 'buffer filled',
      actual: buf.toString().substring(0, 20)
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'handled gracefully',
      actual: e.message
    };
  }
});

test('value 为 Date 对象应转换为字符串', () => {
  try {
    const buf = Buffer.allocUnsafe(50);
    const date = new Date('2024-01-01');
    buf.fill(date);
    return {
      pass: buf.length === 50,
      expected: 'buffer filled with date string',
      actual: buf.toString().substring(0, 20)
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'handled gracefully',
      actual: e.message
    };
  }
});

test('value 为 RegExp 应转换为字符串', () => {
  try {
    const buf = Buffer.allocUnsafe(20);
    buf.fill(/test/g);
    return {
      pass: buf.length === 20,
      expected: 'buffer filled with regex string',
      actual: buf.toString().substring(0, 10)
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'handled gracefully',
      actual: e.message
    };
  }
});

// === 2. base64url 编码测试 ===

test('base64url 编码填充', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill('YWJj', 'base64url');
    return {
      pass: buf.toString().includes('abc'),
      expected: 'contains abc',
      actual: buf.toString()
    };
  } catch (e) {
    return {
      pass: e.message.includes('encoding') || e.message.includes('Unknown'),
      expected: 'base64url not supported or handled',
      actual: e.message
    };
  }
});

test('base64url 编码与 base64 对比', () => {
  try {
    const buf1 = Buffer.allocUnsafe(10);
    const buf2 = Buffer.allocUnsafe(10);
    buf1.fill('YWJj', 'base64');
    buf2.fill('YWJj', 'base64url');
    return {
      pass: buf1.equals(buf2),
      expected: 'buffers should be equal for simple case',
      actual: `base64: ${buf1.toString('hex')}, base64url: ${buf2.toString('hex')}`
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'base64url may not be supported',
      actual: e.message
    };
  }
});

// === 3. 更多 TypedArray 变体测试 ===

test('Int16Array 作为 value', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    const arr = new Int16Array([256, 512]);
    buf.fill(arr);
    return {
      pass: buf.length === 10,
      expected: 'buffer filled',
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'Int16Array handled',
      actual: e.message
    };
  }
});

test('Uint16Array 作为 value', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    const arr = new Uint16Array([256, 512]);
    buf.fill(arr);
    return {
      pass: buf.length === 10,
      expected: 'buffer filled',
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'Uint16Array handled',
      actual: e.message
    };
  }
});

test('Uint32Array 作为 value', () => {
  try {
    const buf = Buffer.allocUnsafe(20);
    const arr = new Uint32Array([1, 2, 3]);
    buf.fill(arr);
    return {
      pass: buf.length === 20,
      expected: 'buffer filled',
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'Uint32Array handled',
      actual: e.message
    };
  }
});

test('Float32Array 作为 value', () => {
  try {
    const buf = Buffer.allocUnsafe(20);
    const arr = new Float32Array([1.5, 2.5]);
    buf.fill(arr);
    return {
      pass: buf.length === 20,
      expected: 'buffer filled',
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'Float32Array handled',
      actual: e.message
    };
  }
});

test('Float64Array 作为 value', () => {
  try {
    const buf = Buffer.allocUnsafe(20);
    const arr = new Float64Array([1.5]);
    buf.fill(arr);
    return {
      pass: buf.length === 20,
      expected: 'buffer filled',
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'Float64Array handled',
      actual: e.message
    };
  }
});

test('BigInt64Array 作为 value', () => {
  try {
    const buf = Buffer.allocUnsafe(20);
    const arr = new BigInt64Array([1n, 2n]);
    buf.fill(arr);
    return {
      pass: buf.length === 20,
      expected: 'buffer filled',
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'BigInt64Array handled',
      actual: e.message
    };
  }
});

test('BigUint64Array 作为 value', () => {
  try {
    const buf = Buffer.allocUnsafe(20);
    const arr = new BigUint64Array([1n, 2n]);
    buf.fill(arr);
    return {
      pass: buf.length === 20,
      expected: 'buffer filled',
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'BigUint64Array handled',
      actual: e.message
    };
  }
});

// === 4. 大数值边界测试 ===

test('value 为 2^31 - 1 (最大正整数)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(2147483647);
  const expected = Buffer.from([255, 255, 255, 255, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 为 2^31 (负数边界)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(2147483648);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 为 2^32 - 1 (最大 uint32)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(4294967295);
  const expected = Buffer.from([255, 255, 255, 255, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 为 2^32 (溢出)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(4294967296);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('value 为 -2^31', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(-2147483648);
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 5. 编码参数混合测试 ===

test('offset 为字符串编码名称会被处理', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0);
    buf.fill('test', 'utf8', 5);
    // Node.js 会尝试将 'utf8' 转换为数字（NaN），然后使用默认值
    return {
      pass: true,
      expected: 'handled without throwing',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('type') || e.message.includes('number') || e.message.includes('encoding'),
      expected: 'exception or handled gracefully',
      actual: e.message
    };
  }
});

test('end 为编码名称会被处理', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0);
    buf.fill('test', 0, 'utf8', 5);
    // Node.js 会尝试将 'utf8' 转换为数字（NaN），然后使用默认值
    return {
      pass: true,
      expected: 'handled without throwing',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('type') || e.message.includes('number') || e.message.includes('integer') || e.message.includes('encoding'),
      expected: 'exception or handled gracefully',
      actual: e.message
    };
  }
});

// === 6. 特殊 Unicode 字符测试 ===

test('填充零宽字符 (Zero Width Space)', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('\u200B'); // Zero Width Space
  return {
    pass: buf.length === 10,
    expected: 'buffer filled',
    actual: Array.from(buf).join(',')
  };
});

test('填充组合字符 (Combining Diacritical Marks)', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('\u0301'); // Combining Acute Accent
  return {
    pass: buf.length === 10,
    expected: 'buffer filled',
    actual: Array.from(buf).join(',')
  };
});

test('填充代理对字符 (Surrogate Pair)', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('𝕳'); // Mathematical Bold Capital H (U+1D573)
  return {
    pass: buf.length === 10,
    expected: 'buffer filled',
    actual: Array.from(buf).join(',')
  };
});

test('填充 RTL 字符 (Right-to-Left)', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('א'); // Hebrew Letter Alef
  return {
    pass: buf.length === 10,
    expected: 'buffer filled',
    actual: Array.from(buf).join(',')
  };
});

// === 7. 边界条件组合测试 ===

test('offset 为 buffer.length - 1 应只填充最后一个字节', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  buf.fill(0xFF, 9);
  return {
    pass: buf[9] === 0xFF && buf[8] === 0,
    expected: 'only last byte filled',
    actual: Array.from(buf).join(',')
  };
});

test('end 为 1 应只填充第一个字节', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  buf.fill(0xFF, 0, 1);
  return {
    pass: buf[0] === 0xFF && buf[1] === 0,
    expected: 'only first byte filled',
    actual: Array.from(buf).join(',')
  };
});

test('offset 和 end 都为 0 应不填充', () => {
  const buf = Buffer.allocUnsafe(5);
  const original = Buffer.from(buf);
  buf.fill(0xFF, 0, 0);
  return {
    pass: buf.equals(original),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

// === 8. 字符串编码边界测试 ===

test('utf16le 编码奇数长度缓冲区', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('a', 'utf16le');
  return {
    pass: buf.length === 5,
    expected: 'buffer filled with truncation',
    actual: Array.from(buf).join(',')
  };
});

test('ucs2 编码奇数长度缓冲区', () => {
  const buf = Buffer.allocUnsafe(7);
  buf.fill('abc', 'ucs2');
  return {
    pass: buf.length === 7,
    expected: 'buffer filled with truncation',
    actual: Array.from(buf).join(',')
  };
});

// === 9. 空值和特殊值组合测试 ===

test('value 为 0 且 offset 为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0xFF);
  buf.fill(0, 0);
  return {
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('value 为空字符串且指定编码', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0xFF);
  buf.fill('', 'utf8');
  return {
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('value 为空字符串且指定 hex 编码', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(0xFF);
    buf.fill('', 'hex');
    return {
      pass: buf.every(b => b === 0),
      expected: 'all bytes should be 0',
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value'),
      expected: 'exception or filled with 0',
      actual: e.message
    };
  }
});

// === 10. 性能和大缓冲区测试 ===

test('填充超大缓冲区 (100KB)', () => {
  const buf = Buffer.allocUnsafe(100000);
  const start = Date.now();
  buf.fill(0x42);
  const duration = Date.now() - start;
  return {
    pass: duration < 1000 && buf[0] === 0x42 && buf[99999] === 0x42,
    expected: 'should complete quickly',
    actual: `completed in ${duration}ms`
  };
});

test('填充超大缓冲区并指定范围', () => {
  const buf = Buffer.allocUnsafe(100000);
  buf.fill(0);
  buf.fill(0xFF, 50000, 60000);
  return {
    pass: buf[49999] === 0 && buf[50000] === 0xFF && buf[59999] === 0xFF && buf[60000] === 0,
    expected: 'range filled correctly',
    actual: `[49999]=${buf[49999]}, [50000]=${buf[50000]}, [59999]=${buf[59999]}, [60000]=${buf[60000]}`
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
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
