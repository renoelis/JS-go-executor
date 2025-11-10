// buf.fill 查缺补漏测试
// 针对可能遗漏的边界情况和特殊场景

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

// === BigInt 相关补充测试 ===

test('BigInt64Array 负数值正确转换', () => {
  const arr = new BigInt64Array([-1n, -256n, -257n]);
  const buf = Buffer.allocUnsafe(24);
  buf.fill(arr);
  // -1n 的 8 字节小端序：[255,255,255,255,255,255,255,255]
  // -256n 的 8 字节小端序：[0,255,255,255,255,255,255,255]
  // -257n 的 8 字节小端序：[255,254,255,255,255,255,255,255]
  const expected = [
    255,255,255,255,255,255,255,255,
    0,255,255,255,255,255,255,255,
    255,254,255,255,255,255,255,255
  ];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('BigInt64Array 大数值正确转换', () => {
  const arr = new BigInt64Array([0x7FFFFFFFFFFFFFFFn]); // 最大正数
  const buf = Buffer.allocUnsafe(8);
  buf.fill(arr);
  const expected = [255,255,255,255,255,255,255,127]; // 小端序
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('BigUint64Array 填充', () => {
  const arr = new BigUint64Array([1n, 256n]);
  const buf = Buffer.allocUnsafe(16);
  buf.fill(arr);
  const expected = [1,0,0,0,0,0,0,0, 0,1,0,0,0,0,0,0];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('混合 BigInt 和普通 TypedArray 长度', () => {
  const arr = new BigInt64Array([1n]);
  const buf = Buffer.allocUnsafe(20);
  buf.fill(arr);
  // 8 字节模式重复：[1,0,0,0,0,0,0,0] 重复 2.5 次
  const expected = [1,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0, 1,0,0,0];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

// === TypedArray 其他类型补充 ===

test('Int16Array 填充（小端序）', () => {
  const arr = new Int16Array([0x0102, 0x0304]);
  const buf = Buffer.allocUnsafe(8);
  buf.fill(arr);
  // Int16Array 每个元素 2 字节小端序
  const expected = [2,1, 4,3, 2,1, 4,3];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('Uint16Array 填充', () => {
  const arr = new Uint16Array([256, 257]);
  const buf = Buffer.allocUnsafe(8);
  buf.fill(arr);
  // 256 = 0x0100 小端序 [0,1], 257 = 0x0101 小端序 [1,1]
  const expected = [0,1, 1,1, 0,1, 1,1];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('Int32Array 填充', () => {
  const arr = new Int32Array([0x01020304]);
  const buf = Buffer.allocUnsafe(8);
  buf.fill(arr);
  // 小端序：[4,3,2,1]
  const expected = [4,3,2,1, 4,3,2,1];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('Uint32Array 填充', () => {
  const arr = new Uint32Array([0xFFFFFFFF]);
  const buf = Buffer.allocUnsafe(8);
  buf.fill(arr);
  const expected = [255,255,255,255, 255,255,255,255];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('Float32Array 填充', () => {
  const arr = new Float32Array([1.0]); // 即使是整数值也应该按浮点数处理
  const buf = Buffer.allocUnsafe(8);
  buf.fill(arr);
  // Float32 的 1.0 = [0x00, 0x00, 0x80, 0x3F] 小端序
  const expected = [0,0,128,63, 0,0,128,63];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('Float64Array 填充', () => {
  const arr = new Float64Array([1.0]);
  const buf = Buffer.allocUnsafe(16);
  buf.fill(arr);
  // Float64 的 1.0 = [0x00,0x00,0x00,0x00,0x00,0x00,0xF0,0x3F] 小端序
  const expected = [0,0,0,0,0,0,240,63, 0,0,0,0,0,0,240,63];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 编码边界测试 ===

test('hex 编码单个字符应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('a', 'hex');
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid'),
      expected: 'error about invalid value',
      actual: e.message
    };
  }
});

test('hex 编码空字符串应填充 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('', 'hex');
  const expected = Buffer.from([0,0,0,0,0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('base64 无效字符应忽略', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('YWJj!!!', 'base64'); // 'abc' in base64 with invalid chars
  // base64 'YWJj' = 'abc' = [97,98,99]
  const result = buf.toString('utf8', 0, 3);
  return {
    pass: result === 'abc',
    expected: 'abc',
    actual: result
  };
});

test('utf16le 代理对正确处理', () => {
  // 😀 emoji (U+1F600) 需要代理对
  const buf = Buffer.allocUnsafe(10);
  buf.fill('😀', 'utf16le');
  // U+1F600 = 0xD83D 0xDE00 (代理对)
  // 小端序：[0x3D, 0xD8, 0x00, 0xDE]
  const expected = [0x3D, 0xD8, 0x00, 0xDE, 0x3D, 0xD8, 0x00, 0xDE, 0x3D, 0xD8];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('latin1 高位字符正确处理', () => {
  // Latin1 范围 0-255
  const buf = Buffer.allocUnsafe(5);
  buf.fill('ÿ', 'latin1'); // U+00FF
  const expected = Buffer.from([255,255,255,255,255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('ascii 高位截断', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('ÿ', 'ascii'); // U+00FF，ASCII 取低 7 位 = 0xFF & 0x7F = 0x7F，但实际 Node.js 取低 8 位
  const expected = Buffer.from([255,255,255,255,255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === offset/end 边界补充 ===

test('offset 等于 length 应不填充', () => {
  const buf = Buffer.from([1,2,3,4,5]);
  buf.fill(0xFF, 5);
  const expected = Buffer.from([1,2,3,4,5]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('end 为 0 应不填充', () => {
  const buf = Buffer.from([1,2,3,4,5]);
  buf.fill(0xFF, 0, 0);
  const expected = Buffer.from([1,2,3,4,5]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('offset 和 end 相等应不填充', () => {
  const buf = Buffer.from([1,2,3,4,5]);
  buf.fill(0xFF, 2, 2);
  const expected = Buffer.from([1,2,3,4,5]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('offset 大于 end 应不填充', () => {
  const buf = Buffer.from([1,2,3,4,5]);
  buf.fill(0xFF, 3, 2);
  const expected = Buffer.from([1,2,3,4,5]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('offset 为浮点数 0.5 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(0xFF, 0.5);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('integer'),
      expected: 'error about integer',
      actual: e.message
    };
  }
});

test('end 为浮点数 2.5 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(0xFF, 0, 2.5);
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error'
    };
  } catch (e) {
    return {
      pass: e.message.includes('integer'),
      expected: 'error about integer',
      actual: e.message
    };
  }
});

// === 特殊字符串值 ===

test('填充包含 null 字符的字符串', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill('a\x00b');
  // 'a\x00b' = [97, 0, 98]
  const expected = [97,0,98, 97,0,98, 97,0,98, 97];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充只包含 null 字符的字符串', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('\x00');
  const expected = Buffer.from([0,0,0,0,0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充非常长的字符串', () => {
  const longStr = 'a'.repeat(1000);
  const buf = Buffer.allocUnsafe(5000);
  buf.fill(longStr);
  // 应该重复填充
  return {
    pass: buf.every(b => b === 97),
    expected: 'all bytes should be 97',
    actual: buf.slice(0, 10).join(',') + '...'
  };
});

// === 链式调用和返回值 ===

test('fill 返回的 Buffer 可以继续链式调用', () => {
  const buf = Buffer.allocUnsafe(10);
  const result = buf.fill(0).fill(1, 0, 5).fill(2, 5, 10);
  const expected = Buffer.from([1,1,1,1,1, 2,2,2,2,2]);
  return {
    pass: result === buf && buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === Buffer 子类型 ===

test('sliced Buffer 填充', () => {
  const parent = Buffer.allocUnsafe(10);
  parent.fill(0);
  const slice = parent.slice(2, 7);
  slice.fill(0xFF);
  // slice 修改应该影响 parent
  const expected = [0,0, 255,255,255,255,255, 0,0,0];
  return {
    pass: parent.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(parent).join(',')
  };
});

test('Buffer.from 创建的 Buffer 填充', () => {
  const buf = Buffer.from([1,2,3,4,5]);
  buf.fill(0xFF, 1, 4);
  const expected = Buffer.from([1,255,255,255,5]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 编码参数位置变化 ===

test('encoding 作为第二个参数（value 是字符串）', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill('abc', 'hex');
  // 'abc' hex 解码：'ab' = 0xAB，'c' 单个字符无效被截断，所以只有 [0xAB]
  const expected = [171,171,171,171,171,171];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
    actual: Array.from(buf).join(',')
  };
});

test('encoding 作为第三个参数（value 是字符串，有 offset）', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  buf.fill('abc', 2, 'hex');
  // 从 offset 2 开始填充，'abc' hex = [0xAB]
  const expected = [0,0, 171,171,171,171,171,171,171,171];
  return {
    pass: buf.equals(Buffer.from(expected)),
    expected: expected.join(','),
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
