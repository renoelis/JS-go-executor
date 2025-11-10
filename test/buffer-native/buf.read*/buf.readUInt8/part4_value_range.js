// buf.readUInt8() - 完整数值范围测试
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
test('读取 0（最小值）', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0, 0);
  return buf.readUInt8(0) === 0;
});

test('读取 255（最大值）', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(255, 0);
  return buf.readUInt8(0) === 255;
});

test('读取 1（最小值 + 1）', () => {
  const buf = Buffer.from([0x01]);
  return buf.readUInt8(0) === 1;
});

test('读取 254（最大值 - 1）', () => {
  const buf = Buffer.from([0xFE]);
  return buf.readUInt8(0) === 254;
});

// 中间值测试
test('读取 128（中点）', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(128, 0);
  return buf.readUInt8(0) === 128;
});

test('读取 127', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(127, 0);
  return buf.readUInt8(0) === 127;
});

test('读取 129', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(129, 0);
  return buf.readUInt8(0) === 129;
});

// 小值测试
test('读取 2', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(2, 0);
  return buf.readUInt8(0) === 2;
});

test('读取 10', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(10, 0);
  return buf.readUInt8(0) === 10;
});

test('读取 50', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(50, 0);
  return buf.readUInt8(0) === 50;
});

test('读取 100', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(100, 0);
  return buf.readUInt8(0) === 100;
});

// 大值测试
test('读取 200', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(200, 0);
  return buf.readUInt8(0) === 200;
});

test('读取 250', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(250, 0);
  return buf.readUInt8(0) === 250;
});

// 十六进制值系列测试
test('读取 0x00', () => {
  const buf = Buffer.from([0x00]);
  return buf.readUInt8(0) === 0;
});

test('读取 0x10（16）', () => {
  const buf = Buffer.from([0x10]);
  return buf.readUInt8(0) === 16;
});

test('读取 0x20（32）', () => {
  const buf = Buffer.from([0x20]);
  return buf.readUInt8(0) === 32;
});

test('读取 0x40（64）', () => {
  const buf = Buffer.from([0x40]);
  return buf.readUInt8(0) === 64;
});

test('读取 0x80（128）', () => {
  const buf = Buffer.from([0x80]);
  return buf.readUInt8(0) === 128;
});

test('读取 0x90（144）', () => {
  const buf = Buffer.from([0x90]);
  return buf.readUInt8(0) === 144;
});

test('读取 0xA0（160）', () => {
  const buf = Buffer.from([0xA0]);
  return buf.readUInt8(0) === 160;
});

test('读取 0xC0（192）', () => {
  const buf = Buffer.from([0xC0]);
  return buf.readUInt8(0) === 192;
});

test('读取 0xE0（224）', () => {
  const buf = Buffer.from([0xE0]);
  return buf.readUInt8(0) === 224;
});

test('读取 0xF0（240）', () => {
  const buf = Buffer.from([0xF0]);
  return buf.readUInt8(0) === 240;
});

test('读取 0xFF（255）', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUInt8(0) === 255;
});

// 连续值测试
test('连续读取多个不同值', () => {
  const buf = Buffer.from([0, 50, 128, 200, 255]);
  return buf.readUInt8(0) === 0 &&
         buf.readUInt8(1) === 50 &&
         buf.readUInt8(2) === 128 &&
         buf.readUInt8(3) === 200 &&
         buf.readUInt8(4) === 255;
});

// 特殊模式测试
test('读取全 0xFF 模式', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  return buf.readUInt8(0) === 255 &&
         buf.readUInt8(1) === 255 &&
         buf.readUInt8(2) === 255;
});

test('读取全 0x00 模式', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  return buf.readUInt8(0) === 0 &&
         buf.readUInt8(1) === 0 &&
         buf.readUInt8(2) === 0;
});

test('读取交替模式 0xAA', () => {
  const buf = Buffer.from([0xAA]);
  return buf.readUInt8(0) === 170;
});

test('读取交替模式 0x55', () => {
  const buf = Buffer.from([0x55]);
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
