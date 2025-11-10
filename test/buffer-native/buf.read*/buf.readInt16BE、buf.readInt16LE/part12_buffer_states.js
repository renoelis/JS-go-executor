// Buffer状态和特殊方法测试
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

// === Buffer.copy后读取 ===

test('copy后的Buffer读取 - BE', () => {
  const src = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const dst = Buffer.alloc(4);
  src.copy(dst, 0, 0, 4);
  return dst.readInt16BE(0) === 0x1234 && dst.readInt16BE(2) === 0x5678;
});

test('copy后的Buffer读取 - LE', () => {
  const src = Buffer.from([0x34, 0x12, 0x78, 0x56]);
  const dst = Buffer.alloc(4);
  src.copy(dst, 0, 0, 4);
  return dst.readInt16LE(0) === 0x1234 && dst.readInt16LE(2) === 0x5678;
});

test('部分copy后读取 - BE', () => {
  const src = Buffer.from([0x00, 0x00, 0x12, 0x34]);
  const dst = Buffer.alloc(2);
  src.copy(dst, 0, 2, 4);
  return dst.readInt16BE(0) === 0x1234;
});

test('部分copy后读取 - LE', () => {
  const src = Buffer.from([0x00, 0x00, 0x34, 0x12]);
  const dst = Buffer.alloc(2);
  src.copy(dst, 0, 2, 4);
  return dst.readInt16LE(0) === 0x1234;
});

// === 不同编码创建的Buffer ===

test('从hex编码创建 - BE', () => {
  const buf = Buffer.from('1234', 'hex');
  return buf.readInt16BE(0) === 0x1234;
});

test('从hex编码创建 - LE', () => {
  const buf = Buffer.from('3412', 'hex');
  return buf.readInt16LE(0) === 0x1234;
});

test('从base64编码创建 - BE', () => {
  const buf = Buffer.from('EjQ=', 'base64'); // 0x12, 0x34
  return buf.readInt16BE(0) === 0x1234;
});

test('从base64编码创建 - LE', () => {
  const buf = Buffer.from('NBI=', 'base64'); // 0x34, 0x12
  return buf.readInt16LE(0) === 0x1234;
});

// === Buffer.concat后读取 ===

test('concat两个Buffer后读取 - BE', () => {
  const buf1 = Buffer.from([0x12]);
  const buf2 = Buffer.from([0x34]);
  const combined = Buffer.concat([buf1, buf2]);
  return combined.readInt16BE(0) === 0x1234;
});

test('concat两个Buffer后读取 - LE', () => {
  const buf1 = Buffer.from([0x34]);
  const buf2 = Buffer.from([0x12]);
  const combined = Buffer.concat([buf1, buf2]);
  return combined.readInt16LE(0) === 0x1234;
});

test('concat多个Buffer后读取 - BE', () => {
  const bufs = [
    Buffer.from([0x12]),
    Buffer.from([0x34]),
    Buffer.from([0x56]),
    Buffer.from([0x78])
  ];
  const combined = Buffer.concat(bufs);
  return combined.readInt16BE(0) === 0x1234 && combined.readInt16BE(2) === 0x5678;
});

// === Buffer逆序后读取 ===

test('reverse后读取 - BE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  buf.reverse();
  return buf.readInt16BE(0) === 0x1234;
});

test('reverse后读取 - LE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  buf.reverse();
  return buf.readInt16LE(0) === 0x1234;
});

// === Buffer.swap16后读取 ===

test('swap16后读取 - BE', () => {
  const buf = Buffer.from([0x34, 0x12, 0x78, 0x56]);
  buf.swap16();
  return buf.readInt16BE(0) === 0x1234 && buf.readInt16BE(2) === 0x5678;
});

test('swap16后读取 - LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  buf.swap16();
  return buf.readInt16LE(0) === 0x1234 && buf.readInt16LE(2) === 0x5678;
});

// === 只读的subarray ===

test('subarray与原Buffer共享内存 - BE', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x00]);
  const sub = buf.subarray(1, 3);
  buf[1] = 0x56;
  return sub.readInt16BE(0) === 0x5634;
});

test('subarray与原Buffer共享内存 - LE', () => {
  const buf = Buffer.from([0x00, 0x34, 0x12, 0x00]);
  const sub = buf.subarray(1, 3);
  buf[1] = 0x78;
  return sub.readInt16LE(0) === 0x1278;
});

// === 零长度相关 ===

test('1字节Buffer不能读取 - BE', () => {
  try {
    Buffer.from([0x12]).readInt16BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('1字节Buffer不能读取 - LE', () => {
  try {
    Buffer.from([0x12]).readInt16LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('0字节Buffer不能读取 - BE', () => {
  try {
    Buffer.alloc(0).readInt16BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('0字节Buffer不能读取 - LE', () => {
  try {
    Buffer.alloc(0).readInt16LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed/tests.length)*100).toFixed(2)+'%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
