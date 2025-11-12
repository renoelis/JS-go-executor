// buf.writeInt32BE() - 边界与极端值测试
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

// 边界值测试
test('边界值：0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0, 0);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

test('边界值：1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(1, 0);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 1;
});

test('边界值：-1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-1, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('边界值：127 (0x7F)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(127, 0);
  return buf[3] === 0x7F;
});

test('边界值：128 (0x80)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(128, 0);
  return buf[3] === 0x80;
});

test('边界值：255 (0xFF)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(255, 0);
  return buf[3] === 0xFF;
});

test('边界值：256 (0x100)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(256, 0);
  return buf[2] === 0x01 && buf[3] === 0x00;
});

test('边界值：2^31 - 1 (最大正数)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(2147483647, 0);
  return buf[0] === 0x7F && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('边界值：-2^31 (最小负数)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-2147483648, 0);
  return buf[0] === 0x80 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('边界值：2^16', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(65536, 0);
  return buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('边界值：2^24', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(16777216, 0);
  return buf[0] === 0x01 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

// 偏移量边界测试
test('偏移量边界：offset = 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(123, 0);
  return result === 4;
});

test('偏移量边界：offset = length - 4（恰好容纳）', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeInt32BE(123, 4);
  return result === 8;
});

test('偏移量边界：多次写入不同偏移', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 4);
  buf.writeInt32BE(0x33333333, 8);
  return buf[0] === 0x11 && buf[4] === 0x22 && buf[8] === 0x33;
});

// Buffer 长度边界
test('Buffer 长度：恰好 4 字节', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(123, 0);
  return result === 4;
});

test('Buffer 长度：5 字节', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.writeInt32BE(123, 0);
  return result === 4 && buf[4] !== undefined;
});

test('Buffer 长度：很大的 Buffer', () => {
  const buf = Buffer.allocUnsafe(1024);
  const result = buf.writeInt32BE(0x12345678, 512);
  return result === 516 && buf[512] === 0x12;
});

// 符号位测试
test('符号位：正数最高位为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(100, 0);
  return (buf[0] & 0x80) === 0;
});

test('符号位：负数最高位为 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-100, 0);
  return (buf[0] & 0x80) === 0x80;
});

test('符号位：-1 所有位为 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-1, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('符号位：0x7FFFFFFF (最大正数)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x7FFFFFFF, 0);
  return buf[0] === 0x7F;
});

test('符号位：-0x80000000 (最小负数)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-0x80000000, 0);
  return buf[0] === 0x80 && buf[1] === 0x00;
});

// 补码测试
test('补码：-2 的表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-2, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFE;
});

test('补码：-256 的表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-256, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0x00;
});

test('补码：-65536 的表示', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-65536, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0x00 && buf[3] === 0x00;
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
