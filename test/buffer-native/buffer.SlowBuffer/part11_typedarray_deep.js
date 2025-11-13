// Buffer.allocUnsafeSlow - TypedArray 深度交互 (Round 4 补漏)
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

// Uint8Array 方法测试
test('allocUnsafeSlow Buffer 是 Uint8Array 的实例', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Uint8Array;
});

test('可以使用 Uint8Array.set 设置值', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.set([1, 2, 3], 2);
  return buf[2] === 1 && buf[3] === 2 && buf[4] === 3;
});

test('可以使用 Uint8Array.subarray', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf[5] = 100;
  const sub = buf.subarray(5, 7);
  return sub[0] === 100 && sub instanceof Uint8Array;
});

test('forEach 方法正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  let sum = 0;
  buf.forEach(byte => sum += byte);
  return sum === 6;
});

test('map 方法正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const doubled = buf.map(byte => byte * 2);
  return doubled[0] === 2 && doubled[1] === 4 && doubled[2] === 6;
});

test('filter 方法正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  const filtered = buf.filter(byte => byte > 2);
  return filtered.length === 3 && filtered[0] === 3;
});

test('reduce 方法正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  const sum = buf.reduce((acc, val) => acc + val, 0);
  return sum === 10;
});

test('every 方法正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf.fill(10);
  return buf.every(byte => byte === 10);
});

test('some 方法正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(0);
  buf[2] = 100;
  return buf.some(byte => byte === 100);
});

test('find 方法正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const result = buf.find(byte => byte > 2);
  return result === 3;
});

test('findIndex 方法正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const index = buf.findIndex(byte => byte > 2);
  return index === 2;
});

// ArrayBuffer 交互
test('buffer 属性返回底层 ArrayBuffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('byteOffset 属性正确', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('byteLength 属性等于 length', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.byteLength === buf.length;
});

test('可以从 Buffer 创建其他 TypedArray 视图', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.fill(0);
  buf.writeUInt32LE(0x12345678, 0);
  const view = new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return view[0] === 0x12345678;
});

test('可以创建 Int8Array 视图', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf[0] = 255;
  buf[1] = 1;
  const int8 = new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return int8[0] === -1 && int8[1] === 1;
});

test('可以创建 Uint16Array 视图', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeUInt16LE(0x1234, 0);
  const uint16 = new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
  return uint16[0] === 0x1234;
});

test('可以创建 Float32Array 视图', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatLE(3.14, 0);
  const float32 = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return Math.abs(float32[0] - 3.14) < 0.01;
});

test('可以创建 Float64Array 视图', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeDoubleLE(3.14159, 0);
  const float64 = new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8);
  return Math.abs(float64[0] - 3.14159) < 0.00001;
});

// DataView 交互
test('可以创建 DataView', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return dv instanceof DataView;
});

test('DataView 可以读写数据', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  dv.setUint32(0, 0x12345678, true);
  return buf.readUInt32LE(0) === 0x12345678;
});

test('DataView 字节序控制', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  dv.setUint16(0, 0x1234, false);
  return dv.getUint16(0, false) === 0x1234;
});

// 视图修改验证
test('修改 TypedArray 视图影响 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.fill(0);
  const uint32 = new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  uint32[0] = 0xFFFFFFFF;
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('修改 Buffer 影响 TypedArray 视图', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  const uint32 = new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  buf.fill(0xFF);
  return uint32[0] === 0xFFFFFFFF;
});

// BYTES_PER_ELEMENT
test('Buffer BYTES_PER_ELEMENT 是 1', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.BYTES_PER_ELEMENT === 1;
});

test('Uint8Array BYTES_PER_ELEMENT 是 1', () => {
  return Uint8Array.BYTES_PER_ELEMENT === 1;
});

// 与其他 TypedArray 的比较
test('Buffer 和 Uint8Array 长度相同时可以比较', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const uint8 = new Uint8Array(5);
  buf.fill(10);
  uint8.fill(10);
  return buf.every((val, i) => val === uint8[i]);
});

test('可以从 Buffer 复制到 Uint8Array', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const uint8 = new Uint8Array(5);
  uint8.set(buf);
  return uint8[0] === 1 && uint8[1] === 2 && uint8[2] === 3;
});

test('可以从 Uint8Array 复制到 Buffer', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.allocUnsafeSlow(5);
  buf.set(uint8);
  return buf[0] === 1 && buf[4] === 5;
});

// 数组方法返回类型
test('slice 返回 Buffer 而非 Uint8Array', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const slice = buf.slice(0, 2);
  return Buffer.isBuffer(slice);
});

test('subarray 返回 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const sub = buf.subarray(0, 2);
  return Buffer.isBuffer(sub);
});

// 长度和容量
test('Buffer.length 等于分配的大小', () => {
  const sizes = [0, 1, 10, 100, 1000];
  return sizes.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  });
});

test('Buffer.byteLength 等于 length', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf.byteLength === buf.length;
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
