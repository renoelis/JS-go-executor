// buf.compare() - Part 5: 补充测试（查缺补漏）
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result.pass) {
      tests.push({ name, status: '✅', details: result.message });
    } else {
      tests.push({ name, status: '❌', details: result.message });
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// ============================================================================
// 1. 边界索引值测试
// ============================================================================

test('索引为 0 的边界情况', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result = buf1.compare(buf2, 0, 0, 0, 0);
  return {
    pass: result === 0,
    message: `空范围比较应该相等: ${result}`
  };
});

test('索引等于 buffer 长度（边界值）', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const result = buf1.compare(buf2, 0, 4, 0, 4);
  return {
    pass: result === 0,
    message: `完整范围比较: ${result}`
  };
});

test('targetEnd 刚好等于 buffer 长度', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3);
  return {
    pass: result === 0,
    message: `targetEnd = length 应该合法: ${result}`
  };
});

test('sourceEnd 刚好等于 buffer 长度', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3, 0, 3);
  return {
    pass: result === 0,
    message: `sourceEnd = length 应该合法: ${result}`
  };
});

// ============================================================================
// 2. 更多 TypedArray 类型测试
// ============================================================================

test('与 Uint32Array 比较', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00]);
  const arr = new Uint32Array([1, 2]);
  const result = buf.compare(Buffer.from(arr.buffer));
  return {
    pass: result === 0,
    message: `Uint32Array 比较: ${result}`
  };
});

test('与 Int16Array 比较', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFE, 0xFF]);
  const arr = new Int16Array([-1, -2]);
  const result = buf.compare(Buffer.from(arr.buffer));
  return {
    pass: result === 0,
    message: `Int16Array 比较 (负数): ${result}`
  };
});

