// buffer.kMaxLength - Part 11: ArrayBuffer and TypedArray Integration
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

// ArrayBuffer 相关测试
test('Buffer.from(ArrayBuffer) 完整复制', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return buf.length === 10;
});

test('Buffer.from(ArrayBuffer, byteOffset)', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5);
  return buf.length === 5;
});

test('Buffer.from(ArrayBuffer, byteOffset, length)', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2, 5);
  return buf.length === 5;
});

test('Buffer.from(ArrayBuffer) byteOffset 超出范围抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, 100);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('Buffer.from(ArrayBuffer) length 超出范围抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, 0, 100);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

// TypedArray 系列测试
test('Buffer.from(Uint8Array)', () => {
  const u8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(u8);
  return buf.length === 5 && buf[0] === 1;
});

test('Buffer.from(Uint16Array)', () => {
  const u16 = new Uint16Array([1, 2, 3]);
  const buf = Buffer.from(u16.buffer);
  return buf.length === 6;
});

test('Buffer.from(Uint32Array)', () => {
  const u32 = new Uint32Array([1, 2]);
  const buf = Buffer.from(u32.buffer);
  return buf.length === 8;
});

test('Buffer.from(Int8Array)', () => {
  const i8 = new Int8Array([-1, -2, -3]);
  const buf = Buffer.from(i8);
  return buf.length === 3 && buf[0] === 255;
});

test('Buffer.from(Int16Array)', () => {
  const i16 = new Int16Array([256, 512]);
  const buf = Buffer.from(i16.buffer);
  return buf.length === 4;
});

test('Buffer.from(Int32Array)', () => {
  const i32 = new Int32Array([1, 2]);
  const buf = Buffer.from(i32.buffer);
  return buf.length === 8;
});

test('Buffer.from(Float32Array)', () => {
  const f32 = new Float32Array([1.5, 2.5]);
  const buf = Buffer.from(f32.buffer);
  return buf.length === 8;
});

test('Buffer.from(Float64Array)', () => {
  const f64 = new Float64Array([1.5, 2.5]);
  const buf = Buffer.from(f64.buffer);
  return buf.length === 16;
});

test('Buffer.from(BigInt64Array)', () => {
  const bi64 = new BigInt64Array([1n, 2n]);
  const buf = Buffer.from(bi64.buffer);
  return buf.length === 16;
});

test('Buffer.from(BigUint64Array)', () => {
  const bu64 = new BigUint64Array([1n, 2n]);
  const buf = Buffer.from(bu64.buffer);
  return buf.length === 16;
});

// Buffer 与 TypedArray 共享内存
test('Buffer 和 Uint8Array 共享内存', () => {
  const buf = Buffer.from([1, 2, 3]);
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  u8[0] = 99;
  return buf[0] === 99;
});

test('修改 Buffer 影响对应的 TypedArray', () => {
  const ab = new ArrayBuffer(10);
  const u8 = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  buf[0] = 100;
  return u8[0] === 100;
});

// buffer.buffer 属性
test('buffer.buffer 返回底层 ArrayBuffer', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('buffer.buffer 长度可能大于 buffer.length（池分配）', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer.byteLength >= buf.length;
});

test('buffer.byteOffset 存在', () => {
  const buf = Buffer.alloc(10);
  return typeof buf.byteOffset === 'number';
});

test('buffer.byteLength 等于 buffer.length', () => {
  const buf = Buffer.alloc(10);
  return buf.byteLength === buf.length;
});

// DataView 集成
test('DataView 可以访问 Buffer 数据', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const value = dv.getUint32(0, false);
  return value === 0x01020304;
});

test('通过 DataView 修改 Buffer', () => {
  const buf = Buffer.alloc(4);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  dv.setUint32(0, 0x01020304, false);
  return buf[0] === 0x01 && buf[3] === 0x04;
});

// Buffer 继承自 Uint8Array
test('Buffer instanceof Uint8Array', () => {
  const buf = Buffer.alloc(10);
  return buf instanceof Uint8Array;
});

test('Buffer.prototype 继承自 Uint8Array.prototype', () => {
  return Uint8Array.prototype.isPrototypeOf(Buffer.prototype);
});

test('Buffer 拥有 Uint8Array 的方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const filtered = buf.filter(x => x > 1);
  return filtered.length === 2;
});

test('Buffer.map 返回 Buffer 而非 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  const mapped = buf.map(x => x * 2);
  return Buffer.isBuffer(mapped);
});

test('Buffer.slice 返回 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  return Buffer.isBuffer(sliced);
});

// kMaxLength 与 TypedArray 最大长度的关系
test('kMaxLength 大于 Uint8Array 实际可分配长度', () => {
  try {
    new Uint8Array(kMaxLength);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('TypedArray 有自己的长度限制', () => {
  try {
    new Uint8Array(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e instanceof RangeError;
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
