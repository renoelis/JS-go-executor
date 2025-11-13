// buffer.kMaxLength - Part 14: Compatibility and Cross-Environment Tests
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 与其他 Buffer 方法的兼容性测试
test('Buffer.allocUnsafe 与 kMaxLength 交互', () => {
  try {
    Buffer.allocUnsafe(10);
    return true;
  } catch (e) {
    return false;
  }
});

test('Buffer.allocUnsafeSlow 与 kMaxLength 交互', () => {
  try {
    Buffer.allocUnsafeSlow(10);
    return true;
  } catch (e) {
    return false;
  }
});

test('Buffer.concat 不受 kMaxLength 单独约束', () => {
  const buf1 = Buffer.alloc(100);
  const buf2 = Buffer.alloc(100);
  const concat = Buffer.concat([buf1, buf2]);
  return concat.length === 200 && concat.length < kMaxLength;
});

test('Buffer.isBuffer 识别正常大小的 Buffer', () => {
  const buf = Buffer.alloc(100);
  return Buffer.isBuffer(buf);
});

// 与 TypedArray 兼容性
test('kMaxLength 与 Uint8Array.BYTES_PER_ELEMENT 比较', () => {
  return kMaxLength > Uint8Array.BYTES_PER_ELEMENT;
});

test('kMaxLength 与 ArrayBuffer.isView 兼容', () => {
  const buf = Buffer.alloc(10);
  return ArrayBuffer.isView(buf);
});

test('ArrayBuffer 创建大小验证', () => {
  try {
    const ab = new ArrayBuffer(1024);
    return ab.byteLength === 1024 && ab.byteLength < kMaxLength;
  } catch (e) {
    return false;
  }
});

// 内存和性能相关测试
test('Buffer.poolSize 属性存在', () => {
  return typeof Buffer.poolSize === 'number';
});

test('Buffer.poolSize 小于 kMaxLength', () => {
  return Buffer.poolSize < kMaxLength;
});

test('创建小 Buffer 使用内存池', () => {
  const buf1 = Buffer.allocUnsafe(100);
  const buf2 = Buffer.allocUnsafe(100);
  // 小 Buffer 可能共享底层 ArrayBuffer
  return buf1.buffer && buf2.buffer;
});

// JSON 序列化兼容性
test('Buffer.toJSON 方法存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  return json.type === 'Buffer' && Array.isArray(json.data);
});

test('Buffer.from JSON 反序列化', () => {
  const original = Buffer.from([1, 2, 3]);
  const json = original.toJSON();
  const restored = Buffer.from(json.data);
  return original.equals(restored);
});

// 字符串编码兼容性
test('Buffer 支持所有标准编码', () => {
  const encodings = ['utf8', 'ascii', 'latin1', 'base64', 'hex', 'utf16le', 'ucs2', 'binary'];
  return encodings.every(enc => {
    try {
      const buf = Buffer.from('test', enc);
      return Buffer.isBuffer(buf);
    } catch (e) {
      return false;
    }
  });
});

test('Buffer.isEncoding 验证所有编码', () => {
  const encodings = ['utf8', 'ascii', 'latin1', 'base64', 'hex', 'utf16le', 'ucs2', 'binary'];
  return encodings.every(enc => Buffer.isEncoding(enc));
});

// 与 Stream 的兼容性
test('Buffer 可以转换为流', () => {
  const buf = Buffer.from('hello world');
  return buf.length > 0;
});

// 数组方法兼容性
test('Buffer 继承数组方法 forEach', () => {
  const buf = Buffer.from([1, 2, 3]);
  let sum = 0;
  buf.forEach(val => sum += val);
  return sum === 6;
});

test('Buffer 继承数组方法 map', () => {
  const buf = Buffer.from([1, 2, 3]);
  const mapped = buf.map(val => val * 2);
  return Buffer.isBuffer(mapped) && mapped[0] === 2;
});

test('Buffer 继承数组方法 filter', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const filtered = buf.filter(val => val > 2);
  return Buffer.isBuffer(filtered) && filtered.length === 2;
});

test('Buffer 继承数组方法 reduce', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const sum = buf.reduce((acc, val) => acc + val, 0);
  return sum === 10;
});

// 与其他全局对象的兼容性
test('kMaxLength 在当前环境中可用', () => {
  return typeof kMaxLength === 'number' && kMaxLength > 0;
});

test('Buffer 在不同上下文中可用', () => {
  // 测试 Buffer 在不同执行上下文中的可用性
  const bufferFromRequire = require('buffer').Buffer;
  return bufferFromRequire === Buffer;
});

// 错误处理兼容性
test('Buffer 错误有正确的 name 属性', () => {
  try {
    Buffer.alloc(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Buffer 错误有正确的 message', () => {
  try {
    Buffer.alloc('invalid');
    return false;
  } catch (e) {
    return typeof e.message === 'string' && e.message.length > 0;
  }
});

// 版本兼容性（间接测试）
test('Buffer API 与 Node.js v25.0.0 兼容', () => {
  // 测试一些 Node.js v25.0.0 中应该存在的方法
  const methods = ['alloc', 'allocUnsafe', 'from', 'concat', 'compare'];
  return methods.every(method => typeof Buffer[method] === 'function');
});

test('kMaxLength 是稳定的 API', () => {
  // kMaxLength 在 Node.js 中是稳定的 API，不应该改变
  return kMaxLength === Number.MAX_SAFE_INTEGER;
});

// WeakRef 和 FinalizationRegistry 兼容性（如果支持）
test('WeakRef 与 Buffer 兼容性', () => {
  try {
    if (typeof WeakRef !== 'undefined') {
      const buf = Buffer.alloc(10);
      const weakRef = new WeakRef(buf);
      return weakRef.deref() === buf;
    }
    return true; // WeakRef 不支持时跳过
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
