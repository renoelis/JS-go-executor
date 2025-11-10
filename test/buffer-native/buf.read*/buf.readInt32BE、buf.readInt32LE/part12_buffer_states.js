// Buffer 状态和操作测试
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

// === Buffer.copy 测试 ===

test('copy 完整Buffer后读取 - BE', () => {
  const src = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const dst = Buffer.alloc(4);
  src.copy(dst);
  return dst.readInt32BE(0) === 0x12345678;
});

test('copy 完整Buffer后读取 - LE', () => {
  const src = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const dst = Buffer.alloc(4);
  src.copy(dst);
  return dst.readInt32LE(0) === 0x12345678;
});

test('copy 部分Buffer后读取 - BE', () => {
  const src = Buffer.from([0xFF, 0x12, 0x34, 0x56, 0x78, 0xFF]);
  const dst = Buffer.alloc(4);
  src.copy(dst, 0, 1, 5);
  return dst.readInt32BE(0) === 0x12345678;
});

test('copy 部分Buffer后读取 - LE', () => {
  const src = Buffer.from([0xFF, 0x78, 0x56, 0x34, 0x12, 0xFF]);
  const dst = Buffer.alloc(4);
  src.copy(dst, 0, 1, 5);
  return dst.readInt32LE(0) === 0x12345678;
});

// === 不同编码创建 ===

test('hex 编码创建后读取 - BE', () => {
  const buf = Buffer.from('12345678', 'hex');
  return buf.readInt32BE(0) === 0x12345678;
});

test('hex 编码创建后读取 - LE', () => {
  const buf = Buffer.from('78563412', 'hex');
  return buf.readInt32LE(0) === 0x12345678;
});

test('base64 编码创建后读取 - BE', () => {
  const buf = Buffer.from('EjRWeA==', 'base64');
  return buf.readInt32BE(0) === 0x12345678;
});

test('base64 编码创建后读取 - LE', () => {
  const buf = Buffer.from('eFY0Eg==', 'base64');
  return buf.readInt32LE(0) === 0x12345678;
});

// === Buffer.concat ===

test('concat 多个Buffer后读取 - BE', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x78]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readInt32BE(0) === 0x12345678;
});

test('concat 多个Buffer后读取 - LE', () => {
  const buf1 = Buffer.from([0x78, 0x56]);
  const buf2 = Buffer.from([0x34, 0x12]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readInt32LE(0) === 0x12345678;
});

// === Buffer.reverse ===

test('reverse 后读取 - BE转LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const beBefore = buf.readInt32BE(0);
  buf.reverse();
  const leAfter = buf.readInt32LE(0);
  return beBefore === 0x12345678 && leAfter === 0x12345678;
});

test('reverse 后读取 - LE转BE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const leBefore = buf.readInt32LE(0);
  buf.reverse();
  const beAfter = buf.readInt32BE(0);
  return leBefore === 0x12345678 && beAfter === 0x12345678;
});

// === Buffer.swap32 ===

test('swap32 后读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const before = buf.readInt32BE(0);
  buf.swap32();
  const after = buf.readInt32BE(0);
  return before === 0x12345678 && after === 0x78563412;
});

test('swap32 后读取 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const before = buf.readInt32LE(0);
  buf.swap32();
  const after = buf.readInt32LE(0);
  return before === 0x12345678 && after === 0x78563412;
});

// === subarray 共享内存 ===

test('subarray 共享内存验证 - BE', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x00]);
  const sub = buf.subarray(1, 5);
  
  const before = sub.readInt32BE(0);
  buf[1] = 0xFF;
  const after = sub.readInt32BE(0);
  
  return before === 0x12345678 && after === -13347208;
});

test('subarray 共享内存验证 - LE', () => {
  const buf = Buffer.from([0x00, 0x78, 0x56, 0x34, 0x12, 0x00]);
  const sub = buf.subarray(1, 5);
  
  const before = sub.readInt32LE(0);
  buf[1] = 0xFF;
  const after = sub.readInt32LE(0);
  
  return before === 0x12345678 && after === 0x123456FF;
});

// === 长度不足的Buffer ===

test('3字节Buffer不可读 - BE', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('3字节Buffer不可读 - LE', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readInt32LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('0字节Buffer不可读 - BE', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readInt32BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('0字节Buffer不可读 - LE', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readInt32LE(0);
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
