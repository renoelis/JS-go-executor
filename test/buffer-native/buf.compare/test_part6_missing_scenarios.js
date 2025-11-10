// buf.compare() - Part 6: 补充缺失的测试场景
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
// 1. 更多参数类型验证
// ============================================================================

test('数组作为参数 - 应抛出TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare([1, 2, 3]);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('Buffer'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('Symbol作为参数 - 应抛出TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(Symbol('test'));
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && (e.message.includes('Buffer') || e.message.includes('symbol')),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('Function作为参数 - 应抛出TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(function() {});
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('Buffer'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('正则表达式作为参数 - 应抛出TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(/test/);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('Buffer'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('Date对象作为参数 - 应抛出TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(new Date());
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('Buffer'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

// ============================================================================
// 2. 索引参数的特殊类型
// ============================================================================

test('BigInt作为targetStart - 应抛出TypeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, 0n, 5, 0, 5);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('type number'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('BigInt作为targetEnd - 应抛出TypeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, 0, 5n, 0, 5);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('type number'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('BigInt作为sourceStart - 应抛出TypeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, 0, 5, 0n, 5);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('type number'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('BigInt作为sourceEnd - 应抛出TypeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, 0, 5, 0, 5n);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('type number'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('null作为targetStart - 应抛出TypeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, null, 5, 0, 5);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('type number'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('对象作为targetStart - 应抛出TypeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, {}, 5, 0, 5);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('type number'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

// ============================================================================
// 3. 边界条件组合
// ============================================================================

test('targetStart等于buffer长度（空范围比较）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  // buf2[5:5] vs buf1[0:5] => 空 vs 5字节 => -1
  const result = buf1.compare(buf2, 5, 5, 0, 5);
  return {
    pass: result === 1, // source比target长
    message: `期望 1 (源比目标长), 得到 ${result}`
  };
});

test('sourceStart等于buffer长度（空范围比较）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  // buf2[0:5] vs buf1[5:5] => 5字节 vs 空 => 1
  const result = buf1.compare(buf2, 0, 5, 5, 5);
  return {
    pass: result === -1, // source比target短
    message: `期望 -1 (源比目标短), 得到 ${result}`
  };
});

test('两边都是空范围且在不同位置', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 2, 2, 3, 3);
  return {
    pass: result === 0,
    message: `期望 0 (都是空范围), 得到 ${result}`
  };
});

test('targetStart和targetEnd相等且为最大索引', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const result = buf1.compare(buf2, 4, 4, 0, 4);
  return {
    pass: result === 1,
    message: `期望 1, 得到 ${result}`
  };
});

// ============================================================================
// 4. 返回值精确性验证
// ============================================================================

test('字节差值很大（0x01 vs 0xFE）仍返回-1', () => {
  const buf1 = Buffer.from([0x01]);
  const buf2 = Buffer.from([0xFE]);
  const result = buf1.compare(buf2);
  return {
    pass: result === -1 && result !== -253,
    message: `期望精确的 -1 (不是 -253), 得到 ${result}`
  };
});

test('字节差值很大（0xFE vs 0x01）仍返回1', () => {
  const buf1 = Buffer.from([0xFE]);
  const buf2 = Buffer.from([0x01]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 1 && result !== 253,
    message: `期望精确的 1 (不是 253), 得到 ${result}`
  };
});

test('长度差异很大时仍返回-1或1', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.alloc(1000, 0x61); // 1000个'a'
  const result = buf1.compare(buf2);
  return {
    pass: result === -1 && result !== -999,
    message: `期望 -1 (不是 -999), 得到 ${result}`
  };
});

test('内容完全不同但长度相同时返回-1或1', () => {
  const buf1 = Buffer.from([0x00, 0x00, 0x00]);
  const buf2 = Buffer.from([0xFF, 0xFF, 0xFF]);
  const result = buf1.compare(buf2);
  return {
    pass: result === -1 || result === 1,
    message: `返回值应该是 -1 或 1, 得到 ${result}`
  };
});

// ============================================================================
// 5. 特殊TypedArray类型
// ============================================================================

test('DataView对象 - 应抛出TypeError', () => {
  const buf = Buffer.from('test');
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  try {
    buf.compare(dv);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' && e.message.includes('Buffer'),
      message: `捕获到: ${e.name} - ${e.message}`
    };
  }
});

test('Int32Array与Buffer比较', () => {
  const arr = new Int32Array([0x01020304]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.from(arr.buffer);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Int32Array buffer比较: ${result}`
  };
});

test('Float32Array创建的Buffer比较', () => {
  const arr = new Float32Array([3.14]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.from(arr.buffer);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Float32Array buffer比较: ${result}`
  };
});

test('Float64Array创建的Buffer比较', () => {
  const arr = new Float64Array([3.141592653589793]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.from(arr.buffer);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Float64Array buffer比较: ${result}`
  };
});

test('BigInt64Array创建的Buffer比较', () => {
  const arr = new BigInt64Array([123456789n]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.from(arr.buffer);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `BigInt64Array buffer比较: ${result}`
  };
});

test('BigUint64Array创建的Buffer比较', () => {
  const arr = new BigUint64Array([9876543210n]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.from(arr.buffer);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `BigUint64Array buffer比较: ${result}`
  };
});

// ============================================================================
// 6. 特殊字节模式
// ============================================================================

test('连续1000个相同字节（0xAA）', () => {
  const buf1 = Buffer.alloc(1000, 0xAA);
  const buf2 = Buffer.alloc(1000, 0xAA);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `1000个0xAA比较: ${result}`
  };
});

test('连续1000个相同字节最后一个不同', () => {
  const buf1 = Buffer.alloc(1000, 0xAA);
  const buf2 = Buffer.alloc(1000, 0xAA);
  buf2[999] = 0xAB;
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `最后一个字节不同: ${result}`
  };
});

test('递增字节序列（0x00-0xFF）', () => {
  const buf1 = Buffer.alloc(256);
  const buf2 = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf1[i] = i;
    buf2[i] = i;
  }
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `递增序列比较: ${result}`
  };
});

test('交替字节模式（0x55, 0xAA）', () => {
  const buf1 = Buffer.alloc(100);
  const buf2 = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf1[i] = i % 2 === 0 ? 0x55 : 0xAA;
    buf2[i] = i % 2 === 0 ? 0x55 : 0xAA;
  }
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `交替模式比较: ${result}`
  };
});

// ============================================================================
// 7. 性能和稳定性
// ============================================================================

test('比较修改后的buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result1 = buf1.compare(buf2);
  
  // 修改buf2
  buf2[0] = 0x7A; // 'z'
  const result2 = buf1.compare(buf2);
  
  return {
    pass: result1 === 0 && result2 === -1,
    message: `修改前: ${result1}, 修改后: ${result2}`
  };
});

test('连续10次比较同一对buffer', () => {
  const buf1 = Buffer.from('stable test');
  const buf2 = Buffer.from('stable test');
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(buf1.compare(buf2));
  }
  const allZero = results.every(r => r === 0);
  return {
    pass: allZero,
    message: `10次结果: ${results.join(', ')}`
  };
});

test('在循环中创建和比较buffer', () => {
  let pass = true;
  for (let i = 0; i < 100; i++) {
    const buf1 = Buffer.from('test');
    const buf2 = Buffer.from('test');
    if (buf1.compare(buf2) !== 0) {
      pass = false;
      break;
    }
  }
  return {
    pass: pass,
    message: `100次创建和比较: ${pass ? '全部通过' : '有失败'}`
  };
});

// ============================================================================
// 8. 较大buffer测试
// ============================================================================

test('1MB buffer 比较', () => {
  const size = 1024 * 1024; // 1MB
  const buf1 = Buffer.alloc(size, 0xCC);
  const buf2 = Buffer.alloc(size, 0xCC);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `1MB buffer比较: ${result}`
  };
});

test('1MB buffer 最后字节不同', () => {
  const size = 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xDD);
  const buf2 = Buffer.alloc(size, 0xDD);
  buf2[size - 1] = 0xDE;
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `1MB buffer最后字节不同: ${result}`
  };
});

test('1MB buffer 第一字节不同', () => {
  const size = 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xEE);
  const buf2 = Buffer.alloc(size, 0xEE);
  buf2[0] = 0xEF;
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `1MB buffer第一字节不同: ${result}`
  };
});

// ============================================================================
// 9. Buffer.compare静态方法补充
// ============================================================================

test('静态方法 - 数组作为参数应抛出TypeError', () => {
  const buf = Buffer.from('test');
  try {
    Buffer.compare(buf, [1, 2, 3]);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError',
      message: `捕获到: ${e.name}`
    };
  }
});

test('静态方法 - Symbol作为buf1应抛出TypeError', () => {
  const buf = Buffer.from('test');
  try {
    Buffer.compare(Symbol('test'), buf);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError',
      message: `捕获到: ${e.name}`
    };
  }
});

test('静态方法 - 与DataView比较应抛出TypeError', () => {
  const buf = Buffer.from('test');
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  try {
    Buffer.compare(buf, dv);
    return { pass: false, message: '应该抛出TypeError' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError',
      message: `捕获到: ${e.name}`
    };
  }
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

