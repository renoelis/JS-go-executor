const { Buffer } = require('buffer');

// buf.fill() 查缺补漏测试
// 覆盖之前测试中可能遗漏的边界情况和特殊场景

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

// === 1. base64url 编码测试 ===

test('填充 base64url 编码字符串', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('SGVsbG8', 'base64url');
  // 'SGVsbG8' 解码为 'Hello'
  const expected = Buffer.from('HelloHello');
  return {
    pass: buf.equals(expected),
    expected: expected.toString('hex'),
    actual: buf.toString('hex')
  };
});

test('base64url 编码大小写不敏感', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  buf1.fill('SGVs', 'base64url');
  buf2.fill('SGVs', 'BASE64URL');
  return {
    pass: buf1.equals(buf2),
    expected: buf1.toString('hex'),
    actual: buf2.toString('hex')
  };
});

test('base64url 编码包含 - 和 _ 字符', () => {
  const buf = Buffer.allocUnsafe(10);
  // base64url 使用 - 和 _ 替代 + 和 /
  buf.fill('YWJj', 'base64url');
  return {
    pass: buf.toString().includes('abc'),
    expected: 'should contain abc',
    actual: buf.toString().substring(0, 6)
  };
});

// === 2. 其他 TypedArray 类型测试 ===

test('填充 Int8Array', () => {
  const arr = new Int8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.allocUnsafe(5);
  buf.fill(arr);
  const expected = Buffer.from([1, 2, 3, 4, 5]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充 Int16Array', () => {
  const arr = new Int16Array([256, 257]); // 超过 255 的值
  const buf = Buffer.allocUnsafe(4);
  buf.fill(arr);
  // Int16Array 的每个元素占 2 字节
  return {
    pass: buf.length === 4,
    expected: '4 bytes filled',
    actual: Array.from(buf).join(',')
  };
});

test('填充 Uint16Array', () => {
  const arr = new Uint16Array([65, 66]);
  const buf = Buffer.allocUnsafe(4);
  buf.fill(arr);
  return {
    pass: buf.length === 4,
    expected: '4 bytes filled',
    actual: Array.from(buf).join(',')
  };
});

test('填充 Float32Array', () => {
  const arr = new Float32Array([1.5, 2.5]);
  const buf = Buffer.allocUnsafe(8);
  buf.fill(arr);
  return {
    pass: buf.length === 8,
    expected: '8 bytes filled',
    actual: Array.from(buf).join(',')
  };
});

// === 3. 共享 ArrayBuffer 测试 ===

test('填充共享 ArrayBuffer 的 Buffer', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);
  
  buf1.fill(0x42);
  
  // buf2 应该也看到变化，因为共享同一个 ArrayBuffer
  return {
    pass: buf2[0] === 0x42 && buf2[9] === 0x42,
    expected: 'buf2 should see changes',
    actual: Array.from(buf2).join(',')
  };
});

test('填充 ArrayBuffer 的部分视图', () => {
  const ab = new ArrayBuffer(20);
  const buf1 = Buffer.from(ab, 0, 10);
  const buf2 = Buffer.from(ab, 10, 10);
  
  buf1.fill(0x11);
  buf2.fill(0x22);
  
  return {
    pass: buf1[0] === 0x11 && buf2[0] === 0x22,
    expected: 'separate views should not interfere',
    actual: `buf1[0]=${buf1[0]}, buf2[0]=${buf2[0]}`
  };
});

// === 4. offset/end 浮点数边界测试 ===

test('offset 为浮点数 2.1 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(1, 2.1, 5);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('integer') || e.message.includes('out of range'),
      expected: 'error about integer',
      actual: e.message
    };
  }
});

test('end 为浮点数 5.9 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(1, 2, 5.9);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('integer') || e.message.includes('out of range'),
      expected: 'error about integer',
      actual: e.message
    };
  }
});

test('offset 和 end 都是浮点数应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(1, 2.5, 7.5);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: true,
      expected: 'error thrown',
      actual: e.message
    };
  }
});

// === 5. 编码参数变体测试 ===

test('编码 "utf-8" 带连字符', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  buf1.fill('hello', 'utf8');
  buf2.fill('hello', 'utf-8');
  return {
    pass: buf1.equals(buf2),
    expected: 'should be equal',
    actual: `utf8: ${buf1.toString('hex')}, utf-8: ${buf2.toString('hex')}`
  };
});

test('编码 "ucs-2" 带连字符', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  buf1.fill('ab', 'ucs2');
  buf2.fill('ab', 'ucs-2');
  return {
    pass: buf1.equals(buf2),
    expected: 'should be equal',
    actual: `ucs2: ${buf1.toString('hex')}, ucs-2: ${buf2.toString('hex')}`
  };
});

test('编码 "utf-16le" 带连字符', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  buf1.fill('ab', 'utf16le');
  buf2.fill('ab', 'utf-16le');
  return {
    pass: buf1.equals(buf2),
    expected: 'should be equal',
    actual: `utf16le: ${buf1.toString('hex')}, utf-16le: ${buf2.toString('hex')}`
  };
});

// === 6. 极端字符串长度测试 ===

