// Buffer.resolveObjectURL() - Part 2: Input Types Tests
const { Buffer, resolveObjectURL, Blob } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 字符串类型测试
test('普通字符串输入', () => {
  const result = resolveObjectURL('blob:nodedata:test');
  return result === undefined || result instanceof Blob;
});

test('空字符串输入', () => {
  const result = resolveObjectURL('');
  return result === undefined;
});

test('单字符字符串', () => {
  const result = resolveObjectURL('a');
  return result === undefined;
});

test('包含空格的字符串', () => {
  const result = resolveObjectURL('blob:nodedata:test id');
  return result === undefined || result instanceof Blob;
});

test('包含换行符的字符串', () => {
  const result = resolveObjectURL('blob:nodedata:test\nid');
  return result === undefined || result instanceof Blob;
});

test('包含制表符的字符串', () => {
  const result = resolveObjectURL('blob:nodedata:test\tid');
  return result === undefined || result instanceof Blob;
});

// 非字符串类型（会被转为字符串）
test('null 输入（转为字符串 "null"）', () => {
  const result = resolveObjectURL(null);
  return result === undefined;
});

test('undefined 输入（转为字符串 "undefined"）', () => {
  const result = resolveObjectURL(undefined);
  return result === undefined;
});

test('数字输入（转为字符串）', () => {
  const result = resolveObjectURL(123);
  return result === undefined;
});

test('数字 0 输入', () => {
  const result = resolveObjectURL(0);
  return result === undefined;
});

test('负数输入', () => {
  const result = resolveObjectURL(-123);
  return result === undefined;
});

test('浮点数输入', () => {
  const result = resolveObjectURL(3.14);
  return result === undefined;
});

test('NaN 输入（转为字符串 "NaN"）', () => {
  const result = resolveObjectURL(NaN);
  return result === undefined;
});

test('Infinity 输入（转为字符串）', () => {
  const result = resolveObjectURL(Infinity);
  return result === undefined;
});

test('-Infinity 输入', () => {
  const result = resolveObjectURL(-Infinity);
  return result === undefined;
});

test('布尔值 true 输入', () => {
  const result = resolveObjectURL(true);
  return result === undefined;
});

test('布尔值 false 输入', () => {
  const result = resolveObjectURL(false);
  return result === undefined;
});

// 对象类型（会被转为字符串）
test('空对象输入', () => {
  const result = resolveObjectURL({});
  return result === undefined;
});

test('包含 toString 方法的对象', () => {
  const obj = {
    toString() {
      return 'blob:nodedata:customid';
    }
  };
  const result = resolveObjectURL(obj);
  return result === undefined || result instanceof Blob;
});

test('包含 toString 返回无效 URL 的对象', () => {
  const obj = {
    toString() {
      return 'invalid';
    }
  };
  const result = resolveObjectURL(obj);
  return result === undefined;
});

test('数组输入（转为字符串）', () => {
  const result = resolveObjectURL([]);
  return result === undefined;
});

test('非空数组输入', () => {
  const result = resolveObjectURL(['blob', 'nodedata', 'id']);
  return result === undefined;
});

test('Symbol.toPrimitive 返回有效 URL', () => {
  const obj = {
    [Symbol.toPrimitive](hint) {
      return 'blob:nodedata:symbolid';
    }
  };
  const result = resolveObjectURL(obj);
  return result === undefined || result instanceof Blob;
});

test('Symbol.toPrimitive 返回无效 URL', () => {
  const obj = {
    [Symbol.toPrimitive](hint) {
      return 'invalid';
    }
  };
  const result = resolveObjectURL(obj);
  return result === undefined;
});

// 特殊字符串值
test('字符串 "null"', () => {
  const result = resolveObjectURL('null');
  return result === undefined;
});

test('字符串 "undefined"', () => {
  const result = resolveObjectURL('undefined');
  return result === undefined;
});

test('字符串 "[object Object]"', () => {
  const result = resolveObjectURL('[object Object]');
  return result === undefined;
});

// URL 编码字符串
test('URL 编码的字符串', () => {
  const result = resolveObjectURL('blob:nodedata:test%20id');
  return result === undefined || result instanceof Blob;
});

test('包含百分号的字符串', () => {
  const result = resolveObjectURL('blob:nodedata:test%id');
  return result === undefined || result instanceof Blob;
});

// Unicode 字符
test('包含 Unicode 字符的 ID', () => {
  const result = resolveObjectURL('blob:nodedata:测试');
  return result === undefined || result instanceof Blob;
});

test('包含 emoji 的 ID', () => {
  const result = resolveObjectURL('blob:nodedata:test😀');
  return result === undefined || result instanceof Blob;
});

test('包含零宽字符的 ID', () => {
  const result = resolveObjectURL('blob:nodedata:test\u200B');
  return result === undefined || result instanceof Blob;
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
