// buf.compare() - Part 4: Buffer.compare 静态方法测试
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
// 1. Buffer.compare 静态方法基本测试
// ============================================================================

test('静态方法 - 相等比较', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  const result = Buffer.compare(buf1, buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('静态方法 - buf1 < buf2', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  const result = Buffer.compare(buf1, buf2);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
  };
});

test('静态方法 - buf1 > buf2', () => {
  const buf1 = Buffer.from('abd');
  const buf2 = Buffer.from('abc');
  const result = Buffer.compare(buf1, buf2);
  return {
    pass: result === 1,
    message: `期望 1, 得到 ${result}`
  };
});

test('静态方法 - 不同长度', () => {
  const buf1 = Buffer.from('ab');
  const buf2 = Buffer.from('abc');
  const result = Buffer.compare(buf1, buf2);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
  };
});

test('静态方法 - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const result = Buffer.compare(buf1, buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

// ============================================================================
// 2. 静态方法用于数组排序
// ============================================================================

test('使用静态方法排序 buffer 数组', () => {
  const buffers = [
    Buffer.from('dog'),
    Buffer.from('cat'),
    Buffer.from('ant'),
    Buffer.from('bird')
  ];
  
  buffers.sort(Buffer.compare);
  
  const expected = ['ant', 'bird', 'cat', 'dog'];
  const actual = buffers.map(b => b.toString('utf8'));
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  
  return {
    pass: match,
    message: `期望 ${JSON.stringify(expected)}, 得到 ${JSON.stringify(actual)}`
  };
});

test('排序包含空 buffer 的数组', () => {
  const buffers = [
    Buffer.from('hello'),
    Buffer.alloc(0),
    Buffer.from('world'),
    Buffer.from('a')
  ];
  
  buffers.sort(Buffer.compare);
  
  // 空 buffer 应该排在最前面
  const pass = buffers[0].length === 0;
  
  return {
    pass: pass,
    message: `空 buffer 应该排在最前面: ${buffers.map(b => b.toString() || '(empty)').join(', ')}`
  };
});

test('排序数值字节的 buffer', () => {
  const buffers = [
    Buffer.from([0x03, 0x02]),
    Buffer.from([0x01, 0x02]),
    Buffer.from([0x02, 0x02]),
    Buffer.from([0x01, 0x01])
  ];
  
  buffers.sort(Buffer.compare);
  
  // 应该按字节值排序
  const pass = buffers[0][0] === 0x01 && buffers[0][1] === 0x01 &&
               buffers[3][0] === 0x03;
  
  return {
    pass: pass,
    message: `排序后: ${buffers.map(b => `[${b[0]},${b[1]}]`).join(', ')}`
  };
});

// ============================================================================
// 3. 静态方法错误处理
// ============================================================================

test('静态方法 - 缺少第一个参数', () => {
  try {
    Buffer.compare();
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('参数'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('静态方法 - 缺少第二个参数', () => {
  const buf = Buffer.from('test');
  try {
    Buffer.compare(buf);
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('参数'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('静态方法 - 第一个参数不是 buffer', () => {
  const buf = Buffer.from('test');
  try {
    Buffer.compare('not a buffer', buf);
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('Buffer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('静态方法 - 第二个参数不是 buffer', () => {
  const buf = Buffer.from('test');
  try {
    Buffer.compare(buf, 'not a buffer');
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('Buffer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('静态方法 - 两个参数都是 null', () => {
  try {
    Buffer.compare(null, null);
    return { pass: false, message: '应该抛出错误但没有' };
  } catch (e) {
    return {
      pass: e.name === 'TypeError' || e.message.includes('buffer') || e.message.includes('Buffer'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

// ============================================================================
// 4. 静态方法与实例方法一致性测试
// ============================================================================

test('静态方法与实例方法结果一致 - 相等', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const staticResult = Buffer.compare(buf1, buf2);
  const instanceResult = buf1.compare(buf2);
  return {
    pass: staticResult === instanceResult && staticResult === 0,
    message: `静态: ${staticResult}, 实例: ${instanceResult}`
  };
});

test('静态方法与实例方法结果一致 - 小于', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  const staticResult = Buffer.compare(buf1, buf2);
  const instanceResult = buf1.compare(buf2);
  return {
    pass: staticResult === instanceResult && staticResult === -1,
    message: `静态: ${staticResult}, 实例: ${instanceResult}`
  };
});

test('静态方法与实例方法结果一致 - 大于', () => {
  const buf1 = Buffer.from('xyz');
  const buf2 = Buffer.from('abc');
  const staticResult = Buffer.compare(buf1, buf2);
  const instanceResult = buf1.compare(buf2);
  return {
    pass: staticResult === instanceResult && staticResult === 1,
    message: `静态: ${staticResult}, 实例: ${instanceResult}`
  };
});

// ============================================================================
// 5. 静态方法与 TypedArray
// ============================================================================

test('静态方法 - Uint8Array 参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  const result = Buffer.compare(buf, arr);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('静态方法 - 两个 Uint8Array', () => {
  const arr1 = new Uint8Array([1, 2, 3]);
  const arr2 = new Uint8Array([1, 2, 3]);
  const result = Buffer.compare(arr1, arr2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

// ============================================================================
// 6. 特殊场景测试
// ============================================================================

test('静态方法 - 交换参数顺序应得到相反结果', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('xyz');
  const result1 = Buffer.compare(buf1, buf2);
  const result2 = Buffer.compare(buf2, buf1);
  return {
    pass: result1 === -1 && result2 === 1 && result1 === -result2,
    message: `compare(buf1, buf2) = ${result1}, compare(buf2, buf1) = ${result2}`
  };
});

test('静态方法 - 传递相同的 buffer 对象', () => {
  const buf = Buffer.from('test');
  const result = Buffer.compare(buf, buf);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('静态方法 - 大量 buffer 排序性能', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from(String(Math.random())));
  }
  
  try {
    buffers.sort(Buffer.compare);
    
    // 验证排序正确性 - 检查是否为升序
    let sorted = true;
    for (let i = 1; i < buffers.length; i++) {
      if (Buffer.compare(buffers[i-1], buffers[i]) > 0) {
        sorted = false;
        break;
      }
    }
    
    return {
      pass: sorted,
      message: `排序了 100 个 buffer, 结果${sorted ? '正确' : '错误'}`
    };
  } catch (e) {
    return {
      pass: false,
      message: `排序过程出错: ${e.message}`
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

