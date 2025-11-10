// buf.compare() - Part 2: 范围参数测试
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
// 1. 基本范围参数
// ============================================================================

test('指定完整范围比较 - 相等', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result = buf1.compare(buf2, 0, 5, 0, 5);
  return {
    pass: result === 0,
    message: `期望 0, 得到 ${result}`
  };
});

test('指定完整范围比较 - 不等', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 0, 5, 0, 5);
  return {
    pass: result === -1,
    message: `期望 -1, 得到 ${result}`
  };
});

test('部分范围相等', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('xellx');
  const result = buf1.compare(buf2, 1, 4, 1, 4);
  return {
    pass: result === 0,
    message: `期望 0 (ell === ell), 得到 ${result}`
  };
});

test('比较不同位置的子串', () => {
  const buf1 = Buffer.from('abcdef');
  const buf2 = Buffer.from('xyzabc');
  const result = buf1.compare(buf2, 3, 6, 0, 3);
  return {
    pass: result === 0,
    message: `期望 0 (abc === abc), 得到 ${result}`
  };
});

// ============================================================================
// 2. 范围参数的边界情况
// ============================================================================

test('targetStart === targetEnd (空范围)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 2, 2, 0, 5);
  return {
    pass: result === 1,
    message: `期望 1 (5 字节 > 0 字节), 得到 ${result}`
  };
});

test('sourceStart === sourceEnd (空范围)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 0, 5, 2, 2);
  return {
    pass: result === -1,
    message: `期望 -1 (0 字节 < 5 字节), 得到 ${result}`
  };
});

test('两边都是空范围', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 2, 2, 3, 3);
  return {
    pass: result === 0,
    message: `期望 0 (0 字节 === 0 字节), 得到 ${result}`
  };
});

test('targetStart > targetEnd (反向范围)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 4, 2, 0, 5);
  return {
    pass: result === 1,
    message: `期望 1 (被修正为空范围), 得到 ${result}`
  };
});

test('sourceStart > sourceEnd (反向范围)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 0, 5, 4, 2);
  return {
    pass: result === -1,
    message: `期望 -1 (被修正为空范围), 得到 ${result}`
  };
});

// ============================================================================
// 3. 负数索引处理 - Node.js 会抛出 RangeError
// ============================================================================

test('targetStart 为负数 - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, -1, 5, 0, 5);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('targetStart'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('sourceStart 为负数 - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, 0, 5, -2, 5);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('sourceStart'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('targetEnd 为负数 - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  try {
    buf1.compare(buf2, 0, -1, 0, 5);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('targetEnd'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

// ============================================================================
// 4. 超出范围的索引 - Node.js 会抛出 RangeError
// ============================================================================

test('targetEnd 超出长度 - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hel');
  try {
    buf1.compare(buf2, 0, 100, 0, 3);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('targetEnd'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('sourceEnd 超出长度 - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hel');
  const buf2 = Buffer.from('hello');
  try {
    buf1.compare(buf2, 0, 5, 0, 100);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('sourceEnd'),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

test('targetStart 和 targetEnd 都超出长度 - 应抛出 RangeError', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.from('hi');
  try {
    buf1.compare(buf2, 100, 200, 0, 2);
    return { pass: false, message: '应该抛出 RangeError 但没有' };
  } catch (e) {
    // 可能先检查 targetEnd 或 targetStart，任意一个都算正确
    return {
      pass: e.name === 'RangeError' && (e.message.includes('targetStart') || e.message.includes('targetEnd')),
      message: `捕获到错误: ${e.name} - ${e.message}`
    };
  }
});

// ============================================================================
// 5. 只传部分参数（测试默认值）
// ============================================================================

test('只传 targetStart', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('llo');
  // 只传 targetStart 时，比较的是 buf2[2:] vs buf1[0:]
  const result = buf1.compare(buf2, 2);
  return {
    pass: result === -1, // hello 完整内容 vs llo[2:] = "o"
    message: `期望 -1 (hello vs llo[2:]), 得到 ${result}`
  };
});

test('传 targetStart 和 targetEnd', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('ell');
  // 比较 buf1 完整内容 vs buf2[1:4]，但 buf2 只有 3 个字节
  try {
    const result = buf1.compare(buf2, 1, 4);
    return {
      pass: false,
      message: `应该抛出 RangeError (targetEnd 超出范围), 但得到 ${result}`
    };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('targetEnd'),
      message: `正确抛出 RangeError: ${e.message}`
    };
  }
});

test('传 targetStart, targetEnd, sourceStart', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('ello');
  const result = buf1.compare(buf2, 0, 4, 1);
  return {
    pass: result === 0,
    message: `期望 0 (hello[1:] vs ello[0:4]), 得到 ${result}`
  };
});

// ============================================================================
// 6. undefined 参数
// ============================================================================

test('targetStart 为 undefined', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result = buf1.compare(buf2, undefined, 5, 0, 5);
  return {
    pass: result === 0,
    message: `期望 0 (undefined 默认为 0), 得到 ${result}`
  };
});

test('所有范围参数都是 undefined', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result = buf1.compare(buf2, undefined, undefined, undefined, undefined);
  return {
    pass: result === 0,
    message: `期望 0 (全部使用默认值), 得到 ${result}`
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

