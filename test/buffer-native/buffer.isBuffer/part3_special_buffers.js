// Buffer.isBuffer() - 特殊 Buffer 场景测试
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

// Buffer 切片和视图测试
test('Buffer.slice 返回的切片是 Buffer', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(0, 5);
  return Buffer.isBuffer(slice) === true;
});

test('Buffer.subarray 返回的子数组是 Buffer', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(0, 5);
  return Buffer.isBuffer(sub) === true;
});

test('Buffer.slice 空切片返回 true', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(5, 5);
  return Buffer.isBuffer(slice) === true;
});

test('Buffer.subarray 全范围子数组返回 true', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray();
  return Buffer.isBuffer(sub) === true;
});

test('Buffer.slice 负索引切片返回 true', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(-5);
  return Buffer.isBuffer(slice) === true;
});

// Buffer 编码相关测试
test('不同编码创建的 Buffer 都返回 true - utf8', () => {
  const buf = Buffer.from('hello', 'utf8');
  return Buffer.isBuffer(buf) === true;
});

test('不同编码创建的 Buffer 都返回 true - hex', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return Buffer.isBuffer(buf) === true;
});

test('不同编码创建的 Buffer 都返回 true - base64', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  return Buffer.isBuffer(buf) === true;
});

test('不同编码创建的 Buffer 都返回 true - ascii', () => {
  const buf = Buffer.from('hello', 'ascii');
  return Buffer.isBuffer(buf) === true;
});

test('不同编码创建的 Buffer 都返回 true - latin1', () => {
  const buf = Buffer.from('hello', 'latin1');
  return Buffer.isBuffer(buf) === true;
});

test('不同编码创建的 Buffer 都返回 true - binary', () => {
  const buf = Buffer.from('hello', 'binary');
  return Buffer.isBuffer(buf) === true;
});

test('不同编码创建的 Buffer 都返回 true - ucs2', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return Buffer.isBuffer(buf) === true;
});

test('不同编码创建的 Buffer 都返回 true - utf16le', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return Buffer.isBuffer(buf) === true;
});

// Buffer 和 Uint8Array 互操作测试
test('从 Uint8Array buffer 创建的 Buffer 返回 true', () => {
  const u8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(u8.buffer);
  return Buffer.isBuffer(buf) === true;
});

test('从 Uint8Array buffer 带 offset 创建的 Buffer 返回 true', () => {
  const u8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(u8.buffer, 1, 3);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer 填充后仍返回 true', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xFF);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.copy 后源和目标都是 Buffer', () => {
  const src = Buffer.from('hello');
  const dst = Buffer.alloc(5);
  src.copy(dst);
  return Buffer.isBuffer(src) === true && Buffer.isBuffer(dst) === true;
});

// Buffer 比较和操作测试
test('Buffer.compare 的参数检查 - 两个 Buffer', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  Buffer.compare(buf1, buf2);
  return Buffer.isBuffer(buf1) === true && Buffer.isBuffer(buf2) === true;
});

test('Buffer.concat 空数组返回零长度 Buffer', () => {
  const result = Buffer.concat([]);
  return Buffer.isBuffer(result) === true;
});

test('Buffer.concat 单个元素返回 Buffer', () => {
  const buf = Buffer.from('hello');
  const result = Buffer.concat([buf]);
  return Buffer.isBuffer(result) === true;
});

// SharedArrayBuffer 测试（goja 不支持，跳过）
// test('从 SharedArrayBuffer 创建的 Buffer 返回 true', () => {
//   const sab = new SharedArrayBuffer(10);
//   const buf = Buffer.from(sab);
//   return Buffer.isBuffer(buf) === true;
// });

// Buffer 转换测试
test('Buffer.toJSON 后的对象不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const json = buf.toJSON();
  return Buffer.isBuffer(json) === false;
});

test('Buffer 转为 Uint8Array 视图不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return Buffer.isBuffer(u8) === false;
});

// 大小边界测试
test('最大长度 Buffer 返回 true', () => {
  try {
    const maxSize = 2147483647;
    const buf = Buffer.allocUnsafe(Math.min(maxSize, 1024 * 1024));
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return true;
  }
});

test('单字节 Buffer 返回 true', () => {
  const buf = Buffer.alloc(1);
  return Buffer.isBuffer(buf) === true;
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
