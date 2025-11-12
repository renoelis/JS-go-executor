// Buffer.isBuffer() - 查缺补漏：遗漏场景深度测试
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

// Buffer.isBuffer 函数本身的特性
test('Buffer.isBuffer 解绑调用仍有效', () => {
  const isBuffer = Buffer.isBuffer;
  const buf = Buffer.from('test');
  return isBuffer(buf) === true && isBuffer(null) === false;
});

test('Buffer.isBuffer 多次调用返回值一致', () => {
  const buf = Buffer.from('test');
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(buf) === true;
});

test('对同一非 Buffer 对象多次调用一致', () => {
  const obj = { data: 'test' };
  return Buffer.isBuffer(obj) === false &&
         Buffer.isBuffer(obj) === false &&
         Buffer.isBuffer(obj) === false;
});

// Buffer.from Uint8Array 的副本行为
test('Buffer.from Uint8Array 创建副本', () => {
  const u8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from(u8);
  u8[0] = 99;
  return Buffer.isBuffer(buf) === true && buf[0] === 1;
});

test('Buffer.from Uint8Array.buffer 创建视图', () => {
  const u8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from(u8.buffer);
  u8[0] = 99;
  return Buffer.isBuffer(buf) === true && buf[0] === 99;
});

// Buffer.from ArrayBuffer 带 offset 和 length
test('Buffer.from ArrayBuffer 带 offset', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2);
  return Buffer.isBuffer(buf) === true && buf.length === 8;
});

test('Buffer.from ArrayBuffer 带 offset 和 length', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2, 5);
  return Buffer.isBuffer(buf) === true && buf.length === 5;
});

test('Buffer.from ArrayBuffer offset=0 length=0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 0);
  return Buffer.isBuffer(buf) === true && buf.length === 0;
});

// Buffer 的底层 ArrayBuffer 属性
test('Buffer.buffer 属性不是 Buffer', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(buf.buffer) === false &&
         buf.buffer instanceof ArrayBuffer === true;
});

test('Buffer.byteOffset 属性', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true &&
         typeof buf.byteOffset === 'number' &&
         Buffer.isBuffer(buf.byteOffset) === false;
});

test('Buffer.byteLength 属性', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true &&
         typeof buf.byteLength === 'number' &&
         Buffer.isBuffer(buf.byteLength) === false;
});

test('Buffer 的 length 属性不是 Buffer', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true &&
         typeof buf.length === 'number' &&
         Buffer.isBuffer(buf.length) === false;
});

// Buffer.alloc 第三个参数（编码）
test('Buffer.alloc 带编码参数', () => {
  const buf = Buffer.alloc(10, 'a', 'utf8');
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.alloc 带编码参数 - hex', () => {
  const buf = Buffer.alloc(10, 'ff', 'hex');
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.alloc 带编码参数 - base64', () => {
  const buf = Buffer.alloc(10, 'YQ==', 'base64');
  return Buffer.isBuffer(buf) === true;
});

// 特殊长度参数
test('Buffer.alloc 长度为浮点数（向下取整）', () => {
  const buf = Buffer.alloc(5.9);
  return Buffer.isBuffer(buf) === true && buf.length === 5;
});

test('Buffer.alloc 长度为字符串数字', () => {
  try {
    const buf = Buffer.alloc('10');
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return true;
  }
});

test('Buffer.alloc 长度为 0 有效', () => {
  const buf = Buffer.alloc(0);
  return Buffer.isBuffer(buf) === true && buf.length === 0;
});

