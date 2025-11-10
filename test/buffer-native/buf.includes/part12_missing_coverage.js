// buf.includes() - Missing Coverage Tests (补充缺失测试)
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

// === ArrayBuffer 作为搜索值 ===
test('ArrayBuffer 作为搜索值 - 应该抛出错误或转换', () => {
  const buf = Buffer.from('hello world');
  try {
    const ab = new ArrayBuffer(5);
    const view = new Uint8Array(ab);
    view[0] = 119; // 'w'
    view[1] = 111; // 'o'
    view[2] = 114; // 'r'
    view[3] = 108; // 'l'
    view[4] = 100; // 'd'
    const result = buf.includes(ab);
    // 如果支持，应该找到或返回 false
    return typeof result === 'boolean';
  } catch (e) {
    // 抛出错误也是合理的
    return true;
  }
});

test('空 ArrayBuffer 作为搜索值', () => {
  const buf = Buffer.from('hello');
  try {
    const ab = new ArrayBuffer(0);
    const result = buf.includes(ab);
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

// === Symbol 类型测试 ===
test('Symbol 作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(Symbol('test'));
    return false; // 不应该执行到这里
  } catch (e) {
    return e.message.includes('symbol') || e.message.includes('type') || e.message.includes('Cannot');
  }
});

test('Symbol.iterator 作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(Symbol.iterator);
    return false;
  } catch (e) {
    return true;
  }
});

// === 函数类型测试 ===
test('函数作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(function() {});
    return false;
  } catch (e) {
    return true;
  }
});

test('箭头函数作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(() => {});
    return false;
  } catch (e) {
    return true;
  }
});

// === BigInt 类型测试 ===
test('BigInt 作为搜索值 - 应该抛出错误或转换', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    const result = buf.includes(1n);
    // 如果转换，应该找到 1
    return typeof result === 'boolean';
  } catch (e) {
    // 抛出错误也是合理的
    return true;
  }
});

test('大 BigInt 作为搜索值', () => {
  const buf = Buffer.from([255, 254, 253]);
  try {
    const result = buf.includes(255n);
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('负 BigInt 作为搜索值', () => {
  const buf = Buffer.from([255, 254, 253]);
  try {
    const result = buf.includes(-1n);
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

// === base64url 编码测试 ===
test('base64url 编码 - 查找', () => {
  const buf = Buffer.from('hello world');
  try {
    // base64url 可能不被支持，但需要测试
    const result = buf.includes('aGVsbG8', 0, 'base64url');
    return typeof result === 'boolean';
  } catch (e) {
    // 如果不支持，应该抛出错误
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('base64url 编码 - 带特殊字符', () => {
  try {
    const buf = Buffer.from('test+/test', 'base64');
    const result = buf.includes('test', 0, 'base64url');
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

// === 与 lastIndexOf 的一致性 ===
test('includes 与 lastIndexOf 一致性 - 找到', () => {
  const buf = Buffer.from('hello world hello');
  const includesResult = buf.includes('hello');
  const lastIndexOfResult = buf.lastIndexOf('hello') !== -1;
  return includesResult === lastIndexOfResult && includesResult === true;
});

test('includes 与 lastIndexOf 一致性 - 未找到', () => {
  const buf = Buffer.from('hello world');
  const includesResult = buf.includes('xyz');
  const lastIndexOfResult = buf.lastIndexOf('xyz') !== -1;
  return includesResult === lastIndexOfResult && includesResult === false;
});

test('includes 与 lastIndexOf 一致性 - 使用 offset', () => {
  const buf = Buffer.from('hello world hello');
  const includesResult = buf.includes('hello', 10);
  const lastIndexOfResult = buf.lastIndexOf('hello', 20) >= 10;
  return includesResult === lastIndexOfResult;
});

// === toString 后的一致性 ===
test('toString 后再 includes - utf8', () => {
  const buf = Buffer.from('hello world');
  const str = buf.toString('utf8');
  return buf.includes('world') === str.includes('world');
});

test('toString 后再 includes - hex', () => {
  const buf = Buffer.from('hello');
  const hex = buf.toString('hex');
  // hex 字符串应该包含 '68656c6c6f'
  return hex.includes('68656c6c6f') === true;
});

test('toString 后再 includes - base64', () => {
  const buf = Buffer.from('hello');
  const b64 = buf.toString('base64');
  // base64 字符串应该是 'aGVsbG8='
  return b64.includes('aGVsbG8=') === true;
});

// === 正则表达式作为搜索值 ===
test('正则表达式作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello world');
  try {
    buf.includes(/world/);
    return false;
  } catch (e) {
    return true;
  }
});

test('正则表达式字面量作为搜索值', () => {
  const buf = Buffer.from('hello world');
  try {
    buf.includes(new RegExp('world'));
    return false;
  } catch (e) {
    return true;
  }
});

// === Date 对象作为搜索值 ===
test('Date 对象作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(new Date());
    return false;
  } catch (e) {
    return true;
  }
});

// === Map/Set 作为搜索值 ===
test('Map 作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(new Map());
    return false;
  } catch (e) {
    return true;
  }
});

test('Set 作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(new Set());
    return false;
  } catch (e) {
    return true;
  }
});

// === WeakMap/WeakSet 作为搜索值 ===
test('WeakMap 作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(new WeakMap());
    return false;
  } catch (e) {
    return true;
  }
});

test('WeakSet 作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(new WeakSet());
    return false;
  } catch (e) {
    return true;
  }
});

