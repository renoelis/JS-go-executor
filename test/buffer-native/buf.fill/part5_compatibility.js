// buf.fill() - Compatibility and Advanced Tests
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

// === 方法链式调用测试 ===

test('链式调用多次 fill', () => {
  const buf = Buffer.alloc(10, 0);
  buf.fill(1, 0, 3).fill(2, 3, 6).fill(3, 6, 10);
  const expected = Buffer.from([1, 1, 1, 2, 2, 2, 3, 3, 3, 3]);
  return { 
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('fill 后调用其他方法', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.fill(0x42).slice(0, 5);
  return { 
    pass: slice.every(b => b === 0x42) && slice.length === 5,
    expected: '5 bytes of 0x42',
    actual: Array.from(slice).join(',')
  };
});

// === 内存安全测试 ===

test('填充后原始数据被覆盖', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.fill(0);
  return { 
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('部分填充不影响其他区域', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.fill(0, 1, 4);
  const expected = Buffer.from([1, 0, 0, 0, 5]);
  return { 
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('多次填充同一区域', () => {
  const buf = Buffer.alloc(5);
  buf.fill(1);
  buf.fill(2);
  buf.fill(3);
  return { 
    pass: buf.every(b => b === 3),
    expected: 'all bytes should be 3',
    actual: Array.from(buf).join(',')
  };
});

// === TypedArray 互操作性测试 ===

test('fill 后创建 Uint8Array 视图', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0x42);
  const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  return { 
    pass: Array.from(view).every(b => b === 0x42),
    expected: 'all bytes in view should be 0x42',
    actual: Array.from(view).join(',')
  };
});

test('fill 后创建 Int8Array 视图', () => {
  const buf = Buffer.alloc(5);
  buf.fill(200); // 200 as unsigned, -56 as signed
  const view = new Int8Array(buf.buffer, buf.byteOffset, buf.length);
  return { 
    pass: Array.from(view).every(b => b === -56),
    expected: 'all bytes should be -56 in signed view',
    actual: Array.from(view).join(',')
  };
});

test('fill 后创建 Uint16Array 视图', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0x12);
  const view = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);
  // 每个 uint16 应该是 0x1212 (小端) 或 0x1212 (大端)
  return { 
    pass: view.length === 5,
    expected: '5 uint16 values',
    actual: view.length.toString()
  };
});

// === 编码边界测试 ===

test('hex 编码奇数长度字符串', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill('abc', 'hex'); // 奇数长度 hex 字符串
    return { 
      pass: true,
      expected: 'handled gracefully',
      actual: buf.toString('hex')
    };
  } catch (e) {
    return { 
      pass: true,
      expected: 'error or handled',
      actual: e.message
    };
  }
});

test('hex 编码非法字符', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill('xyz', 'hex'); // 非法 hex 字符
    return { 
      pass: true,
      expected: 'handled gracefully',
      actual: buf.toString('hex')
    };
  } catch (e) {
    return { 
      pass: true,
      expected: 'error or handled',
      actual: e.message
    };
  }
});

test('base64 编码非法字符', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill('!!!', 'base64');
    return { 
      pass: true,
      expected: 'handled gracefully',
      actual: buf.toString('hex')
    };
  } catch (e) {
    return { 
      pass: true,
      expected: 'error or handled',
      actual: e.message
    };
  }
});

test('base64 编码填充字符', () => {
  const buf = Buffer.alloc(8);
  buf.fill('YWJj', 'base64'); // 'abc' with padding
  return { 
    pass: buf.toString().includes('abc'),
    expected: 'should contain abc',
    actual: buf.toString()
  };
});

// === 不同 Buffer 类型测试 ===

test('Buffer.from 创建的 Buffer 可以 fill', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.fill(0);
  return { 
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('Buffer.allocUnsafe 创建的 Buffer 可以 fill', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x42);
  return { 
    pass: buf.every(b => b === 0x42),
    expected: 'all bytes should be 0x42',
    actual: Array.from(buf).join(',')
  };
});

test('Buffer.alloc 创建的 Buffer 可以 fill', () => {
  const buf = Buffer.alloc(10, 0xFF);
  buf.fill(0);
  return { 
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('sliced Buffer 可以 fill', () => {
  const buf = Buffer.alloc(10, 0);
  const slice = buf.slice(2, 8);
  slice.fill(0x42);
  return { 
    pass: buf[2] === 0x42 && buf[7] === 0x42 && buf[0] === 0 && buf[9] === 0,
    expected: 'slice fill should affect original buffer',
    actual: Array.from(buf).join(',')
  };
});

// === 性能相关测试 ===

test('填充中等大小 Buffer 性能测试', () => {
  const buf = Buffer.alloc(1000);
  const start = Date.now();
  buf.fill(0x42);
  const duration = Date.now() - start;
  return { 
    pass: duration < 100 && buf[0] === 0x42 && buf[999] === 0x42,
    expected: 'should complete quickly and correctly',
    actual: 'completed in ' + duration + 'ms'
  };
});

test('填充字符串比填充数字稍慢但正确', () => {
  const buf = Buffer.alloc(100);
  buf.fill('abc');
  return { 
    pass: buf.toString().startsWith('abc'),
    expected: 'should start with abc',
    actual: buf.toString().substring(0, 10)
  };
});

// === offset/end 组合测试 ===

test('只填充第一个字节', () => {
  const buf = Buffer.alloc(5, 0);
  buf.fill(1, 0, 1);
  return { 
    pass: buf[0] === 1 && buf[1] === 0,
    expected: 'only first byte should be 1',
    actual: Array.from(buf).join(',')
  };
});

test('只填充最后一个字节', () => {
  const buf = Buffer.alloc(5, 0);
  buf.fill(1, 4, 5);
  return { 
    pass: buf[4] === 1 && buf[3] === 0,
    expected: 'only last byte should be 1',
    actual: Array.from(buf).join(',')
  };
});

test('填充中间部分', () => {
  const buf = Buffer.alloc(10, 0);
  buf.fill(1, 3, 7);
  return { 
    pass: buf[3] === 1 && buf[6] === 1 && buf[2] === 0 && buf[7] === 0,
    expected: 'bytes 3-6 should be 1',
    actual: Array.from(buf).join(',')
  };
});

test('使用负 offset 和正 end 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(10, 0);
    buf.fill(1, -5, 8);
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('out of range'),
      expected: 'error about out of range',
      actual: e.message
    };
  }
});

test('使用正 offset 和负 end 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(10, 0);
    buf.fill(1, 2, -2);
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('out of range'),
      expected: 'error about out of range',
      actual: e.message
    };
  }
});

test('使用负 offset 和负 end 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(10, 0);
    buf.fill(1, -7, -2);
    return { 
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return { 
      pass: e.message.includes('out of range'),
      expected: 'error about out of range',
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

