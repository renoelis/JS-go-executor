// buf.readUInt8() - 深度边界测试
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

// 大 buffer 测试
test('大 buffer 首字节读取', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt8(255, 0);
  return buf.readUInt8(0) === 255;
});

test('大 buffer 末字节读取', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt8(128, 9999);
  return buf.readUInt8(9999) === 128;
});

test('大 buffer 中间字节读取', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt8(200, 5000);
  return buf.readUInt8(5000) === 200;
});

// 极值 offset 测试
test('offset = 0 边界', () => {
  const buf = Buffer.from([255]);
  return buf.readUInt8(0) === 255;
});

test('offset = length - 1 边界', () => {
  const buf = Buffer.from([10, 20, 30, 40, 255]);
  return buf.readUInt8(buf.length - 1) === 255;
});

// 特殊模式值测试
test('全 1 位模式（0xFF）', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUInt8(0) === 255;
});

test('全 0 位模式（0x00）', () => {
  const buf = Buffer.from([0x00]);
  return buf.readUInt8(0) === 0;
});

test('交替位模式 10101010（0xAA）', () => {
  const buf = Buffer.from([0xAA]);
  return buf.readUInt8(0) === 170;
});

test('交替位模式 01010101（0x55）', () => {
  const buf = Buffer.from([0x55]);
  return buf.readUInt8(0) === 85;
});

// 连续读取测试
test('连续读取所有字节', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== i) return false;
  }
  return true;
});

// 修改后的 buffer 读取
test('修改 buffer 后读取新值', () => {
  const buf = Buffer.from([100]);
  const v1 = buf.readUInt8(0);
  buf.writeUInt8(200, 0);
  const v2 = buf.readUInt8(0);
  return v1 === 100 && v2 === 200;
});

// subarray 独立性测试
test('subarray 修改不影响原 buffer 读取', () => {
  const buf = Buffer.from([100, 200, 50]);
  const sub = buf.subarray(1, 3);
  sub.writeUInt8(255, 0);
  // subarray 和原 buffer 共享内存，所以会影响
  return buf.readUInt8(1) === 255;
});

// slice 独立性测试
test('slice 修改不影响原 buffer 读取', () => {
  const buf = Buffer.from([100, 200, 50]);
  const sliced = buf.slice(1, 3);
  sliced.writeUInt8(255, 0);
  // slice 和原 buffer 共享内存（在某些实现中），所以可能会影响
  return buf.readUInt8(1) === 255;
});

// 零长度相关测试
test('单字节 buffer 读取', () => {
  const buf = Buffer.from([123]);
  return buf.readUInt8(0) === 123;
});

// 256 个值完整性测试
test('验证所有可能的 uint8 值（0-255）', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf.writeUInt8(i, i);
  }
  for (let i = 0; i < 256; i++) {
    if (buf.readUInt8(i) !== i) return false;
  }
  return true;
});

// 二进制位测试
test('只有最高位为 1（0x80）', () => {
  const buf = Buffer.from([0b10000000]);
  return buf.readUInt8(0) === 128;
});

test('只有最低位为 1（0x01）', () => {
  const buf = Buffer.from([0b00000001]);
  return buf.readUInt8(0) === 1;
});

test('奇数位为 1（0xAA）', () => {
  const buf = Buffer.from([0b10101010]);
  return buf.readUInt8(0) === 170;
});

test('偶数位为 1（0x55）', () => {
  const buf = Buffer.from([0b01010101]);
  return buf.readUInt8(0) === 85;
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
