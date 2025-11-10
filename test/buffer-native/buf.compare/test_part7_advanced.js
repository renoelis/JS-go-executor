// buf.compare() - Part 7: 高级场景和边界测试
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
// 1. ArrayBuffer 和 SharedArrayBuffer 支持
// ============================================================================

test('直接使用 ArrayBuffer 创建的 Buffer', () => {
  const ab1 = new ArrayBuffer(8);
  const view1 = new Uint8Array(ab1);
  view1.set([1, 2, 3, 4, 5, 6, 7, 8]);
  
  const ab2 = new ArrayBuffer(8);
  const view2 = new Uint8Array(ab2);
  view2.set([1, 2, 3, 4, 5, 6, 7, 8]);
  
  const buf1 = Buffer.from(ab1);
  const buf2 = Buffer.from(ab2);
  const result = buf1.compare(buf2);
  
  return {
    pass: result === 0,
    message: `ArrayBuffer 创建的 Buffer 比较: ${result}`
  };
});

test('ArrayBuffer 部分内容比较', () => {
  const ab = new ArrayBuffer(16);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 16; i++) view[i] = i;
  
  const buf1 = Buffer.from(ab, 0, 8);
  const buf2 = Buffer.from(ab, 8, 8);
  const result = buf1.compare(buf2);
  
  return {
    pass: result === -1, // [0-7] < [8-15]
    message: `ArrayBuffer 部分比较: ${result}`
  };
});

test('SharedArrayBuffer 创建的 Buffer（若支持）', () => {
  try {
    if (typeof SharedArrayBuffer === 'undefined') {
      return { pass: true, message: 'SharedArrayBuffer 不支持，跳过' };
    }
    
    const sab1 = new SharedArrayBuffer(8);
    const view1 = new Uint8Array(sab1);
    view1.set([1, 2, 3, 4, 5, 6, 7, 8]);
    
    const sab2 = new SharedArrayBuffer(8);
    const view2 = new Uint8Array(sab2);
    view2.set([1, 2, 3, 4, 5, 6, 7, 8]);
    
    const buf1 = Buffer.from(sab1);
    const buf2 = Buffer.from(sab2);
    const result = buf1.compare(buf2);
    
    return {
      pass: result === 0,
      message: `SharedArrayBuffer 比较: ${result}`
    };
  } catch (e) {
    return { pass: true, message: `SharedArrayBuffer 测试跳过: ${e.message}` };
  }
});

// ============================================================================
// 2. 最大整数安全范围测试
// ============================================================================

test('MAX_SAFE_INTEGER 作为索引 - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  try {
    buf1.compare(buf2, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0, 4);
    return { pass: false, message: '应该抛出 RangeError' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && (e.message.includes('targetStart') || e.message.includes('targetEnd')),
      message: `捕获到: ${e.name} - ${e.message.substring(0, 100)}`
    };
  }
});

test('超过 MAX_SAFE_INTEGER 的索引', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  try {
    const tooLarge = Number.MAX_SAFE_INTEGER + 1;
    buf1.compare(buf2, tooLarge, 4, 0, 4);
    return { pass: false, message: '应该抛出 RangeError' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError',
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

// ============================================================================
// 3. 极端大小的 Buffer
// ============================================================================

test('5MB Buffer 完全相等比较', () => {
  const size = 5 * 1024 * 1024; // 5MB
  const buf1 = Buffer.alloc(size, 0x42);
  const buf2 = Buffer.alloc(size, 0x42);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `5MB Buffer 比较: ${result}`
  };
});

test('5MB Buffer 中间位置不同', () => {
  const size = 5 * 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0x42);
  const buf2 = Buffer.alloc(size, 0x42);
  buf2[Math.floor(size / 2)] = 0x43;
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `5MB Buffer 中间不同: ${result}`
  };
});

test('比较 Buffer 的大段范围（1MB 范围）', () => {
  const size = 2 * 1024 * 1024; // 2MB
  const buf1 = Buffer.alloc(size, 0x55);
  const buf2 = Buffer.alloc(size, 0x55);
  const rangeSize = 1024 * 1024; // 1MB
  const result = buf1.compare(buf2, 0, rangeSize, 0, rangeSize);
  return {
    pass: result === 0,
    message: `1MB 范围比较: ${result}`
  };
});

// ============================================================================
// 4. 字符编码边界极端测试
// ============================================================================

test('4字节 UTF-8 字符（emoji 家族）', () => {
  const buf1 = Buffer.from('👨‍👩‍👧‍👦', 'utf8');
  const buf2 = Buffer.from('👨‍👩‍👧‍👦', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `复杂 emoji 比较 (${buf1.length} bytes): ${result}`
  };
});

