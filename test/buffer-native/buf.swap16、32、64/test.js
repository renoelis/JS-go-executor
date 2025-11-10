// Complete Tests
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


test('交换 16 位字节序', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return buf[0] === 0x02 && buf[1] === 0x01 && buf[2] === 0x04 && buf[3] === 0x03;
});

test('返回 this', () => {
  const buf = Buffer.from([0x01, 0x02]);
  const result = buf.swap16();
  return result === buf;
});

test('2 字节 buffer', () => {
  const buf = Buffer.from([0xAA, 0xBB]);
  buf.swap16();
  return buf[0] === 0xBB && buf[1] === 0xAA;
});

test('4 字节 buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return buf[0] === 0x02 && buf[2] === 0x04;
});

test('RangeError: 奇数长度', () => {
  try {
    const buf = Buffer.from([0x01, 0x02, 0x03]);
    buf.swap16();
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('空 buffer', () => {
  const buf = Buffer.alloc(0);
  buf.swap16();
  return buf.length === 0;
});

test('往返交换', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const original = Buffer.from(buf);
  buf.swap16().swap16();
  return buf.equals(original);
});

test('交换 32 位字节序', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();
  return buf[0] === 0x04 && buf[1] === 0x03 && buf[2] === 0x02 && buf[3] === 0x01;
});

test('返回 this', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const result = buf.swap32();
  return result === buf;
});

test('4 字节 buffer', () => {
  const buf = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]);
  buf.swap32();
  return buf[0] === 0xDD && buf[3] === 0xAA;
});

test('8 字节 buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap32();
  return buf[0] === 0x04 && buf[4] === 0x08;
});

test('RangeError: 非 4 的倍数', () => {
  try {
    const buf = Buffer.from([0x01, 0x02, 0x03]);
    buf.swap32();
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('空 buffer', () => {
  const buf = Buffer.alloc(0);
  buf.swap32();
  return buf.length === 0;
});

test('往返交换', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const original = Buffer.from(buf);
  buf.swap32().swap32();
  return buf.equals(original);
});


test('交换 64 位字节序', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  return buf[0] === 0x08 && buf[7] === 0x01;
});

test('返回 this', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const result = buf.swap64();
  return result === buf;
});

test('8 字节 buffer', () => {
  const buf = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF, 0x11, 0x22]);
  buf.swap64();
  return buf[0] === 0x22 && buf[7] === 0xAA;
});

test('16 字节 buffer', () => {
  const buf = Buffer.alloc(16);
  buf[0] = 0x01;
  buf[8] = 0x09;
  buf.swap64();
  return buf[7] === 0x01 && buf[15] === 0x09;
});

test('RangeError: 非 8 的倍数', () => {
  try {
    const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    buf.swap64();
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('空 buffer', () => {
  const buf = Buffer.alloc(0);
  buf.swap64();
  return buf.length === 0;
});

test('往返交换', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const original = Buffer.from(buf);
  buf.swap64().swap64();
  return buf.equals(original);
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
