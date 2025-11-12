// buf.writeInt16LE() - 字节序对比与边界测试
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

// BE 和 LE 对比
test('BE vs LE 字节序差异 - 正数', () => {
  const bufBE = Buffer.alloc(2);
  const bufLE = Buffer.alloc(2);
  bufBE.writeInt16BE(0x1234, 0);
  bufLE.writeInt16LE(0x1234, 0);
  // BE: 12 34, LE: 34 12
  return bufBE[0] === 0x12 && bufBE[1] === 0x34 &&
         bufLE[0] === 0x34 && bufLE[1] === 0x12;
});

test('BE vs LE 字节序差异 - 负数', () => {
  const bufBE = Buffer.alloc(2);
  const bufLE = Buffer.alloc(2);
  bufBE.writeInt16BE(-1000, 0);
  bufLE.writeInt16LE(-1000, 0);
  // 验证不同字节序
  return bufBE[0] !== bufLE[0] || bufBE[1] !== bufLE[1];
});

test('LE 写入后用 readInt16LE 读取验证', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(12345, 0);
  return buf.readInt16LE(0) === 12345;
});

test('LE 写入负数后用 readInt16LE 读取验证', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(-12345, 0);
  return buf.readInt16LE(0) === -12345;
});

// 边界值详细测试
test('边界值 0x7FFF (32767)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(0x7FFF, 0);
  return buf[0] === 0xFF && buf[1] === 0x7F && buf.readInt16LE(0) === 32767;
});

test('边界值 -0x8000 (-32768)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(-0x8000, 0);
  return buf[0] === 0x00 && buf[1] === 0x80 && buf.readInt16LE(0) === -32768;
});

test('边界值 0x8000 溢出抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(0x8000, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('边界值 -0x8001 溢出抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(-0x8001, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('连续写入正负交替值', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt16LE(1000, 0);
  buf.writeInt16LE(-1000, 2);
  buf.writeInt16LE(2000, 4);
  buf.writeInt16LE(-2000, 6);
  return buf.readInt16LE(0) === 1000 &&
         buf.readInt16LE(2) === -1000 &&
         buf.readInt16LE(4) === 2000 &&
         buf.readInt16LE(6) === -2000;
});

// 不同 offset 边界
test('在 buffer 末尾边界写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16LE(999, 8); // 最后两个字节
  return buf.readInt16LE(8) === 999;
});

test('写入到最大合法 offset', () => {
  const buf = Buffer.alloc(100);
  const offset = 98; // 100 - 2
  buf.writeInt16LE(12345, offset);
  return buf.readInt16LE(offset) === 12345;
});

// 多次覆盖写入
test('多次写入同一位置', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(100, 0);
  buf.writeInt16LE(200, 0);
  buf.writeInt16LE(300, 0);
  return buf.readInt16LE(0) === 300;
});

test('重叠写入测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(-1, 0);
  buf.writeInt16LE(0x1234, 1);
  // offset 0-1: FF FF
  // offset 1-2: 34 12
  // 结果: FF 34 12 00
  return buf[0] === 0xFF && buf[1] === 0x34 && buf[2] === 0x12;
});

// 特殊数值模式
test('写入全 0', () => {
  const buf = Buffer.alloc(4, 0xFF);
  buf.writeInt16LE(0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('写入全 1 的位模式 (-1)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(-1, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF;
});

test('写入交替位模式 0x5555', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(0x5555, 0);
  return buf[0] === 0x55 && buf[1] === 0x55;
});

test('写入交替位模式 0xAAAA 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(0xAAAA, 0); // 超出范围
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
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