test('混合多种语言字符', () => {
  const mixed = 'Hello世界مرحباこんにちは🌍';
  const buf1 = Buffer.from(mixed, 'utf8');
  const buf2 = Buffer.from(mixed, 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `混合语言字符 (${buf1.length} bytes): ${result}`
  };
});

test('UTF-8 BOM 标记', () => {
  const buf1 = Buffer.from('\uFEFFHello', 'utf8');
  const buf2 = Buffer.from('\uFEFFHello', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `UTF-8 BOM 比较: ${result}`
  };
});

test('零宽字符（Zero-Width）', () => {
  const buf1 = Buffer.from('a\u200Bb', 'utf8'); // Zero-width space
  const buf2 = Buffer.from('a\u200Bb', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `零宽字符比较: ${result}`
  };
});

// ============================================================================
// 5. 特殊二进制模式
// ============================================================================

test('随机字节模式 1000 字节', () => {
  const buf1 = Buffer.alloc(1000);
  const buf2 = Buffer.alloc(1000);
  // 使用伪随机但可重现的模式
  for (let i = 0; i < 1000; i++) {
    const val = (i * 7 + 13) % 256;
    buf1[i] = val;
    buf2[i] = val;
  }
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `随机字节模式: ${result}`
  };
});

test('斐波那契字节序列', () => {
  const buf1 = Buffer.alloc(20);
  const buf2 = Buffer.alloc(20);
  let a = 0, b = 1;
  for (let i = 0; i < 20; i++) {
    buf1[i] = a % 256;
    buf2[i] = a % 256;
    [a, b] = [b, (a + b) % 256];
  }
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `斐波那契序列: ${result}`
  };
});

test('所有可能字节值（0x00-0xFF）', () => {
  const buf1 = Buffer.alloc(256);
  const buf2 = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf1[i] = i;
    buf2[i] = i;
  }
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `完整字节空间: ${result}`
  };
});

// ============================================================================
// 6. 内存安全和边界保护
// ============================================================================

test('allocUnsafe 后立即比较（不初始化）', () => {
  const buf1 = Buffer.allocUnsafe(100);
  const buf2 = Buffer.allocUnsafe(100);
  // 填充相同内容
  buf1.fill(0x99);
  buf2.fill(0x99);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `allocUnsafe 后填充比较: ${result}`
  };
});

test('越界索引的严格检查 - targetStart', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  try {
    buf1.compare(buf2, 10, 20, 0, 3);
    return { pass: false, message: '应该抛出 RangeError' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('targetEnd'),
      message: `正确抛出: ${e.name}`
    };
  }
});

test('越界索引的严格检查 - sourceStart', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  try {
    buf1.compare(buf2, 0, 3, 10, 20);
    return { pass: false, message: '应该抛出 RangeError' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('sourceEnd'),
      message: `正确抛出: ${e.name}`
    };
  }
});

// ============================================================================
// 7. 并发和稳定性测试
// ============================================================================

test('快速连续比较 10000 次', () => {
  const buf1 = Buffer.from('stability test');
  const buf2 = Buffer.from('stability test');
  let allPass = true;
  for (let i = 0; i < 10000; i++) {
    if (buf1.compare(buf2) !== 0) {
      allPass = false;
      break;
    }
  }
  return {
    pass: allPass,
    message: `10000 次连续比较: ${allPass ? '全部通过' : '失败'}`
  };
});

test('交替修改和比较', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const results = [];
  
  results.push(buf1.compare(buf2)); // 应该是 0
  buf1[0] = 0x7A; // 修改为 'z'
  results.push(buf1.compare(buf2)); // 应该是 1
  buf1[0] = 0x74; // 改回 't'
  results.push(buf1.compare(buf2)); // 应该是 0
  
  const pass = results[0] === 0 && results[1] === 1 && results[2] === 0;
  return {
    pass: pass,
    message: `交替修改结果: [${results.join(', ')}]`
  };
});

// ============================================================================
// 8. 特殊 TypedArray 视图
// ============================================================================

