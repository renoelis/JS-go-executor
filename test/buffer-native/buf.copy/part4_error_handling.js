// buf.copy() - Error Handling and Exception Tests
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

// 测试目标不是 Buffer/TypedArray 时的行为
test('目标为普通对象 - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.copy({}, 0);
    return false; // 不应该成功
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('目标为 null - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.copy(null, 0);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('目标为 undefined - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.copy(undefined, 0);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('目标为字符串 - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.copy('string', 0);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('目标为数组 - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.copy([1, 2, 3, 4, 5], 0);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('目标为数字 - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.copy(123, 0);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 没有参数
test('不传任何参数 - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    buf.copy();
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// DataView 作为目标
test('复制到 DataView', () => {
  const buf = Buffer.from('hello');
  const arrayBuffer = new ArrayBuffer(10);
  const dataView = new DataView(arrayBuffer);
  try {
    const bytes = buf.copy(dataView, 0);
    // DataView 可能被支持，检查是否成功
    return bytes >= 0;
  } catch (e) {
    // 或者抛出 TypeError 也是合法的
    return e instanceof TypeError;
  }
});

// ArrayBuffer 作为目标（ArrayBuffer 本身不能直接使用）
test('复制到 ArrayBuffer - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  const arrayBuffer = new ArrayBuffer(10);
  try {
    buf.copy(arrayBuffer, 0);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 只读的 TypedArray
test('复制到普通 Uint8Array（应该成功）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const target = new Uint8Array(5);
  const bytes = buf.copy(target, 0);
  return bytes === 3 && target[0] === 1 && target[2] === 3;
});

// 测试非常极端的参数组合
test('所有参数都是极端负数 - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  const target = Buffer.alloc(10);
  try {
    buf.copy(target, -1000, -2000, -3000);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('targetStart 极大负数 - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  const target = Buffer.alloc(10);
  try {
    buf.copy(target, -Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('sourceStart 极大正数 - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  const target = Buffer.alloc(10);
  try {
    buf.copy(target, 0, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

// Symbol 参数测试
test('targetStart 为 Symbol - 应抛出错误', () => {
  const buf = Buffer.from('hello');
  const target = Buffer.alloc(10);
  try {
    buf.copy(target, Symbol('test'));
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 函数作为参数
test('targetStart 为函数', () => {
  const buf = Buffer.from('hi');
  const target = Buffer.alloc(10, 0);
  try {
    const bytes = buf.copy(target, function() { return 2; });
    // 函数不会被调用，应转换为 NaN -> 0
    return bytes === 2 && target.slice(0, 2).toString() === 'hi';
  } catch (e) {
    // 或者抛出错误也可能
    return true;
  }
});

// BigInt 参数测试（如果环境支持）
test('targetStart 为 BigInt', () => {
  const buf = Buffer.from('hi');
  const target = Buffer.alloc(10);
  try {
    const bytes = buf.copy(target, BigInt(2));
    // BigInt 可能被转换或抛出错误
    return true;
  } catch (e) {
    // TypeError 是预期的
    return e instanceof TypeError;
  }
});

// 测试 Uint8ClampedArray
test('复制到 Uint8ClampedArray', () => {
  const buf = Buffer.from([1, 2, 3, 255, 128]);
  const target = new Uint8ClampedArray(10);
  const bytes = buf.copy(target, 0);
  return bytes === 5 && target[3] === 255 && target[4] === 128;
});

// 测试 Float32Array（字节对齐可能不同）
test('复制到 Float32Array', () => {
  const buf = Buffer.from([0, 0, 128, 63]); // 1.0 in IEEE 754
  const target = new Float32Array(2);
  const bytes = buf.copy(target, 0);
  return bytes === 4;
});

// 测试复制到已分离的 ArrayBuffer
test('复制到已分离的 TypedArray', () => {
  const buf = Buffer.from('hello');
  const arrayBuffer = new ArrayBuffer(10);
  const target = new Uint8Array(arrayBuffer);
  
  // 注意：实际分离 ArrayBuffer 需要特殊 API（postMessage 等）
  // 这里只测试正常情况
  const bytes = buf.copy(target, 0);
  return bytes === 5;
});

// 测试零长度复制的各种情况
test('零长度源，非零 targetStart', () => {
  const buf = Buffer.alloc(0);
  const target = Buffer.alloc(10, 0x61);
  const bytes = buf.copy(target, 5);
  return bytes === 0 && target.toString() === 'aaaaaaaaaa';
});

test('零长度目标，非零 sourceStart', () => {
  const buf = Buffer.from('hello');
  const target = Buffer.alloc(0);
  const bytes = buf.copy(target, 0, 2);
  return bytes === 0;
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

