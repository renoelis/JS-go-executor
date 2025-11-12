// Buffer.isBuffer() - 组合场景与交叉验证测试
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

// 类型组合测试
test('Buffer 和 null 的比较', () => {
  const buf = Buffer.from('test');
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(null) === false &&
         buf !== null;
});

test('Buffer 和 undefined 的比较', () => {
  const buf = Buffer.from('test');
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(undefined) === false &&
         buf !== undefined;
});

// 类型转换组合
test('数字数组转 Buffer 后判断', () => {
  const arr = [0, 1, 255, 128, 64];
  const buf = Buffer.from(arr);
  return Array.isArray(arr) === true &&
         Buffer.isBuffer(arr) === false &&
         Buffer.isBuffer(buf) === true &&
         buf.length === arr.length;
});

test('字符串转 Buffer 多种编码验证', () => {
  const str = 'hello';
  const encodings = ['utf8', 'hex', 'base64', 'ascii'];
  const bufs = encodings.map(enc => {
    try {
      return Buffer.from(str, enc);
    } catch (e) {
      return null;
    }
  });
  return bufs.filter(b => b !== null).every(b => Buffer.isBuffer(b) === true);
});

// Buffer 操作链
test('多次操作后的 Buffer 类型保持', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xFF);
  buf.write('test', 0);
  const slice = buf.slice(0, 4);
  slice.reverse();
  return Buffer.isBuffer(buf) === true && Buffer.isBuffer(slice) === true;
});

test('连续的 slice 和 subarray 操作', () => {
  const buf = Buffer.from('hello world test');
  const s1 = buf.slice(0, 10);
  const s2 = s1.slice(6);
  const s3 = s2.subarray(0, 4);
  return Buffer.isBuffer(s1) === true &&
         Buffer.isBuffer(s2) === true &&
         Buffer.isBuffer(s3) === true;
});

// Buffer 和 TypedArray 的区分
test('Buffer.from TypedArray 创建的是 Buffer', () => {
  const u8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(u8);
  return Buffer.isBuffer(u8) === false &&
         Buffer.isBuffer(buf) === true &&
         u8 instanceof Uint8Array === true &&
         buf instanceof Uint8Array === true;
});

test('Buffer.from ArrayBuffer 和 TypedArray.buffer 的区别', () => {
  const u8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf1 = Buffer.from(u8.buffer);
  const buf2 = Buffer.from(u8);
  return Buffer.isBuffer(buf1) === true &&
         Buffer.isBuffer(buf2) === true &&
         Buffer.isBuffer(u8.buffer) === false;
});

// 空和零值组合
test('空值创建的各种 Buffer', () => {
  const bufs = [
    Buffer.from(''),
    Buffer.from([]),
    Buffer.from(new ArrayBuffer(0)),
    Buffer.alloc(0),
    Buffer.allocUnsafe(0)
  ];
  return bufs.every(buf => Buffer.isBuffer(buf) === true && buf.length === 0);
});

test('零填充的 Buffer', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10, 0);
  const buf3 = Buffer.alloc(10).fill(0);
  return Buffer.isBuffer(buf1) === true &&
         Buffer.isBuffer(buf2) === true &&
         Buffer.isBuffer(buf3) === true &&
         buf1.every((v, i) => v === 0 && buf2[i] === 0 && buf3[i] === 0);
});

// concat 组合场景
test('concat 混合来源的 Buffer', () => {
  const bufs = [
    Buffer.from('hello'),
    Buffer.from([32]),
    Buffer.from(new ArrayBuffer(5)),
    Buffer.alloc(5, 0x21)
  ];
  const result = Buffer.concat(bufs);
  return bufs.every(b => Buffer.isBuffer(b) === true) &&
         Buffer.isBuffer(result) === true;
});

test('concat 单个 Buffer 多次', () => {
  const buf = Buffer.from('a');
  const result = Buffer.concat([buf, buf, buf, buf, buf]);
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(result) === true &&
         result.length === 5;
});

test('concat 嵌套 Buffer 数组', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result1 = Buffer.concat([buf1, buf2]);
  const result2 = Buffer.concat([result1, buf1]);
  return Buffer.isBuffer(result1) === true &&
         Buffer.isBuffer(result2) === true;
});

