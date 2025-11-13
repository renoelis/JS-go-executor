// buffer.isUtf8() - Part 16: Function Properties and Deep Coverage (查缺补漏1)
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 1. 函数属性测试
test('isUtf8 函数 length 属性', () => {
  return isUtf8.length === 1; // 至少接受1个参数
});

test('isUtf8 函数 name 属性', () => {
  return isUtf8.name === 'isUtf8';
});

test('isUtf8 typeof 检查', () => {
  return typeof isUtf8 === 'function';
});

test('isUtf8 toString 输出', () => {
  const str = isUtf8.toString();
  return typeof str === 'string' && str.length > 0;
});

// 2. 函数调用方式测试
test('apply 调用方式', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8.apply(null, [buf]) === true;
});

test('call 调用方式', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8.call(null, buf) === true;
});

test('bind 调用方式', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const boundFunc = isUtf8.bind(null);
  return boundFunc(buf) === true;
});

// 3. 极端参数组合测试
test('Symbol 参数类型', () => {
  try {
    isUtf8(Symbol('test'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('BigInt 参数类型', () => {
  try {
    isUtf8(BigInt(123));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Function 参数类型', () => {
  try {
    isUtf8(function() {});
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Date 参数类型', () => {
  try {
    isUtf8(new Date());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('RegExp 参数类型', () => {
  try {
    isUtf8(/test/);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Error 参数类型', () => {
  try {
    isUtf8(new Error('test'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 4. 特殊数值参数测试（offset/length）
test('offset 为 NaN', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, NaN) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('offset 为 Infinity', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, Infinity) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('offset 为 -Infinity', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, -Infinity) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('length 为 NaN', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, 0, NaN) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('length 为 Infinity', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, 0, Infinity) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('length 为 -Infinity', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, 0, -Infinity) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

// 5. 参数强制转换边界测试
test('offset 为浮点数 3.14', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, 3.14) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('offset 为负浮点数 -2.5', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, -2.5) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('length 为浮点数 2.9', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, 0, 2.9) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

// 6. 极大数值测试
test('offset 为 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, Number.MAX_SAFE_INTEGER) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('length 为 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, 0, Number.MAX_SAFE_INTEGER) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('offset 为 Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, Number.MIN_SAFE_INTEGER) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

// 7. 零值测试的边界
test('offset = -0', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, -0) === true;
});

test('length = -0', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 0, -0) === true;
});

// 8. 参数数量变化测试
test('无参数调用', () => {
  try {
    isUtf8();
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('4个参数调用', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, 0, 5, 'extra') === 'boolean';
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('5个参数调用', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, 0, 5, 'extra1', 'extra2') === 'boolean';
  } catch (e) {
    return e instanceof TypeError;
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