test('Buffer.alloc 长度为负数会抛错', () => {
  try {
    Buffer.alloc(-1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('must be');
  }
});

test('Buffer.alloc 长度为 NaN 会抛错', () => {
  try {
    Buffer.alloc(NaN);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('NaN');
  }
});

// Buffer 静态属性
test('Buffer.poolSize 不是 Buffer', () => {
  return typeof Buffer.poolSize === 'number' &&
         Buffer.isBuffer(Buffer.poolSize) === false;
});

test('Buffer.byteLength 静态方法', () => {
  const len = Buffer.byteLength('hello', 'utf8');
  return typeof len === 'number' && Buffer.isBuffer(len) === false;
});

test('Buffer.byteLength 返回值不是 Buffer', () => {
  const results = [
    Buffer.byteLength('test'),
    Buffer.byteLength('hello', 'utf8'),
    Buffer.byteLength('48656c6c6f', 'hex'),
    Buffer.byteLength('SGVsbG8=', 'base64')
  ];
  return results.every(len => typeof len === 'number' && Buffer.isBuffer(len) === false);
});

// Node.js Blob API（v15.7.0+）
test('Blob 不是 Buffer', () => {
  try {
    const { Blob } = require('buffer');
    const blob = new Blob(['hello']);
    return Buffer.isBuffer(blob) === false;
  } catch (e) {
    return true;
  }
});

test('从 Blob 读取的数据不是 Buffer', () => {
  try {
    const { Blob } = require('buffer');
    const blob = new Blob(['hello']);
    const text = blob.text();
    return Buffer.isBuffer(text) === false;
  } catch (e) {
    return true;
  }
});

// Buffer.compare 的错误场景
test('Buffer.compare 第二个参数不是 Buffer 抛错', () => {
  try {
    Buffer.compare(Buffer.from('a'), null);
    return false;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('buf2');
  }
});

test('Buffer.compare 第一个参数不是 Buffer 抛错', () => {
  try {
    Buffer.compare(null, Buffer.from('a'));
    return false;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('buf1');
  }
});

test('Buffer.compare 两个参数都不是 Buffer 抛错', () => {
  try {
    Buffer.compare(null, null);
    return false;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('buf');
  }
});

// Buffer.concat 的错误场景
test('Buffer.concat 数组包含 null 抛错', () => {
  try {
    Buffer.concat([Buffer.from('test'), null]);
    return false;
  } catch (e) {
    return e.message.includes('null') || e.message.includes('length') || e.message.includes('Buffer');
  }
});

test('Buffer.concat 数组包含非 Buffer 抛错', () => {
  try {
    Buffer.concat([Buffer.from('test'), 'string']);
    return false;
  } catch (e) {
    return true;
  }
});

test('Buffer.concat 数组包含 Uint8Array 抛错', () => {
  try {
    Buffer.concat([Buffer.from('test'), new Uint8Array([1, 2, 3])]);
    return false;
  } catch (e) {
    return true;
  }
});

// Buffer.from 的错误场景
test('Buffer.from Symbol 抛错', () => {
  try {
    Buffer.from(Symbol('test'));
    return false;
  } catch (e) {
    return e.message.includes('string') || e.message.includes('type') || e.message.includes('first argument');
  }
});

test('Buffer.from Function 抛错', () => {
  try {
    Buffer.from(function() {});
    return false;
  } catch (e) {
    return true;
  }
});

test('Buffer.from 纯数字抛错', () => {
  try {
    Buffer.from(123);
    return false;
  } catch (e) {
    return true;
  }
});

// Buffer 方法返回值类型验证
test('Buffer.includes 返回布尔值不是 Buffer', () => {
  const buf = Buffer.from('hello world');
  const result = buf.includes('world');
  return typeof result === 'boolean' && Buffer.isBuffer(result) === false;
});

test('Buffer.indexOf 返回数字不是 Buffer', () => {
  const buf = Buffer.from('hello world');
  const result = buf.indexOf('world');
  return typeof result === 'number' && Buffer.isBuffer(result) === false;
});

test('Buffer.lastIndexOf 返回数字不是 Buffer', () => {
  const buf = Buffer.from('hello hello');
  const result = buf.lastIndexOf('hello');
  return typeof result === 'number' && Buffer.isBuffer(result) === false;
});

test('Buffer.toString 返回字符串不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const result = buf.toString();
  return typeof result === 'string' && Buffer.isBuffer(result) === false;
});

test('Buffer.toJSON 返回对象不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const result = buf.toJSON();
  return typeof result === 'object' && Buffer.isBuffer(result) === false;
});

test('Buffer.toLocaleString 返回字符串不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const result = buf.toLocaleString();
  return typeof result === 'string' && Buffer.isBuffer(result) === false;
});

test('Buffer.keys 返回迭代器不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const iter = buf.keys();
  return typeof iter.next === 'function' && Buffer.isBuffer(iter) === false;
});

test('Buffer.values 返回迭代器不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const iter = buf.values();
  return typeof iter.next === 'function' && Buffer.isBuffer(iter) === false;
});

test('Buffer.entries 返回迭代器不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const iter = buf.entries();
  return typeof iter.next === 'function' && Buffer.isBuffer(iter) === false;
});

test('Buffer[Symbol.iterator] 返回迭代器不是 Buffer', () => {
  const buf = Buffer.from('hello');
  const iter = buf[Symbol.iterator]();
  return typeof iter.next === 'function' && Buffer.isBuffer(iter) === false;
});

// Buffer 数值读取方法返回值
test('Buffer.readInt8 返回数字不是 Buffer', () => {
  const buf = Buffer.from([127]);
  const val = buf.readInt8(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('Buffer.readUInt8 返回数字不是 Buffer', () => {
  const buf = Buffer.from([255]);
  const val = buf.readUInt8(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('Buffer.readInt16LE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const val = buf.readInt16LE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('Buffer.readUInt32BE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readUInt32BE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('Buffer.readFloatLE 返回数字不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(3.14, 0);
  const val = buf.readFloatLE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('Buffer.readDoubleLE 返回数字不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleLE(3.14159, 0);
  const val = buf.readDoubleLE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('Buffer.readBigInt64LE 返回 BigInt 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64LE(BigInt(12345), 0);
  const val = buf.readBigInt64LE(0);
  return typeof val === 'bigint' && Buffer.isBuffer(val) === false;
});

// 写入方法返回值
test('Buffer.write 返回数字（写入字节数）不是 Buffer', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0);
  return typeof written === 'number' && Buffer.isBuffer(written) === false;
});

test('Buffer.writeInt8 返回 offset 不是 Buffer', () => {
  const buf = Buffer.alloc(4);
  const offset = buf.writeInt8(127, 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('Buffer.copy 返回复制字节数不是 Buffer', () => {
  const src = Buffer.from('hello');
  const dst = Buffer.alloc(5);
  const copied = src.copy(dst);
  return typeof copied === 'number' && Buffer.isBuffer(copied) === false;
});

test('Buffer.fill 返回自身仍是 Buffer', () => {
  const buf = Buffer.alloc(10);
  const result = buf.fill(0xFF);
  return Buffer.isBuffer(result) === true && result === buf;
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