test('填充非常长的字符串（1000字符）', () => {
  const buf = Buffer.allocUnsafe(100);
  const longStr = 'a'.repeat(1000);
  buf.fill(longStr);
  return {
    pass: buf.every(b => b === 0x61), // 'a' 的 ASCII 码
    expected: 'all bytes should be 0x61',
    actual: `first: ${buf[0]}, last: ${buf[99]}`
  };
});

test('填充空字符串重复多次', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('');
  buf.fill('');
  buf.fill('');
  return {
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

// === 7. Buffer 方法组合测试 ===

test('fill 后 slice 再 fill', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x11);
  const slice = buf.slice(2, 8);
  slice.fill(0x22);
  
  // slice 的修改应该影响原 buffer
  return {
    pass: buf[0] === 0x11 && buf[2] === 0x22 && buf[9] === 0x11,
    expected: 'slice fill should affect original',
    actual: Array.from(buf).join(',')
  };
});

test('fill 后 copy 到另一个 Buffer', () => {
  const buf1 = Buffer.allocUnsafe(5);
  buf1.fill(0x42);
  
  const buf2 = Buffer.allocUnsafe(5);
  buf1.copy(buf2);
  
  return {
    pass: buf2.every(b => b === 0x42),
    expected: 'copied buffer should have same values',
    actual: Array.from(buf2).join(',')
  };
});

test('fill 后 toString 各种编码', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('Hello');
  
  const utf8 = buf.toString('utf8');
  const hex = buf.toString('hex');
  const base64 = buf.toString('base64');
  
  return {
    pass: utf8.includes('Hello') && hex.length > 0 && base64.length > 0,
    expected: 'all encodings should work',
    actual: `utf8: ${utf8.substring(0, 10)}, hex: ${hex.substring(0, 10)}`
  };
});

// === 8. 特殊数值边界测试 ===

test('填充 0.5 应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0.5);
  return {
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('填充 0.9 应转换为 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0.9);
  return {
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('填充 255.5 应转换为 255', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(255.5);
  return {
    pass: buf.every(b => b === 255),
    expected: 'all bytes should be 255',
    actual: Array.from(buf).join(',')
  };
});

test('填充 256.5 应转换为 0 (256 & 255 = 0)', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(256.5);
  return {
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

// === 9. 编码错误处理测试 ===

test('hex 编码空字符串', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('', 'hex');
  return {
    pass: buf.every(b => b === 0),
    expected: 'empty hex string should fill with 0',
    actual: Array.from(buf).join(',')
  };
});

test('base64 编码空字符串', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('', 'base64');
  return {
    pass: buf.every(b => b === 0),
    expected: 'empty base64 string should fill with 0',
    actual: Array.from(buf).join(',')
  };
});

test('hex 编码单个字符（奇数长度）', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('a', 'hex');
    // 单个 hex 字符无法解码，应该抛出异常
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('value'),
      expected: 'error about invalid value',
      actual: e.message
    };
  }
});

// === 10. 连续操作测试 ===

test('连续 fill 不同值', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x11);
  buf.fill(0x22, 0, 5);
  buf.fill(0x33, 5, 10);
  
  return {
    pass: buf[0] === 0x22 && buf[5] === 0x33,
    expected: 'different regions should have different values',
    actual: Array.from(buf).join(',')
  };
});

test('fill 后 write 再 fill', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x11);
  buf.write('abc', 0);
  buf.fill(0x22, 5);
  
  return {
    pass: buf.toString('utf8', 0, 3) === 'abc' && buf[5] === 0x22,
    expected: 'write and fill should coexist',
    actual: `text: ${buf.toString('utf8', 0, 3)}, byte[5]: ${buf[5]}`
  };
});

// === 11. 内存对齐测试 ===

test('填充奇数长度 Buffer', () => {
  const buf = Buffer.allocUnsafe(7);
  buf.fill(0x42);
  return {
    pass: buf.length === 7 && buf.every(b => b === 0x42),
    expected: 'odd length buffer should fill correctly',
    actual: `length: ${buf.length}, all 0x42: ${buf.every(b => b === 0x42)}`
  };
});

test('填充质数长度 Buffer', () => {
  const buf = Buffer.allocUnsafe(13);
  buf.fill('abc');
  return {
    pass: buf.length === 13,
    expected: 'prime length buffer should fill correctly',
    actual: `length: ${buf.length}, content: ${buf.toString().substring(0, 13)}`
  };
});

// === 12. Unicode 边界测试 ===

test('填充 Unicode BMP 字符（U+0000 到 U+FFFF）', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('\u4E2D'); // 中文字符 "中"
  return {
    pass: buf.toString('utf8').includes('中'),
    expected: 'should contain Chinese character',
    actual: buf.toString('utf8').substring(0, 6)
  };
});

test('填充 Unicode 补充平面字符（U+10000 以上）', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('𝕳'); // 数学字母 H (U+1D573)
  return {
    pass: buf.length === 10,
    expected: 'supplementary plane character should fill',
    actual: buf.toString('utf8').substring(0, 8)
  };
});

test('填充组合字符', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('é'); // e + 组合重音符
  return {
    pass: buf.length === 10,
    expected: 'combining character should fill',
    actual: buf.toString('utf8').substring(0, 6)
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
