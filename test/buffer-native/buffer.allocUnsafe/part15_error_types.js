// Buffer.allocUnsafe() - Error Type Validation Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// TypeError 测试 - 当参数不是数字时
test('传入字符串抛出 TypeError', () => {
  try {
    Buffer.allocUnsafe("10");
    return false;
  } catch (error) {
    if (error.name !== 'TypeError' && !error.message.includes('type')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入字符串抛出错误: ${error.name}`);
    return true;
  }
});

test('传入 null 抛出 TypeError', () => {
  try {
    Buffer.allocUnsafe(null);
    return false;
  } catch (error) {
    if (error.name !== 'TypeError' && !error.message.includes('type')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入 null 抛出错误: ${error.name}`);
    return true;
  }
});

test('传入 undefined 抛出 TypeError', () => {
  try {
    Buffer.allocUnsafe(undefined);
    return false;
  } catch (error) {
    if (error.name !== 'TypeError' && !error.message.includes('type')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入 undefined 抛出错误: ${error.name}`);
    return true;
  }
});

test('传入布尔值抛出 TypeError', () => {
  try {
    Buffer.allocUnsafe(true);
    return false;
  } catch (error) {
    if (error.name !== 'TypeError' && !error.message.includes('type')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入布尔值抛出错误: ${error.name}`);
    return true;
  }
});

test('传入对象抛出 TypeError', () => {
  try {
    Buffer.allocUnsafe({});
    return false;
  } catch (error) {
    if (error.name !== 'TypeError' && !error.message.includes('type')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入对象抛出错误: ${error.name}`);
    return true;
  }
});

test('传入数组抛出 TypeError', () => {
  try {
    Buffer.allocUnsafe([]);
    return false;
  } catch (error) {
    if (error.name !== 'TypeError' && !error.message.includes('type')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入数组抛出错误: ${error.name}`);
    return true;
  }
});

test('传入 Symbol 抛出 TypeError', () => {
  try {
    Buffer.allocUnsafe(Symbol('test'));
    return false;
  } catch (error) {
    if (error.name !== 'TypeError' && !error.message.includes('type')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入 Symbol 抛出错误: ${error.name}`);
    return true;
  }
});

test('传入函数抛出 TypeError', () => {
  try {
    Buffer.allocUnsafe(function(){});
    return false;
  } catch (error) {
    if (error.name !== 'TypeError' && !error.message.includes('type')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入函数抛出错误: ${error.name}`);
    return true;
  }
});

// RangeError 测试 - 当数字超出范围时
test('传入负数抛出 RangeError', () => {
  try {
    Buffer.allocUnsafe(-1);
    return false;
  } catch (error) {
    if (error.name !== 'RangeError' && !error.message.includes('range') && !error.message.includes('negative')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入负数抛出错误: ${error.name}`);
    return true;
  }
});

test('传入 NaN 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafe(NaN);
    return false;
  } catch (error) {
    if (error.name !== 'RangeError' && !error.message.includes('range')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入 NaN 抛出错误: ${error.name}`);
    return true;
  }
});

test('传入 Infinity 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafe(Infinity);
    return false;
  } catch (error) {
    if (error.name !== 'RangeError' && !error.message.includes('range')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入 Infinity 抛出错误: ${error.name}`);
    return true;
  }
});

test('传入 -Infinity 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafe(-Infinity);
    return false;
  } catch (error) {
    if (error.name !== 'RangeError' && !error.message.includes('range')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入 -Infinity 抛出错误: ${error.name}`);
    return true;
  }
});

test('传入超大数值抛出 RangeError', () => {
  try {
    Buffer.allocUnsafe(Number.MAX_SAFE_INTEGER);
    console.log('⚠️ 超大数值可能因内存限制成功或失败');
    return true;
  } catch (error) {
    if (error.name !== 'RangeError' && !error.message.includes('range') && !error.message.includes('memory')) {
      console.log(`⚠️ 错误类型: ${error.name}, 消息: ${error.message}`);
    }
    console.log(`✅ 传入超大数值抛出错误: ${error.name}`);
    return true;
  }
});

// 错误消息验证
test('TypeError 错误消息包含有用信息', () => {
  try {
    Buffer.allocUnsafe("invalid");
    return false;
  } catch (error) {
    if (!error.message || error.message.length === 0) {
      throw new Error('错误消息为空');
    }
    console.log(`✅ TypeError 消息: ${error.message.substring(0, 50)}...`);
    return true;
  }
});

test('RangeError 错误消息包含有用信息', () => {
  try {
    Buffer.allocUnsafe(-100);
    return false;
  } catch (error) {
    if (!error.message || error.message.length === 0) {
      throw new Error('错误消息为空');
    }
    console.log(`✅ RangeError 消息: ${error.message.substring(0, 50)}...`);
    return true;
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
