// buf.writeUInt16BE/LE() - Round 4: 组合场景与语义点补充
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

// 混合写入场景
test('writeUInt16BE + writeUInt16LE: 交替写入', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt16BE(0x1234, 0);
  buf.writeUInt16LE(0x5678, 2);
  buf.writeUInt16BE(0x9ABC, 4);
  buf.writeUInt16LE(0xDEF0, 6);
  return buf[0] === 0x12 && buf[2] === 0x78 && buf[4] === 0x9A && buf[6] === 0xF0;
});

// 覆盖写入的完整性
test('writeUInt16BE: 部分覆盖相邻数据', () => {
  const buf = Buffer.alloc(6);
  buf.writeUInt16BE(0x1111, 0);
  buf.writeUInt16BE(0x2222, 2);
  buf.writeUInt16BE(0x3333, 4);
  buf.writeUInt16BE(0xAAAA, 1);
  return buf[0] === 0x11 && buf[1] === 0xAA && buf[2] === 0xAA && buf[3] === 0x22;
});

test('writeUInt16LE: 部分覆盖相邻数据', () => {
  const buf = Buffer.alloc(6);
  buf.writeUInt16LE(0x1111, 0);
  buf.writeUInt16LE(0x2222, 2);
  buf.writeUInt16LE(0x3333, 4);
  buf.writeUInt16LE(0xAAAA, 1);
  return buf[0] === 0x11 && buf[1] === 0xAA && buf[2] === 0xAA && buf[3] === 0x22;
});

// Buffer 长度边界
test('writeUInt16BE: 最小可写 buffer (长度 2)', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xFFFF, 0);
  return buf.length === 2 && buf[0] === 0xFF && buf[1] === 0xFF;
});

test('writeUInt16LE: 最小可写 buffer (长度 2)', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xFFFF, 0);
  return buf.length === 2 && buf[0] === 0xFF && buf[1] === 0xFF;
});

// 大 buffer 多次写入
test('writeUInt16BE: 大 buffer 填充所有位置', () => {
  const size = 1000;
  const buf = Buffer.alloc(size * 2);
  for (let i = 0; i < size; i++) {
    buf.writeUInt16BE(i, i * 2);
  }
  return buf.readUInt16BE(0) === 0 && buf.readUInt16BE(998 * 2) === 998;
});

test('writeUInt16LE: 大 buffer 填充所有位置', () => {
  const size = 1000;
  const buf = Buffer.alloc(size * 2);
  for (let i = 0; i < size; i++) {
    buf.writeUInt16LE(i, i * 2);
  }
  return buf.readUInt16LE(0) === 0 && buf.readUInt16LE(998 * 2) === 998;
});

// 数值转换后的精度
test('writeUInt16BE: 浮点数 123.456 截断为 123', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(123.456, 0);
  return buf.readUInt16BE(0) === 123;
});

test('writeUInt16LE: 浮点数 123.456 截断为 123', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(123.456, 0);
  return buf.readUInt16LE(0) === 123;
});

test('writeUInt16BE: 浮点数 65534.999 截断为 65534', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(65534.999, 0);
  return buf.readUInt16BE(0) === 65534;
});

test('writeUInt16LE: 浮点数 65534.999 截断为 65534', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(65534.999, 0);
  return buf.readUInt16LE(0) === 65534;
});

// 特殊输入值组合
test('writeUInt16BE: 数组 [256] 转为 256', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE([256], 0);
  return buf.readUInt16BE(0) === 256;
});

test('writeUInt16LE: 数组 [256] 转为 256', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE([256], 0);
  return buf.readUInt16LE(0) === 256;
});

// offset 边界组合
test('writeUInt16BE: offset=0 多次写入覆盖', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1111, 0);
  buf.writeUInt16BE(0x2222, 0);
  buf.writeUInt16BE(0x3333, 0);
  return buf.readUInt16BE(0) === 0x3333;
});

