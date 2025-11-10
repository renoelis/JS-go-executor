// 方法完整性测试
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

// 方法存在性
test('BE: 方法存在', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return typeof buf.readUInt16BE === 'function';
});

test('LE: 方法存在', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return typeof buf.readUInt16LE === 'function';
});

// 返回值类型
test('BE: 返回值类型为 number', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return typeof buf.readUInt16BE(0) === 'number';
});

test('LE: 返回值类型为 number', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return typeof buf.readUInt16LE(0) === 'number';
});

// 返回值范围
test('BE: 返回值范围 0-65535', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  const val = buf.readUInt16BE(0);
  return val >= 0 && val <= 65535 && val === 65535;
});

test('LE: 返回值范围 0-65535', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  const val = buf.readUInt16LE(0);
  return val >= 0 && val <= 65535 && val === 65535;
});

// 不修改原 Buffer
test('BE: 不修改原 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const before = buf.toString('hex');
  buf.readUInt16BE(0);
  const after = buf.toString('hex');
  return before === after;
});

test('LE: 不修改原 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const before = buf.toString('hex');
  buf.readUInt16LE(0);
  const after = buf.toString('hex');
  return before === after;
});

// 多次读取一致性
test('BE: 多次读取一致', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  const val1 = buf.readUInt16BE(0);
  const val2 = buf.readUInt16BE(0);
  const val3 = buf.readUInt16BE(0);
  return val1 === val2 && val2 === val3 && val1 === 0xABCD;
});

test('LE: 多次读取一致', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  const val1 = buf.readUInt16LE(0);
  const val2 = buf.readUInt16LE(0);
  const val3 = buf.readUInt16LE(0);
  return val1 === val2 && val2 === val3 && val1 === 0xCDAB;
});

// offset 默认值
test('BE: offset 默认值为 0', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16BE() === buf.readUInt16BE(0);
});

test('LE: offset 默认值为 0', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16LE() === buf.readUInt16LE(0);
});

// 连续调用
test('BE: 连续调用不同 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v1 = buf.readUInt16BE(0);
  const v2 = buf.readUInt16BE(2);
  return v1 === 0x1234 && v2 === 0x5678;
});

test('LE: 连续调用不同 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v1 = buf.readUInt16LE(0);
  const v2 = buf.readUInt16LE(2);
  return v1 === 0x3412 && v2 === 0x7856;
});

// write + read 往返一致性
test('BE: writeUInt16BE + readUInt16BE 往返', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(12345, 0);
  buf.writeUInt16BE(54321, 2);
  return buf.readUInt16BE(0) === 12345 && buf.readUInt16BE(2) === 54321;
});

test('LE: writeUInt16LE + readUInt16LE 往返', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(12345, 0);
  buf.writeUInt16LE(54321, 2);
  return buf.readUInt16LE(0) === 12345 && buf.readUInt16LE(2) === 54321;
});

// 与 readInt16 对比（无符号 vs 有符号）
test('BE: readUInt16BE vs readInt16BE (正数)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16BE(0) === buf.readInt16BE(0);
});

test('LE: readUInt16LE vs readInt16LE (正数)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUInt16LE(0) === buf.readInt16LE(0);
});

test('BE: readUInt16BE vs readInt16BE (负数范围)', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  const uint = buf.readUInt16BE(0);
  const int = buf.readInt16BE(0);
  return uint === 65535 && int === -1;
});

test('LE: readUInt16LE vs readInt16LE (负数范围)', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  const uint = buf.readUInt16LE(0);
  const int = buf.readInt16LE(0);
  return uint === 65535 && int === -1;
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
