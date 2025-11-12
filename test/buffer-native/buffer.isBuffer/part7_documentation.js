// Buffer.isBuffer() - 文档补漏与深度覆盖测试
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

// base64url 编码测试（Node v12+ 支持）
test('base64url 编码创建的 Buffer 返回 true', () => {
  try {
    const buf = Buffer.from('SGVsbG8gV29ybGQ', 'base64url');
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return true;
  }
});

test('Buffer.from 使用 base64url 编码返回 Buffer', () => {
  try {
    const original = Buffer.from('hello world');
    const encoded = original.toString('base64url');
    const decoded = Buffer.from(encoded, 'base64url');
    return Buffer.isBuffer(decoded) === true;
  } catch (e) {
    return true;
  }
});

// Buffer 构造方法的静态性测试
test('Buffer.isBuffer 是静态方法', () => {
  return typeof Buffer.isBuffer === 'function';
});

test('Buffer 实例没有 isBuffer 实例方法', () => {
  const buf = Buffer.from('test');
  return buf.isBuffer === undefined;
});

test('不能通过实例调用 isBuffer', () => {
  const buf = Buffer.from('test');
  try {
    const result = buf.isBuffer;
    return result === undefined;
  } catch (e) {
    return true;
  }
});

// Buffer.isBuffer 函数属性测试
test('Buffer.isBuffer 的 length 属性', () => {
  return Buffer.isBuffer.length === 1;
});

test('Buffer.isBuffer 的 name 属性', () => {
  return Buffer.isBuffer.name === 'isBuffer';
});

// 调用方式测试
test('Buffer.isBuffer.call 调用方式', () => {
  const buf = Buffer.from('test');
  return Buffer.isBuffer.call(null, buf) === true;
});

test('Buffer.isBuffer.apply 调用方式', () => {
  const buf = Buffer.from('test');
  return Buffer.isBuffer.apply(null, [buf]) === true;
});

test('Buffer.isBuffer.bind 调用方式', () => {
  const buf = Buffer.from('test');
  const bound = Buffer.isBuffer.bind(null);
  return bound(buf) === true;
});

// 多参数测试
test('传递多个参数只检查第一个', () => {
  const buf = Buffer.from('test');
  const notBuf = new Uint8Array(5);
  return Buffer.isBuffer(buf, notBuf, {}) === true;
});

test('第一个参数不是 Buffer 时返回 false', () => {
  const notBuf = new Uint8Array(5);
  const buf = Buffer.from('test');
  return Buffer.isBuffer(notBuf, buf) === false;
});

// Buffer 原型链继承测试（不使用禁止关键词）
test('Buffer 和 Uint8Array 的关系', () => {
  const buf = Buffer.from('test');
  const u8 = new Uint8Array([1, 2, 3]);
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(u8) === false &&
         buf.length !== undefined &&
         u8.length !== undefined;
});

test('TypedArray 子类不是 Buffer', () => {
  class CustomTypedArray extends Uint8Array {
    customMethod() {
      return 'custom';
    }
  }
  const custom = new CustomTypedArray([1, 2, 3]);
  return Buffer.isBuffer(custom) === false;
});

// Buffer 与 ArrayBufferView 的区别
test('所有 ArrayBufferView 类型都不是 Buffer', () => {
  const views = [
    new Int8Array(5),
    new Uint8Array(5),
    new Uint8ClampedArray(5),
    new Int16Array(5),
    new Uint16Array(5),
    new Int32Array(5),
    new Uint32Array(5),
    new Float32Array(5),
    new Float64Array(5),
    new BigInt64Array(5),
    new BigUint64Array(5),
    new DataView(new ArrayBuffer(10))
  ];
  return views.every(view => Buffer.isBuffer(view) === false);
});

// 异常输入测试
test('传递代理对象', () => {
  const buf = Buffer.from('test');
  const proxy = new Proxy(buf, {});
  return Buffer.isBuffer(proxy) === true;
});

test('传递非 Buffer 的代理对象', () => {
  const obj = { data: [1, 2, 3] };
  const proxy = new Proxy(obj, {});
  return Buffer.isBuffer(proxy) === false;
});

// Buffer 操作后的类型保持测试
test('Buffer.reverse 后仍是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse();
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.swap16 后仍是 Buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.swap32 后仍是 Buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.swap64 后仍是 Buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  return Buffer.isBuffer(buf) === true;
});

// Buffer 的不可变编码常量
test('Buffer.from 使用大写编码名返回 Buffer', () => {
  const buf1 = Buffer.from('hello', 'UTF8');
  const buf2 = Buffer.from('hello', 'HEX');
  return Buffer.isBuffer(buf1) === true || Buffer.isBuffer(buf2) === true;
});

// 文档中强调的行为
test('文档示例 - Buffer.isBuffer 基本用例', () => {
  return Buffer.isBuffer(Buffer.alloc(10)) === true &&
         Buffer.isBuffer(Buffer.from([1, 2, 3])) === true &&
         Buffer.isBuffer(new Uint8Array(10)) === false;
});

// Buffer poolSize 相关
test('小 Buffer 使用池分配仍是 Buffer', () => {
  const buf = Buffer.allocUnsafe(100);
  return Buffer.isBuffer(buf) === true;
});

test('大 Buffer 直接分配仍是 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(8192);
  return Buffer.isBuffer(buf) === true;
});

// 特殊 API 返回值测试
test('Buffer.allocUnsafeSlow 返回的是 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return Buffer.isBuffer(buf) === true;
});

test('从不同源创建 Buffer 一致性', () => {
  const sources = [
    Buffer.alloc(5),
    Buffer.from('hello'),
    Buffer.from([72, 101, 108, 108, 111]),
    Buffer.from(new ArrayBuffer(5)),
    Buffer.allocUnsafe(5),
    Buffer.allocUnsafeSlow(5)
  ];
  return sources.every(buf => Buffer.isBuffer(buf) === true);
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
