// buffer.btoa() - Round 8: Performance Limits & Stress Tests
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 第8轮：性能极限和压力测试

// 极限长度测试
test('极大字符串 - 100000字节', () => {
  const input = 'x'.repeat(100000);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input && decoded.length === 100000;
});

test('极大字符串 - 200000字节', () => {
  const input = 'y'.repeat(200000);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded === input && decoded.length === 200000;
});

test('极大二进制数据 - 100000字节全0x00', () => {
  const input = '\x00'.repeat(100000);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded.length === 100000;
});

test('极大二进制数据 - 100000字节全0xFF', () => {
  const input = '\xFF'.repeat(100000);
  const result = btoa(input);
  const decoded = atob(result);
  return decoded.length === 100000;
});

test('极大随机数据 - 50000字节', () => {
  let random = '';
  for (let i = 0; i < 50000; i++) {
    random += String.fromCharCode(Math.floor(Math.random() * 256));
  }
  const result = btoa(random);
  const decoded = atob(result);
  return decoded === random;
});

// 特定长度边界测试
test('长度边界 - 接近2^10 (1024)', () => {
  const lengths = [1022, 1023, 1024, 1025, 1026];
  return lengths.every(len => {
    const input = 'a'.repeat(len);
    const result = btoa(input);
    return atob(result) === input;
  });
});

test('长度边界 - 接近2^12 (4096)', () => {
  const lengths = [4094, 4095, 4096, 4097, 4098];
  return lengths.every(len => {
    const input = 'b'.repeat(len);
    const result = btoa(input);
    return atob(result) === input;
  });
});

test('长度边界 - 接近2^14 (16384)', () => {
  const lengths = [16382, 16383, 16384, 16385, 16386];
  return lengths.every(len => {
    const input = 'c'.repeat(len);
    const result = btoa(input);
    return atob(result) === input;
  });
});

test('长度边界 - 接近2^16 (65536)', () => {
  const lengths = [65534, 65535, 65536, 65537];
  return lengths.every(len => {
    const input = 'd'.repeat(len);
    const result = btoa(input);
    return atob(result) === input;
  });
});

// 性能压力测试
test('压力测试 - 1000次短字符串编码', () => {
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    btoa('test string');
  }
  const duration = Date.now() - start;
  return duration < 500; // 应该在500ms内完成
});

test('压力测试 - 100次中等字符串编码', () => {
  const input = 'x'.repeat(1000);
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    btoa(input);
  }
  const duration = Date.now() - start;
  return duration < 500;
});

test('压力测试 - 10次大字符串编码', () => {
  const input = 'x'.repeat(10000);
  const start = Date.now();
  for (let i = 0; i < 10; i++) {
    btoa(input);
  }
  const duration = Date.now() - start;
  return duration < 500;
});

test('压力测试 - 连续编码不同长度', () => {
  const start = Date.now();
  for (let len = 1; len <= 100; len++) {
    btoa('x'.repeat(len));
  }
  const duration = Date.now() - start;
  return duration < 200;
});

test('压力测试 - 往返转换1000次', () => {
  const input = 'round trip test';
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    const encoded = btoa(input);
    const decoded = atob(encoded);
    if (decoded !== input) return false;
  }
  const duration = Date.now() - start;
  return duration < 1000;
});

// 内存压力测试
test('内存压力 - 快速创建销毁大量编码结果', () => {
  for (let i = 0; i < 1000; i++) {
    const result = btoa('temp' + i);
    // 立即丢弃结果，测试GC压力
  }
  return true;
});

test('内存压力 - 大字符串反复编码', () => {
  const input = 'x'.repeat(50000);
  for (let i = 0; i < 20; i++) {
    btoa(input);
  }
  return true;
});

// 并发模拟测试
test('并发模拟 - 快速连续调用', () => {
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(btoa('test' + i));
  }
  // 验证每个结果都正确
  return results.every((r, i) => atob(r) === 'test' + i);
});

test('并发模拟 - 交错不同长度', () => {
  const lengths = [1, 10, 100, 1000, 10, 1];
  return lengths.every(len => {
    const input = 'x'.repeat(len);
    return atob(btoa(input)) === input;
  });
});

// 特殊长度组合
test('特殊长度 - 质数长度序列', () => {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
  return primes.every(p => {
    const input = 'p'.repeat(p);
    return atob(btoa(input)) === input;
  });
});

