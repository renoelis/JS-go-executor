// buf.compare() - Part 9: 额外覆盖测试（查缺补漏）
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
// 1. 参数默认值的完整测试
// ============================================================================

test('只传 target，其他参数使用默认值', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `默认参数: ${result}`
  };
});

test('传 target 和 targetStart，其余默认', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('helloworld');
  // buf1 vs buf2[0:], 默认 targetEnd = buf2.length, sourceStart = 0, sourceEnd = buf1.length
  const result = buf1.compare(buf2, 0);
  return {
    pass: result === -1, // "hello" < "helloworld"
    message: `部分默认参数: ${result}`
  };
});

test('传 undefined 作为所有可选参数', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const result = buf1.compare(buf2, undefined, undefined, undefined, undefined);
  return {
    pass: result === 0,
    message: `所有 undefined: ${result}`
  };
});

// ============================================================================
// 2. 对象属性和原型测试
// ============================================================================

test('Buffer 带有 valueOf 方法（不应影响比较）', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  buf1.valueOf = () => 'should not be called';
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `valueOf 不影响: ${result}`
  };
});

test('Buffer 带有 toString 覆盖（不应影响比较）', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  buf1.toString = () => 'overridden';
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `toString 覆盖不影响: ${result}`
  };
});

test('Buffer 带有 Symbol.toPrimitive', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  buf1[Symbol.toPrimitive] = () => 'primitive';
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Symbol.toPrimitive 不影响: ${result}`
  };
});

// ============================================================================
// 3. 特殊构造的 Buffer
// ============================================================================

test('通过 allocUnsafe 创建的 Buffer（未填充）', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  // 填充相同值以确保可比较
  buf1.fill(0xAB);
  buf2.fill(0xAB);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `allocUnsafe 填充后: ${result}`
  };
});

test('通过 Buffer.from(arrayBuffer, offset, length) 创建', () => {
  const ab = new ArrayBuffer(20);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 20; i++) view[i] = i;
  
  const buf1 = Buffer.from(ab, 5, 10);
  const buf2 = Buffer.from(ab, 5, 10);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `ArrayBuffer offset/length: ${result}`
  };
});

test('concat 创建的 Buffer', () => {
  const buf1 = Buffer.concat([Buffer.from('hello'), Buffer.from('world')]);
  const buf2 = Buffer.from('helloworld');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `concat 创建: ${result}`
  };
});

// ============================================================================
// 4. 范围参数的整数转换测试
// ============================================================================

test('targetStart 为 0.0 (整数值的浮点数)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  // Node.js 接受整数值的浮点数（如 0.0, 5.0）
  const result = buf1.compare(buf2, 0.0, 5.0, 0.0, 5.0);
  return {
    pass: result === 0,
    message: `整数值浮点数被接受: ${result}`
  };
});

test('科学计数法表示的整数 (1e2 = 100)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    // 1e2 = 100, 超出范围
    buf1.compare(buf2, 1e2, 1e3, 0, 5);
    return { pass: false, message: '应该抛出 RangeError' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError',
      message: `科学计数法超出范围: ${e.name}`
    };
  }
});

// ============================================================================
// 5. 索引参数的边界精确测试
// ============================================================================

test('targetStart = -0 (负零等同于 0)', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  // 在 JavaScript 中，-0 === 0 为 true，Node.js 将其视为 0
  const result = buf1.compare(buf2, -0, 4, 0, 4);
  return {
    pass: result === 0,
    message: `-0 被视为 0: ${result}`
  };
});

test('非常接近整数的浮点数 (0.9999999)', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  try {
    buf1.compare(buf2, 0.9999999, 4, 0, 4);
    return { pass: false, message: '应该抛出 RangeError' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('integer'),
      message: `接近整数的浮点数拒绝: ${e.name}`
    };
  }
});

// ============================================================================
// 6. Buffer 与 Uint8Array 的细微差异
// ============================================================================

test('直接比较 Uint8Array（不转换为 Buffer）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  // Node.js 的 buf.compare 可以接受 Uint8Array
  const result = buf.compare(arr);
  return {
    pass: result === 0,
    message: `直接比较 Uint8Array: ${result}`
  };
});

test('Uint8Array 子数组', () => {
  const arr = new Uint8Array([0, 1, 2, 3, 4, 5]);
  const subArr = arr.subarray(1, 4); // [1, 2, 3]
  const buf = Buffer.from([1, 2, 3]);
  const result = buf.compare(subArr);
  return {
    pass: result === 0,
    message: `Uint8Array subarray: ${result}`
  };
});

test('TypedArray 的 buffer 属性', () => {
  const arr1 = new Uint8Array([10, 20, 30]);
  const arr2 = new Uint8Array(arr1.buffer); // 共享 ArrayBuffer
  const buf1 = Buffer.from(arr1);
  const buf2 = Buffer.from(arr2);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `共享 ArrayBuffer: ${result}`
  };
});

// ============================================================================
// 7. 编码和字符边界的复杂测试
// ============================================================================

test('UTF-8 代理对（高低位）', () => {
  // 测试包含代理对的字符串
  const str = '\uD83D\uDE00'; // 😀 emoji
  const buf1 = Buffer.from(str, 'utf8');
  const buf2 = Buffer.from(str, 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0 && buf1.length === 4,
    message: `UTF-8 代理对 (${buf1.length} bytes): ${result}`
  };
});

test('不完整的 UTF-8 序列（字节级别）', () => {
  // 创建不完整的 UTF-8 序列
  const buf1 = Buffer.from([0xE4, 0xB8]); // 不完整的 "中" 字
  const buf2 = Buffer.from([0xE4, 0xB8]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `不完整 UTF-8 序列: ${result}`
  };
});

test('混合有效和无效 UTF-8 字节', () => {
  const buf1 = Buffer.from([0x41, 0xFF, 0x42]); // A, 无效字节, B
  const buf2 = Buffer.from([0x41, 0xFF, 0x42]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `混合有效/无效字节: ${result}`
  };
});

// ============================================================================
// 8. 大数值测试
// ============================================================================

test('比较包含大整数字节表示的 Buffer', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeBigInt64BE(9007199254740991n, 0); // MAX_SAFE_INTEGER
  buf2.writeBigInt64BE(9007199254740991n, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `BigInt 字节表示: ${result}`
  };
});

test('负的大整数', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeBigInt64BE(-9007199254740991n, 0);
  buf2.writeBigInt64BE(-9007199254740991n, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `负 BigInt: ${result}`
  };
});

// ============================================================================
// 9. 静态方法的额外场景
// ============================================================================

test('Buffer.compare 与多个相同的 buffer', () => {
  const buf = Buffer.from('same');
  const buffers = [buf, buf, buf, buf];
  buffers.sort(Buffer.compare);
  // 所有元素应该保持原位（稳定排序）
  return {
    pass: buffers.every(b => b === buf),
    message: `相同 buffer 排序: 全部相同`
  };
});

test('Buffer.compare 与几乎相同的 buffer（最后一位不同）', () => {
  const buffers = [
    Buffer.from([1, 2, 3, 5]),
    Buffer.from([1, 2, 3, 4]),
    Buffer.from([1, 2, 3, 6]),
    Buffer.from([1, 2, 3, 3])
  ];
  buffers.sort(Buffer.compare);
  
  const pass = buffers[0][3] === 3 && buffers[1][3] === 4 && 
               buffers[2][3] === 5 && buffers[3][3] === 6;
  return {
    pass: pass,
    message: `最后一位排序: ${buffers.map(b => b[3]).join(', ')}`
  };
});

// ============================================================================
// 10. 内存和性能边界
// ============================================================================

test('比较后立即修改 buffer（不影响已返回的结果）', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const result1 = buf1.compare(buf2);
  
  // 修改 buf1
  buf1[0] = 0xFF;
  
  // 再次比较
  const result2 = buf1.compare(buf2);
  
  return {
    pass: result1 === 0 && result2 === 1,
    message: `修改前: ${result1}, 修改后: ${result2}`
  };
});

test('比较 10MB buffer 的性能（基础测试）', () => {
  const size = 10 * 1024 * 1024; // 10MB
  try {
    const buf1 = Buffer.alloc(size, 0x55);
    const buf2 = Buffer.alloc(size, 0x55);
    
    const start = Date.now();
    const result = buf1.compare(buf2);
    const elapsed = Date.now() - start;
    
    return {
      pass: result === 0 && elapsed < 5000, // 应该在 5 秒内完成
      message: `10MB 比较耗时: ${elapsed}ms, 结果: ${result}`
    };
  } catch (e) {
    return {
      pass: false,
      message: `10MB 测试失败: ${e.message}`
    };
  }
});

// ============================================================================
// 11. 跨类型比较（确保类型检查严格）
// ============================================================================

test('Map 对象作为参数 - 应抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(new Map());
    return { pass: false, message: '应该抛出 TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError',
      message: `Map 被拒绝: ${e.name}`
    };
  }
});

test('Set 对象作为参数 - 应抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(new Set());
    return { pass: false, message: '应该抛出 TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError',
      message: `Set 被拒绝: ${e.name}`
    };
  }
});

test('WeakMap 对象作为参数 - 应抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(new WeakMap());
    return { pass: false, message: '应该抛出 TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError',
      message: `WeakMap 被拒绝: ${e.name}`
    };
  }
});

test('Promise 对象作为参数 - 应抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(Promise.resolve(Buffer.from('test')));
    return { pass: false, message: '应该抛出 TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError',
      message: `Promise 被拒绝: ${e.name}`
    };
  }
});

// ============================================================================
// 12. 范围参数的边界组合测试
// ============================================================================

test('targetStart=1, targetEnd=1, sourceStart=1, sourceEnd=1', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 1, 1, 1, 1);
  return {
    pass: result === 0,
    message: `四个索引都相同（空范围）: ${result}`
  };
});

test('交叉范围：target[2:4] vs source[1:3]', () => {
  const buf1 = Buffer.from('abcde'); // source
  const buf2 = Buffer.from('xyzab'); // target
  // 比较 buf1[1:3] (bc) vs buf2[2:4] (za)
  const result = buf1.compare(buf2, 2, 4, 1, 3);
  return {
    pass: result === -1, // 'bc' < 'za'
    message: `交叉范围: ${result}`
  };
});

// ============================================================================
// 13. 特殊字符和控制字符
// ============================================================================

test('包含 NULL 终止符的 buffer', () => {
  const buf1 = Buffer.from('test\0data');
  const buf2 = Buffer.from('test\0data');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `NULL 终止符: ${result}`
  };
});

test('控制字符（0x00-0x1F）', () => {
  const buf1 = Buffer.from([0x00, 0x01, 0x02, 0x1F]);
  const buf2 = Buffer.from([0x00, 0x01, 0x02, 0x1F]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `控制字符: ${result}`
  };
});

test('DEL 字符（0x7F）', () => {
  const buf1 = Buffer.from([0x7F]);
  const buf2 = Buffer.from([0x7F]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `DEL 字符: ${result}`
  };
});

// ============================================================================
// 14. 静态方法的对称性和传递性验证
// ============================================================================

test('compare(a, b) + compare(b, a) === 0 (反对称验证)', () => {
  const buf1 = Buffer.from('test1');
  const buf2 = Buffer.from('test2');
  const r1 = Buffer.compare(buf1, buf2);
  const r2 = Buffer.compare(buf2, buf1);
  return {
    pass: r1 + r2 === 0 && r1 === -r2,
    message: `r1=${r1}, r2=${r2}, sum=${r1 + r2}`
  };
});

test('传递性: a<b && b<c => a<c', () => {
  const a = Buffer.from('aaa');
  const b = Buffer.from('bbb');
  const c = Buffer.from('ccc');
  
  const ab = Buffer.compare(a, b) === -1;
  const bc = Buffer.compare(b, c) === -1;
  const ac = Buffer.compare(a, c) === -1;
  
  return {
    pass: ab && bc && ac,
    message: `a<b: ${ab}, b<c: ${bc}, a<c: ${ac}`
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

