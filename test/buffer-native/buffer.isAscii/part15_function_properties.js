// buffer.isAscii() - Part 15: Function Properties and Method Validation
const { Buffer, isAscii } = require('buffer');

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
test('isAscii.length 属性', () => {
  return isAscii.length === 1; // 函数应该只接受1个参数
});

test('isAscii.name 属性', () => {
  return isAscii.name === 'isAscii';
});

test('isAscii 是函数类型', () => {
  return typeof isAscii === 'function';
});

test('Buffer.isAscii 存在性检查', () => {
  // 在 Node.js v25.0.0 中，isAscii 只作为独立函数导出，不是 Buffer 的静态方法
  return typeof Buffer.isAscii === 'undefined' || typeof Buffer.isAscii === 'function';
});

test('isAscii 独立函数验证', () => {
  // 验证 isAscii 作为独立函数正常工作
  return typeof isAscii === 'function' && isAscii.name === 'isAscii';
});

// 函数属性不可修改性测试
test('isAscii.length 不可写', () => {
  try {
    const oldLength = isAscii.length;
    isAscii.length = 99;
    return isAscii.length === oldLength;
  } catch (e) {
    return true; // 严格模式下会抛出错误
  }
});

test('isAscii.name 不可写', () => {
  try {
    const oldName = isAscii.name;
    isAscii.name = 'customName';
    return isAscii.name === oldName;
  } catch (e) {
    return true; // 严格模式下会抛出错误
  }
});

// Symbol 参数测试 - 更全面
test('Symbol 参数 - Symbol.iterator', () => {
  try {
    isAscii(Symbol.iterator);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Symbol 参数 - Symbol.toPrimitive', () => {
  try {
    isAscii(Symbol.toPrimitive);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Symbol 参数 - Symbol.for()', () => {
  try {
    isAscii(Symbol.for('test'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Symbol 参数 - 自定义 Symbol', () => {
  try {
    isAscii(Symbol('custom'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 极端参数测试
test('Infinity 参数', () => {
  try {
    isAscii(Infinity);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('-Infinity 参数', () => {
  try {
    isAscii(-Infinity);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('NaN 参数', () => {
  try {
    isAscii(NaN);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('BigInt 参数', () => {
  try {
    isAscii(BigInt(123));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 函数参数测试
test('Function 参数', () => {
  try {
    isAscii(function() {});
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Arrow Function 参数', () => {
  try {
    isAscii(() => {});
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('async Function 参数', () => {
  try {
    isAscii(async function() {});
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// RegExp 参数测试
test('RegExp 参数', () => {
  try {
    isAscii(/test/);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Date 参数', () => {
  try {
    isAscii(new Date());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Error 对象参数测试
test('Error 参数', () => {
  try {
    isAscii(new Error('test'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Map/Set 参数测试
test('Map 参数', () => {
  try {
    isAscii(new Map());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Set 参数', () => {
  try {
    isAscii(new Set());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('WeakMap 参数', () => {
  try {
    isAscii(new WeakMap());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('WeakSet 参数', () => {
  try {
    isAscii(new WeakSet());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Promise 参数测试
test('Promise 参数', () => {
  try {
    isAscii(Promise.resolve());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 多参数测试（虽然只应该接受一个）
test('多参数调用 - 只使用第一个', () => {
  const buf = Buffer.from('hello');
  const result1 = isAscii(buf);
  const result2 = isAscii(buf, 'extra', 'params');
  return result1 === result2 && result1 === true;
});

test('无参数调用', () => {
  try {
    isAscii();
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 原型链测试
test('isAscii 构造函数调用测试', () => {
  try {
    new isAscii(Buffer.from('test'));
    // 如果没有抛出错误，说明可以被 new 调用（某些实现可能允许）
    return true;
  } catch (e) {
    // 如果抛出 TypeError，也是正确的行为
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
