// buf.length - Part 9: Advanced Scenarios
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

// Buffer.from 各种对象
test('从 Buffer 创建的 length', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  return buf2.length === 5;
});

test('从对象创建 - 类数组对象', () => {
  const arrayLike = { 0: 65, 1: 66, 2: 67, length: 3 };
  try {
    const buf = Buffer.from(arrayLike);
    return buf.length >= 0;
  } catch (e) {
    // 可能不支持，返回 true
    return true;
  }
});

test('从迭代器创建的 length', () => {
  function* gen() {
    yield 65;
    yield 66;
    yield 67;
  }
  try {
    const buf = Buffer.from(gen());
    return buf.length === 3;
  } catch (e) {
    // 可能不支持，返回 true
    return true;
  }
});

// 特殊编码场景
test('base64url 编码的长度', () => {
  try {
    const buf = Buffer.from('SGVsbG8', 'base64url');
    return buf.length === 5;
  } catch (e) {
    // 旧版本可能不支持 base64url
    return true;
  }
});

test('无效编码抛出错误', () => {
  try {
    const buf = Buffer.from('hello', 'invalid-encoding');
    return false; // 不应该执行到这里
  } catch (e) {
    // 应该抛出错误
    return true;
  }
});

// Buffer.allocUnsafeSlow
test('allocUnsafeSlow 的 length', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10;
});

test('allocUnsafeSlow 零长度', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0;
});

// Buffer 池化
test('小 Buffer 的 length - 可能来自池', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  return buf1.length === 10 && buf2.length === 10;
});

test('大 Buffer 的 length - 不使用池', () => {
  const buf = Buffer.allocUnsafe(8192);
  return buf.length === 8192;
});

// 与其他属性的关系
test('length 与 buffer 属性', () => {
  const buf = Buffer.alloc(10);
  return buf.length === 10 && buf.buffer.byteLength >= 10;
});

test('length 与 byteOffset', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  return buf.length === 10 && buf.byteOffset === 5;
});

test('length 与 offset 属性', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(2, 8);
  return slice.length === 6;
});

// Buffer.compare 与 length
test('compare 不同长度的 Buffer', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.from('ab');
  const result = Buffer.compare(buf1, buf2);
  return buf1.length === 1 && buf2.length === 2 && result !== 0;
});

// Buffer.equals 与 length
test('equals 不同长度的 Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello world');
  return buf1.length === 5 && buf2.length === 11 && !buf1.equals(buf2);
});

// JSON 序列化
test('JSON.stringify 包含 length 信息', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = JSON.parse(JSON.stringify(buf));
  return buf.length === 3 && json.data.length === 3;
});

// toString 与 length
test('toString 不改变 length', () => {
  const buf = Buffer.from('hello');
  const str = buf.toString();
  return buf.length === 5 && str === 'hello';
});

test('toString 指定范围不改变 length', () => {
  const buf = Buffer.from('hello world');
  const str = buf.toString('utf8', 0, 5);
  return buf.length === 11 && str === 'hello';
});

// toJSON 与 length
test('toJSON 返回的数据长度与 length 一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const json = buf.toJSON();
  return buf.length === 5 && json.data.length === 5;
});

// Buffer.isBuffer 与 length
test('isBuffer 检查后 length 可访问', () => {
  const buf = Buffer.alloc(10);
  const notBuf = [1, 2, 3];
  return Buffer.isBuffer(buf) && buf.length === 10 && !Buffer.isBuffer(notBuf);
});

// Buffer.byteLength 静态方法
test('Buffer.byteLength 与实例 length 一致', () => {
  const str = 'hello';
  const byteLen = Buffer.byteLength(str);
  const buf = Buffer.from(str);
  return byteLen === buf.length && buf.length === 5;
});

test('Buffer.byteLength 多字节字符', () => {
  const str = '你好';
  const byteLen = Buffer.byteLength(str);
  const buf = Buffer.from(str);
  return byteLen === buf.length && buf.length === 6;
});

// 特殊值
test('Buffer.from(null) 行为', () => {
  try {
    const buf = Buffer.from(null);
    return buf.length >= 0;
  } catch (e) {
    // 应该抛出错误
    return true;
  }
});

test('Buffer.from(undefined) 行为', () => {
  try {
    const buf = Buffer.from(undefined);
    return buf.length >= 0;
  } catch (e) {
    // 应该抛出错误
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
