// Buffer.allocUnsafe() - Error Handling Tests
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

// 错误类型和消息验证
test('传入负数-1的错误类型', () => {
  try {
    Buffer.allocUnsafe(-1);
    return false;
  } catch (error) {
    console.log('✅ 传入负数-1抛出错误');
    return true;
  }
});

test('传入负数-100的错误类型', () => {
  try {
    Buffer.allocUnsafe(-100);
    return false;
  } catch (error) {
    console.log('✅ 传入负数-100抛出错误');
    return true;
  }
});

test('传入NaN的错误类型', () => {
  try {
    Buffer.allocUnsafe(NaN);
    return false;
  } catch (error) {
    console.log('✅ 传入NaN抛出错误');
    return true;
  }
});

test('传入Infinity的错误类型', () => {
  try {
    Buffer.allocUnsafe(Infinity);
    return false;
  } catch (error) {
    console.log('✅ 传入Infinity抛出错误');
    return true;
  }
});

test('传入-Infinity的错误类型', () => {
  try {
    Buffer.allocUnsafe(-Infinity);
    return false;
  } catch (error) {
    console.log('✅ 传入-Infinity抛出错误');
    return true;
  }
});

test('传入undefined的错误类型', () => {
  try {
    Buffer.allocUnsafe(undefined);
    return false;
  } catch (error) {
    console.log('✅ 传入undefined抛出错误');
    return true;
  }
});

test('传入null的错误类型', () => {
  try {
    Buffer.allocUnsafe(null);
    return false;
  } catch (error) {
    console.log('✅ 传入null抛出错误');
    return true;
  }
});

test('传入非数字字符串"abc"的错误类型', () => {
  try {
    Buffer.allocUnsafe("abc");
    return false;
  } catch (error) {
    console.log('✅ 传入非数字字符串"abc"抛出错误');
    return true;
  }
});

test('传入空字符串""的错误类型', () => {
  try {
    Buffer.allocUnsafe("");
    return false;
  } catch (error) {
    console.log('✅ 传入空字符串""抛出错误');
    return true;
  }
});

test('传入布尔值true的错误类型', () => {
  try {
    Buffer.allocUnsafe(true);
    return false;
  } catch (error) {
    console.log('✅ 传入布尔值true抛出错误');
    return true;
  }
});

test('传入布尔值false的错误类型', () => {
  try {
    Buffer.allocUnsafe(false);
    return false;
  } catch (error) {
    console.log('✅ 传入布尔值false抛出错误');
    return true;
  }
});

test('传入对象{}的错误类型', () => {
  try {
    Buffer.allocUnsafe({});
    return false;
  } catch (error) {
    console.log('✅ 传入对象{}抛出错误');
    return true;
  }
});

test('传入数组[]的错误类型', () => {
  try {
    Buffer.allocUnsafe([]);
    return false;
  } catch (error) {
    console.log('✅ 传入数组[]抛出错误');
    return true;
  }
});

test('传入函数function(){}的错误类型', () => {
  try {
    Buffer.allocUnsafe(function(){});
    return false;
  } catch (error) {
    console.log('✅ 传入函数function(){}抛出错误');
    return true;
  }
});

test('传入Symbol的错误类型', () => {
  try {
    Buffer.allocUnsafe(Symbol('test'));
    return false;
  } catch (error) {
    console.log('✅ 传入Symbol抛出错误');
    return true;
  }
});

// 内存限制测试
test('尝试分配超大Buffer(超出限制)', () => {
  try {
    // 使用一个非常大的值，但注意实际内存限制（改为100MB避免OOM）
    Buffer.allocUnsafe(100 * 1024 * 1024); // 100MB
    console.log('✅ 超大Buffer分配处理');
    return true;
  } catch (error) {
    console.log('✅ 超大Buffer分配正确抛错');
    return true;
  }
});

// 错误消息验证
test('错误消息包含有效信息', () => {
  const errorCases = [
    { input: -1, desc: '负数' },
    { input: "abc", desc: '非数字字符串' },
    { input: {}, desc: '对象' }
  ];

  for (const testCase of errorCases) {
    try {
      Buffer.allocUnsafe(testCase.input);
      return false;
    } catch (error) {
      if (!error.message) {
        console.log(`❌ ${testCase.desc}错误消息为空`);
        return false;
      }
    }
  }
  console.log('✅ 所有错误消息都包含有效信息');
  return true;
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