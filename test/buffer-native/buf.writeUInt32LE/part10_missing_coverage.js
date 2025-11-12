// buf.writeUInt32LE() - Missing Coverage Tests
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

// Symbol 类型测试
test('Symbol 作为数值应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('Cannot convert a Symbol value to a number');
  }
});

test('Symbol 作为偏移量应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(123, Symbol('test'));
    return false;
  } catch (e) {
    return e.message.includes('must be of type number') || e.message.includes('Cannot convert a Symbol value to a number');
  }
});

// BigInt 类型测试
test('BigInt 作为数值', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(BigInt(123), 0);
    return buf.readUInt32LE(0) === 123;
  } catch (e) {
    // 某些环境可能不支持 BigInt 到 number 的隐式转换
    return e.message.includes('Cannot convert a BigInt value to a number');
  }
});

test('BigInt 超出范围应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(BigInt('0x1FFFFFFFF'), 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('Cannot convert a BigInt value to a number');
  }
});

// 对象类型转换测试
test('带 valueOf 方法的对象', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    valueOf() { return 123; }
  };
  buf.writeUInt32LE(obj, 0);
  return buf.readUInt32LE(0) === 123;
});

test('带 toString 方法的对象', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    toString() { return '456'; }
  };
  buf.writeUInt32LE(obj, 0);
  return buf.readUInt32LE(0) === 456;
});

test('valueOf 和 toString 都存在时优先 valueOf', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    valueOf() { return 789; },
    toString() { return '999'; }
  };
  buf.writeUInt32LE(obj, 0);
  return buf.readUInt32LE(0) === 789;
});

test('valueOf 返回非数字时使用 toString', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    valueOf() { return 'not a number'; },
    toString() { return '321'; }
  };
  buf.writeUInt32LE(obj, 0);
  return buf.readUInt32LE(0) === 0; // 'not a number' 转换为 NaN，然后为 0
});

// 数组类型测试
test('数组作为数值应该转换为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE([1, 2, 3], 0);
  return buf.readUInt32LE(0) === 0; // 数组转换为字符串再转数字通常为 NaN -> 0
});

test('空数组作为数值应该转换为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE([], 0);
  return buf.readUInt32LE(0) === 0;
});

test('单元素数组作为数值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE([123], 0);
  return buf.readUInt32LE(0) === 123;
});

// 函数类型测试
test('函数作为数值应该转换为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(function() {}, 0);
  return buf.readUInt32LE(0) === 0; // 函数转换为 NaN -> 0
});

// Date 对象测试
test('Date 对象作为数值', () => {
  const buf = Buffer.allocUnsafe(4);
  const date = new Date(123);
  buf.writeUInt32LE(date, 0);
  return buf.readUInt32LE(0) === 123;
});

// 正则表达式测试
test('正则表达式作为数值应该转换为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(/test/, 0);
  return buf.readUInt32LE(0) === 0; // RegExp 转换为 NaN -> 0
});

// 特殊字符串测试
test('空白字符串作为数值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE('   ', 0);
  return buf.readUInt32LE(0) === 0; // 空白字符串转换为 0
});

test('换行符字符串作为数值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE('\n', 0);
  return buf.readUInt32LE(0) === 0;
});

test('制表符字符串作为数值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE('\t', 0);
  return buf.readUInt32LE(0) === 0;
});

// 极端浮点数测试
test('极小正数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(Number.MIN_VALUE, 0);
  return buf.readUInt32LE(0) === 0; // 极小数转换为 0
});

test('负零', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(-0, 0);
  return buf.readUInt32LE(0) === 0;
});

// 错误堆栈信息测试
test('错误堆栈包含方法名', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(Infinity, 0);
    return false;
  } catch (e) {
    return e.stack && e.stack.includes('writeUInt32LE');
  }
});

// 参数缺失测试
test('无参数调用', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE();
    return buf.readUInt32LE(0) === 0; // undefined 转换为 0
  } catch (e) {
    return false;
  }
});

// 多余参数测试
test('多余参数应该被忽略', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(123, 0, 'extra', 'params');
  return buf.readUInt32LE(0) === 123;
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
