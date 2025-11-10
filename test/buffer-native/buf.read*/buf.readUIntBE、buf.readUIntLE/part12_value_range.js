// 完整数值范围测试 - 可变长度无符号整数
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

// === 1字节范围测试 ===

test('BE: 1字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(1);
  buf.writeUIntBE(0, 0, 1);
  return buf.readUIntBE(0, 1) === 0;
});

test('LE: 1字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(1);
  buf.writeUIntLE(0, 0, 1);
  return buf.readUIntLE(0, 1) === 0;
});

test('BE: 1字节 - 255（最大值）', () => {
  const buf = Buffer.alloc(1);
  buf.writeUIntBE(255, 0, 1);
  return buf.readUIntBE(0, 1) === 255;
});

test('LE: 1字节 - 255（最大值）', () => {
  const buf = Buffer.alloc(1);
  buf.writeUIntLE(255, 0, 1);
  return buf.readUIntLE(0, 1) === 255;
});

test('BE: 1字节 - 1', () => {
  const buf = Buffer.from([0x01]);
  return buf.readUIntBE(0, 1) === 1;
});

test('LE: 1字节 - 1', () => {
  const buf = Buffer.from([0x01]);
  return buf.readUIntLE(0, 1) === 1;
});

test('BE: 1字节 - 127（中点）', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readUIntBE(0, 1) === 127;
});

test('LE: 1字节 - 127（中点）', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readUIntLE(0, 1) === 127;
});

test('BE: 1字节 - 128', () => {
  const buf = Buffer.from([0x80]);
  return buf.readUIntBE(0, 1) === 128;
});

test('LE: 1字节 - 128', () => {
  const buf = Buffer.from([0x80]);
  return buf.readUIntLE(0, 1) === 128;
});

// === 2字节范围测试 ===

test('BE: 2字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUIntBE(0, 0, 2);
  return buf.readUIntBE(0, 2) === 0;
});

test('LE: 2字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUIntLE(0, 0, 2);
  return buf.readUIntLE(0, 2) === 0;
});

test('BE: 2字节 - 65535（最大值）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUIntBE(65535, 0, 2);
  return buf.readUIntBE(0, 2) === 65535;
});

test('LE: 2字节 - 65535（最大值）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUIntLE(65535, 0, 2);
  return buf.readUIntLE(0, 2) === 65535;
});

test('BE: 2字节 - 1', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readUIntBE(0, 2) === 1;
});

test('LE: 2字节 - 1', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readUIntLE(0, 2) === 1;
});

test('BE: 2字节 - 32767（中点）', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  return buf.readUIntBE(0, 2) === 32767;
});

test('LE: 2字节 - 32767（中点）', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return buf.readUIntLE(0, 2) === 32767;
});

test('BE: 2字节 - 32768', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readUIntBE(0, 2) === 32768;
});

test('LE: 2字节 - 32768', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readUIntLE(0, 2) === 32768;
});

test('BE: 2字节 - 256', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readUIntBE(0, 2) === 256;
});

test('LE: 2字节 - 256', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readUIntLE(0, 2) === 256;
});

// === 3字节范围测试 ===

test('BE: 3字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(3);
  buf.writeUIntBE(0, 0, 3);
  return buf.readUIntBE(0, 3) === 0;
});

test('LE: 3字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(3);
  buf.writeUIntLE(0, 0, 3);
  return buf.readUIntLE(0, 3) === 0;
});

test('BE: 3字节 - 16777215（最大值）', () => {
  const buf = Buffer.alloc(3);
  buf.writeUIntBE(16777215, 0, 3);
  return buf.readUIntBE(0, 3) === 16777215;
});

test('LE: 3字节 - 16777215（最大值）', () => {
  const buf = Buffer.alloc(3);
  buf.writeUIntLE(16777215, 0, 3);
  return buf.readUIntLE(0, 3) === 16777215;
});

test('BE: 3字节 - 1', () => {
  const buf = Buffer.from([0x00, 0x00, 0x01]);
  return buf.readUIntBE(0, 3) === 1;
});

test('LE: 3字节 - 1', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00]);
  return buf.readUIntLE(0, 3) === 1;
});

test('BE: 3字节 - 8388607（中点）', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 3) === 8388607;
});

test('LE: 3字节 - 8388607（中点）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0x7F]);
  return buf.readUIntLE(0, 3) === 8388607;
});

test('BE: 3字节 - 8388608', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00]);
  return buf.readUIntBE(0, 3) === 8388608;
});

test('LE: 3字节 - 8388608', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80]);
  return buf.readUIntLE(0, 3) === 8388608;
});

test('BE: 3字节 - 65536', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00]);
  return buf.readUIntBE(0, 3) === 65536;
});

test('LE: 3字节 - 65536', () => {
  const buf = Buffer.from([0x00, 0x00, 0x01]);
  return buf.readUIntLE(0, 3) === 65536;
});

// === 4字节范围测试 ===

test('BE: 4字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntBE(0, 0, 4);
  return buf.readUIntBE(0, 4) === 0;
});

test('LE: 4字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntLE(0, 0, 4);
  return buf.readUIntLE(0, 4) === 0;
});

test('BE: 4字节 - 4294967295（最大值）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntBE(4294967295, 0, 4);
  return buf.readUIntBE(0, 4) === 4294967295;
});

