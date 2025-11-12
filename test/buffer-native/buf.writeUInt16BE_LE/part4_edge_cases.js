// buf.writeUInt16BE/LE() - Edge Cases
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

// 字节序验证
test('writeUInt16BE vs LE: 相同值不同字节序', () => {
  const bufBE = Buffer.alloc(2);
  const bufLE = Buffer.alloc(2);
  bufBE.writeUInt16BE(0x1234, 0);
  bufLE.writeUInt16LE(0x1234, 0);
  return bufBE[0] === 0x12 && bufBE[1] === 0x34 &&
         bufLE[0] === 0x34 && bufLE[1] === 0x12;
});

test('writeUInt16BE vs LE: 交换字节顺序', () => {
  const bufBE = Buffer.alloc(2);
  const bufLE = Buffer.alloc(2);
  bufBE.writeUInt16BE(0xABCD, 0);
  bufLE.writeUInt16LE(0xABCD, 0);
  return bufBE[0] === bufLE[1] && bufBE[1] === bufLE[0];
});

test('writeUInt16BE vs LE: 对称值', () => {
  const bufBE = Buffer.alloc(2);
  const bufLE = Buffer.alloc(2);
  bufBE.writeUInt16BE(0xFFFF, 0);
  bufLE.writeUInt16LE(0xFFFF, 0);
  return bufBE[0] === bufLE[0] && bufBE[1] === bufLE[1];
});

// 边界值组合
test('writeUInt16BE: 所有字节都是 0xFF', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xFFFF, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf.readUInt16BE(0) === 65535;
});

test('writeUInt16LE: 所有字节都是 0xFF', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xFFFF, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf.readUInt16LE(0) === 65535;
});

test('writeUInt16BE: 高字节 0xFF 低字节 0x00', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xFF00, 0);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf.readUInt16BE(0) === 65280;
});

test('writeUInt16LE: 高字节 0xFF 低字节 0x00', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xFF00, 0);
  return buf[0] === 0x00 && buf[1] === 0xFF && buf.readUInt16LE(0) === 65280;
});

test('writeUInt16BE: 高字节 0x00 低字节 0xFF', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0x00FF, 0);
  return buf[0] === 0x00 && buf[1] === 0xFF && buf.readUInt16BE(0) === 255;
});

test('writeUInt16LE: 高字节 0x00 低字节 0xFF', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0x00FF, 0);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf.readUInt16LE(0) === 255;
});

// 特殊数值模式
test('writeUInt16BE: 交替位模式 0xAAAA', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xAAAA, 0);
  return buf[0] === 0xAA && buf[1] === 0xAA;
});

test('writeUInt16LE: 交替位模式 0xAAAA', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xAAAA, 0);
  return buf[0] === 0xAA && buf[1] === 0xAA;
});

test('writeUInt16BE: 交替位模式 0x5555', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0x5555, 0);
  return buf[0] === 0x55 && buf[1] === 0x55;
});

test('writeUInt16LE: 交替位模式 0x5555', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0x5555, 0);
  return buf[0] === 0x55 && buf[1] === 0x55;
});

// 读写一致性
test('writeUInt16BE + readUInt16BE: 往返一致', () => {
  const buf = Buffer.alloc(2);
  const val = 12345;
  buf.writeUInt16BE(val, 0);
  return buf.readUInt16BE(0) === val;
});

test('writeUInt16LE + readUInt16LE: 往返一致', () => {
  const buf = Buffer.alloc(2);
  const val = 12345;
  buf.writeUInt16LE(val, 0);
  return buf.readUInt16LE(0) === val;
});

test('writeUInt16BE + readUInt16BE: 边界值 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0, 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE + readUInt16LE: 边界值 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0, 0);
  return buf.readUInt16LE(0) === 0;
});

test('writeUInt16BE + readUInt16BE: 边界值 0xFFFF', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xFFFF, 0);
  return buf.readUInt16BE(0) === 0xFFFF;
});

test('writeUInt16LE + readUInt16LE: 边界值 0xFFFF', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xFFFF, 0);
  return buf.readUInt16LE(0) === 0xFFFF;
});

test('writeUInt16BE + readUInt16BE: 中间值 32768', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(32768, 0);
  return buf.readUInt16BE(0) === 32768;
});

test('writeUInt16LE + readUInt16LE: 中间值 32768', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(32768, 0);
  return buf.readUInt16LE(0) === 32768;
});

// 链式调用
test('writeUInt16BE: 返回值可链式调用', () => {
  const buf = Buffer.alloc(6);
  const r1 = buf.writeUInt16BE(0x1234, 0);
  const r2 = buf.writeUInt16BE(0x5678, r1);
  const r3 = buf.writeUInt16BE(0x9ABC, r2);
  return r1 === 2 && r2 === 4 && r3 === 6 &&
         buf[0] === 0x12 && buf[2] === 0x56 && buf[4] === 0x9A;
});

test('writeUInt16LE: 返回值可链式调用', () => {
  const buf = Buffer.alloc(6);
  const r1 = buf.writeUInt16LE(0x1234, 0);
  const r2 = buf.writeUInt16LE(0x5678, r1);
  const r3 = buf.writeUInt16LE(0x9ABC, r2);
  return r1 === 2 && r2 === 4 && r3 === 6 &&
         buf[0] === 0x34 && buf[2] === 0x78 && buf[4] === 0xBC;
});

// 小数截断精确性
test('writeUInt16BE: 小数 0.1 转为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0.1, 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 小数 0.1 转为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0.1, 0);
  return buf.readUInt16LE(0) === 0;
});

test('writeUInt16BE: 小数 0.9 转为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0.9, 0);
  return buf.readUInt16BE(0) === 0;
});

test('writeUInt16LE: 小数 0.9 转为 0', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0.9, 0);
  return buf.readUInt16LE(0) === 0;
});

test('writeUInt16BE: 小数 1.1 转为 1', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(1.1, 0);
  return buf.readUInt16BE(0) === 1;
});

test('writeUInt16LE: 小数 1.1 转为 1', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(1.1, 0);
  return buf.readUInt16LE(0) === 1;
});

test('writeUInt16BE: 小数 65535.9 超出范围抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16BE(65535.9, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16LE: 小数 65535.9 超出范围抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeUInt16LE(65535.9, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
