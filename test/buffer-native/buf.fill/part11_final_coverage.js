// buf.fill() 最终覆盖测试
// 补充之前测试中遗漏的关键场景

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

// === 1. offset/end 参数类型强制转换测试 ===

test('offset 为字符串 "2" 应抛出类型错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0xFF, "2");
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

test('end 为字符串 "5" 应抛出类型错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0xFF, 0, "5");
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

test('offset 为 true 应抛出类型错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0xFF, true);
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

test('offset 为对象应抛出类型错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0xFF, {});
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

// === 2. encoding 参数边界测试 ===

test('encoding 为数字应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill('abc', 0, 10, 123);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('encoding') || e.message.includes('string'),
      expected: 'encoding error',
      actual: e.message
    };
  }
});

test('encoding 为对象应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill('abc', 0, 10, {});
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('encoding') || e.message.includes('string'),
      expected: 'encoding error',
      actual: e.message
    };
  }
});

test('encoding 为 true 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill('abc', 0, 10, true);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('encoding') || e.message.includes('string'),
      expected: 'encoding error',
      actual: e.message
    };
  }
});

// === 3. 多字节字符边界精确测试 ===

test('UTF-8 双字节字符 \\u0222 在 5 字节 buffer 中精确截断', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('\u0222');
  // \u0222 = 0xC8 0xA2 (2 bytes)
  // 5 bytes = 2.5 characters = [0xC8, 0xA2, 0xC8, 0xA2, 0xC8]
  const expected = Buffer.from([0xC8, 0xA2, 0xC8, 0xA2, 0xC8]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('UTF-8 三字节字符在 7 字节 buffer 中精确截断', () => {
  const buf = Buffer.allocUnsafe(7);
  buf.fill('中'); // 中 = 0xE4 0xB8 0xAD (3 bytes)
  // 7 bytes = 2.33 characters = [0xE4,0xB8,0xAD, 0xE4,0xB8,0xAD, 0xE4]
  const expected = Buffer.from([0xE4, 0xB8, 0xAD, 0xE4, 0xB8, 0xAD, 0xE4]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('UTF-8 四字节字符 emoji 在 10 字节 buffer 中精确截断', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('😀'); // 😀 = 0xF0 0x9F 0x98 0x80 (4 bytes)
  // 10 bytes = 2.5 characters = [0xF0,0x9F,0x98,0x80, 0xF0,0x9F,0x98,0x80, 0xF0,0x9F]
  const expected = Buffer.from([0xF0, 0x9F, 0x98, 0x80, 0xF0, 0x9F, 0x98, 0x80, 0xF0, 0x9F]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 4. hex 编码奇数长度精确测试 ===

test('hex 编码 "abc" (3字符奇数) 应截断为 "ab"', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('abc', 'hex');
  // 'abc' hex 截断为 'ab' = 0xAB
  const expected = Buffer.from([0xAB, 0xAB, 0xAB, 0xAB, 0xAB]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('hex 编码 "abcde" (5字符奇数) 应截断为 "abcd"', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill('abcde', 'hex');
  // 'abcde' hex 截断为 'abcd' = [0xAB, 0xCD]
  const expected = Buffer.from([0xAB, 0xCD, 0xAB, 0xCD]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('hex 编码 "1" (单字符) 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('1', 'hex');
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value'),
      expected: 'invalid value error',
      actual: e.message
    };
  }
});

// === 5. base64 填充字符处理 ===

test('base64 编码带 padding "YWJj" 正确解码', () => {
  const buf = Buffer.allocUnsafe(9);
  buf.fill('YWJj', 'base64'); // 'abc' = [97, 98, 99]
  // 9 bytes = 3 repetitions
  const expected = Buffer.from([97, 98, 99, 97, 98, 99, 97, 98, 99]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('base64 编码 "YQ==" 带双 padding 正确解码', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('YQ==', 'base64'); // 'a' = [97]
  const expected = Buffer.from([97, 97, 97, 97, 97]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('base64 编码 "YWI=" 带单 padding 正确解码', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill('YWI=', 'base64'); // 'ab' = [97, 98]
  const expected = Buffer.from([97, 98, 97, 98, 97, 98]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 6. Uint8Array 子类测试 ===

test('Uint8ClampedArray 填充', () => {
  const arr = new Uint8ClampedArray([100, 200, 255]);
  const buf = Buffer.allocUnsafe(9);
  buf.fill(arr);
  const expected = Buffer.from([100, 200, 255, 100, 200, 255, 100, 200, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('Uint8ClampedArray 空数组应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(new Uint8ClampedArray(0));
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid'),
      expected: 'invalid value error',
      actual: e.message
    };
  }
});

// === 7. 参数顺序变体测试 ===

test('fill(value, encoding) - 两参数形式', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill('616263', 'hex');
  const expected = Buffer.from([0xAB, 0xC6, 0x16, 0x26, 0x36, 0x16]); // 'abc' hex repeated
  // 实际上 '616263' hex = [0x61, 0x62, 0x63] = 'abc'
  const correct = Buffer.from([0x61, 0x62, 0x63, 0x61, 0x62, 0x63]);
  return {
    pass: buf.equals(correct),
    expected: Array.from(correct).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('fill(value, offset, encoding) - 三参数形式', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  buf.fill('616263', 2, 'hex');
  // 从 offset 2 开始填充 [0x61, 0x62, 0x63]
  const expected = Buffer.from([0, 0, 0x61, 0x62, 0x63, 0x61, 0x62, 0x63, 0x61, 0x62]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('fill(value, offset, end, encoding) - 四参数形式', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  buf.fill('616263', 2, 8, 'hex');
  // 从 offset 2 到 end 8 填充
  const expected = Buffer.from([0, 0, 0x61, 0x62, 0x63, 0x61, 0x62, 0x63, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 8. 极端长度 Buffer 测试 ===

test('填充 1MB Buffer 应成功', () => {
  const size = 1024 * 1024; // 1MB
  const buf = Buffer.allocUnsafe(size);
  buf.fill(0x42);
  return {
    pass: buf[0] === 0x42 && buf[size - 1] === 0x42 && buf[size / 2] === 0x42,
    expected: 'all bytes should be 0x42',
    actual: `first: ${buf[0]}, mid: ${buf[size / 2]}, last: ${buf[size - 1]}`
  };
});

test('填充 10MB Buffer 字符串应成功', () => {
  const size = 10 * 1024 * 1024; // 10MB
  const buf = Buffer.allocUnsafe(size);
  buf.fill('abc');
  const pattern = [97, 98, 99]; // 'abc'
  return {
    pass: buf[0] === 97 && buf[1] === 98 && buf[2] === 99 && buf[size - 1] === pattern[(size - 1) % 3],
    expected: 'pattern should repeat correctly',
    actual: `[0]=${buf[0]}, [1]=${buf[1]}, [2]=${buf[2]}, [last]=${buf[size - 1]}`
  };
});

// === 9. 零拷贝和内存共享测试 ===

test('填充 Buffer 后原 ArrayBuffer 应同步更新', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const view = new Uint8Array(ab);
  
  buf.fill(0x42);
  
  return {
    pass: view[0] === 0x42 && view[9] === 0x42,
    expected: 'ArrayBuffer view should see changes',
    actual: `view[0]=${view[0]}, view[9]=${view[9]}`
  };
});

test('填充 Buffer slice 应影响原 Buffer', () => {
  const parent = Buffer.allocUnsafe(20);
  parent.fill(0);
  
  const slice1 = parent.slice(5, 10);
  const slice2 = parent.slice(10, 15);
  
  slice1.fill(0x11);
  slice2.fill(0x22);
  
  return {
    pass: parent[5] === 0x11 && parent[10] === 0x22 && parent[0] === 0 && parent[19] === 0,
    expected: 'slices should modify parent',
    actual: Array.from(parent).join(',')
  };
});

// === 10. 特殊编码组合测试 ===

test('utf16le 单字节字符正确填充', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('a', 'utf16le');
  // 'a' in utf16le = [0x61, 0x00]
  const expected = Buffer.from([0x61, 0x00, 0x61, 0x00, 0x61, 0x00, 0x61, 0x00, 0x61, 0x00]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('utf16le 中文字符正确填充', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill('中', 'utf16le');
  // '中' = U+4E2D, utf16le = [0x2D, 0x4E]
  const expected = Buffer.from([0x2D, 0x4E, 0x2D, 0x4E, 0x2D, 0x4E, 0x2D, 0x4E]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('latin1 超出范围字符应截断', () => {
  const buf = Buffer.allocUnsafe(5);
  // U+0100 超出 latin1 范围 (0-255)，应该取低 8 位 = 0
  buf.fill('\u0100', 'latin1');
  const expected = Buffer.from([0, 0, 0, 0, 0]);
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
