// 完整数值范围测试
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
test('BE: 读取 0（最小值）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0, 0);
  return buf.readUInt16BE(0) === 0;
});

test('LE: 读取 0（最小值）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0, 0);
  return buf.readUInt16LE(0) === 0;
});

test('BE: 读取 65535（最大值）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(65535, 0);
  return buf.readUInt16BE(0) === 65535;
});

test('LE: 读取 65535（最大值）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(65535, 0);
  return buf.readUInt16LE(0) === 65535;
});

test('BE: 读取 1（最小值 + 1）', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readUInt16BE(0) === 1;
});

test('LE: 读取 1（最小值 + 1）', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readUInt16LE(0) === 1;
});

test('BE: 读取 65534（最大值 - 1）', () => {
  const buf = Buffer.from([0xFF, 0xFE]);
  return buf.readUInt16BE(0) === 65534;
});

test('LE: 读取 65534（最大值 - 1）', () => {
  const buf = Buffer.from([0xFE, 0xFF]);
  return buf.readUInt16LE(0) === 65534;
});

// 中间值测试
test('BE: 读取 32768（中点）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(32768, 0);
  return buf.readUInt16BE(0) === 32768;
});

test('LE: 读取 32768（中点）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(32768, 0);
  return buf.readUInt16LE(0) === 32768;
});

test('BE: 读取 32767', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(32767, 0);
  return buf.readUInt16BE(0) === 32767;
});

test('LE: 读取 32767', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(32767, 0);
  return buf.readUInt16LE(0) === 32767;
});

test('BE: 读取 32769', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(32769, 0);
  return buf.readUInt16BE(0) === 32769;
});

test('LE: 读取 32769', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(32769, 0);
  return buf.readUInt16LE(0) === 32769;
});

// 小值测试
test('BE: 读取 2', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(2, 0);
  return buf.readUInt16BE(0) === 2;
});

test('LE: 读取 2', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(2, 0);
  return buf.readUInt16LE(0) === 2;
});

test('BE: 读取 10', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(10, 0);
  return buf.readUInt16BE(0) === 10;
});

test('LE: 读取 10', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(10, 0);
  return buf.readUInt16LE(0) === 10;
});

test('BE: 读取 100', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(100, 0);
  return buf.readUInt16BE(0) === 100;
});

test('LE: 读取 100', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(100, 0);
  return buf.readUInt16LE(0) === 100;
});

test('BE: 读取 256', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(256, 0);
  return buf.readUInt16BE(0) === 256;
});

test('LE: 读取 256', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(256, 0);
  return buf.readUInt16LE(0) === 256;
});

test('BE: 读取 1000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(1000, 0);
  return buf.readUInt16BE(0) === 1000;
});

test('LE: 读取 1000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(1000, 0);
  return buf.readUInt16LE(0) === 1000;
});

// 大值测试
test('BE: 读取 10000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(10000, 0);
  return buf.readUInt16BE(0) === 10000;
});

test('LE: 读取 10000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(10000, 0);
  return buf.readUInt16LE(0) === 10000;
});

test('BE: 读取 50000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(50000, 0);
  return buf.readUInt16BE(0) === 50000;
});

test('LE: 读取 50000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(50000, 0);
  return buf.readUInt16LE(0) === 50000;
});

test('BE: 读取 60000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(60000, 0);
  return buf.readUInt16BE(0) === 60000;
});

test('LE: 读取 60000', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(60000, 0);
  return buf.readUInt16LE(0) === 60000;
});

// 十六进制值系列
test('BE: 读取 0x0000', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readUInt16BE(0) === 0x0000;
});

test('LE: 读取 0x0000', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readUInt16LE(0) === 0x0000;
});

test('BE: 读取 0x1000', () => {
  const buf = Buffer.from([0x10, 0x00]);
  return buf.readUInt16BE(0) === 0x1000;
});

test('LE: 读取 0x1000', () => {
  const buf = Buffer.from([0x00, 0x10]);
  return buf.readUInt16LE(0) === 0x1000;
});

test('BE: 读取 0x2000', () => {
  const buf = Buffer.from([0x20, 0x00]);
  return buf.readUInt16BE(0) === 0x2000;
});

test('LE: 读取 0x2000', () => {
  const buf = Buffer.from([0x00, 0x20]);
  return buf.readUInt16LE(0) === 0x2000;
});

test('BE: 读取 0x4000', () => {
  const buf = Buffer.from([0x40, 0x00]);
  return buf.readUInt16BE(0) === 0x4000;
});

test('LE: 读取 0x4000', () => {
  const buf = Buffer.from([0x00, 0x40]);
  return buf.readUInt16LE(0) === 0x4000;
});

test('BE: 读取 0x8000', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readUInt16BE(0) === 0x8000;
});

test('LE: 读取 0x8000', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readUInt16LE(0) === 0x8000;
});

test('BE: 读取 0xC000', () => {
  const buf = Buffer.from([0xC0, 0x00]);
  return buf.readUInt16BE(0) === 0xC000;
});

test('LE: 读取 0xC000', () => {
  const buf = Buffer.from([0x00, 0xC0]);
  return buf.readUInt16LE(0) === 0xC000;
});

test('BE: 读取 0xFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUInt16BE(0) === 0xFFFF;
});

test('LE: 读取 0xFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUInt16LE(0) === 0xFFFF;
});

// 连续值读取
test('BE: 连续值 0-9', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16BE(i, i * 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt16BE(i * 2) !== i) return false;
  }
  return true;
});

test('LE: 连续值 0-9', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16LE(i, i * 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt16LE(i * 2) !== i) return false;
  }
  return true;
});

// 特殊模式
test('BE: 全 0xFF 模式', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0xFF);
  return buf.readUInt16BE(0) === 0xFFFF && buf.readUInt16BE(2) === 0xFFFF;
});

test('LE: 全 0xFF 模式', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0xFF);
  return buf.readUInt16LE(0) === 0xFFFF && buf.readUInt16LE(2) === 0xFFFF;
});

test('BE: 全 0x00 模式', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0x00);
  return buf.readUInt16BE(0) === 0x0000 && buf.readUInt16BE(2) === 0x0000;
});

test('LE: 全 0x00 模式', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0x00);
  return buf.readUInt16LE(0) === 0x0000 && buf.readUInt16LE(2) === 0x0000;
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