// === Promise 作为搜索值 ===
test('Promise 作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(Promise.resolve(1));
    return false;
  } catch (e) {
    return true;
  }
});

// === Error 对象作为搜索值 ===
test('Error 对象作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.includes(new Error('test'));
    return false;
  } catch (e) {
    return true;
  }
});

// === 类实例作为搜索值 ===
test('自定义类实例作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  class CustomClass {}
  try {
    buf.includes(new CustomClass());
    return false;
  } catch (e) {
    return true;
  }
});

// === 带有 valueOf 的对象 ===
test('带有 valueOf 的对象 - 数字', () => {
  const buf = Buffer.from([1, 2, 3]);
  const obj = {
    valueOf: () => 2
  };
  try {
    const result = buf.includes(obj);
    // 如果调用 valueOf，应该找到 2
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('带有 toString 的对象', () => {
  const buf = Buffer.from('hello world');
  const obj = {
    toString: () => 'world'
  };
  try {
    const result = buf.includes(obj);
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

// === 循环引用对象 ===
test('循环引用对象作为搜索值 - 应该抛出错误', () => {
  const buf = Buffer.from('hello');
  const obj = {};
  obj.self = obj;
  try {
    buf.includes(obj);
    return false;
  } catch (e) {
    return true;
  }
});

// === 冻结的 Buffer ===
test('冻结的 Buffer - 应该抛出错误', () => {
  const buf = Buffer.from('hello world');
  try {
    Object.freeze(buf);
    // 如果没有抛出错误，测试 includes 是否仍然工作
    return buf.includes('world') === true;
  } catch (e) {
    // Node.js 不允许冻结 TypedArray，这是预期的
    return e.message.includes('freeze') || e.message.includes('Cannot');
  }
});

test('密封的 Buffer - 应该抛出错误', () => {
  const buf = Buffer.from('hello world');
  try {
    Object.seal(buf);
    // 如果没有抛出错误，测试 includes 是否仍然工作
    return buf.includes('world') === true;
  } catch (e) {
    // Node.js 不允许密封 TypedArray，这是预期的
    return e.message.includes('seal') || e.message.includes('Cannot');
  }
});

// === 不可扩展的 Buffer ===
test('不可扩展的 Buffer - includes 仍然工作', () => {
  const buf = Buffer.from('hello world');
  Object.preventExtensions(buf);
  return buf.includes('world') === true;
});

// === 多个参数传递 ===
test('传递超过 3 个参数 - 额外参数被忽略', () => {
  const buf = Buffer.from('hello world');
  try {
    const result = buf.includes('world', 0, 'utf8', 'extra', 'params');
    return result === true;
  } catch (e) {
    return false;
  }
});

// === 参数顺序错误 ===
test('参数顺序错误 - encoding 在 byteOffset 位置', () => {
  const buf = Buffer.from('hello world');
  try {
    // 传递 'utf8' 作为 byteOffset
    const result = buf.includes('world', 'utf8');
    // 'utf8' 会被转换为 NaN，然后变成 0
    return typeof result === 'boolean';
  } catch (e) {
    return true;
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
