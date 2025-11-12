// buf.writeUInt16BE/LE() - Ultimate Edge Cases
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

// 极限值组合
test('writeUInt16BE: 值 0 偏移 0', () => {
  const buf = Buffer.alloc(2);
  const r = buf.writeUInt16BE(0, 0);
  return r === 2 && buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16LE: 值 0 偏移 0', () => {
  const buf = Buffer.alloc(2);
  const r = buf.writeUInt16LE(0, 0);
  return r === 2 && buf[0] === 0x00 && buf[1] === 0x00;
});

test('writeUInt16BE: 值 0xFFFF 最大偏移', () => {
  const buf = Buffer.alloc(100);
  const r = buf.writeUInt16BE(0xFFFF, 98);
  return r === 100 && buf[98] === 0xFF && buf[99] === 0xFF;
});

test('writeUInt16LE: 值 0xFFFF 最大偏移', () => {
  const buf = Buffer.alloc(100);
  const r = buf.writeUInt16LE(0xFFFF, 98);
  return r === 100 && buf[98] === 0xFF && buf[99] === 0xFF;
});

test('writeUInt16BE: 恰好 2 字节的 buffer', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0x1234, 0);
  return buf.length === 2 && buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: 恰好 2 字节的 buffer', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0x1234, 0);
  return buf.length === 2 && buf[0] === 0x34 && buf[1] === 0x12;
});

// 连续边界写入
test('writeUInt16BE: 紧密连续写入', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16BE(0x0001, 0);
  buf.writeUInt16BE(0x0203, 2);
  buf.writeUInt16BE(0x0405, 4);
  buf.writeUInt16BE(0x0607, 6);
  let pass = true;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== i) pass = false;
  }
  return pass;
});

test('writeUInt16LE: 紧密连续写入', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16LE(0x0100, 0);
  buf.writeUInt16LE(0x0302, 2);
  buf.writeUInt16LE(0x0504, 4);
  buf.writeUInt16LE(0x0706, 6);
  let pass = true;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== i) pass = false;
  }
  return pass;
});

// 特殊位模式
test('writeUInt16BE: 所有位为 1', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0b1111111111111111, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF;
});

test('writeUInt16LE: 所有位为 1', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0b1111111111111111, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF;
});

test('writeUInt16BE: 交替位 10101010', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0b1010101010101010, 0);
  return buf[0] === 0xAA && buf[1] === 0xAA;
});

test('writeUInt16LE: 交替位 10101010', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0b1010101010101010, 0);
  return buf[0] === 0xAA && buf[1] === 0xAA;
});

test('writeUInt16BE: 交替位 01010101', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0b0101010101010101, 0);
  return buf[0] === 0x55 && buf[1] === 0x55;
});

test('writeUInt16LE: 交替位 01010101', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0b0101010101010101, 0);
  return buf[0] === 0x55 && buf[1] === 0x55;
});

test('writeUInt16BE: 只有最高位为 1', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0b1000000000000000, 0);
  return buf[0] === 0x80 && buf[1] === 0x00;
});

test('writeUInt16LE: 只有最高位为 1', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0b1000000000000000, 0);
  return buf[0] === 0x00 && buf[1] === 0x80;
});

test('writeUInt16BE: 只有最低位为 1', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0b0000000000000001, 0);
  return buf[0] === 0x00 && buf[1] === 0x01;
});

test('writeUInt16LE: 只有最低位为 1', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0b0000000000000001, 0);
  return buf[0] === 0x01 && buf[1] === 0x00;
});

// 多次覆盖同一位置
test('writeUInt16BE: 连续覆盖 10 次', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16BE(i * 100, 0);
  }
  return buf.readUInt16BE(0) === 900;
});

test('writeUInt16LE: 连续覆盖 10 次', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16LE(i * 100, 0);
  }
  return buf.readUInt16LE(0) === 900;
});

// 数学边界
test('writeUInt16BE: 2 的幂次值', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16BE(1, 0);
  buf.writeUInt16BE(2, 2);
  buf.writeUInt16BE(256, 4);
  buf.writeUInt16BE(32768, 6);
  return buf.readUInt16BE(0) === 1 &&
         buf.readUInt16BE(2) === 2 &&
         buf.readUInt16BE(4) === 256 &&
         buf.readUInt16BE(6) === 32768;
});

test('writeUInt16LE: 2 的幂次值', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16LE(1, 0);
  buf.writeUInt16LE(2, 2);
  buf.writeUInt16LE(256, 4);
  buf.writeUInt16LE(32768, 6);
  return buf.readUInt16LE(0) === 1 &&
         buf.readUInt16LE(2) === 2 &&
         buf.readUInt16LE(4) === 256 &&
         buf.readUInt16LE(6) === 32768;
});

test('writeUInt16BE: 2 的幂次减 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16BE(255, 0);
  buf.writeUInt16BE(511, 2);
  buf.writeUInt16BE(1023, 4);
  buf.writeUInt16BE(65535, 6);
  return buf.readUInt16BE(0) === 255 &&
         buf.readUInt16BE(2) === 511 &&
         buf.readUInt16BE(4) === 1023 &&
         buf.readUInt16BE(6) === 65535;
});

test('writeUInt16LE: 2 的幂次减 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16LE(255, 0);
  buf.writeUInt16LE(511, 2);
  buf.writeUInt16LE(1023, 4);
  buf.writeUInt16LE(65535, 6);
  return buf.readUInt16LE(0) === 255 &&
         buf.readUInt16LE(2) === 511 &&
         buf.readUInt16LE(4) === 1023 &&
         buf.readUInt16LE(6) === 65535;
});

// 性能相关：大 buffer
test('writeUInt16BE: 大 buffer 末尾写入', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt16BE(0x1234, 9998);
  return buf[9998] === 0x12 && buf[9999] === 0x34;
});

test('writeUInt16LE: 大 buffer 末尾写入', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt16LE(0x1234, 9998);
  return buf[9998] === 0x34 && buf[9999] === 0x12;
});

// 特殊对象行为
test('writeUInt16BE: offset 为字符串 "0" 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, '0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16LE: offset 为字符串 "0" 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, '0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16BE: offset 为字符串 "2" 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16BE(0x1234, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeUInt16LE: offset 为字符串 "2" 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt16LE(0x1234, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
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
