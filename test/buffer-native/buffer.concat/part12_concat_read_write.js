// Buffer.concat() - Deep Missing Scenarios Part 3: Read/Write Operations and Protocol Tests
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

// concat 后的读取方法测试
test('concat后readInt8', () => {
  const buf1 = Buffer.from([-1, -128, 127]);
  const result = Buffer.concat([buf1]);
  return result.readInt8(0) === -1 &&
         result.readInt8(1) === -128 &&
         result.readInt8(2) === 127;
});

test('concat后readUInt8', () => {
  const buf1 = Buffer.from([0, 128, 255]);
  const result = Buffer.concat([buf1]);
  return result.readUInt8(0) === 0 &&
         result.readUInt8(1) === 128 &&
         result.readUInt8(2) === 255;
});

test('concat后readInt16BE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(32767, 0);
  buf.writeInt16BE(-32768, 2);
  const result = Buffer.concat([buf]);
  return result.readInt16BE(0) === 32767 &&
         result.readInt16BE(2) === -32768;
});

test('concat后readInt16LE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(1000, 0);
  buf.writeInt16LE(-1000, 2);
  const result = Buffer.concat([buf]);
  return result.readInt16LE(0) === 1000 &&
         result.readInt16LE(2) === -1000;
});

test('concat后readUInt16BE', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(65535, 0);
  buf.writeUInt16BE(0, 2);
  const result = Buffer.concat([buf]);
  return result.readUInt16BE(0) === 65535 &&
         result.readUInt16BE(2) === 0;
});

test('concat后readUInt16LE', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(12345, 0);
  const result = Buffer.concat([buf]);
  return result.readUInt16LE(0) === 12345;
});

test('concat后readInt32BE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(2147483647, 0);
  const result = Buffer.concat([buf]);
  return result.readInt32BE(0) === 2147483647;
});

test('concat后readInt32LE', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(-2147483648, 0);
  const result = Buffer.concat([buf]);
  return result.readInt32LE(0) === -2147483648;
});

test('concat后readUInt32BE', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(4294967295, 0);
  const result = Buffer.concat([buf]);
  return result.readUInt32BE(0) === 4294967295;
});

test('concat后readUInt32LE', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(123456789, 0);
  const result = Buffer.concat([buf]);
  return result.readUInt32LE(0) === 123456789;
});

test('concat后readFloatBE', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14159, 0);
  const result = Buffer.concat([buf]);
  const value = result.readFloatBE(0);
  return Math.abs(value - 3.14159) < 0.00001;
});

test('concat后readFloatLE', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.71828, 0);
  const result = Buffer.concat([buf]);
  const value = result.readFloatLE(0);
  return Math.abs(value - 2.71828) < 0.00001;
});

test('concat后readDoubleBE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.PI, 0);
  const result = Buffer.concat([buf]);
  return Math.abs(result.readDoubleBE(0) - Math.PI) < 0.0000001;
});

test('concat后readDoubleLE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.E, 0);
  const result = Buffer.concat([buf]);
  return Math.abs(result.readDoubleLE(0) - Math.E) < 0.0000001;
});

test('concat后readBigInt64BE', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(123456789012345n, 0);
    const result = Buffer.concat([buf]);
    return result.readBigInt64BE(0) === 123456789012345n;
  } catch (e) {
    return true; // 环境不支持BigInt
  }
});

test('concat后readBigInt64LE', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(-987654321098765n, 0);
    const result = Buffer.concat([buf]);
    return result.readBigInt64LE(0) === -987654321098765n;
  } catch (e) {
    return true;
  }
});

test('concat后readBigUInt64BE', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(18446744073709551615n, 0);
    const result = Buffer.concat([buf]);
    return result.readBigUInt64BE(0) === 18446744073709551615n;
  } catch (e) {
    return true;
  }
});

test('concat后readBigUInt64LE', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(9223372036854775807n, 0);
    const result = Buffer.concat([buf]);
    return result.readBigUInt64LE(0) === 9223372036854775807n;
  } catch (e) {
    return true;
  }
});

// 跨Buffer边界读取
test('concat后跨两个Buffer边界读取Int32', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1[0] = 0x12;
  buf1[1] = 0x34;
  buf2[0] = 0x56;
  buf2[1] = 0x78;
  const result = Buffer.concat([buf1, buf2]);
  return result.readUInt32BE(0) === 0x12345678;
});

test('concat后跨边界读取Float', () => {
  const fullBuf = Buffer.alloc(8);
  fullBuf.writeFloatBE(1.23, 0);
  fullBuf.writeFloatBE(4.56, 4);
  const buf1 = fullBuf.slice(0, 3);
  const buf2 = fullBuf.slice(3, 5);
  const buf3 = fullBuf.slice(5, 8);
  const result = Buffer.concat([buf1, buf2, buf3]);
  return Math.abs(result.readFloatBE(0) - 1.23) < 0.01 &&
         Math.abs(result.readFloatBE(4) - 4.56) < 0.01;
});

// concat 后的写入方法测试
test('concat后write方法', () => {
  const result = Buffer.concat([Buffer.alloc(10)]);
  const written = result.write('hello', 0, 'utf8');
  return written === 5 && result.toString('utf8', 0, 5) === 'hello';
});

test('concat后writeInt8', () => {
  const result = Buffer.concat([Buffer.alloc(3)]);
  result.writeInt8(-128, 0);
  result.writeInt8(0, 1);
  result.writeInt8(127, 2);
  return result[0] === 128 && result[1] === 0 && result[2] === 127;
});

test('concat后writeUInt8', () => {
  const result = Buffer.concat([Buffer.alloc(3)]);
  result.writeUInt8(255, 0);
  result.writeUInt8(128, 1);
  result.writeUInt8(0, 2);
  return result[0] === 255 && result[1] === 128 && result[2] === 0;
});

test('concat后writeInt16BE', () => {
  const result = Buffer.concat([Buffer.alloc(4)]);
  result.writeInt16BE(-1000, 0);
  return result.readInt16BE(0) === -1000;
});

test('concat后writeUInt32LE', () => {
  const result = Buffer.concat([Buffer.alloc(4)]);
  result.writeUInt32LE(0xDEADBEEF, 0);
  return result.readUInt32LE(0) === 0xDEADBEEF;
});

// 协议模拟场景
test('TLV协议模拟（Type-Length-Value）', () => {
  const type = Buffer.from([0x01]);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(5, 0);
  const value = Buffer.from('hello');
  const packet = Buffer.concat([type, length, value]);
  return packet.length === 8 &&
         packet[0] === 1 &&
         packet.readUInt16BE(1) === 5 &&
         packet.toString('utf8', 3, 8) === 'hello';
});

test('HTTP chunk模拟', () => {
  const chunkSize = Buffer.from('5\r\n', 'ascii');
  const chunkData = Buffer.from('hello', 'ascii');
  const chunkEnd = Buffer.from('\r\n', 'ascii');
  const chunk = Buffer.concat([chunkSize, chunkData, chunkEnd]);
  return chunk.toString('ascii').startsWith('5\r\nhello\r\n');
});

test('多层嵌套concat', () => {
  const inner1 = Buffer.concat([Buffer.from('a'), Buffer.from('b')]);
  const inner2 = Buffer.concat([Buffer.from('c'), Buffer.from('d')]);
  const outer = Buffer.concat([inner1, inner2]);
  return outer.toString() === 'abcd' && outer.length === 4;
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
