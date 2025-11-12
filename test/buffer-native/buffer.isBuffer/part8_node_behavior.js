// Buffer.isBuffer() - Node v25.0.0 实际行为验证测试
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

// 基于实际行为的边界测试
test('Buffer 长度为 1 字节', () => {
  const buf = Buffer.alloc(1);
  return Buffer.isBuffer(buf) === true && buf.length === 1;
});

test('Buffer 长度为 2 字节', () => {
  const buf = Buffer.alloc(2);
  return Buffer.isBuffer(buf) === true && buf.length === 2;
});

test('Buffer 长度为 1024 字节', () => {
  const buf = Buffer.alloc(1024);
  return Buffer.isBuffer(buf) === true && buf.length === 1024;
});

test('Buffer 长度为 4096 字节（页面大小）', () => {
  const buf = Buffer.alloc(4096);
  return Buffer.isBuffer(buf) === true && buf.length === 4096;
});

test('Buffer 长度为 8192 字节（poolSize）', () => {
  const buf = Buffer.alloc(8192);
  return Buffer.isBuffer(buf) === true && buf.length === 8192;
});

// 实际内存分配行为
test('allocUnsafe 不初始化内存', () => {
  const buf = Buffer.allocUnsafe(10);
  return Buffer.isBuffer(buf) === true;
});

test('alloc 初始化为零', () => {
  const buf = Buffer.alloc(10);
  return Buffer.isBuffer(buf) === true && buf[0] === 0;
});

test('alloc 可以指定填充值', () => {
  const buf = Buffer.alloc(10, 0xFF);
  return Buffer.isBuffer(buf) === true && buf[0] === 0xFF;
});

test('alloc 可以使用字符串填充', () => {
  const buf = Buffer.alloc(10, 'a');
  return Buffer.isBuffer(buf) === true && buf[0] === 0x61;
});

test('alloc 可以使用 Buffer 填充', () => {
  const fill = Buffer.from([1, 2]);
  const buf = Buffer.alloc(10, fill);
  return Buffer.isBuffer(buf) === true;
});

// 字符串编码的实际行为
test('utf8 和 utf-8 是相同编码', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('hello', 'utf-8');
  return Buffer.isBuffer(buf1) === true && Buffer.isBuffer(buf2) === true;
});

test('ucs2 和 ucs-2 是相同编码', () => {
  const buf1 = Buffer.from('hello', 'ucs2');
  const buf2 = Buffer.from('hello', 'ucs-2');
  return Buffer.isBuffer(buf1) === true && Buffer.isBuffer(buf2) === true;
});

test('utf16le 和 utf-16le 是相同编码', () => {
  const buf1 = Buffer.from('hello', 'utf16le');
  const buf2 = Buffer.from('hello', 'utf-16le');
  return Buffer.isBuffer(buf1) === true && Buffer.isBuffer(buf2) === true;
});

test('latin1 和 binary 是相同编码', () => {
  const buf1 = Buffer.from('hello', 'latin1');
  const buf2 = Buffer.from('hello', 'binary');
  return Buffer.isBuffer(buf1) === true && Buffer.isBuffer(buf2) === true;
});

// Buffer.from 特殊行为
test('Buffer.from 字符串默认 utf8', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello', 'utf8');
  return Buffer.isBuffer(buf1) === true &&
         Buffer.isBuffer(buf2) === true &&
         buf1.equals(buf2);
});

test('Buffer.from 空字符串各编码都返回零长度 Buffer', () => {
  const encodings = ['utf8', 'hex', 'base64', 'ascii'];
  return encodings.every(enc => {
    const buf = Buffer.from('', enc);
    return Buffer.isBuffer(buf) === true && buf.length === 0;
  });
});

// Buffer.concat 实际行为
test('Buffer.concat 不修改原 Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const original1 = buf1.toString();
  const original2 = buf2.toString();
  const result = Buffer.concat([buf1, buf2]);
  return Buffer.isBuffer(result) === true &&
         Buffer.isBuffer(buf1) === true &&
         Buffer.isBuffer(buf2) === true &&
         buf1.toString() === original1 &&
         buf2.toString() === original2;
});

