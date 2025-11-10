// buf.indexOf() - Error Handling Tests
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

function testError(name, fn, expectedErrorType) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error but none thrown' });
  } catch (e) {
    const pass = e.name === expectedErrorType || e.message.includes(expectedErrorType);
    tests.push({ name, status: pass ? '✅' : '❌', error: pass ? undefined : e.message });
  }
}

// TypeError 测试 - 无效的 value 类型
testError('TypeError - value 为对象', () => {
  const buf = Buffer.from('hello');
  buf.indexOf({ key: 'value' });
}, 'TypeError');

testError('TypeError - value 为 Symbol', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(Symbol('test'));
}, 'TypeError');

testError('TypeError - value 为 Function', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(function() {});
}, 'TypeError');

testError('TypeError - value 为 Boolean true', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(true);
}, 'TypeError');

testError('TypeError - value 为 Boolean false', () => {
  const buf = Buffer.from('hello');
  buf.indexOf(false);
}, 'TypeError');

// undefined 和 null 作为 value 会抛出错误
testError('TypeError - value 为 undefined', () => {
  const buf = Buffer.from('undefined');
  buf.indexOf(undefined);
}, 'TypeError');

testError('TypeError - value 为 null', () => {
  const buf = Buffer.from('null');
  buf.indexOf(null);
}, 'TypeError');

test('类型转换 - 数字 0', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.indexOf(0) === 0;
});

test('类型转换 - 空字符串', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('') === 0;
});

test('类型转换 - 空 Buffer', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0)) === 0;
});

test('类型转换 - 空 Uint8Array', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(new Uint8Array(0)) === 0;
});

// byteOffset 类型转换测试
test('byteOffset 转换 - undefined', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', undefined) === 6;
});

test('byteOffset 转换 - null', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', null) === 6;
});

test('byteOffset 转换 - 空对象', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', {}) === 6;
});

test('byteOffset 转换 - 空数组', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', []) === 6;
});

testError('byteOffset 转换 - 字符串 "abc"（会被当作 encoding）', () => {
  const buf = Buffer.from('hello world');
  buf.indexOf('world', 'abc');
}, 'TypeError');

test('byteOffset 转换 - 布尔值 true', () => {
  const buf = Buffer.from('hello hello');
  return buf.indexOf('hello', true) === 6; // true 转为 1
});

test('byteOffset 转换 - 布尔值 false', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', false) === 0; // false 转为 0
});

// encoding 参数测试
testError('无效 encoding - 抛出错误', () => {
  const buf = Buffer.from('hello world');
  buf.indexOf('world', 0, 'invalid-encoding');
}, 'TypeError');

testError('空 encoding - 抛出错误', () => {
  const buf = Buffer.from('hello world');
  buf.indexOf('world', 0, '');
}, 'TypeError');

test('undefined encoding - 使用默认', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, undefined) === 6;
});

testError('null encoding - 抛出错误', () => {
  const buf = Buffer.from('hello world');
  buf.indexOf('world', 0, null);
}, 'TypeError');

// 边界条件错误测试
test('极大的 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', Number.MAX_SAFE_INTEGER) === -1;
});

test('极小的 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', Number.MIN_SAFE_INTEGER) === 0;
});

test('Infinity byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', Infinity) === -1;
});

test('-Infinity byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', -Infinity) === 0;
});

// 数字范围测试
test('数字值 - 超出 0-255 范围 (256)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(256) === 0; // 256 % 256 = 0
});

test('数字值 - 超出 0-255 范围 (1000)', () => {
  const buf = Buffer.from([0, 232, 2, 3]);
  return buf.indexOf(1000) === 1; // 1000 % 256 = 232
});

test('数字值 - 负数 -1', () => {
  const buf = Buffer.from([0, 255, 2, 3]);
  return buf.indexOf(-1) === 1; // -1 & 0xFF = 255
});

test('数字值 - 负数 -256', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(-256) === 0; // -256 & 0xFF = 0
});

// 特殊数字值
test('NaN 作为 value', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(NaN) === 0; // NaN 转为 0
});

test('Infinity 作为 value', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(Infinity) === 0; // Infinity 转为 0
});

test('-Infinity 作为 value', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(-Infinity) === 0; // -Infinity 转为 0
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
