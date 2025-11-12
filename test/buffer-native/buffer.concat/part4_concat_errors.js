// Buffer.concat() - Error Cases and Invalid Inputs
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

// 参数类型错误
test('list参数不是数组（传入null）', () => {
  try {
    Buffer.concat(null);
    return false;
  } catch (e) {
    return e.message.includes('list') || e.message.includes('Array') ||
           e.message.includes('argument') || e.message.includes('ERR_INVALID_ARG_TYPE');
  }
});

test('list参数不是数组（传入undefined）', () => {
  try {
    Buffer.concat(undefined);
    return false;
  } catch (e) {
    return e.message.includes('list') || e.message.includes('Array') ||
           e.message.includes('argument') || e.message.includes('ERR_INVALID_ARG_TYPE');
  }
});

test('list参数不是数组（传入字符串）', () => {
  try {
    Buffer.concat('not an array');
    return false;
  } catch (e) {
    return e.message.includes('list') || e.message.includes('Array') ||
           e.message.includes('argument');
  }
});

test('list参数不是数组（传入数字）', () => {
  try {
    Buffer.concat(123);
    return false;
  } catch (e) {
    return e.message.includes('list') || e.message.includes('Array') ||
           e.message.includes('argument');
  }
});

test('list参数不是数组（传入对象）', () => {
  try {
    Buffer.concat({ a: 1 });
    return false;
  } catch (e) {
    return e.message.includes('list') || e.message.includes('Array') ||
           e.message.includes('argument');
  }
});

// 数组元素类型错误
test('list包含非Buffer/Uint8Array元素（字符串）', () => {
  try {
    Buffer.concat([Buffer.from('a'), 'string']);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer') ||
           e.message.includes('list') || e.message.includes('ERR_INVALID_ARG_TYPE');
  }
});

test('list包含非Buffer/Uint8Array元素（数字）', () => {
  try {
    Buffer.concat([Buffer.from('a'), 123]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer') ||
           e.message.includes('list');
  }
});

test('list包含非Buffer/Uint8Array元素（null）', () => {
  try {
    Buffer.concat([Buffer.from('a'), null]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer') ||
           e.message.includes('list') || e.message.includes('null');
  }
});

test('list包含非Buffer/Uint8Array元素（undefined）', () => {
  try {
    Buffer.concat([Buffer.from('a'), undefined]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer') ||
           e.message.includes('list') || e.message.includes('undefined');
  }
});

test('list包含非Buffer/Uint8Array元素（对象）', () => {
  try {
    Buffer.concat([Buffer.from('a'), { length: 5 }]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer') ||
           e.message.includes('list');
  }
});

test('list包含非Buffer/Uint8Array元素（数组）', () => {
  try {
    Buffer.concat([Buffer.from('a'), [1, 2, 3]]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer') ||
           e.message.includes('list');
  }
});

test('list全部元素都非法', () => {
  try {
    Buffer.concat([123, 'abc', null]);
    return false;
  } catch (e) {
    // 当所有元素都非法时，可能报类型错误或属性访问错误
    return e.message.includes('Uint8Array') || e.message.includes('Buffer') ||
           e.message.includes('list') || e.message.includes('[0]') ||
           e.message.includes('properties') || e.message.includes('length');
  }
});

// totalLength 参数错误
test('totalLength为字符串', () => {
  try {
    Buffer.concat([Buffer.from('test')], 'string');
    return false;
  } catch (e) {
    return e.message.includes('length') || e.message.includes('number') ||
           e.message.includes('ERR_INVALID_ARG_TYPE');
  }
});

test('totalLength为对象', () => {
  try {
    Buffer.concat([Buffer.from('test')], {});
    return false;
  } catch (e) {
    return true; // 应该报错或被强制转换
  }
});

test('totalLength为布尔值', () => {
  try {
    const result = Buffer.concat([Buffer.from('test')], true);
    // true 可能被转换为 1
    return result.length === 1 || false;
  } catch (e) {
    return true; // 或者抛出错误
  }
});

// 无参数调用
test('不传任何参数', () => {
  try {
    Buffer.concat();
    return false;
  } catch (e) {
    return e.message.includes('list') || e.message.includes('argument') ||
           e.message.includes('required');
  }
});

// 边界情况
test('list为类数组对象（但不是真数组）', () => {
  try {
    const arrayLike = { 0: Buffer.from('a'), 1: Buffer.from('b'), length: 2 };
    Buffer.concat(arrayLike);
    return false;
  } catch (e) {
    return e.message.includes('Array') || e.message.includes('list') ||
           e.message.includes('iterable');
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
