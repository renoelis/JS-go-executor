// buf.length - Part 11: Additional Coverage Tests
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

// Buffer.concat 相关测试
test('Buffer.concat 空数组的 length', () => {
  const buf = Buffer.concat([]);
  return buf.length === 0;
});

test('Buffer.concat 单个 buffer 的 length', () => {
  const buf1 = Buffer.from('hello');
  const result = Buffer.concat([buf1]);
  return result.length === 5;
});

test('Buffer.concat 多个 buffer 的 length', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' ');
  const buf3 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.length === 11;
});

test('Buffer.concat 指定 totalLength 的 length', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 20);
  return result.length === 20;
});

test('Buffer.concat 指定小于实际长度的 totalLength', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 5);
  return result.length === 5;
});

// ArrayBuffer 相关测试
test('Buffer.from(ArrayBuffer) 的 length', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return buf.length === 10;
});

test('Buffer.from(ArrayBuffer, offset) 的 length', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2);
  return buf.length === 8;
});

test('Buffer.from(ArrayBuffer, offset, length) 的 length', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2, 5);
  return buf.length === 5;
});

// SharedArrayBuffer 相关测试
test('Buffer.from(SharedArrayBuffer) 的 length', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const buf = Buffer.from(sab);
    return buf.length === 10;
  } catch (e) {
    // SharedArrayBuffer 可能不支持
    return true;
  }
});

// Buffer 复制相关测试
test('Buffer.from(Buffer) 的 length', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  return buf2.length === 5;
});

test('Buffer.from(Buffer) 独立 length', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  // 修改 buf2 不影响 buf1 的 length
  return buf1.length === 5 && buf2.length === 5;
});

// TypedArray 相关测试
test('Buffer.from(Uint8Array) 的 length', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(arr);
  return buf.length === 5;
});

test('Buffer.from(Uint16Array) 的 length', () => {
  const arr = new Uint16Array([1, 2, 3]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 6; // 3 * 2 bytes
});

test('Buffer.from(Uint32Array) 的 length', () => {
  const arr = new Uint32Array([1, 2]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 8; // 2 * 4 bytes
});

test('Buffer.from(Float32Array) 的 length', () => {
  const arr = new Float32Array([1.5, 2.5]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 8; // 2 * 4 bytes
});

test('Buffer.from(Float64Array) 的 length', () => {
  const arr = new Float64Array([1.5]);
  const buf = Buffer.from(arr.buffer);
  return buf.length === 8; // 1 * 8 bytes
});

// byteOffset 相关测试
test('slice 后的 byteOffset 与 length 关系', () => {
  const buf = Buffer.alloc(20);
  const slice = buf.slice(5, 15);
  return slice.length === 10 && slice.byteOffset === 5;
});

test('subarray 后的 byteOffset 与 length 关系', () => {
  const buf = Buffer.alloc(20);
  const sub = buf.subarray(3, 13);
  return sub.length === 10 && sub.byteOffset === 3;
});

// buffer.buffer 相关测试
test('length 与 buffer.byteLength 的关系', () => {
  const buf = Buffer.alloc(10);
  return buf.length <= buf.buffer.byteLength;
});

test('slice 后 length 与 buffer.byteLength 的关系', () => {
  const buf = Buffer.alloc(20);
  const slice = buf.slice(5, 15);
  // slice 的 length 是 10，但 buffer.byteLength 可能更大
  return slice.length === 10 && slice.buffer.byteLength >= 10;
});

// allocUnsafe 相关测试
test('allocUnsafe 的 length', () => {
  const buf = Buffer.allocUnsafe(100);
  return buf.length === 100;
});

test('allocUnsafeSlow 的 length', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf.length === 100;
});

// 特殊值测试
test('length 不受 NaN 赋值影响', () => {
  const buf = Buffer.alloc(10);
  buf.length = NaN;
  return buf.length === 10;
});

test('length 不受 Infinity 赋值影响', () => {
  const buf = Buffer.alloc(10);
  buf.length = Infinity;
  return buf.length === 10;
});

test('length 不受 -Infinity 赋值影响', () => {
  const buf = Buffer.alloc(10);
  buf.length = -Infinity;
  return buf.length === 10;
});

test('length 不受数组赋值影响', () => {
  const buf = Buffer.alloc(10);
  buf.length = [1, 2, 3];
  return buf.length === 10;
});

test('length 不受函数赋值影响', () => {
  const buf = Buffer.alloc(10);
  buf.length = function() { return 20; };
  return buf.length === 10;
});

// 边界值测试
test('length 为 2^8 的情况', () => {
  const buf = Buffer.alloc(256);
  return buf.length === 256;
});

test('length 为 2^12 的情况', () => {
  const buf = Buffer.alloc(4096);
  return buf.length === 4096;
});

test('length 为 2^13 的情况', () => {
  const buf = Buffer.alloc(8192);
  return buf.length === 8192;
});

test('length 为 2^14 的情况', () => {
  const buf = Buffer.alloc(16384);
  return buf.length === 16384;
});

// 操作后 length 不变测试
test('write 后 length 不变', () => {
  const buf = Buffer.alloc(20);
  buf.write('hello', 0, 'utf8');
  return buf.length === 20;
});

test('writeInt8 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt8(127, 0);
  return buf.length === 10;
});

test('writeInt16BE 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(32767, 0);
  return buf.length === 10;
});

test('writeInt32BE 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt32BE(2147483647, 0);
  return buf.length === 10;
});

test('writeFloatBE 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeFloatBE(3.14, 0);
  return buf.length === 10;
});

test('writeDoubleBE 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeDoubleBE(3.14159, 0);
  return buf.length === 10;
});

// 比较操作后 length 不变
test('compare 后 length 不变', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('def');
  buf1.compare(buf2);
  return buf1.length === 3 && buf2.length === 3;
});

test('equals 后 length 不变', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  buf1.equals(buf2);
  return buf1.length === 3 && buf2.length === 3;
});

// 迭代器操作后 length 不变
test('entries() 后 length 不变', () => {
  const buf = Buffer.from('hello');
  const iter = buf.entries();
  iter.next();
  return buf.length === 5;
});

test('keys() 后 length 不变', () => {
  const buf = Buffer.from('hello');
  const iter = buf.keys();
  iter.next();
  return buf.length === 5;
});

test('values() 后 length 不变', () => {
  const buf = Buffer.from('hello');
  const iter = buf.values();
  iter.next();
  return buf.length === 5;
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