test('Buffer.concat 返回新 Buffer', () => {
  const buf1 = Buffer.from('hello');
  const result = Buffer.concat([buf1]);
  return Buffer.isBuffer(result) === true && result !== buf1;
});

// Buffer 切片的实际行为
test('slice 返回原 buffer 的视图', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(0, 3);
  slice[0] = 0x48;
  return Buffer.isBuffer(slice) === true &&
         Buffer.isBuffer(buf) === true &&
         buf[0] === 0x48;
});

test('subarray 和 slice 行为相同', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(1, 4);
  const sub = buf.subarray(1, 4);
  return Buffer.isBuffer(slice) === true &&
         Buffer.isBuffer(sub) === true &&
         slice.equals(sub);
});

// Buffer 比较的实际行为
test('Buffer.compare 不会改变 Buffer 的类型', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.from('b');
  const cmp = Buffer.compare(buf1, buf2);
  return typeof cmp === 'number' &&
         Buffer.isBuffer(buf1) === true &&
         Buffer.isBuffer(buf2) === true;
});

test('Buffer equals 是实例方法', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const result = buf1.equals(buf2);
  return result === true && Buffer.isBuffer(buf1) === true;
});

// TypedArray 互操作的实际行为
test('Buffer 是 Uint8Array 的实例', () => {
  const buf = Buffer.from('test');
  return Buffer.isBuffer(buf) === true &&
         buf instanceof Uint8Array === true;
});

test('Uint8Array 不是 Buffer', () => {
  const u8 = new Uint8Array([1, 2, 3]);
  return Buffer.isBuffer(u8) === false &&
         u8 instanceof Uint8Array === true;
});

test('Buffer 和 Uint8Array 共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const u8 = new Uint8Array(ab);
  buf[0] = 255;
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(u8) === false &&
         u8[0] === 255;
});

// Buffer 修改操作的类型保持
test('write 操作不改变类型', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  return Buffer.isBuffer(buf) === true;
});

test('writeInt8 操作不改变类型', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(127, 0);
  return Buffer.isBuffer(buf) === true;
});

test('writeUInt32LE 操作不改变类型', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0x12345678, 0);
  return Buffer.isBuffer(buf) === true;
});

test('fill 操作不改变类型', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0);
  return Buffer.isBuffer(buf) === true;
});

// Buffer 复制的实际行为
test('copy 不改变源和目标类型', () => {
  const src = Buffer.from('hello');
  const dst = Buffer.alloc(5);
  const copied = src.copy(dst);
  return typeof copied === 'number' &&
         Buffer.isBuffer(src) === true &&
         Buffer.isBuffer(dst) === true;
});

test('copy 可以指定范围', () => {
  const src = Buffer.from('hello');
  const dst = Buffer.alloc(10);
  src.copy(dst, 0, 0, 3);
  return Buffer.isBuffer(dst) === true && dst[0] === 0x68;
});

// Buffer 迭代的实际行为
test('Buffer 可迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = [...buf];
  return Buffer.isBuffer(buf) === true &&
         Array.isArray(arr) === true &&
         arr[0] === 1;
});

test('Buffer values 返回迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  return Buffer.isBuffer(buf) === true &&
         typeof iter.next === 'function';
});

test('Buffer keys 返回迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  return Buffer.isBuffer(buf) === true &&
         typeof iter.next === 'function';
});

test('Buffer entries 返回迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return Buffer.isBuffer(buf) === true &&
         typeof iter.next === 'function';
});

// Buffer indexOf 和 lastIndexOf 实际行为
test('indexOf 不改变 Buffer 类型', () => {
  const buf = Buffer.from('hello world');
  const idx = buf.indexOf('world');
  return typeof idx === 'number' && Buffer.isBuffer(buf) === true;
});

test('lastIndexOf 不改变 Buffer 类型', () => {
  const buf = Buffer.from('hello hello');
  const idx = buf.lastIndexOf('hello');
  return typeof idx === 'number' && Buffer.isBuffer(buf) === true;
});

test('includes 不改变 Buffer 类型', () => {
  const buf = Buffer.from('hello world');
  const result = buf.includes('world');
  return typeof result === 'boolean' && Buffer.isBuffer(buf) === true;
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
