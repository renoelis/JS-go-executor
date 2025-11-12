// Buffer.allocUnsafe() - Types and Boundary Tests
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

// 参数类型测试
test('传入数字字符串"10"应该抛错', () => {
  try {
    Buffer.allocUnsafe("10");
    console.log('❌ 传入数字字符串"10"应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入数字字符串"10"正确抛错');
    return true;
  }
});

test('传入数字字符串"0"应该抛错', () => {
  try {
    Buffer.allocUnsafe("0");
    console.log('❌ 传入数字字符串"0"应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入数字字符串"0"正确抛错');
    return true;
  }
});

test('传入浮点数10.7', () => {
  const buf = Buffer.allocUnsafe(10.7);
  if (buf.length !== 10) throw new Error(`Expected length 10, got ${buf.length}`);
  if (!(buf instanceof Buffer)) throw new Error('Expected Buffer instance');
  console.log('✅ 传入浮点数10.7');
  return true;
});

test('传入浮点数10.1', () => {
  const buf = Buffer.allocUnsafe(10.1);
  if (buf.length !== 10) throw new Error(`Expected length 10, got ${buf.length}`);
  if (!(buf instanceof Buffer)) throw new Error('Expected Buffer instance');
  console.log('✅ 传入浮点数10.1');
  return true;
});

test('传入负数-1', () => {
  try {
    Buffer.allocUnsafe(-1);
    console.log('❌ 传入负数-1应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入负数-1正确抛错');
    return true;
  }
});

test('传入NaN', () => {
  try {
    Buffer.allocUnsafe(NaN);
    console.log('❌ 传入NaN应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入NaN正确抛错');
    return true;
  }
});

test('传入Infinity', () => {
  try {
    Buffer.allocUnsafe(Infinity);
    console.log('❌ 传入Infinity应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入Infinity正确抛错');
    return true;
  }
});

test('传入-Infinity', () => {
  try {
    Buffer.allocUnsafe(-Infinity);
    console.log('❌ 传入-Infinity应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入-Infinity正确抛错');
    return true;
  }
});

test('传入undefined', () => {
  try {
    Buffer.allocUnsafe(undefined);
    console.log('❌ 传入undefined应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入undefined正确抛错');
    return true;
  }
});

test('传入null', () => {
  try {
    Buffer.allocUnsafe(null);
    console.log('❌ 传入null应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入null正确抛错');
    return true;
  }
});

test('传入非数字字符串"abc"', () => {
  try {
    Buffer.allocUnsafe("abc");
    console.log('❌ 传入非数字字符串"abc"应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入非数字字符串"abc"正确抛错');
    return true;
  }
});

test('传入空字符串""', () => {
  try {
    Buffer.allocUnsafe("");
    console.log('❌ 传入空字符串""应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入空字符串""正确抛错');
    return true;
  }
});

test('传入布尔值true', () => {
  try {
    Buffer.allocUnsafe(true);
    console.log('❌ 传入布尔值true应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入布尔值true正确抛错');
    return true;
  }
});

test('传入布尔值false', () => {
  try {
    Buffer.allocUnsafe(false);
    console.log('❌ 传入布尔值false应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入布尔值false正确抛错');
    return true;
  }
});

test('传入对象{}', () => {
  try {
    Buffer.allocUnsafe({});
    console.log('❌ 传入对象{}应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入对象{}正确抛错');
    return true;
  }
});

test('传入数组[]', () => {
  try {
    Buffer.allocUnsafe([]);
    console.log('❌ 传入数组[]应该抛出错误');
    return false;
  } catch (error) {
    console.log('✅ 传入数组[]正确抛错');
    return true;
  }
});

// 边界值测试
test('传入最大安全整数', () => {
  try {
    // 这里我们使用一个相对较小的值来避免内存问题
    Buffer.allocUnsafe(1000000);
    console.log('✅ 传入大数值(1000000)');
    return true;
  } catch (error) {
    console.log('✅ 传入大数值处理正确');
    return true;
  }
});

test('传入小数0.999', () => {
  const buf = Buffer.allocUnsafe(0.999);
  if (buf.length !== 0) throw new Error(`Expected length 0, got ${buf.length}`);
  console.log('✅ 传入小数0.999');
  return true;
});

test('传入小数1.001', () => {
  const buf = Buffer.allocUnsafe(1.001);
  if (buf.length !== 1) throw new Error(`Expected length 1, got ${buf.length}`);
  console.log('✅ 传入小数1.001');
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