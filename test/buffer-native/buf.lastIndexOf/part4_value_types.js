// buf.lastIndexOf() - value 参数类型测试
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

// 字符串类型
test('value: 字符串 - 单个字符', () => {
  const buf = Buffer.from('hello world hello');
  return buf.lastIndexOf('o') === 16;
});

test('value: 字符串 - 多个字符', () => {
  const buf = Buffer.from('test test test');
  return buf.lastIndexOf('test') === 10;
});

test('value: 空字符串', () => {
  const buf = Buffer.from('hello');
  // 空字符串应该返回 byteOffset（默认 buf.length - 1）
  return buf.lastIndexOf('') === 5;
});

test('value: 空字符串 with byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf('', 2) === 2;
});

// 数字类型
test('value: 数字 - 0-255 范围内', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);
  return buf.lastIndexOf(2) === 3;
});

test('value: 数字 - 0', () => {
  const buf = Buffer.from([0, 1, 2, 0]);
  return buf.lastIndexOf(0) === 3;
});

test('value: 数字 - 255', () => {
  const buf = Buffer.from([255, 1, 2, 255]);
  return buf.lastIndexOf(255) === 3;
});

test('value: 数字 - 超出 255 取模', () => {
  const buf = Buffer.from([1, 2, 3, 1]);
  // 257 % 256 = 1
  return buf.lastIndexOf(257) === 3;
});

test('value: 数字 - 负数转换', () => {
  const buf = Buffer.from([254, 1, 2, 254]);
  // -2 & 0xFF = 254
  return buf.lastIndexOf(-2) === 3;
});

test('value: 数字 - 浮点数取整', () => {
  const buf = Buffer.from([3, 1, 2, 3]);
  return buf.lastIndexOf(3.7) === 3;
});

// Buffer 类型
test('value: Buffer - 单字节', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);
  return buf.lastIndexOf(Buffer.from([2])) === 3;
});

test('value: Buffer - 多字节', () => {
  const buf = Buffer.from('hello world hello');
  return buf.lastIndexOf(Buffer.from('hello')) === 12;
});

test('value: Buffer - 空 Buffer', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf(Buffer.alloc(0)) === 4;
});

test('value: Buffer - 完全匹配', () => {
  const buf = Buffer.from('exact');
  return buf.lastIndexOf(Buffer.from('exact')) === 0;
});

// Uint8Array 类型
test('value: Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3, 1, 2, 3]);
  const search = new Uint8Array([1, 2, 3]);
  return buf.lastIndexOf(search) === 3;
});

test('value: Uint8Array - 空', () => {
  const buf = Buffer.from('test');
  const search = new Uint8Array(0);
  return buf.lastIndexOf(search) === 4;
});

// Int8Array 类型（Node.js 只接受 Uint8Array，其他 TypedArray 会报错）
test('value: Int8Array 抛出错误', () => {
  const buf = Buffer.from([1, 2, 3, 1, 2]);
  const search = new Int8Array([1, 2]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// Uint16Array 类型（Node.js 只接受 Uint8Array）
test('value: Uint16Array 抛出错误', () => {
  const buf = Buffer.from([1, 0, 2, 0, 1, 0]);
  const search = new Uint16Array([1]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// 特殊值（Node.js 严格类型检查）
test('value: undefined 抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.lastIndexOf(undefined);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: null 抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.lastIndexOf(null);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: true 抛出错误', () => {
  const buf = Buffer.from('true false true');
  try {
    buf.lastIndexOf(true);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: false 抛出错误', () => {
  const buf = Buffer.from('false true false');
  try {
    buf.lastIndexOf(false);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// 对象类型（应该抛出错误）
test('value: 普通对象抛出错误', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf({});
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: 普通数组抛出错误', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf([1, 2, 3]);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: 有 length 但无索引的对象抛出错误', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf({ length: 5 });
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// 多字节字符
test('value: 中文字符', () => {
  const buf = Buffer.from('你好世界你好');
  return buf.lastIndexOf('你好') === 12;
});

test('value: emoji', () => {
  const buf = Buffer.from('😀😁😀');
  return buf.lastIndexOf('😀') === 8;
});

test('value: 混合多字节', () => {
  const buf = Buffer.from('café café');
  return buf.lastIndexOf('café') === 6;
});

// 重复模式
test('value: 重复字节模式', () => {
  const buf = Buffer.from([1, 1, 1, 1, 1]);
  return buf.lastIndexOf(1) === 4;
});

test('value: 重复字符串模式', () => {
  const buf = Buffer.from('aaaaaaa');
  return buf.lastIndexOf('aaa') === 4;
});

test('value: 重复 Buffer 模式', () => {
  const buf = Buffer.from([1, 2, 1, 2, 1, 2]);
  return buf.lastIndexOf(Buffer.from([1, 2])) === 4;
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
