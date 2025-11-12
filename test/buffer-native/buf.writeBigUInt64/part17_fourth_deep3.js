// buf.writeBigUInt64BE/LE - 第四轮深度补充3：内存布局与字节顺序深度验证
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

// ===== BE 和 LE 的字节布局精确镜像验证 =====

test('writeBigUInt64BE/LE - 布局完全镜像（0x0102030405060708n）', () => {
  const bufBE = Buffer.alloc(8);
  const bufLE = Buffer.alloc(8);
  const val = 0x0102030405060708n;

  bufBE.writeBigUInt64BE(val, 0);
  bufLE.writeBigUInt64LE(val, 0);

  return Array.from(bufBE).every((b, i) => b === bufLE[7 - i]);
});

test('writeBigUInt64BE/LE - 布局完全镜像（0xFFEEDDCCBBAA9988n）', () => {
  const bufBE = Buffer.alloc(8);
  const bufLE = Buffer.alloc(8);
  const val = 0xFFEEDDCCBBAA9988n;

  bufBE.writeBigUInt64BE(val, 0);
  bufLE.writeBigUInt64LE(val, 0);

  return Array.from(bufBE).every((b, i) => b === bufLE[7 - i]);
});

test('writeBigUInt64BE/LE - 布局完全镜像（0xFFFFFFFFFFFFFFFFn）', () => {
  const bufBE = Buffer.alloc(8);
  const bufLE = Buffer.alloc(8);
  const val = 0xFFFFFFFFFFFFFFFFn;

  bufBE.writeBigUInt64BE(val, 0);
  bufLE.writeBigUInt64LE(val, 0);

  return Array.from(bufBE).every((b, i) => b === bufLE[7 - i]);
});

test('writeBigUInt64BE/LE - 布局完全镜像（0x0000000000000001n）', () => {
  const bufBE = Buffer.alloc(8);
  const bufLE = Buffer.alloc(8);
  const val = 0x0000000000000001n;

  bufBE.writeBigUInt64BE(val, 0);
  bufLE.writeBigUInt64LE(val, 0);

  return Array.from(bufBE).every((b, i) => b === bufLE[7 - i]);
});

// ===== BE 字节序精确验证（逐字节检查）=====

test('writeBigUInt64BE - 字节序精确：0x123456789ABCDEF0n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x123456789ABCDEF0n, 0);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78 &&
         buf[4] === 0x9A && buf[5] === 0xBC && buf[6] === 0xDE && buf[7] === 0xF0;
});

test('writeBigUInt64BE - 字节序精确：0xFEDCBA9876543210n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xFEDCBA9876543210n, 0);
  return buf[0] === 0xFE && buf[1] === 0xDC && buf[2] === 0xBA && buf[3] === 0x98 &&
         buf[4] === 0x76 && buf[5] === 0x54 && buf[6] === 0x32 && buf[7] === 0x10;
});

test('writeBigUInt64BE - 字节序精确：0x8000000000000000n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x8000000000000000n, 0);
  return buf[0] === 0x80 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64BE - 字节序精确：0x0000000000000080n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0000000000000080n, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x80;
});

// ===== LE 字节序精确验证（逐字节检查）=====

test('writeBigUInt64LE - 字节序精确：0x123456789ABCDEF0n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x123456789ABCDEF0n, 0);
  return buf[0] === 0xF0 && buf[1] === 0xDE && buf[2] === 0xBC && buf[3] === 0x9A &&
         buf[4] === 0x78 && buf[5] === 0x56 && buf[6] === 0x34 && buf[7] === 0x12;
});

test('writeBigUInt64LE - 字节序精确：0xFEDCBA9876543210n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xFEDCBA9876543210n, 0);
  return buf[0] === 0x10 && buf[1] === 0x32 && buf[2] === 0x54 && buf[3] === 0x76 &&
         buf[4] === 0x98 && buf[5] === 0xBA && buf[6] === 0xDC && buf[7] === 0xFE;
});

test('writeBigUInt64LE - 字节序精确：0x8000000000000000n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x8000000000000000n, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x80;
});

test('writeBigUInt64LE - 字节序精确：0x0000000000000080n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0000000000000080n, 0);
  return buf[0] === 0x80 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

// ===== 不同 offset 的内存布局验证 =====

test('writeBigUInt64BE - offset=0, 验证周围字节不受影响', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 0);
  return buf.slice(0, 8).toString('hex') === '1234567890abcdef' &&
         buf.slice(8, 16).every(b => b === 0xFF);
});

test('writeBigUInt64BE - offset=4, 验证周围字节不受影响', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 4);
  return buf.slice(0, 4).every(b => b === 0xFF) &&
         buf.slice(4, 12).toString('hex') === '1234567890abcdef' &&
         buf.slice(12, 16).every(b => b === 0xFF);
});

