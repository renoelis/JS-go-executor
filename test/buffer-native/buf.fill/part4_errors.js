// buf.fill() - Error Handling Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ 
      name, 
      status: result.pass ? '✅' : '❌',
      expected: result.expected,
      actual: result.actual
    });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// === 错误处理测试 ===

test('value 为 undefined 应使用 0', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.fill(undefined);
  return { 
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 null 应使用 0', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.fill(null);
  return { 
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 true 应转换为 1', () => {
  const buf = Buffer.alloc(5);
  buf.fill(true);
  return { 
    pass: buf.every(b => b === 1),
    expected: 'all bytes should be 1',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 false 应转换为 0', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.fill(false);
  return { 
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 NaN 应使用 0', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.fill(NaN);
  return { 
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 Infinity 应使用 0', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.fill(Infinity);
  return { 
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 -Infinity 应使用 0', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.fill(-Infinity);
  return { 
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('offset 为 NaN 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill(1, NaN);
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('out of range') || e.message.includes('integer'),
      expected: 'error about invalid offset',
      actual: e.message
    };
  }
});

test('offset 为 undefined 应使用 0', () => {
  const buf = Buffer.alloc(5);
  buf.fill(1, undefined);
  return { 
    pass: buf.every(b => b === 1),
    expected: 'all bytes should be 1',
    actual: Array.from(buf).join(',')
  };
});

test('offset 为 null 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill(1, null);
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('type'),
      expected: 'error about type',
      actual: e.message
    };
  }
});

test('offset 为浮点数应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0);
    buf.fill(1, 2.7, 4.9);
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('integer'),
      expected: 'error about integer',
      actual: e.message
    };
  }
});

test('end 为 NaN 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill(1, 0, NaN);
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('integer') || e.message.includes('out of range'),
      expected: 'error about invalid end',
      actual: e.message
    };
  }
});

test('end 为 undefined 应使用 buffer.length', () => {
  const buf = Buffer.alloc(5);
  buf.fill(1, 0, undefined);
  return { 
    pass: buf.every(b => b === 1),
    expected: 'all bytes should be 1',
    actual: Array.from(buf).join(',')
  };
});

test('end 为 null 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0);
    buf.fill(1, 0, null);
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('type'),
      expected: 'error about type',
      actual: e.message
    };
  }
});

test('end 为浮点数应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0);
    buf.fill(1, 0, 3.9);
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('integer'),
      expected: 'error about integer',
      actual: e.message
    };
  }
});

test('编码为空字符串应使用默认编码', () => {
  const buf = Buffer.alloc(3);
  buf.fill('abc', 0, 3, '');
  return { 
    pass: buf.toString() === 'abc',
    expected: 'abc',
    actual: buf.toString()
  };
});

test('编码为 undefined 应使用默认编码', () => {
  const buf = Buffer.alloc(3);
  buf.fill('abc', 0, 3, undefined);
  return { 
    pass: buf.toString() === 'abc',
    expected: 'abc',
    actual: buf.toString()
  };
});

test('编码为 null 应使用默认编码', () => {
  const buf = Buffer.alloc(3);
  buf.fill('abc', 0, 3, null);
  return { 
    pass: buf.toString() === 'abc',
    expected: 'abc',
    actual: buf.toString()
  };
});

test('无效编码应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill('abc', 0, 5, 'invalid-encoding');
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('encoding') || e.message.includes('Unknown'),
      expected: 'error about invalid encoding',
      actual: e.message
    };
  }
});

test('offset 为字符串数字应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0);
    buf.fill(1, '2', '4');
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('type'),
      expected: 'error about type',
      actual: e.message
    };
  }
});

test('offset 为非数字字符串应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill(1, 'abc');
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('type'),
      expected: 'error about type',
      actual: e.message
    };
  }
});

// === Uint8Array 测试 ===

test('填充 Uint8Array', () => {
  const buf = Buffer.alloc(10);
  const arr = new Uint8Array([1, 2, 3]);
  buf.fill(arr);
  const expected = Buffer.from([1, 2, 3, 1, 2, 3, 1, 2, 3, 1]);
  return { 
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充空 Uint8Array 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0xFF);
    buf.fill(new Uint8Array(0));
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('invalid'),
      expected: 'error about invalid value',
      actual: e.message
    };
  }
});

// === 数组测试 ===

test('填充普通数组（应该失败或转换）', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill([1, 2, 3]);
    // Node.js 会尝试将数组转换为字符串 "1,2,3"
    return { 
      pass: true,
      expected: 'converted to string or error',
      actual: buf.toString()
    };
  } catch (e) {
    return { 
      pass: true,
      expected: 'error or string conversion',
      actual: e.message
    };
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

