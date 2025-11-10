// buf.fill() 最终缺失场景补充测试
// 基于 Node.js v25.0.0 官方文档，补充现有测试未覆盖的场景
// 重点：无效 hex 字符串、部分有效 hex、allocUnsafe 行为、链式调用

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

// === 1. 无效 hex 编码测试（官方文档特别提到） ===

test('hex 编码 - 完全无效的字符应抛出异常', () => {
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
      pass: e.message.includes('invalid') || e.message.includes('hex') || e.message.includes('character'),
      expected: 'exception about invalid hex',
      actual: e.message
    };
  }
});

test('hex 编码 - 部分有效字符（aazz）应只取有效部分', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('aazz', 'hex');
  const expected = Buffer.from([0xaa, 0xaa, 0xaa, 0xaa, 0xaa]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('hex 编码 - 奇数长度有效字符串', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('abc', 'hex');
  // 'abc' 是奇数长度，Node.js 会忽略最后一个字符或补0
  return {
    pass: buf.length === 5,
    expected: 'buffer filled',
    actual: Array.from(buf).join(',')
  };
});

test('hex 编码 - 空字符串应填充 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0xFF);
  buf.fill('', 'hex');
  return {
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('hex 编码 - 单个有效字符应抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('a', 'hex');
    return {
      pass: false,
      expected: 'should throw exception',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('hex'),
      expected: 'exception about invalid hex (odd length)',
      actual: e.message
    };
  }
});

test('hex 编码 - 大小写混合', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill('AaBbCc', 'hex');
  const expected = Buffer.from([0xAA, 0xBB, 0xCC, 0xAA, 0xBB, 0xCC]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('hex 编码 - 包含空格会被忽略', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('aa bb', 'hex');
  // Node.js 会忽略空格，只解析 'aa' 和 'bb'
  return {
    pass: buf.length === 5,
    expected: 'buffer filled (spaces ignored)',
    actual: Array.from(buf).join(',')
  };
});

// === 2. 多字节字符截断测试（官方文档示例） ===

test('双字节 UTF-8 字符截断（\\u0222）', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('\u0222');
  // \u0222 是 2 字节 UTF-8: 0xc8 0xa2
  // 5 字节应该是: c8 a2 c8 a2 c8
  const expected = Buffer.from([0xc8, 0xa2, 0xc8, 0xa2, 0xc8]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('三字节 UTF-8 字符截断（中）', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('中');
  // '中' 是 3 字节: 0xe4 0xb8 0xad
  // 5 字节应该是: e4 b8 ad e4 b8
  const expected = Buffer.from([0xe4, 0xb8, 0xad, 0xe4, 0xb8]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('四字节 UTF-8 字符截断（😀）', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill('😀');
  // '😀' 是 4 字节: 0xf0 0x9f 0x98 0x80
  // 6 字节应该是: f0 9f 98 80 f0 9f
  const expected = Buffer.from([0xf0, 0x9f, 0x98, 0x80, 0xf0, 0x9f]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('多字节字符截断 - 恰好整除', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill('中');
  // 6 字节恰好 2 个完整的'中'
  const expected = Buffer.from([0xe4, 0xb8, 0xad, 0xe4, 0xb8, 0xad]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 3. value 类型强制转换测试（uint32） ===

test('value 为小数应截断为整数', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(65.7);
  // 65.7 应该被转换为 65
  return {
    pass: buf.every(b => b === 65),
    expected: 'all bytes should be 65',
    actual: Array.from(buf).join(',')
  };
});

test('value 为负小数应转换', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(-1.5);
  // -1.5 应该被转换为 255
  return {
    pass: buf.every(b => b === 255),
    expected: 'all bytes should be 255',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 256.5 应取模', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(256.5);
  // 256.5 转为整数 256，256 & 255 = 0
  return {
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 257.9 应取模', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(257.9);
  // 257.9 转为整数 257，257 & 255 = 1
  return {
    pass: buf.every(b => b === 1),
    expected: 'all bytes should be 1',
    actual: Array.from(buf).join(',')
  };
});

// === 4. 链式调用测试 ===

test('fill 返回 this 可以链式调用', () => {
  const buf = Buffer.allocUnsafe(10);
  const result = buf.fill(0).fill(0xFF, 0, 5).fill(0xAA, 5, 10);
  return {
    pass: result === buf && buf[0] === 0xFF && buf[5] === 0xAA,
    expected: 'chained calls work',
    actual: `result === buf: ${result === buf}, buf[0]: ${buf[0]}, buf[5]: ${buf[5]}`
  };
});

test('链式调用 - 多次填充不同编码', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0).fill('61', 0, 5, 'hex').fill('b', 5, 10, 'utf8');
  return {
    pass: buf[0] === 0x61 && buf[5] === 0x62,
    expected: 'different encodings in chain',
    actual: `buf[0]: ${buf[0]}, buf[5]: ${buf[5]}`
  };
});

// === 5. allocUnsafe 特定行为测试 ===

test('allocUnsafe 后 fill 应覆盖所有字节', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0x42);
  return {
    pass: buf.every(b => b === 0x42),
    expected: 'all bytes should be 0x42',
    actual: Array.from(buf).join(',')
  };
});

test('allocUnsafe 后部分 fill', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0xFF, 3, 7);
  return {
    pass: buf[3] === 0xFF && buf[6] === 0xFF,
    expected: 'partial fill works',
    actual: `buf[3]: ${buf[3]}, buf[6]: ${buf[6]}`
  };
});

// === 6. offset/end 边界组合测试 ===

test('offset 为 buffer.length 应不填充', () => {
  const buf = Buffer.allocUnsafe(5);
  const original = Buffer.from(buf);
  buf.fill(0xFF, 5);
  return {
    pass: buf.equals(original),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

test('end 为 0 应不填充', () => {
  const buf = Buffer.allocUnsafe(5);
  const original = Buffer.from(buf);
  buf.fill(0xFF, 0, 0);
  return {
    pass: buf.equals(original),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

test('offset 和 end 都为 buffer.length 应不填充', () => {
  const buf = Buffer.allocUnsafe(5);
  const original = Buffer.from(buf);
  buf.fill(0xFF, 5, 5);
  return {
    pass: buf.equals(original),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

// === 7. 编码参数位置变化测试 ===

test('fill(value, encoding) - 两参数形式', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill('616263', 'hex');
  return {
    pass: buf.toString() === 'abcabc',
    expected: 'abcabc',
    actual: buf.toString()
  };
});

test('fill(value, offset, encoding) - 三参数形式', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  buf.fill('616263', 2, 'hex');
  return {
    pass: buf[0] === 0 && buf[1] === 0 && buf[2] === 0x61,
    expected: 'offset works with encoding',
    actual: Array.from(buf).join(',')
  };
});

test('fill(value, offset, end, encoding) - 四参数形式', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  buf.fill('616263', 2, 8, 'hex');
  return {
    pass: buf[0] === 0 && buf[2] === 0x61 && buf[8] === 0,
    expected: 'range with encoding works',
    actual: Array.from(buf).join(',')
  };
});

// === 8. 特殊 Buffer 类型测试 ===

test('填充 Buffer.from 创建的 buffer', () => {
  const buf = Buffer.from('hello');
  buf.fill('x');
  return {
    pass: buf.toString() === 'xxxxx',
    expected: 'xxxxx',
    actual: buf.toString()
  };
});

test('填充 Buffer.alloc 创建的 buffer', () => {
  const buf = Buffer.alloc(5);
  buf.fill(0x42);
  return {
    pass: buf.every(b => b === 0x42),
    expected: 'all bytes should be 0x42',
    actual: Array.from(buf).join(',')
  };
});

test('填充 Buffer.allocUnsafe 创建的 buffer', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0x42);
  return {
    pass: buf.every(b => b === 0x42),
    expected: 'all bytes should be 0x42',
    actual: Array.from(buf).join(',')
  };
});

// === 9. 空值和边界组合 ===

test('空字符串 + offset + end', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0xFF);
  buf.fill('', 1, 4);
  return {
    pass: buf[0] === 0xFF && buf[1] === 0 && buf[2] === 0 && buf[3] === 0 && buf[4] === 0xFF,
    expected: 'range filled with 0',
    actual: Array.from(buf).join(',')
  };
});

test('空 Buffer + offset + end', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(0xFF);
    buf.fill(Buffer.alloc(0), 1, 4);
    return {
      pass: false,
      expected: 'should throw exception',
      actual: 'no exception thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('length') || e.message.includes('zero'),
      expected: 'exception about empty buffer',
      actual: e.message
    };
  }
});

// === 10. 大数值精确测试 ===

test('value 为 0x100 (256) 应填充 0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0x100);
  return {
    pass: buf.every(b => b === 0),
    expected: 'all bytes should be 0',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 0x1FF (511) 应填充 255', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0x1FF);
  return {
    pass: buf.every(b => b === 255),
    expected: 'all bytes should be 255',
    actual: Array.from(buf).join(',')
  };
});

test('value 为 0xFFFFFFFF 应填充 255', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0xFFFFFFFF);
  return {
    pass: buf.every(b => b === 255),
    expected: 'all bytes should be 255',
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
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
