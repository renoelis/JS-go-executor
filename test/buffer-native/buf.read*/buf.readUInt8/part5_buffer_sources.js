// buf.readUInt8() - 不同 Buffer 来源测试
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

// Buffer.from() 不同参数
test('Buffer.from(array) 读取', () => {
  const buf = Buffer.from([255, 128, 0]);
  return buf.readUInt8(0) === 255 && buf.readUInt8(1) === 128 && buf.readUInt8(2) === 0;
});

test('Buffer.from(string, encoding) 读取', () => {
  const buf = Buffer.from('test', 'utf8');
  const firstByte = buf.readUInt8(0);
  // 't' 的 ASCII 码是 116
  return firstByte === 116;
});

test('Buffer.from(buffer) 读取', () => {
  const original = Buffer.from([100, 200]);
  const copy = Buffer.from(original);
  return copy.readUInt8(0) === 100 && copy.readUInt8(1) === 200;
});

test('Buffer.from(hex string) 读取', () => {
  const buf = Buffer.from('ff80', 'hex');
  return buf.readUInt8(0) === 255 && buf.readUInt8(1) === 128;
});

test('Buffer.from(base64 string) 读取', () => {
  const buf = Buffer.from('AQID', 'base64'); // [1, 2, 3]
  return buf.readUInt8(0) === 1 && buf.readUInt8(1) === 2 && buf.readUInt8(2) === 3;
});

// Buffer.alloc()
test('Buffer.alloc() 默认值读取', () => {
  const buf = Buffer.alloc(3);
  return buf.readUInt8(0) === 0 && buf.readUInt8(1) === 0 && buf.readUInt8(2) === 0;
});

test('Buffer.alloc(size, fill) 读取', () => {
  const buf = Buffer.alloc(3, 100);
  return buf.readUInt8(0) === 100 && buf.readUInt8(1) === 100 && buf.readUInt8(2) === 100;
});

test('Buffer.alloc() 255 填充读取', () => {
  const buf = Buffer.alloc(3, 255);
  return buf.readUInt8(0) === 255 && buf.readUInt8(1) === 255 && buf.readUInt8(2) === 255;
});

test('Buffer.alloc() 字符串填充读取', () => {
  const buf = Buffer.alloc(4, 'A');
  // 'A' 的 ASCII 码是 65
  return buf.readUInt8(0) === 65 && buf.readUInt8(1) === 65;
});

// Buffer.allocUnsafe()
test('Buffer.allocUnsafe() 写入后读取', () => {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUInt8(255, 0);
  buf.writeUInt8(128, 1);
  return buf.readUInt8(0) === 255 && buf.readUInt8(1) === 128;
});

// ArrayBuffer 视图
test('从 Uint8Array 创建的 Buffer 读取', () => {
  const arr = new Uint8Array([255, 128, 0]);
  const buf = Buffer.from(arr.buffer);
  return buf.readUInt8(0) === 255 && buf.readUInt8(1) === 128 && buf.readUInt8(2) === 0;
});

test('从 Uint8Array 直接创建的 Buffer 读取', () => {
  const arr = new Uint8Array([200, 100, 50]);
  const buf = Buffer.from(arr);
  return buf.readUInt8(0) === 200 && buf.readUInt8(1) === 100 && buf.readUInt8(2) === 50;
});

test('从 ArrayBuffer 创建的 Buffer 读取', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 255;
  view[1] = 128;
  view[2] = 0;
  const buf = Buffer.from(ab);
  return buf.readUInt8(0) === 255 && buf.readUInt8(1) === 128 && buf.readUInt8(2) === 0;
});

test('从 Uint16Array 创建的 Buffer 读取', () => {
  const arr = new Uint16Array([0x00FF, 0x0080]);
  const buf = Buffer.from(arr.buffer);
  // 取决于字节序，但应能正确读取
  return typeof buf.readUInt8(0) === 'number';
});

// Buffer.concat()
test('Buffer.concat() 后读取', () => {
  const buf1 = Buffer.from([100]);
  const buf2 = Buffer.from([200]);
  const buf3 = Buffer.from([0]);
  const combined = Buffer.concat([buf1, buf2, buf3]);
  return combined.readUInt8(0) === 100 && combined.readUInt8(1) === 200 && combined.readUInt8(2) === 0;
});

test('Buffer.concat() 多个 buffer 读取', () => {
  const bufs = [
    Buffer.from([1]),
    Buffer.from([2]),
    Buffer.from([3]),
    Buffer.from([4]),
    Buffer.from([5])
  ];
  const combined = Buffer.concat(bufs);
  return combined.readUInt8(0) === 1 && 
         combined.readUInt8(1) === 2 && 
         combined.readUInt8(4) === 5;
});

// slice 后读取
test('Buffer.slice() 后读取', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(1, 4);
  return sliced.readUInt8(0) === 20 && sliced.readUInt8(1) === 30 && sliced.readUInt8(2) === 40;
});

test('Buffer.slice() 负索引后读取', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(-2);
  return sliced.readUInt8(0) === 40 && sliced.readUInt8(1) === 50;
});

test('Buffer.subarray() 后读取', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(2, 5);
  return sub.readUInt8(0) === 30 && sub.readUInt8(1) === 40 && sub.readUInt8(2) === 50;
});

// 填充后读取
test('Buffer.fill() 后读取', () => {
  const buf = Buffer.alloc(5);
  buf.fill(255);
  return buf.readUInt8(0) === 255 && buf.readUInt8(4) === 255;
});

test('Buffer.fill() 部分填充后读取', () => {
  const buf = Buffer.alloc(5);
  buf.fill(128, 1, 3);
  return buf.readUInt8(0) === 0 && buf.readUInt8(1) === 128 && buf.readUInt8(2) === 128 && buf.readUInt8(3) === 0;
});

test('Buffer.fill() 字符串后读取', () => {
  const buf = Buffer.alloc(5);
  buf.fill('A');
  return buf.readUInt8(0) === 65 && buf.readUInt8(4) === 65;
});

// 复制后读取
test('Buffer.copy() 后读取', () => {
  const src = Buffer.from([255, 128, 0]);
  const dst = Buffer.alloc(5);
  src.copy(dst, 1);
  return dst.readUInt8(0) === 0 && dst.readUInt8(1) === 255 && dst.readUInt8(2) === 128 && dst.readUInt8(3) === 0;
});

test('Buffer.copy() 部分复制后读取', () => {
  const src = Buffer.from([10, 20, 30, 40, 50]);
  const dst = Buffer.alloc(5);
  src.copy(dst, 0, 2, 4);
  return dst.readUInt8(0) === 30 && dst.readUInt8(1) === 40;
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
