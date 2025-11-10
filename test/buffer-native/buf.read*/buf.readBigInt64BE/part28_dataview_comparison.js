// buf.readBigInt64BE() - 与 DataView 对比测试
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

// Buffer vs DataView 读取一致性
test('Buffer 与 DataView 读取正数一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(12345n, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufValue = buf.readBigInt64BE(0);
  const dvValue = dv.getBigInt64(0, false); // false = big-endian
  
  return bufValue === dvValue && bufValue === 12345n;
});

test('Buffer 与 DataView 读取负数一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-9999n, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufValue = buf.readBigInt64BE(0);
  const dvValue = dv.getBigInt64(0, false);
  
  return bufValue === dvValue && bufValue === -9999n;
});

test('Buffer 与 DataView 读取最大值一致', () => {
  const buf = Buffer.alloc(8);
  const max = 9223372036854775807n;
  buf.writeBigInt64BE(max, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufValue = buf.readBigInt64BE(0);
  const dvValue = dv.getBigInt64(0, false);
  
  return bufValue === dvValue && bufValue === max;
});

test('Buffer 与 DataView 读取最小值一致', () => {
  const buf = Buffer.alloc(8);
  const min = -9223372036854775808n;
  buf.writeBigInt64BE(min, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufValue = buf.readBigInt64BE(0);
  const dvValue = dv.getBigInt64(0, false);
  
  return bufValue === dvValue && bufValue === min;
});

test('Buffer 与 DataView 读取零一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0n, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufValue = buf.readBigInt64BE(0);
  const dvValue = dv.getBigInt64(0, false);
  
  return bufValue === dvValue && bufValue === 0n;
});

test('Buffer 与 DataView 读取不同 offset 一致', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(111n, 0);
  buf.writeBigInt64BE(222n, 8);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  
  const buf1 = buf.readBigInt64BE(0);
  const dv1 = dv.getBigInt64(0, false);
  const buf2 = buf.readBigInt64BE(8);
  const dv2 = dv.getBigInt64(8, false);
  
  return buf1 === dv1 && buf2 === dv2 && buf1 === 111n && buf2 === 222n;
});

test('Buffer 与 DataView 读取特殊字节序一致', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufValue = buf.readBigInt64BE(0);
  const dvValue = dv.getBigInt64(0, false);
  
  return bufValue === dvValue && bufValue === 72623859790382856n;
});

test('Buffer 与 DataView 读取全 FF 一致', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufValue = buf.readBigInt64BE(0);
  const dvValue = dv.getBigInt64(0, false);
  
  return bufValue === dvValue && bufValue === -1n;
});

test('Buffer 与 DataView 读取交替模式一致', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufValue = buf.readBigInt64BE(0);
  const dvValue = dv.getBigInt64(0, false);
  
  return bufValue === dvValue && bufValue === -6148914691236517206n;
});

test('Buffer 与 DataView 读取随机值一致', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufValue = buf.readBigInt64BE(0);
  const dvValue = dv.getBigInt64(0, false);
  
  return bufValue === dvValue && bufValue === 1311768467463790320n;
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
