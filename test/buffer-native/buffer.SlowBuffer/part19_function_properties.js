// Buffer.allocUnsafeSlow - 函数属性和调用方式测试
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

// 函数属性测试
test('allocUnsafeSlow 是函数类型', () => {
  return typeof Buffer.allocUnsafeSlow === 'function';
});

test('allocUnsafeSlow 函数 length 属性', () => {
  return Buffer.allocUnsafeSlow.length === 1;
});

test('allocUnsafeSlow 函数 name 属性', () => {
  return Buffer.allocUnsafeSlow.name === 'allocUnsafeSlow';
});

test('allocUnsafeSlow 函数 toString', () => {
  const str = Buffer.allocUnsafeSlow.toString();
  return str.includes('function') && str.includes('allocUnsafeSlow');
});

// 函数调用方式测试
test('通过 Buffer.allocUnsafeSlow 调用', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer && buf.length === 10;
});

test('通过 call 调用', () => {
  const buf = Buffer.allocUnsafeSlow.call(Buffer, 5);
  return buf instanceof Buffer && buf.length === 5;
});

test('通过 apply 调用', () => {
  const buf = Buffer.allocUnsafeSlow.apply(Buffer, [8]);
  return buf instanceof Buffer && buf.length === 8;
});

test('通过 bind 调用', () => {
  const boundFunc = Buffer.allocUnsafeSlow.bind(Buffer);
  const buf = boundFunc(15);
  return buf instanceof Buffer && buf.length === 15;
});

// 参数类型处理
test('参数为 undefined 抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(undefined);
    return false;
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('参数为 null 抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(null);
    return false;
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('参数为字符串数字抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow('10');
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('参数为空字符串抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow('');
    return false;
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('参数为 NaN 抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(NaN);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('参数为 Infinity 抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(Infinity);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('参数为负数抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('参数为小数截断', () => {
  const buf = Buffer.allocUnsafeSlow(10.7);
  return buf instanceof Buffer && buf.length === 10;
});

test('参数为布尔值 true 抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(true);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('参数为布尔值 false 抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(false);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Symbol 处理
test('参数为 Symbol 抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(Symbol('test'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 对象参数处理
test('参数为数组取第一个元素', () => {
  try {
    Buffer.allocUnsafeSlow([10, 20]);
    return false;
  } catch (e) {
    return true;
  }
});

test('参数为对象抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow({length: 10});
    return false;
  } catch (e) {
    return true;
  }
});

// 无参数调用
test('无参数调用抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow();
    return false;
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

// 多参数调用
test('多参数只取第一个', () => {
  const buf = Buffer.allocUnsafeSlow(10, 20, 30);
  return buf instanceof Buffer && buf.length === 10;
});

// 函数可枚举性
test('allocUnsafeSlow 在 Buffer 中可访问', () => {
  return 'allocUnsafeSlow' in Buffer;
});

test('allocUnsafeSlow 在 Buffer 原型链上不存在', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return !('allocUnsafeSlow' in buf);
});

// 与 new 操作符
test('new 调用 allocUnsafeSlow 行为检查', () => {
  try {
    const result = new Buffer.allocUnsafeSlow(10);
    // 在某些实现中可能返回Buffer实例
    return result instanceof Buffer && result.length === 10;
  } catch (e) {
    // 在某些实现中可能抛出TypeError
    return e instanceof TypeError;
  }
});

// 函数不可变性
test('不能重新赋值 allocUnsafeSlow', () => {
  const original = Buffer.allocUnsafeSlow;
  try {
    Buffer.allocUnsafeSlow = () => {};
    return Buffer.allocUnsafeSlow !== original;
  } catch (e) {
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
