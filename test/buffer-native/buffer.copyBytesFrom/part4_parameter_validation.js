// Buffer.copyBytesFrom() - Part 4: Parameter Validation and Type Errors
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

// 第一个参数必须是 TypedArray
test('TypeError: 第一个参数必须是 TypedArray - DataView', () => {
  try {
    const ab = new ArrayBuffer(4);
    const dv = new DataView(ab);
    Buffer.copyBytesFrom(dv);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('TypedArray');
  }
});

test('TypeError: 第一个参数必须是 TypedArray - ArrayBuffer', () => {
  try {
    Buffer.copyBytesFrom(new ArrayBuffer(4));
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('TypedArray');
  }
});

test('TypeError: 第一个参数必须是 TypedArray - 普通数组', () => {
  try {
    Buffer.copyBytesFrom([1, 2, 3]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('TypedArray');
  }
});

test('TypeError: 第一个参数必须是 TypedArray - 普通对象', () => {
  try {
    Buffer.copyBytesFrom({ length: 3 });
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('TypedArray');
  }
});

test('Buffer 作为参数应该成功', () => {
  try {
    const sourceBuf = Buffer.from([1, 2, 3]);
    const result = Buffer.copyBytesFrom(sourceBuf);
    return result.length === 3 && result[0] === 1 && result[1] === 2 && result[2] === 3;
  } catch (e) {
    return false;
  }
});

test('TypeError: 第一个参数必须是 TypedArray - null', () => {
  try {
    Buffer.copyBytesFrom(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 第一个参数必须是 TypedArray - undefined', () => {
  try {
    Buffer.copyBytesFrom(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 缺少第一个参数', () => {
  try {
    Buffer.copyBytesFrom();
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 第一个参数是字符串', () => {
  try {
    Buffer.copyBytesFrom('test');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 第一个参数是数字', () => {
  try {
    Buffer.copyBytesFrom(123);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset 参数必须是数字且为整数
test('TypeError: offset 参数必须是数字 - 字符串', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, '1');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('number');
  }
});

test('TypeError: offset 参数必须是数字 - 对象', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, {});
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('number');
  }
});

test('TypeError: offset 参数必须是数字 - 数组', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, [1]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('number');
  }
});

test('RangeError: offset 必须是整数 - 浮点数', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('integer');
  }
});

test('RangeError: offset 必须是整数 - NaN', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('integer');
  }
});

test('RangeError: offset 必须是整数 - Infinity', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('integer');
  }
});

test('RangeError: offset 必须是整数 - -Infinity', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, -Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('integer');
  }
});

test('RangeError: offset 不能为负', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('>= 0');
  }
});

test('RangeError: offset 不能超过 MAX_SAFE_INTEGER', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, Number.MAX_SAFE_INTEGER + 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// length 参数必须是数字且为整数
test('TypeError: length 参数必须是数字 - 字符串', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('number');
  }
});

test('TypeError: length 参数必须是数字 - 对象', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, {});
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('number');
  }
});

test('RangeError: length 必须是整数 - 浮点数', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, 2.7);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('integer');
  }
});

test('RangeError: length 必须是整数 - NaN', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('integer');
  }
});

test('RangeError: length 必须是整数 - Infinity', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('integer');
  }
});

test('RangeError: length 不能为负', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('>= 0');
  }
});

test('RangeError: length 不能超过 MAX_SAFE_INTEGER', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, Number.MAX_SAFE_INTEGER + 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