test('Uint8ClampedArray 创建的 Buffer', () => {
  const arr1 = new Uint8ClampedArray([255, 128, 0]);
  const arr2 = new Uint8ClampedArray([255, 128, 0]);
  const buf1 = Buffer.from(arr1.buffer);
  const buf2 = Buffer.from(arr2.buffer);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Uint8ClampedArray 比较: ${result}`
  };
});

test('不同 TypedArray 相同字节内容', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4]);
  const int8 = new Int8Array([1, 2, 3, 4]);
  const buf1 = Buffer.from(uint8.buffer);
  const buf2 = Buffer.from(int8.buffer);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `不同 TypedArray 相同字节: ${result}`
  };
});

// ============================================================================
// 9. 原型链和对象属性测试
// ============================================================================

test('Buffer 实例自定义属性不影响比较', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  buf1.customProperty = 'should not affect';
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `自定义属性不影响: ${result}`
  };
});

test('冻结的 Buffer 对象', () => {
  const buf1 = Buffer.from('frozen');
  const buf2 = Buffer.from('frozen');
  try {
    Object.freeze(buf1);
    const result = buf1.compare(buf2);
    return {
      pass: result === 0,
      message: `冻结对象比较: ${result}`
    };
  } catch (e) {
    // Node.js v25 不允许冻结有元素的 TypedArray
    return {
      pass: e.message.includes('Cannot freeze'),
      message: `Node.js v25 不支持冻结 Buffer: ${e.message}`
    };
  }
});

// ============================================================================
// 10. 零拷贝和性能相关
// ============================================================================

test('slice 后的 Buffer 比较（共享内存）', () => {
  const original = Buffer.from('hello world');
  const slice1 = original.slice(0, 5);
  const slice2 = original.slice(0, 5);
  const result = slice1.compare(slice2);
  return {
    pass: result === 0,
    message: `slice 共享内存比较: ${result}`
  };
});

test('subarray 后的 Buffer 比较', () => {
  const original = Buffer.from('abcdefgh');
  const sub1 = original.subarray(2, 6);
  const sub2 = Buffer.from('cdef');
  const result = sub1.compare(sub2);
  return {
    pass: result === 0,
    message: `subarray 比较: ${result}`
  };
});

test('修改原始 Buffer 影响 slice', () => {
  const original = Buffer.from('hello');
  const slice1 = original.slice(0, 5);
  const slice2 = Buffer.from('hello');
  
  const result1 = slice1.compare(slice2);
  original[0] = 0x7A; // 修改原始 buffer
  const result2 = slice1.compare(slice2);
  
  return {
    pass: result1 === 0 && result2 === 1,
    message: `修改原始影响 slice: ${result1}, ${result2}`
  };
});

// ============================================================================
// 11. 边界组合极端测试
// ============================================================================

test('只比较单个字节范围', () => {
  const buf1 = Buffer.from('abcde');
  const buf2 = Buffer.from('abcde');
  const result = buf1.compare(buf2, 2, 3, 2, 3);
  return {
    pass: result === 0,
    message: `单字节范围比较: ${result}`
  };
});

test('范围长度不同 - 短范围在前', () => {
  const buf1 = Buffer.from('abcdefgh');
  const buf2 = Buffer.from('abcdefgh');
  // 比较 buf1[0:3] vs buf2[0:5]
  const result = buf1.compare(buf2, 0, 5, 0, 3);
  return {
    pass: result === -1, // source 比 target 短
    message: `不同长度范围: ${result}`
  };
});

test('范围长度不同 - 长范围在前', () => {
  const buf1 = Buffer.from('abcdefgh');
  const buf2 = Buffer.from('abcdefgh');
  // 比较 buf1[0:5] vs buf2[0:3]
  const result = buf1.compare(buf2, 0, 3, 0, 5);
  return {
    pass: result === 1, // source 比 target 长
    message: `不同长度范围: ${result}`
  };
});

// ============================================================================
// 12. 静态方法极端场景
// ============================================================================

test('Buffer.compare 与 1000 个 buffer 排序', () => {
  const buffers = [];
  for (let i = 999; i >= 0; i--) {
    buffers.push(Buffer.from(String(i).padStart(3, '0')));
  }
  
  buffers.sort(Buffer.compare);
  
  // 验证排序正确性
  let sorted = true;
  for (let i = 0; i < buffers.length; i++) {
    if (buffers[i].toString() !== String(i).padStart(3, '0')) {
      sorted = false;
      break;
    }
  }
  
  return {
    pass: sorted,
    message: `1000 个 buffer 排序: ${sorted ? '正确' : '失败'}`
  };
});

test('Buffer.compare 处理重复值', () => {
  const buffers = [
    Buffer.from('aaa'),
    Buffer.from('bbb'),
    Buffer.from('aaa'),
    Buffer.from('bbb'),
    Buffer.from('aaa')
  ];
  
  buffers.sort(Buffer.compare);
  
  // 所有 'aaa' 应该在 'bbb' 之前
  const firstBIndex = buffers.findIndex(b => b.toString() === 'bbb');
  const lastAIndex = buffers.findIndex(b => b.toString() === 'bbb') - 1;
  
  return {
    pass: firstBIndex === 3,
    message: `重复值排序正确: firstBIndex=${firstBIndex}`
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

