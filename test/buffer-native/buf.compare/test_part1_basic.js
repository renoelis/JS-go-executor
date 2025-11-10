// buf.compare() - Part 1: 基本功能测试
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
// 1. 基本相等比较
// ============================================================================

test('完全相等的 buffer', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('相同内容不同创建方式', () => {
  const buf1 = Buffer.from([0x61, 0x62, 0x63]);
  const buf2 = Buffer.from('abc', 'utf8');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('与自身比较', () => {
  const buf = Buffer.from('test');
  const result = buf.compare(buf);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('空 buffer 比较', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

// ============================================================================
// 2. 大小比较
// ============================================================================

test('buf1 < buf2 (第一个字节不同)', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('bbc');
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
  };
});

test('buf1 > buf2 (第一个字节不同)', () => {
  const buf1 = Buffer.from('bbc');
  const buf2 = Buffer.from('abc');
  const result = buf1.compare(buf2);
  return {
    pass: result === 1,
    message: `期望 1, 得到 ${result}`
  };
});

test('buf1 < buf2 (中间字节不同)', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('adc');
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
  };
});

test('buf1 > buf2 (最后字节不同)', () => {
  const buf1 = Buffer.from('abd');
  const buf2 = Buffer.from('abc');
  const result = buf1.compare(buf2);
  return {
    pass: result === 1,
    message: `期望 1, 得到 ${result}`
  };
});

test('返回值精确性 - 必须是 -1 而非其他负数', () => {
  const buf1 = Buffer.from([0x00]);
  const buf2 = Buffer.from([0xFF]);
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `期望精确的 -1, 得到 ${result}`
  };
});

test('返回值精确性 - 必须是 1 而非其他正数', () => {
  const buf1 = Buffer.from([0xFF]);
  const buf2 = Buffer.from([0x00]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 1,
    message: `期望精确的 1, 得到 ${result}`
  };
});

// ============================================================================
// 3. 不同长度比较
// ============================================================================

test('buf1 较短且内容相同', () => {
  const buf1 = Buffer.from('ab');
  const buf2 = Buffer.from('abc');
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
  };
});

test('buf1 较长且内容相同', () => {
  const buf1 = Buffer.from('abcd');
  const buf2 = Buffer.from('abc');
  const result = buf1.compare(buf2);
  return {
    pass: result === 1,
    message: `期望 1, 得到 ${result}`
  };
});

test('空 buffer vs 非空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.from('a');
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
  };
});

test('非空 buffer vs 空 buffer', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.alloc(0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 1,
    message: `期望 1, 得到 ${result}`
  };
});

// ============================================================================
// 4. 不同数值的字节比较
// ============================================================================

test('字节值 0x00 vs 0x01', () => {
  const buf1 = Buffer.from([0x00]);
  const buf2 = Buffer.from([0x01]);
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
  };
});

test('字节值 0xFF vs 0x00', () => {
  const buf1 = Buffer.from([0xFF]);
  const buf2 = Buffer.from([0x00]);
  const result = buf1.compare(buf2);
  return {
    pass: result === 1,
    message: `期望 1, 得到 ${result}`
  };
});

test('多字节数值比较', () => {
  const buf1 = Buffer.from([0x01, 0x02, 0x03]);
  const buf2 = Buffer.from([0x01, 0x02, 0x04]);
  const result = buf1.compare(buf2);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
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

