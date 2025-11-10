// 不同Buffer来源测试
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

// Buffer.from 测试
test('Buffer.from(array) - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE(0) === 0x1234;
});

test('Buffer.from(array) - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readInt16LE(0) === 0x1234;
});

test('Buffer.from(string) - BE', () => {
  const buf = Buffer.from('1234', 'hex');
  return buf.readInt16BE(0) === 0x1234;
});

test('Buffer.from(string) - LE', () => {
  const buf = Buffer.from('3412', 'hex');
  return buf.readInt16LE(0) === 0x1234;
});

// Buffer.alloc 测试
test('Buffer.alloc - BE', () => {
  const buf = Buffer.alloc(2);
  buf[0] = 0x12;
  buf[1] = 0x34;
  return buf.readInt16BE(0) === 0x1234;
});

test('Buffer.alloc - LE', () => {
  const buf = Buffer.alloc(2);
  buf[0] = 0x34;
  buf[1] = 0x12;
  return buf.readInt16LE(0) === 0x1234;
});

// Buffer.allocUnsafe 测试
test('Buffer.allocUnsafe - BE', () => {
  const buf = Buffer.allocUnsafe(2);
  buf[0] = 0x7F;
  buf[1] = 0xFF;
  return buf.readInt16BE(0) === 32767;
});

test('Buffer.allocUnsafe - LE', () => {
  const buf = Buffer.allocUnsafe(2);
  buf[0] = 0xFF;
  buf[1] = 0x7F;
  return buf.readInt16LE(0) === 32767;
});

// Uint8Array 转 Buffer 测试
test('Uint8Array to Buffer - BE', () => {
  const arr = new Uint8Array([0x80, 0x00]);
  const buf = Buffer.from(arr);
  return buf.readInt16BE(0) === -32768;
});

test('Uint8Array to Buffer - LE', () => {
  const arr = new Uint8Array([0x00, 0x80]);
  const buf = Buffer.from(arr);
  return buf.readInt16LE(0) === -32768;
});

// ArrayBuffer 转 Buffer 测试
test('ArrayBuffer to Buffer - BE', () => {
  const ab = new ArrayBuffer(2);
  const view = new Uint8Array(ab);
  view[0] = 0x00;
  view[1] = 0x01;
  const buf = Buffer.from(ab);
  return buf.readInt16BE(0) === 1;
});

test('ArrayBuffer to Buffer - LE', () => {
  const ab = new ArrayBuffer(2);
  const view = new Uint8Array(ab);
  view[0] = 0x01;
  view[1] = 0x00;
  const buf = Buffer.from(ab);
  return buf.readInt16LE(0) === 1;
});

// Buffer.concat 测试
test('Buffer.concat - BE', () => {
  const buf1 = Buffer.from([0xFF]);
  const buf2 = Buffer.from([0xFF]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readInt16BE(0) === -1;
});

test('Buffer.concat - LE', () => {
  const buf1 = Buffer.from([0xFF]);
  const buf2 = Buffer.from([0xFF]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readInt16LE(0) === -1;
});

// Buffer.slice 测试
test('Buffer.slice - BE', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x00]);
  const slice = buf.slice(1, 3);
  return slice.readInt16BE(0) === 0x1234;
});

test('Buffer.slice - LE', () => {
  const buf = Buffer.from([0x00, 0x34, 0x12, 0x00]);
  const slice = buf.slice(1, 3);
  return slice.readInt16LE(0) === 0x1234;
});

// Buffer.subarray 测试
test('Buffer.subarray - BE', () => {
  const buf = Buffer.from([0x00, 0x7F, 0xFF, 0x00]);
  const sub = buf.subarray(1, 3);
  return sub.readInt16BE(0) === 32767;
});

test('Buffer.subarray - LE', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x7F, 0x00]);
  const sub = buf.subarray(1, 3);
  return sub.readInt16LE(0) === 32767;
});

// 修改后的Buffer测试
test('修改后的Buffer - BE', () => {
  const buf = Buffer.from([0x00, 0x00]);
  buf[0] = 0xFF;
  buf[1] = 0x00;
  return buf.readInt16BE(0) === -256;
});

test('修改后的Buffer - LE', () => {
  const buf = Buffer.from([0x00, 0x00]);
  buf[0] = 0x00;
  buf[1] = 0xFF;
  return buf.readInt16LE(0) === -256;
});

// 大Buffer中读取
test('大Buffer中间位置读取 - BE', () => {
  const buf = Buffer.alloc(100);
  buf[50] = 0x12;
  buf[51] = 0x34;
  return buf.readInt16BE(50) === 0x1234;
});

test('大Buffer中间位置读取 - LE', () => {
  const buf = Buffer.alloc(100);
  buf[50] = 0x34;
  buf[51] = 0x12;
  return buf.readInt16LE(50) === 0x1234;
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
