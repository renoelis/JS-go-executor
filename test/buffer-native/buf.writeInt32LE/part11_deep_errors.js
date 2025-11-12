// buf.writeInt32LE() - 深度补充：错误消息与堆栈验证
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

// RangeError 详细验证
test('RangeError：越界时的错误名称', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError：越界时有堆栈', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return typeof e.stack === 'string' && e.stack.length > 0;
  }
});

test('RangeError：值超范围时的错误名称', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(2147483648, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError：值超范围时有堆栈', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(2147483648, 0);
    return false;
  } catch (e) {
    return typeof e.stack === 'string' && e.stack.length > 0;
  }
});

test('RangeError：Infinity 错误名称', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError：-Infinity 错误名称', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(-Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError：负 offset 错误名称', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError：浮点 offset 错误名称', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(123, 2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// TypeError 详细验证
test('TypeError：offset 为字符串时的错误名称', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(123, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError：offset 为字符串时有堆栈', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(123, '2');
    return false;
  } catch (e) {
    return typeof e.stack === 'string' && e.stack.length > 0;
  }
});

test('TypeError：offset 为 null 时的错误名称', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(123, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError：offset 为 null 时有堆栈', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(123, null);
    return false;
  } catch (e) {
    return typeof e.stack === 'string' && e.stack.length > 0;
  }
});

test('TypeError：value 为 Symbol 时的错误名称', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError：value 为 Symbol 时有堆栈', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return typeof e.stack === 'string' && e.stack.length > 0;
  }
});

test('TypeError：this 为 null 时的错误名称', () => {
  try {
    Buffer.prototype.writeInt32LE.call(null, 123, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError：this 为 undefined 时的错误名称', () => {
  try {
    Buffer.prototype.writeInt32LE.call(undefined, 123, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 错误消息内容验证
test('错误消息：越界包含关键词', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('out of') || e.message.includes('bounds');
  }
});

test('错误消息：offset 类型错误包含关键词', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(123, '2');
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('type');
  }
});

test('错误消息：值超范围包含关键词', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(2147483648, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('2147483647') || e.message.includes('-2147483648');
  }
});

// 错误对象属性
test('错误对象：有 message 属性', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return 'message' in e && typeof e.message === 'string';
  }
});

test('错误对象：有 name 属性', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return 'name' in e && typeof e.name === 'string';
  }
});

test('错误对象：有 stack 属性', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return 'stack' in e && typeof e.stack === 'string';
  }
});

test('错误对象：是 Error 实例', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return e instanceof Error;
  }
});

test('错误对象：RangeError 是 Error 子类', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(2147483648, 0);
    return false;
  } catch (e) {
    return e instanceof RangeError && e instanceof Error;
  }
});

test('错误对象：TypeError 是 Error 子类', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(123, '2');
    return false;
  } catch (e) {
    return e instanceof TypeError && e instanceof Error;
  }
});

// 多种错误场景的错误类型区分
test('错误区分：offset 越界 vs offset 类型错误', () => {
  let err1, err2;
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
  } catch (e) {
    err1 = e;
  }
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(123, '2');
  } catch (e) {
    err2 = e;
  }
  return err1.name === 'RangeError' && err2.name === 'TypeError';
});

test('错误区分：value 越界 vs offset 越界', () => {
  let err1, err2;
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(2147483648, 0);
  } catch (e) {
    err1 = e;
  }
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
  } catch (e) {
    err2 = e;
  }
  return err1.name === 'RangeError' && err2.name === 'RangeError';
});

// 堆栈包含函数名
test('堆栈：包含 writeInt32LE', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return e.stack.includes('writeInt32LE');
  }
});

test('堆栈：包含文件路径', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return e.stack.includes('.js');
  }
});

// 错误不影响后续操作
test('错误恢复：异常后 Buffer 仍可用', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeInt32LE(123, 10);
  } catch (e) {
    // 忽略错误
  }
  buf.writeInt32LE(456, 0);
  return buf.readInt32LE(0) === 456;
});

test('错误恢复：多次异常不影响正常操作', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeInt32LE(123, 10);
  } catch (e) {}
  try {
    buf.writeInt32LE(456, 10);
  } catch (e) {}
  buf.writeInt32LE(789, 0);
  return buf.readInt32LE(0) === 789;
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
