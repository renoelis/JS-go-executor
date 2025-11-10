// buf.lastIndexOf() - 错误处理和异常情况测试
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

// 无效的 value 类型
test('错误: value 为 null', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf(null);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('错误: value 为 undefined（无参数）', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf();
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('错误: value 为 boolean', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf(true);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('错误: value 为 Symbol', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf(Symbol('test'));
    return false;
  } catch (e) {
    return e.message.includes('must be one of type') || e.message.includes('Cannot convert');
  }
});

test('错误: value 为普通对象', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf({ key: 'value' });
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('错误: value 为数组', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf([1, 2, 3]);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('错误: value 为函数', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf(function() {});
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// 无效的编码
test('错误: 无效编码名称', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf('test', undefined, 'invalid-encoding');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('错误: 编码为数字', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf('test', undefined, 123);
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding') || e.message.includes('must be a string');
  }
});

test('错误: 编码为对象', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf('test', undefined, {});
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding') || e.message.includes('must be a string');
  }
});

// TypedArray 错误（非 Uint8Array）
test('错误: Int8Array', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const search = new Int8Array([1, 2]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('错误: Uint16Array', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const search = new Uint16Array([1]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('错误: Int16Array', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const search = new Int16Array([1]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('错误: Uint8ClampedArray', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const search = new Uint8ClampedArray([1, 2]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// DataView 错误
test('错误: DataView', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const ab = new ArrayBuffer(2);
  const dv = new DataView(ab);
  try {
    buf.lastIndexOf(dv);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// ArrayBuffer 错误（不能直接作为 value）
test('错误: ArrayBuffer 直接作为 value', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const ab = new ArrayBuffer(2);
  try {
    buf.lastIndexOf(ab);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// BigInt 错误
test('错误: BigInt 作为 value', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  try {
    buf.lastIndexOf(1n);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type') || e.message.includes('Cannot convert');
  }
});

// 特殊的 byteOffset 值
test('byteOffset: NaN 转换为 0 或 buf.length', () => {
  const buf = Buffer.from('test test');
  // NaN 作为 byteOffset 的行为
  const result = buf.lastIndexOf('test', NaN);
  // 根据 Node.js 文档，NaN 会被转换，通常搜索整个 buffer
  return result === 5 || result === 0;
});

test('byteOffset: Infinity', () => {
  const buf = Buffer.from('test test');
  // Infinity 应该被限制为 buf.length - 1
  return buf.lastIndexOf('test', Infinity) === 5;
});

test('byteOffset: -Infinity', () => {
  const buf = Buffer.from('test');
  // -Infinity 应该返回 -1
  return buf.lastIndexOf('test', -Infinity) === -1;
});

// 字符串编码边界
test('编码: 空字符串作为编码（应该报错）', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf('test', undefined, '');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
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
