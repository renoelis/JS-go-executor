// buf.readBigUInt64BE() - 与 DataView 对比测试
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

// 与 DataView.getBigUint64 对比
test('与 DataView.getBigUint64 结果一致（offset=0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(12345n, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

test('与 DataView.getBigUint64 结果一致（offset=8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(67890n, 8);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(8) === dv.getBigUint64(8, false);
});

test('与 DataView.getBigUint64 结果一致（最大值）', () => {
  const buf = Buffer.alloc(8);
  const max = 18446744073709551615n;
  buf.writeBigUInt64BE(max, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

test('与 DataView.getBigUint64 结果一致（零值）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0n, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

// Big-Endian 一致性
test('Big-Endian 与 DataView 一致', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

// Little-Endian 不一致
test('readBigUInt64BE 与 DataView LE 不同', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const be = buf.readBigUInt64BE(0);
  const le = dv.getBigUint64(0, true);
  return be !== le;
});

// 多个位置对比
test('多个位置与 DataView 一致', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64BE(111n, 0);
  buf.writeBigUInt64BE(222n, 8);
  buf.writeBigUInt64BE(333n, 16);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false) &&
         buf.readBigUInt64BE(8) === dv.getBigUint64(8, false) &&
         buf.readBigUInt64BE(16) === dv.getBigUint64(16, false);
});

// 从 ArrayBuffer 创建
test('从 ArrayBuffer 创建的 Buffer 与 DataView 一致', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setBigUint64(0, 99999n, false);
  const buf = Buffer.from(ab);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

// 共享 ArrayBuffer
test('共享 ArrayBuffer 的 Buffer 与 DataView 一致', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  buf.writeBigUInt64BE(55555n, 0);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

// 不同字节模式
test('全 0xFF 与 DataView 一致', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
});

test('交替模式与 DataView 一致', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
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
