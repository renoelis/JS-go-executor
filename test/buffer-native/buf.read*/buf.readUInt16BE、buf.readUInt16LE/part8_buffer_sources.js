// 不同 Buffer 来源测试
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

// Buffer.from(array)
test('BE: Buffer.from(array)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt16BE(0) === 0x1234 && buf.readUInt16BE(2) === 0x5678;
});

test('LE: Buffer.from(array)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt16LE(0) === 0x3412 && buf.readUInt16LE(2) === 0x7856;
});

// Buffer.from(string)
test('BE: Buffer.from(string, utf8)', () => {
  const buf = Buffer.from('AB', 'utf8');
  return buf.readUInt16BE(0) === 0x4142;
});

test('LE: Buffer.from(string, utf8)', () => {
  const buf = Buffer.from('AB', 'utf8');
  return buf.readUInt16LE(0) === 0x4241;
});

// Buffer.from(hex)
test('BE: Buffer.from(hex string)', () => {
  const buf = Buffer.from('1234', 'hex');
  return buf.readUInt16BE(0) === 0x1234;
});

test('LE: Buffer.from(hex string)', () => {
  const buf = Buffer.from('1234', 'hex');
  return buf.readUInt16LE(0) === 0x3412;
});

// Buffer.from(base64)
test('BE: Buffer.from(base64)', () => {
  const buf = Buffer.from('EjQ=', 'base64');
  return buf.readUInt16BE(0) === 0x1234;
});

test('LE: Buffer.from(base64)', () => {
  const buf = Buffer.from('EjQ=', 'base64');
  return buf.readUInt16LE(0) === 0x3412;
});

// Buffer.from(buffer)
test('BE: Buffer.from(buffer)', () => {
  const buf1 = Buffer.from([0xAB, 0xCD]);
  const buf2 = Buffer.from(buf1);
  return buf2.readUInt16BE(0) === 0xABCD;
});

test('LE: Buffer.from(buffer)', () => {
  const buf1 = Buffer.from([0xAB, 0xCD]);
  const buf2 = Buffer.from(buf1);
  return buf2.readUInt16LE(0) === 0xCDAB;
});

// Buffer.alloc()
test('BE: Buffer.alloc() 默认值', () => {
  const buf = Buffer.alloc(4);
  return buf.readUInt16BE(0) === 0 && buf.readUInt16BE(2) === 0;
});

test('LE: Buffer.alloc() 默认值', () => {
  const buf = Buffer.alloc(4);
  return buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 0;
});

// Buffer.alloc(size, fill)
test('BE: Buffer.alloc(size, fill)', () => {
  const buf = Buffer.alloc(4, 0xFF);
  return buf.readUInt16BE(0) === 0xFFFF && buf.readUInt16BE(2) === 0xFFFF;
});

test('LE: Buffer.alloc(size, fill)', () => {
  const buf = Buffer.alloc(4, 0xFF);
  return buf.readUInt16LE(0) === 0xFFFF && buf.readUInt16LE(2) === 0xFFFF;
});

// Buffer.allocUnsafe()
test('BE: Buffer.allocUnsafe()', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt16BE(0x1234, 0);
  return buf.readUInt16BE(0) === 0x1234;
});

test('LE: Buffer.allocUnsafe()', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt16LE(0x1234, 0);
  return buf.readUInt16LE(0) === 0x1234;
});

// Buffer.concat()
test('BE: Buffer.concat()', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x78]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readUInt16BE(0) === 0x1234 && buf.readUInt16BE(2) === 0x5678;
});

test('LE: Buffer.concat()', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x78]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readUInt16LE(0) === 0x3412 && buf.readUInt16LE(2) === 0x7856;
});

// Buffer.slice()
test('BE: Buffer.slice()', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56]);
  const slice = buf.slice(1, 3);
  return slice.readUInt16BE(0) === 0x1234;
});

test('LE: Buffer.slice()', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56]);
  const slice = buf.slice(1, 3);
  return slice.readUInt16LE(0) === 0x3412;
});

// Buffer.subarray()
test('BE: Buffer.subarray()', () => {
  const buf = Buffer.from([0x00, 0xAB, 0xCD, 0xFF]);
  const sub = buf.subarray(1, 3);
  return sub.readUInt16BE(0) === 0xABCD;
});

test('LE: Buffer.subarray()', () => {
  const buf = Buffer.from([0x00, 0xAB, 0xCD, 0xFF]);
  const sub = buf.subarray(1, 3);
  return sub.readUInt16LE(0) === 0xCDAB;
});

// Buffer.fill()
test('BE: Buffer.fill()', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0xAA);
  return buf.readUInt16BE(0) === 0xAAAA && buf.readUInt16BE(2) === 0xAAAA;
});

test('LE: Buffer.fill()', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0xAA);
  return buf.readUInt16LE(0) === 0xAAAA && buf.readUInt16LE(2) === 0xAAAA;
});

// Buffer.copy()
test('BE: Buffer.copy()', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const buf2 = Buffer.alloc(4);
  buf1.copy(buf2);
  return buf2.readUInt16BE(0) === 0x1234 && buf2.readUInt16BE(2) === 0x5678;
});

test('LE: Buffer.copy()', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const buf2 = Buffer.alloc(4);
  buf1.copy(buf2);
  return buf2.readUInt16LE(0) === 0x3412 && buf2.readUInt16LE(2) === 0x7856;
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