// 编码转换组合
test('Buffer 编码转换后判断', () => {
  const original = Buffer.from('hello', 'utf8');
  const hex = original.toString('hex');
  const back = Buffer.from(hex, 'hex');
  return Buffer.isBuffer(original) === true &&
         typeof hex === 'string' &&
         Buffer.isBuffer(hex) === false &&
         Buffer.isBuffer(back) === true &&
         original.equals(back);
});

test('base64 编码循环转换', () => {
  const original = Buffer.from('hello world');
  const b64 = original.toString('base64');
  const decoded = Buffer.from(b64, 'base64');
  const b64Again = decoded.toString('base64');
  return Buffer.isBuffer(original) === true &&
         Buffer.isBuffer(decoded) === true &&
         b64 === b64Again;
});

// 数组方法对 Buffer 的影响
test('map 不会改变 Buffer 为数组', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const mapped = [...buf].map(v => v * 2);
  return Buffer.isBuffer(buf) === true &&
         Array.isArray(mapped) === true &&
         Buffer.isBuffer(mapped) === false;
});

test('filter 不会改变 Buffer 为数组', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const filtered = [...buf].filter(v => v > 2);
  return Buffer.isBuffer(buf) === true &&
         Array.isArray(filtered) === true &&
         Buffer.isBuffer(filtered) === false;
});

// compare 和 equals 组合
test('compare 和 equals 一致性', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('test');
  const buf3 = Buffer.from('TEST');
  return Buffer.isBuffer(buf1) === true &&
         Buffer.isBuffer(buf2) === true &&
         Buffer.isBuffer(buf3) === true &&
         buf1.equals(buf2) === true &&
         Buffer.compare(buf1, buf2) === 0 &&
         buf1.equals(buf3) === false &&
         Buffer.compare(buf1, buf3) !== 0;
});

// 修改操作组合
test('连续 write 操作', () => {
  const buf = Buffer.alloc(20);
  buf.write('hello', 0);
  buf.write('world', 6);
  buf.write('!', 11);
  return Buffer.isBuffer(buf) === true &&
         buf.toString('utf8', 0, 12) === 'hello\x00world!';
});

test('混合数值写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(255, 0);
  buf.writeInt8(-128, 1);
  buf.writeUInt16LE(0x1234, 2);
  buf.writeInt32BE(0x12345678, 4);
  return Buffer.isBuffer(buf) === true &&
         buf[0] === 255 &&
         buf[1] === 128;
});

// 视图共享测试
test('Buffer 和 TypedArray 共享修改', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const u8 = new Uint8Array(ab);
  buf[0] = 100;
  u8[1] = 200;
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(u8) === false &&
         buf[0] === 100 &&
         buf[1] === 200 &&
         u8[0] === 100 &&
         u8[1] === 200;
});

// 边界索引组合
test('slice 各种边界组合', () => {
  const buf = Buffer.from('hello world');
  const slices = [
    buf.slice(),
    buf.slice(0),
    buf.slice(0, buf.length),
    buf.slice(-5),
    buf.slice(0, -6),
    buf.slice(6, 11)
  ];
  return slices.every(s => Buffer.isBuffer(s) === true);
});

// 多层嵌套切片
test('三层嵌套切片', () => {
  const buf = Buffer.from('hello world test data');
  const s1 = buf.slice(0, 16);
  const s2 = s1.slice(6, 11);
  const s3 = s2.slice(1, 4);
  s3[0] = 0x58;
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(s1) === true &&
         Buffer.isBuffer(s2) === true &&
         Buffer.isBuffer(s3) === true &&
         buf[7] === 0x58;
});

// 复制和视图的区别
test('Buffer.from Buffer 创建副本', () => {
  const original = Buffer.from('hello');
  const copy = Buffer.from(original);
  copy[0] = 0x48;
  return Buffer.isBuffer(original) === true &&
         Buffer.isBuffer(copy) === true &&
         original[0] !== copy[0];
});

test('slice 创建视图不是副本', () => {
  const original = Buffer.from('hello');
  const view = original.slice();
  view[0] = 0x48;
  return Buffer.isBuffer(original) === true &&
         Buffer.isBuffer(view) === true &&
         original[0] === view[0];
});

// 特殊长度组合
test('长度为素数的 Buffer', () => {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  const bufs = primes.map(p => Buffer.alloc(p));
  return bufs.every(buf => Buffer.isBuffer(buf) === true);
});

test('长度为 2 的幂的 Buffer', () => {
  const powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
  const bufs = powers.map(p => Buffer.alloc(p));
  return bufs.every(buf => Buffer.isBuffer(buf) === true);
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