test('LE: 4字节 - 4294967295（最大值）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntLE(4294967295, 0, 4);
  return buf.readUIntLE(0, 4) === 4294967295;
});

test('BE: 4字节 - 1', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  return buf.readUIntBE(0, 4) === 1;
});

test('LE: 4字节 - 1', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 4) === 1;
});

test('BE: 4字节 - 2147483647（中点）', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 4) === 2147483647;
});

test('LE: 4字节 - 2147483647（中点）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readUIntLE(0, 4) === 2147483647;
});

test('BE: 4字节 - 2147483648', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 4) === 2147483648;
});

test('LE: 4字节 - 2147483648', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readUIntLE(0, 4) === 2147483648;
});

test('BE: 4字节 - 16777216', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 4) === 16777216;
});

test('LE: 4字节 - 16777216', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  return buf.readUIntLE(0, 4) === 16777216;
});

// === 5字节范围测试 ===

test('BE: 5字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(5);
  buf.writeUIntBE(0, 0, 5);
  return buf.readUIntBE(0, 5) === 0;
});

test('LE: 5字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(5);
  buf.writeUIntLE(0, 0, 5);
  return buf.readUIntLE(0, 5) === 0;
});

test('BE: 5字节 - 1099511627775（最大值）', () => {
  const buf = Buffer.alloc(5);
  buf.writeUIntBE(1099511627775, 0, 5);
  return buf.readUIntBE(0, 5) === 1099511627775;
});

test('LE: 5字节 - 1099511627775（最大值）', () => {
  const buf = Buffer.alloc(5);
  buf.writeUIntLE(1099511627775, 0, 5);
  return buf.readUIntLE(0, 5) === 1099511627775;
});

test('BE: 5字节 - 1', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01]);
  return buf.readUIntBE(0, 5) === 1;
});

test('LE: 5字节 - 1', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 5) === 1;
});

test('BE: 5字节 - 549755813887（中点）', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 5) === 549755813887;
});

test('LE: 5字节 - 549755813887（中点）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readUIntLE(0, 5) === 549755813887;
});

test('BE: 5字节 - 549755813888', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 5) === 549755813888;
});

test('LE: 5字节 - 549755813888', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x80]);
  return buf.readUIntLE(0, 5) === 549755813888;
});

test('BE: 5字节 - 4294967296', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 5) === 4294967296;
});

test('LE: 5字节 - 4294967296', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01]);
  return buf.readUIntLE(0, 5) === 4294967296;
});

// === 6字节范围测试 ===

test('BE: 6字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(6);
  buf.writeUIntBE(0, 0, 6);
  return buf.readUIntBE(0, 6) === 0;
});

test('LE: 6字节 - 0（最小值）', () => {
  const buf = Buffer.alloc(6);
  buf.writeUIntLE(0, 0, 6);
  return buf.readUIntLE(0, 6) === 0;
});

test('BE: 6字节 - 281474976710655（最大值）', () => {
  const buf = Buffer.alloc(6);
  buf.writeUIntBE(281474976710655, 0, 6);
  return buf.readUIntBE(0, 6) === 281474976710655;
});

test('LE: 6字节 - 281474976710655（最大值）', () => {
  const buf = Buffer.alloc(6);
  buf.writeUIntLE(281474976710655, 0, 6);
  return buf.readUIntLE(0, 6) === 281474976710655;
});

test('BE: 6字节 - 1', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
  return buf.readUIntBE(0, 6) === 1;
});

test('LE: 6字节 - 1', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 6) === 1;
});

test('BE: 6字节 - 140737488355327（中点）', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 6) === 140737488355327;
});

test('LE: 6字节 - 140737488355327（中点）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readUIntLE(0, 6) === 140737488355327;
});

test('BE: 6字节 - 140737488355328', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 6) === 140737488355328;
});

test('LE: 6字节 - 140737488355328', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  return buf.readUIntLE(0, 6) === 140737488355328;
});

test('BE: 6字节 - 1099511627776', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 6) === 1099511627776;
});

test('LE: 6字节 - 1099511627776', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
  return buf.readUIntLE(0, 6) === 1099511627776;
});

// === 2的幂次测试 ===

test('BE: 2字节 - 2^8 = 256', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readUIntBE(0, 2) === 256;
});

test('LE: 2字节 - 2^8 = 256', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readUIntLE(0, 2) === 256;
});

test('BE: 3字节 - 2^16 = 65536', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00]);
  return buf.readUIntBE(0, 3) === 65536;
});

test('LE: 3字节 - 2^16 = 65536', () => {
  const buf = Buffer.from([0x00, 0x00, 0x01]);
  return buf.readUIntLE(0, 3) === 65536;
});

test('BE: 4字节 - 2^24 = 16777216', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 4) === 16777216;
});

test('LE: 4字节 - 2^24 = 16777216', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  return buf.readUIntLE(0, 4) === 16777216;
});

test('BE: 5字节 - 2^32 = 4294967296', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 5) === 4294967296;
});

test('LE: 5字节 - 2^32 = 4294967296', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01]);
  return buf.readUIntLE(0, 5) === 4294967296;
});

test('BE: 6字节 - 2^40 = 1099511627776', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 6) === 1099511627776;
});

test('LE: 6字节 - 2^40 = 1099511627776', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
  return buf.readUIntLE(0, 6) === 1099511627776;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