test('特殊长度 - 2的幂次序列', () => {
  const powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
  return powers.every(p => {
    const input = 'p'.repeat(p);
    return atob(btoa(input)) === input;
  });
});

test('特殊长度 - 斐波那契数列', () => {
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
  return fib.every(f => {
    const input = 'f'.repeat(f);
    return atob(btoa(input)) === input;
  });
});

// 极端字符组合压力
test('极端字符 - 1000个0x00', () => {
  const input = '\x00'.repeat(1000);
  const result = btoa(input);
  return atob(result).length === 1000;
});

test('极端字符 - 1000个0xFF', () => {
  const input = '\xFF'.repeat(1000);
  const result = btoa(input);
  return atob(result).length === 1000;
});

test('极端字符 - 1000个0xAA', () => {
  const input = '\xAA'.repeat(1000);
  const result = btoa(input);
  return atob(result).length === 1000;
});

test('极端字符 - 1000个0x55', () => {
  const input = '\x55'.repeat(1000);
  const result = btoa(input);
  return atob(result).length === 1000;
});

// 输出长度验证压力
test('输出长度公式 - 大量随机长度验证', () => {
  for (let i = 0; i < 100; i++) {
    const len = Math.floor(Math.random() * 1000) + 1;
    const input = 'r'.repeat(len);
    const result = btoa(input);
    const expected = Math.ceil(len / 3) * 4;
    if (result.length !== expected) return false;
  }
  return true;
});

// 边界条件压力测试
test('边界压力 - 大量Latin-1边界字符', () => {
  let input = '';
  for (let i = 0; i < 1000; i++) {
    input += '\xFF';
  }
  const result = btoa(input);
  const decoded = atob(result);
  return decoded.length === 1000;
});

test('边界压力 - 交替边界字符', () => {
  let input = '';
  for (let i = 0; i < 1000; i++) {
    input += i % 2 === 0 ? '\x00' : '\xFF';
  }
  const result = btoa(input);
  const decoded = atob(result);
  return decoded.length === 1000;
});

// 填充模式压力
test('填充压力 - 大量3N长度', () => {
  for (let i = 3; i <= 300; i += 3) {
    const result = btoa('x'.repeat(i));
    if (result.includes('=')) return false;
  }
  return true;
});

test('填充压力 - 大量3N+1长度', () => {
  for (let i = 1; i <= 301; i += 3) {
    const result = btoa('x'.repeat(i));
    if (!result.endsWith('==')) return false;
  }
  return true;
});

test('填充压力 - 大量3N+2长度', () => {
  for (let i = 2; i <= 302; i += 3) {
    const result = btoa('x'.repeat(i));
    if (!result.endsWith('=') || result.endsWith('==')) return false;
  }
  return true;
});

// 随机数据压力测试
test('随机压力 - 100轮随机数据往返', () => {
  for (let round = 0; round < 100; round++) {
    const len = Math.floor(Math.random() * 1000) + 1;
    let random = '';
    for (let i = 0; i < len; i++) {
      random += String.fromCharCode(Math.floor(Math.random() * 256));
    }
    const encoded = btoa(random);
    const decoded = atob(encoded);
    if (decoded !== random) return false;
  }
  return true;
});

// 性能稳定性验证
test('性能稳定性 - 同一输入多次编码时间一致', () => {
  const input = 'x'.repeat(10000);
  const times = [];
  for (let i = 0; i < 20; i++) {
    const start = Date.now();
    btoa(input);
    times.push(Date.now() - start);
  }
  // 检查时间波动不大（最大时间不超过最小时间的10倍）
  const min = Math.min(...times);
  const max = Math.max(...times);
  return max <= min * 10 || max < 50; // 允许小值时的波动
});

// 输出格式一致性压力
test('格式一致性 - 大量输出都符合Base64规范', () => {
  const validChars = /^[A-Za-z0-9+/]*={0,2}$/;
  for (let i = 0; i < 100; i++) {
    const len = Math.floor(Math.random() * 100) + 1;
    const input = 'x'.repeat(len);
    const result = btoa(input);
    if (!validChars.test(result)) return false;
  }
  return true;
});

// 极限测试 - 最大可能长度
test('极限测试 - 500000字节字符串', () => {
  try {
    const input = 'z'.repeat(500000);
    const result = btoa(input);
    const decoded = atob(result);
    return decoded === input && decoded.length === 500000;
  } catch (e) {
    // 如果因为内存限制失败，也认为是合理的
    return e.message.includes('memory') || e.message.includes('length');
  }
});

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