test('writeUInt16LE: offset=0 多次写入覆盖', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1111, 0);
  buf.writeUInt16LE(0x2222, 0);
  buf.writeUInt16LE(0x3333, 0);
  return buf.readUInt16LE(0) === 0x3333;
});

// 字节序混合验证
test('writeUInt16BE 和 writeUInt16LE: 同一值不同字节序完全相反', () => {
  const bufBE = Buffer.alloc(2);
  const bufLE = Buffer.alloc(2);
  const values = [0x0102, 0x1234, 0xABCD, 0xFF00, 0x00FF];

  for (const val of values) {
    bufBE.writeUInt16BE(val, 0);
    bufLE.writeUInt16LE(val, 0);
    if (bufBE[0] !== bufLE[1] || bufBE[1] !== bufLE[0]) {
      return false;
    }
  }
  return true;
});

// 连续边界值测试
test('writeUInt16BE: 0 到 10 连续值', () => {
  const buf = Buffer.alloc(22);
  for (let i = 0; i <= 10; i++) {
    buf.writeUInt16BE(i, i * 2);
  }
  let pass = true;
  for (let i = 0; i <= 10; i++) {
    if (buf.readUInt16BE(i * 2) !== i) pass = false;
  }
  return pass;
});

test('writeUInt16LE: 0 到 10 连续值', () => {
  const buf = Buffer.alloc(22);
  for (let i = 0; i <= 10; i++) {
    buf.writeUInt16LE(i, i * 2);
  }
  let pass = true;
  for (let i = 0; i <= 10; i++) {
    if (buf.readUInt16LE(i * 2) !== i) pass = false;
  }
  return pass;
});

test('writeUInt16BE: 65525 到 65535 连续值', () => {
  const buf = Buffer.alloc(22);
  for (let i = 0; i <= 10; i++) {
    buf.writeUInt16BE(65525 + i, i * 2);
  }
  let pass = true;
  for (let i = 0; i <= 10; i++) {
    if (buf.readUInt16BE(i * 2) !== 65525 + i) pass = false;
  }
  return pass;
});

test('writeUInt16LE: 65525 到 65535 连续值', () => {
  const buf = Buffer.alloc(22);
  for (let i = 0; i <= 10; i++) {
    buf.writeUInt16LE(65525 + i, i * 2);
  }
  let pass = true;
  for (let i = 0; i <= 10; i++) {
    if (buf.readUInt16LE(i * 2) !== 65525 + i) pass = false;
  }
  return pass;
});

// 返回值一致性
test('writeUInt16BE: 返回值始终是 offset + 2', () => {
  const buf = Buffer.alloc(10);
  const offsets = [0, 1, 2, 5, 8];
  for (const offset of offsets) {
    const result = buf.writeUInt16BE(0x1234, offset);
    if (result !== offset + 2) return false;
  }
  return true;
});

test('writeUInt16LE: 返回值始终是 offset + 2', () => {
  const buf = Buffer.alloc(10);
  const offsets = [0, 1, 2, 5, 8];
  for (const offset of offsets) {
    const result = buf.writeUInt16LE(0x1234, offset);
    if (result !== offset + 2) return false;
  }
  return true;
});

// 原型链方法调用
test('writeUInt16BE: 通过原型链调用', () => {
  const buf = Buffer.alloc(4);
  Buffer.prototype.writeUInt16BE.call(buf, 0x1234, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUInt16LE: 通过原型链调用', () => {
  const buf = Buffer.alloc(4);
  Buffer.prototype.writeUInt16LE.call(buf, 0x1234, 0);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

// 不可变性验证
test('writeUInt16BE: 写入不改变 buffer 长度', () => {
  const buf = Buffer.alloc(10);
  const originalLength = buf.length;
  buf.writeUInt16BE(0x1234, 0);
  return buf.length === originalLength;
});

test('writeUInt16LE: 写入不改变 buffer 长度', () => {
  const buf = Buffer.alloc(10);
  const originalLength = buf.length;
  buf.writeUInt16LE(0x1234, 0);
  return buf.length === originalLength;
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