test('与 Float64Array 创建的 Buffer 比较', () => {
  const float = new Float64Array([3.14]);
  const buf1 = Buffer.from(float.buffer);
  const buf2 = Buffer.from(float.buffer);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Float64Array buffer 比较: ${result}`
  };
});

// ============================================================================
// 3. 极端长度和性能测试
// ============================================================================

test('较大 buffer 比较 (10KB)', () => {
  const size = 10 * 1024;
  const buf1 = Buffer.alloc(size, 0xAB);
  const buf2 = Buffer.alloc(size, 0xAB);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `10KB buffer 比较: ${result}`
  };
});

test('较大 buffer 最后一个字节不同', () => {
  const size = 8192;
  const buf1 = Buffer.alloc(size, 0xCC);
  const buf2 = Buffer.alloc(size, 0xCC);
  buf2[size - 1] = 0xCD;
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `最后字节不同应返回 -1: ${result}`
  };
});

test('较大 buffer 中间部分比较', () => {
  const size = 5000;
  const buf1 = Buffer.alloc(size, 0xFF);
  const buf2 = Buffer.alloc(size, 0xFF);
  // 比较中间 100 字节
  const result = buf1.compare(buf2, 2000, 2100, 2000, 2100);
  return {
    pass: result === 0,
    message: `大 buffer 中间部分比较: ${result}`
  };
});

// ============================================================================
// 4. 重复比较和稳定性测试
// ============================================================================

test('相同对象多次比较稳定性', () => {
  const buf1 = Buffer.from('stable test');
  const buf2 = Buffer.from('stable test');
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(buf1.compare(buf2));
  }
  const allZero = results.every(r => r === 0);
  return {
    pass: allZero,
    message: `10次比较结果: ${results.join(', ')}`
  };
});

test('循环比较不同 buffer', () => {
  const buffers = [
    Buffer.from('aaa'),
    Buffer.from('bbb'),
    Buffer.from('ccc')
  ];
  let pass = true;
  for (let i = 0; i < buffers.length - 1; i++) {
    if (buffers[i].compare(buffers[i + 1]) !== -1) {
      pass = false;
      break;
    }
  }
  return {
    pass: pass,
    message: `循环比较结果正确: ${pass}`
  };
});

// ============================================================================
// 5. 边界条件组合测试
// ============================================================================

test('空 buffer 与非空范围比较', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.from('test');
  const result = buf1.compare(buf2, 0, 4);
  return {
    pass: result === -1,
    message: `空 buffer < 非空: ${result}`
  };
});

test('两个 buffer 在不同偏移处相等', () => {
  const buf1 = Buffer.from('xxxABCyyy');
  const buf2 = Buffer.from('zzzABCzzz');
  const result = buf1.compare(buf2, 3, 6, 3, 6);
  return {
    pass: result === 0,
    message: `不同偏移处的相同子串: ${result}`
  };
});

test('重叠范围的比较', () => {
  const buf1 = Buffer.from('abcdefgh');
  const buf2 = Buffer.from('abcdefgh');
  // 比较 buf2[2:5] vs buf1[1:4]
  // 即 "cde" vs "bcd"
  const result = buf1.compare(buf2, 2, 5, 1, 4);
  return {
    pass: result === -1, // 实际上是比较 buf1[1:4] vs buf2[2:5], 即 "bcd" vs "cde", b < c
    message: `重叠范围比较: ${result}`
  };
});

// ============================================================================
// 6. 字符编码边界测试
// ============================================================================

test('UTF-8 多字节字符在边界处', () => {
  const buf1 = Buffer.from('测试', 'utf8'); // "测试" = 6 bytes in UTF-8
  const buf2 = Buffer.from('测试', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `UTF-8 多字节字符: ${result}`
  };
});

test('部分多字节字符比较（字节级别）', () => {
  const buf1 = Buffer.from('你好世界', 'utf8');
  const buf2 = Buffer.from('你好世界', 'utf8');
  // 比较前 6 个字节（恰好是前两个字符）
  const result = buf1.compare(buf2, 0, 6, 0, 6);
  return {
    pass: result === 0,
    message: `部分多字节字符比较: ${result}`
  };
});

test('emoji 字符的字节比较', () => {
  const buf1 = Buffer.from('👍', 'utf8'); // 4 bytes
  const buf2 = Buffer.from('👍', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0 && buf1.length === 4,
    message: `emoji 比较 (${buf1.length} bytes): ${result}`
  };
});

test('混合 ASCII 和多字节字符', () => {
  const buf1 = Buffer.from('Hello世界', 'utf8');
  const buf2 = Buffer.from('Hello世界', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `混合字符: ${result}`
  };
});

// ============================================================================
// 7. 零字节和特殊字节模式
// ============================================================================

test('包含零字节的 buffer', () => {
  const buf1 = Buffer.from([0x41, 0x00, 0x42, 0x00]);
  const buf2 = Buffer.from([0x41, 0x00, 0x42, 0x00]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `包含零字节: ${result}`
  };
});

test('零字节影响比较结果', () => {
  const buf1 = Buffer.from([0x41, 0x00, 0x42]);
  const buf2 = Buffer.from([0x41, 0x01, 0x42]);
  const result = buf1.compare(buf2);
  return {
    pass: result === -1, // 0x00 < 0x01
    message: `零字节位置影响: ${result}`
  };
});

test('交替的 0x00 和 0xFF', () => {
  const buf1 = Buffer.from([0x00, 0xFF, 0x00, 0xFF]);
  const buf2 = Buffer.from([0x00, 0xFF, 0x00, 0xFF]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `交替字节模式: ${result}`
  };
});

// ============================================================================
// 8. 参数强制转换测试
// ============================================================================

test('字符串形式的数字索引（应抛出 TypeError）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    // Node.js v25 不会自动转换字符串为数字，会抛出 TypeError
    const result = buf1.compare(buf2, "1", "3", "1", "3");
    return {
      pass: false,
      message: `应该抛出 TypeError 但返回了: ${result}`
    };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('type number'),
      message: `正确抛出错误: ${e.name} - ${e.message}`
    };
  }
});

test('布尔值作为索引（应抛出 TypeError）', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  try {
    // Node.js v25 不会自动转换布尔值为数字，会抛出 TypeError
    const result = buf1.compare(buf2, false, true, false, true);
    return {
      pass: false,
      message: `应该抛出 TypeError 但返回了: ${result}`
    };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('type number'),
      message: `正确抛出错误: ${e.name} - ${e.message}`
    };
  }
});

// ============================================================================
// 9. 静态方法补充测试
// ============================================================================

test('Buffer.compare 与字节序无关', () => {
  // 比较是逐字节进行的，与平台字节序无关
  const buf1 = Buffer.from([0x01, 0x02]);
  const buf2 = Buffer.from([0x02, 0x01]);
  const result = Buffer.compare(buf1, buf2);
  return {
    pass: result === -1, // 第一个字节 0x01 < 0x02
    message: `字节序无关比较: ${result}`
  };
});

test('Buffer.compare 用于查找重复', () => {
  const buffers = [
    Buffer.from('aaa'),
    Buffer.from('bbb'),
    Buffer.from('aaa'), // 重复
    Buffer.from('ccc')
  ];
  
  const sorted = buffers.slice().sort(Buffer.compare);
  // 相同的 buffer 应该相邻
  let foundDuplicate = false;
  for (let i = 1; i < sorted.length; i++) {
    if (Buffer.compare(sorted[i-1], sorted[i]) === 0) {
      foundDuplicate = true;
      break;
    }
  }
  
  return {
    pass: foundDuplicate,
    message: `排序后找到重复项: ${foundDuplicate}`
  };
});

// ============================================================================
// 10. 内存安全和越界保护
// ============================================================================

test('读取已分配但未初始化的内存', () => {
  // allocUnsafe 分配未初始化的内存
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  // 填充相同值
  buf1.fill(0x55);
  buf2.fill(0x55);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `allocUnsafe 后填充的 buffer: ${result}`
  };
});

test('比较部分初始化的 buffer', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  // 只初始化前 5 个字节
  buf1.fill(0xAA, 0, 5);
  buf2.fill(0xAA, 0, 5);
  // 只比较初始化的部分
  const result = buf1.compare(buf2, 0, 5, 0, 5);
  return {
    pass: result === 0,
    message: `部分初始化 buffer 比较: ${result}`
  };
});

// ============================================================================
// 输出结果
// ============================================================================

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

