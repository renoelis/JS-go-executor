// buf.readBigInt64LE() - Buffer 不同来源测试
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

// Buffer.from() 不同来源
test('Buffer.from(array) 读取', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readBigInt64LE(0) === 9223372036854775807n;
});

test('Buffer.from(string) 读取', () => {
  const buf = Buffer.from('0000000000000000', 'hex');
  return buf.readBigInt64LE(0) === 0n;
});

test('Buffer.from(string, utf8) 读取', () => {
  const buf = Buffer.from('12345678');
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint';
});

test('Buffer.from(buffer) 读取', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeBigInt64LE(12345n, 0);
  const buf2 = Buffer.from(buf1);
  return buf2.readBigInt64LE(0) === 12345n;
});

test('Buffer.from(arrayBuffer) 读取', () => {
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setBigInt64(0, 99999n, true);
  const buf = Buffer.from(ab);
  return buf.readBigInt64LE(0) === 99999n;
});

test('Buffer.from(arrayBuffer, offset) 读取', () => {
  const ab = new ArrayBuffer(16);
  const view = new DataView(ab);
  view.setBigInt64(8, 77777n, true);
  const buf = Buffer.from(ab, 8, 8);
  return buf.readBigInt64LE(0) === 77777n;
});

test('Buffer.from(arrayBuffer, offset, length) 读取', () => {
  const ab = new ArrayBuffer(24);
  const view = new DataView(ab);
  view.setBigInt64(8, 55555n, true);
  const buf = Buffer.from(ab, 8, 8);
  return buf.readBigInt64LE(0) === 55555n;
});

// Buffer.alloc() 不同大小
test('Buffer.alloc(8) 读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(11111n, 0);
  return buf.readBigInt64LE(0) === 11111n;
});

test('Buffer.alloc(16) 读取不同位置', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(22222n, 0);
  buf.writeBigInt64LE(33333n, 8);
  return buf.readBigInt64LE(0) === 22222n && buf.readBigInt64LE(8) === 33333n;
});

test('Buffer.alloc(1024) 大 Buffer 读取', () => {
  const buf = Buffer.alloc(1024);
  buf.writeBigInt64LE(44444n, 512);
  return buf.readBigInt64LE(512) === 44444n;
});

// Buffer.allocUnsafe()
test('Buffer.allocUnsafe(8) 写入后读取', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64LE(66666n, 0);
  return buf.readBigInt64LE(0) === 66666n;
});

test('Buffer.allocUnsafe(16) 写入后读取', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeBigInt64LE(88888n, 8);
  return buf.readBigInt64LE(8) === 88888n;
});

// Buffer.concat()
test('Buffer.concat() 后读取', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeBigInt64LE(11111n, 0);
  const buf2 = Buffer.alloc(8);
  buf2.writeBigInt64LE(22222n, 0);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readBigInt64LE(0) === 11111n && buf.readBigInt64LE(8) === 22222n;
});

test('Buffer.concat() 单个 Buffer 后读取', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeBigInt64LE(33333n, 0);
  const buf = Buffer.concat([buf1]);
  return buf.readBigInt64LE(0) === 33333n;
});

// 从 TypedArray 创建
test('从 Uint8Array 创建后读取', () => {
  const arr = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  const buf = Buffer.from(arr);
  return buf.readBigInt64LE(0) === 9223372036854775807n;
});

test('从 Int8Array 创建后读取', () => {
  const arr = new Int8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const buf = Buffer.from(arr);
  return typeof buf.readBigInt64LE(0) === 'bigint';
});

test('从 Uint16Array.buffer 创建后读取', () => {
  const arr = new Uint16Array(4);
  arr[0] = 0xFFFF;
  arr[1] = 0xFFFF;
  arr[2] = 0xFFFF;
  arr[3] = 0x7FFF;
  const buf = Buffer.from(arr.buffer);
  return typeof buf.readBigInt64LE(0) === 'bigint';
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
