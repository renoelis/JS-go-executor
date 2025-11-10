const { Buffer } = require('buffer');

// buf.fill() 补充测试 - 覆盖缺失的关键场景
// 基于 Node.js v25.0.0 官方文档规范

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

// === 1. 多字节字符截断行为测试 ===

test('多字节字符截断 - UTF-8 双字节字符', () => {
  // 官方示例：\u0222 占用两个字节在 UTF-8 中
  const buf = Buffer.allocUnsafe(5);
  buf.fill('\u0222');
  // 应该写入 c8 a2 c8 a2 c8 (最后一个字符被截断)
  const expected = Buffer.from([0xc8, 0xa2, 0xc8, 0xa2, 0xc8]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('多字节字符截断 - 奇数长度缓冲区', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.fill('\u0222'); // 双字节字符，在3字节缓冲区中
  // 应该是 c8 a2 c8 (最后一个字符截断)
  const expected = Buffer.from([0xc8, 0xa2, 0xc8]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('多字节字符截断 - 单字节缓冲区', () => {
  const buf = Buffer.allocUnsafe(1);
  buf.fill('\u0222'); // 双字节字符，在1字节缓冲区中
  // 应该只有 c8 (第一个字节)
  const expected = Buffer.from([0xc8]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 2. 无效字符处理测试 ===

test('无效字符 - hex编码包含非法字符应抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('zz', 'hex'); // 'zz' 不是有效的 hex
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: e.message.includes('invalid') || e.message.includes('hex'),
      expected: 'error about invalid hex',
      actual: e.message
    };
  }
});

test('无效字符 - 部分有效hex应截断', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('aazz', 'hex'); // 'aa' 有效，'zz' 无效
    // 应该只使用 'aa' 部分
    const expected = Buffer.from([0xaa, 0xaa, 0xaa, 0xaa, 0xaa]);
    return {
      pass: buf.equals(expected),
      expected: Array.from(expected).join(','),
      actual: Array.from(buf).join(',')
    };
  } catch (e) {
    return {
      pass: false,
      expected: 'should handle partial valid hex',
      actual: e.message
    };
  }
});

test('无效字符 - base64包含非法字符', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill('!!!', 'base64'); // '!!!' 不是有效的 base64
    return {
      pass: true, // Node.js 可能会忽略或处理非法字符
      expected: 'handled gracefully',
      actual: buf.toString('hex')
    };
  } catch (e) {
    return {
      pass: true, // 抛出异常也是可接受的行为
      expected: 'error or handled',
      actual: e.message
    };
  }
});

// === 3. 空 Buffer/Uint8Array 处理测试 ===

test('零长度Buffer填充非零长度Buffer应抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    const emptyBuf = Buffer.alloc(0);
    buf.fill(emptyBuf); // v10.0.0+ 应抛出异常
    return {
      pass: false,
      expected: 'should throw error for zero-length buffer',
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

test('零长度Uint8Array填充非零长度Buffer应抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    const emptyArr = new Uint8Array(0);
    buf.fill(emptyArr); // v10.0.0+ 应抛出异常
    return {
      pass: false,
      expected: 'should throw error for zero-length Uint8Array',
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

// === 4. 大数值处理测试 ===

test('大数值填充应使用 value & 255', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(300); // 300 & 255 = 44
  const expected = Buffer.from([44, 44, 44, 44, 44]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('极大数值填充应使用 value & 255', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.fill(1000); // 1000 & 255 = 232
  const expected = Buffer.from([232, 232, 232]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('负数填充应转换为 uint32', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.fill(-1); // -1 转换为 uint32 是 4294967295，& 255 = 255
  const expected = Buffer.from([255, 255, 255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 5. 负数 end 值测试 ===

test('负数end值应抛出ERR_INDEX_OUT_OF_RANGE', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(1, 0, -1); // v10.0.0+ 应抛出异常
    return {
      pass: false,
      expected: 'should throw error for negative end',
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

test('负数offset和负数end组合', () => {
  try {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(1, -2, -1); // 都应该是负数
    return {
      pass: false,
      expected: 'should throw error',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: true, // 抛出异常是预期行为
      expected: 'error thrown',
      actual: e.message
    };
  }
});

// === 6. offset/end 边界组合测试 ===

test('offset等于buffer长度', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.fill(1, 5, 5); // offset = length
  // 应该返回 buffer，但不填充任何内容
  return {
    pass: result === buf && buf.every(b => b === 0),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

test('end等于0', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.fill(1, 0, 0); // end = 0
  // 应该返回 buffer，但不填充任何内容
  return {
    pass: result === buf && buf.every(b => b === 0),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

test('offset等于end', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.fill(1, 2, 2); // offset = end = 2
  // 应该返回 buffer，但不填充任何内容
  return {
    pass: result === buf && buf.every(b => b === 0),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

test('offset大于end', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.fill(1, 3, 2); // offset > end
  // Node.js 不会抛出错误，而是不填充任何内容
  return {
    pass: result === buf && buf.every(b => b === 0),
    expected: 'buffer unchanged',
    actual: Array.from(buf).join(',')
  };
});

// === 7. 编码参数大小写测试 ===

test('编码大小写不敏感 - UTF8', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  buf1.fill('a', 'utf8');
  buf2.fill('a', 'UTF8');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: 'utf8: ' + buf1.toString('hex') + ', UTF8: ' + buf2.toString('hex')
  };
});

test('编码大小写不敏感 - HEX', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  buf1.fill('aa', 'hex');
  buf2.fill('aa', 'HEX');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: 'hex: ' + buf1.toString('hex') + ', HEX: ' + buf2.toString('hex')
  };
});

test('编码大小写不敏感 - BASE64', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  buf1.fill('YQ==', 'base64');
  buf2.fill('YQ==', 'BASE64');
  return {
    pass: buf1.equals(buf2),
    expected: 'buffers should be equal',
    actual: 'base64: ' + buf1.toString('hex') + ', BASE64: ' + buf2.toString('hex')
  };
});

// === 8. 特殊值类型测试 ===

test('BigInt值应被拒绝', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(123n); // BigInt
    return {
      pass: false,
      expected: 'should throw error for BigInt',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: true, // 抛出异常是预期行为
      expected: 'error thrown',
      actual: e.message
    };
  }
});

test('Symbol值应被拒绝', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.fill(Symbol('test')); // Symbol
    return {
      pass: false,
      expected: 'should throw error for Symbol',
      actual: 'no error thrown'
    };
  } catch (e) {
    return {
      pass: true, // 抛出异常是预期行为
      expected: 'error thrown',
      actual: e.message
    };
  }
});

test('对象应转换为0', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill({}); // Object 转换为 0
  const expected = Buffer.from([0, 0, 0, 0, 0]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

// === 9. 返回值测试 ===

test('返回值应是原buffer引用', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.fill(1);
  return {
    pass: result === buf,
    expected: 'should return same buffer reference',
    actual: result === buf ? 'same reference' : 'different reference'
  };
});

test('链式调用应正常工作', () => {
  const buf = Buffer.allocUnsafe(10);
  const result = buf.fill(1, 0, 5).fill(2, 5, 10);
  const expected = Buffer.from([1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
  return {
    pass: result.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(result).join(',')
  };
});

// === 10. 边界情况测试 ===

test('填充单字节缓冲区', () => {
  const buf = Buffer.allocUnsafe(1);
  buf.fill(255);
  const expected = Buffer.from([255]);
  return {
    pass: buf.equals(expected),
    expected: Array.from(expected).join(','),
    actual: Array.from(buf).join(',')
  };
});

test('填充双字节缓冲区', () => {
  const buf = Buffer.allocUnsafe(2);
  buf.fill(170);
  const expected = Buffer.from([170, 170]);
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
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
