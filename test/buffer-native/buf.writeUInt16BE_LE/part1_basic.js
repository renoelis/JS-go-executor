// buf.writeUInt16BE/LE() - Basic Tests
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

// 基本功能测试
test('writeUInt16BE: 写入基本数值 0x1234', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: 写入基本数值 0x1234', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234, 0);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUInt16BE: 写入最小值 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16LE: 写入最小值 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16BE: 写入最大值 0xFFFF', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0xFFFF, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF;
});

test('writeUInt16LE: 写入最大值 0xFFFF', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0xFFFF, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF;
});

test('writeUInt16BE: 写入中间值 32768', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(32768, 0);
  return buf[0] === 0x80 && buf[1] === 0x00;
});

test('writeUInt16LE: 写入中间值 32768', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(32768, 0);
  return buf[0] === 0x00 && buf[1] === 0x80;
});

// 返回值测试
test('writeUInt16BE: 返回写入后的偏移量', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUInt16BE(0x1234, 0);
  return result === 2;
});

test('writeUInt16LE: 返回写入后的偏移量', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUInt16LE(0x1234, 0);
  return result === 2;
});

test('writeUInt16BE: 不同偏移量返回值', () => {
  const buf = Buffer.alloc(8);
  const r1 = buf.writeUInt16BE(0x1234, 2);
  return r1 === 4;
});

test('writeUInt16LE: 不同偏移量返回值', () => {
  const buf = Buffer.alloc(8);
  const r1 = buf.writeUInt16LE(0x1234, 2);
  return r1 === 4;
});

// offset 参数测试
test('writeUInt16BE: offset=0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0xABCD, 0);
  return buf[0] === 0xAB && buf[1] === 0xCD;
});

test('writeUInt16LE: offset=0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0xABCD, 0);
  return buf[0] === 0xCD && buf[1] === 0xAB;
});

test('writeUInt16BE: offset=2', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0xABCD, 2);
  return buf[2] === 0xAB && buf[3] === 0xCD;
});

test('writeUInt16LE: offset=2', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0xABCD, 2);
  return buf[2] === 0xCD && buf[3] === 0xAB;
});

test('writeUInt16BE: 不覆盖其他字节', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  buf.writeUInt16BE(0xABCD, 1);
  return buf[0] === 0x11 && buf[1] === 0xAB && buf[2] === 0xCD && buf[3] === 0x44;
});

test('writeUInt16LE: 不覆盖其他字节', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  buf.writeUInt16LE(0xABCD, 1);
  return buf[0] === 0x11 && buf[1] === 0xCD && buf[2] === 0xAB && buf[3] === 0x44;
});

// 多次写入测试
test('writeUInt16BE: 连续写入多个值', () => {
  const buf = Buffer.alloc(6);
  buf.writeUInt16BE(0x1234, 0);
  buf.writeUInt16BE(0x5678, 2);
  buf.writeUInt16BE(0x9ABC, 4);
  return buf[0] === 0x12 && buf[1] === 0x34 &&
         buf[2] === 0x56 && buf[3] === 0x78 &&
         buf[4] === 0x9A && buf[5] === 0xBC;
});

test('writeUInt16LE: 连续写入多个值', () => {
  const buf = Buffer.alloc(6);
  buf.writeUInt16LE(0x1234, 0);
  buf.writeUInt16LE(0x5678, 2);
  buf.writeUInt16LE(0x9ABC, 4);
  return buf[0] === 0x34 && buf[1] === 0x12 &&
         buf[2] === 0x78 && buf[3] === 0x56 &&
         buf[4] === 0xBC && buf[5] === 0x9A;
});

test('writeUInt16BE: 覆盖写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234, 0);
  buf.writeUInt16BE(0xABCD, 0);
  return buf[0] === 0xAB && buf[1] === 0xCD;
});

test('writeUInt16LE: 覆盖写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234, 0);
  buf.writeUInt16LE(0xABCD, 0);
  return buf[0] === 0xCD && buf[1] === 0xAB;
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
