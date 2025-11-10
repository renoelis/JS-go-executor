// buf.readBigUInt64LE() - 与 DataView 对比测试
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
  buf.writeBigUInt64LE(12345n, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64LE(0) === dv.getBigUint64(0, true);
});

test('与 DataView.getBigUint64 结果一致（offset=8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(67890n, 8);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64LE(8) === dv.getBigUint64(8, true);
});

test('与 DataView.getBigUint64 结果一致（最大值）', () => {
  const buf = Buffer.alloc(8);
  const max = 18446744073709551615n;
  buf.writeBigUInt64LE(max, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64LE(0) === dv.getBigUint64(0, true);
});

test('与 DataView.getBigUint64 结果一致（零值）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0n, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64LE(0) === dv.getBigUint64(0, true);
});

// Little-Endian 一致性
test('Little-Endian 与 DataView 一致', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64LE(0) === dv.getBigUint64(0, true);
});

// Little-Endian vs Big-Endian
test('readBigUInt64LE 与 DataView BE 不同', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const le = buf.readBigUInt64LE(0);
  const be = dv.getBigUint64(0, false);
  return le !== be;
});

// 多个位置对比
test('多个位置与 DataView 一致', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64LE(111n, 0);
  buf.writeBigUInt64LE(222n, 8);
  buf.writeBigUInt64LE(333n, 16);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64LE(0) === dv.getBigUint64(0, true) &&
         buf.readBigUInt64LE(8) === dv.getBigUint64(8, true) &&
         buf.readBigUInt64LE(16) === dv.getBigUint64(16, true);
});

// 从 ArrayBuffer 创建
test('从 ArrayBuffer 创建的 Buffer 与 DataView 一致', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setBigUint64(0, 99999n, true);
  const buf = Buffer.from(ab);
  return buf.readBigUInt64LE(0) === dv.getBigUint64(0, true);
});

// 共享 ArrayBuffer
test('共享 ArrayBuffer 的 Buffer 与 DataView 一致', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  buf.writeBigUInt64LE(55555n, 0);
  return buf.readBigUInt64LE(0) === dv.getBigUint64(0, true);
});

// 不同字节模式
test('全 0xFF 与 DataView 一致', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64LE(0) === dv.getBigUint64(0, true);
});

test('交替模式与 DataView 一致', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return buf.readBigUInt64LE(0) === dv.getBigUint64(0, true);
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