test('writeBigUInt64BE - offset=8, 验证周围字节不受影响', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 8);
  return buf.slice(0, 8).every(b => b === 0xFF) &&
         buf.slice(8, 16).toString('hex') === '1234567890abcdef';
});

test('writeBigUInt64LE - offset=0, 验证周围字节不受影响', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 0);
  return buf.slice(0, 8).toString('hex') === 'efcdab9078563412' &&
         buf.slice(8, 16).every(b => b === 0xFF);
});

test('writeBigUInt64LE - offset=4, 验证周围字节不受影响', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 4);
  return buf.slice(0, 4).every(b => b === 0xFF) &&
         buf.slice(4, 12).toString('hex') === 'efcdab9078563412' &&
         buf.slice(12, 16).every(b => b === 0xFF);
});

test('writeBigUInt64LE - offset=8, 验证周围字节不受影响', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 8);
  return buf.slice(0, 8).every(b => b === 0xFF) &&
         buf.slice(8, 16).toString('hex') === 'efcdab9078563412';
});

// ===== 连续写入的内存布局验证 =====

test('writeBigUInt64BE - 连续3次写入，内存布局正确', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64BE(0x1111111111111111n, 0);
  buf.writeBigUInt64BE(0x2222222222222222n, 8);
  buf.writeBigUInt64BE(0x3333333333333333n, 16);

  return buf.slice(0, 8).toString('hex') === '1111111111111111' &&
         buf.slice(8, 16).toString('hex') === '2222222222222222' &&
         buf.slice(16, 24).toString('hex') === '3333333333333333';
});

test('writeBigUInt64LE - 连续3次写入，内存布局正确', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64LE(0x1111111111111111n, 0);
  buf.writeBigUInt64LE(0x2222222222222222n, 8);
  buf.writeBigUInt64LE(0x3333333333333333n, 16);

  return buf.slice(0, 8).toString('hex') === '1111111111111111' &&
         buf.slice(8, 16).toString('hex') === '2222222222222222' &&
         buf.slice(16, 24).toString('hex') === '3333333333333333';
});

// ===== 字节边界对齐验证 =====

test('writeBigUInt64BE - 非对齐 offset=1, 内存布局正确', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64BE(0xABCDEF0123456789n, 1);
  return buf[0] === 0x00 &&
         buf[1] === 0xAB && buf[2] === 0xCD && buf[3] === 0xEF &&
         buf[4] === 0x01 && buf[5] === 0x23 && buf[6] === 0x45 &&
         buf[7] === 0x67 && buf[8] === 0x89 &&
         buf.slice(9).every(b => b === 0x00);
});

test('writeBigUInt64LE - 非对齐 offset=1, 内存布局正确', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64LE(0xABCDEF0123456789n, 1);
  return buf[0] === 0x00 &&
         buf[1] === 0x89 && buf[2] === 0x67 && buf[3] === 0x45 &&
         buf[4] === 0x23 && buf[5] === 0x01 && buf[6] === 0xEF &&
         buf[7] === 0xCD && buf[8] === 0xAB &&
         buf.slice(9).every(b => b === 0x00);
});

test('writeBigUInt64BE - 非对齐 offset=3, 内存布局正确', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64BE(0xABCDEF0123456789n, 3);
  return buf.slice(0, 3).every(b => b === 0x00) &&
         buf[3] === 0xAB && buf[4] === 0xCD && buf[5] === 0xEF &&
         buf[6] === 0x01 && buf[7] === 0x23 && buf[8] === 0x45 &&
         buf[9] === 0x67 && buf[10] === 0x89 &&
         buf.slice(11).every(b => b === 0x00);
});

test('writeBigUInt64LE - 非对齐 offset=3, 内存布局正确', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64LE(0xABCDEF0123456789n, 3);
  return buf.slice(0, 3).every(b => b === 0x00) &&
         buf[3] === 0x89 && buf[4] === 0x67 && buf[5] === 0x45 &&
         buf[6] === 0x23 && buf[7] === 0x01 && buf[8] === 0xEF &&
         buf[9] === 0xCD && buf[10] === 0xAB &&
         buf.slice(11).every(b => b === 0x00);
});

// ===== 高位字节优先级验证 =====

test('writeBigUInt64BE - 高位字节在低地址（最高字节在 buf[0]）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x8000000000000001n, 0);
  // BE: 高位字节 0x80 在 buf[0], 低位字节 0x01 在 buf[7]
  return buf[0] === 0x80 && buf[7] === 0x01;
});

test('writeBigUInt64LE - 低位字节在低地址（最低字节在 buf[0]）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x8000000000000001n, 0);
  // LE: 低位字节 0x01 在 buf[0], 高位字节 0x80 在 buf[7]
  return buf[0] === 0x01 && buf[7] === 0x80;
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
