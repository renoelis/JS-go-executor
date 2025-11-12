// buf.writeBigUInt64BE/LE - 超深度补充轮3：异常恢复与极限压测
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

// ===== 异常后 buffer 状态保持不变 =====

test('writeBigUInt64BE - offset 越界后 buffer 未被修改', () => {
  const buf = Buffer.alloc(8, 0xAA);
  const original = buf.toString('hex');
  try {
    buf.writeBigUInt64BE(0x1234567890ABCDEFn, 10);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

test('writeBigUInt64LE - offset 越界后 buffer 未被修改', () => {
  const buf = Buffer.alloc(8, 0xAA);
  const original = buf.toString('hex');
  try {
    buf.writeBigUInt64LE(0x1234567890ABCDEFn, 10);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

test('writeBigUInt64BE - value 类型错误后 buffer 未被修改', () => {
  const buf = Buffer.alloc(8, 0xBB);
  const original = buf.toString('hex');
  try {
    buf.writeBigUInt64BE(123, 0);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

test('writeBigUInt64LE - value 类型错误后 buffer 未被修改', () => {
  const buf = Buffer.alloc(8, 0xBB);
  const original = buf.toString('hex');
  try {
    buf.writeBigUInt64LE(123, 0);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

test('writeBigUInt64BE - value 超出范围后 buffer 未被修改', () => {
  const buf = Buffer.alloc(8, 0xCC);
  const original = buf.toString('hex');
  try {
    buf.writeBigUInt64BE(18446744073709551616n, 0);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

test('writeBigUInt64LE - value 超出范围后 buffer 未被修改', () => {
  const buf = Buffer.alloc(8, 0xCC);
  const original = buf.toString('hex');
  try {
    buf.writeBigUInt64LE(18446744073709551616n, 0);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

// ===== 连续失败不影响后续成功 =====

test('writeBigUInt64BE - 连续失败后仍可成功写入', () => {
  const buf = Buffer.alloc(16);
  try { buf.writeBigUInt64BE(123, 0); } catch (e) {}
  try { buf.writeBigUInt64BE(-1n, 0); } catch (e) {}
  try { buf.writeBigUInt64BE(0n, 20); } catch (e) {}

  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 0);
  const readBack = buf.readBigUInt64BE(0);
  return readBack === 0x1234567890ABCDEFn;
});

test('writeBigUInt64LE - 连续失败后仍可成功写入', () => {
  const buf = Buffer.alloc(16);
  try { buf.writeBigUInt64LE(123, 0); } catch (e) {}
  try { buf.writeBigUInt64LE(-1n, 0); } catch (e) {}
  try { buf.writeBigUInt64LE(0n, 20); } catch (e) {}

  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 0);
  const readBack = buf.readBigUInt64LE(0);
  return readBack === 0x1234567890ABCDEFn;
});

// ===== 极限压测：大量连续写入 =====

test('writeBigUInt64BE - 压测：1000 个连续写入', () => {
  const buf = Buffer.alloc(8000);
  for (let i = 0; i < 1000; i++) {
    buf.writeBigUInt64BE(BigInt(i), i * 8);
  }
  return buf.readBigUInt64BE(0) === 0n &&
         buf.readBigUInt64BE(8) === 1n &&
         buf.readBigUInt64BE(7992) === 999n;
});

test('writeBigUInt64LE - 压测：1000 个连续写入', () => {
  const buf = Buffer.alloc(8000);
  for (let i = 0; i < 1000; i++) {
    buf.writeBigUInt64LE(BigInt(i), i * 8);
  }
  return buf.readBigUInt64LE(0) === 0n &&
         buf.readBigUInt64LE(8) === 1n &&
         buf.readBigUInt64LE(7992) === 999n;
});

// ===== 极限压测：随机位置写入 =====

test('writeBigUInt64BE - 压测：随机位置写入100次', () => {
  const buf = Buffer.alloc(10000);
  const positions = [];
  const usedOffsets = new Set();

  for (let i = 0; i < 100; i++) {
    let offset;
    // 确保 offset 不重叠（每个写入占8字节）
    do {
      offset = Math.floor(Math.random() * (10000 - 8));
      offset = Math.floor(offset / 8) * 8; // 对齐到8字节边界
    } while (usedOffsets.has(offset));

    usedOffsets.add(offset);
    positions.push({ offset, val: BigInt(i) });
    buf.writeBigUInt64BE(BigInt(i), offset);
  }

  for (const p of positions) {
    if (buf.readBigUInt64BE(p.offset) !== p.val) {
      return false;
    }
  }
  return true;
});

test('writeBigUInt64LE - 压测：随机位置写入100次', () => {
  const buf = Buffer.alloc(10000);
  const positions = [];
  const usedOffsets = new Set();

  for (let i = 0; i < 100; i++) {
    let offset;
    // 确保 offset 不重叠（每个写入占8字节）
    do {
      offset = Math.floor(Math.random() * (10000 - 8));
      offset = Math.floor(offset / 8) * 8; // 对齐到8字节边界
    } while (usedOffsets.has(offset));

    usedOffsets.add(offset);
    positions.push({ offset, val: BigInt(i) });
    buf.writeBigUInt64LE(BigInt(i), offset);
  }

  for (const p of positions) {
    if (buf.readBigUInt64LE(p.offset) !== p.val) {
      return false;
    }
  }
  return true;
});

// ===== 极限值边界完整覆盖 =====

const extremeValues = [
  { name: "0n", val: 0n },
  { name: "1n", val: 1n },
  { name: "2^32-1", val: 4294967295n },
  { name: "2^32", val: 4294967296n },
  { name: "2^32+1", val: 4294967297n },
  { name: "2^48-1", val: 281474976710655n },
  { name: "2^48", val: 281474976710656n },
  { name: "2^48+1", val: 281474976710657n },
  { name: "2^63-1", val: 9223372036854775807n },
  { name: "2^63", val: 9223372036854775808n },
  { name: "2^63+1", val: 9223372036854775809n },
  { name: "2^64-2", val: 18446744073709551614n },
  { name: "2^64-1", val: 18446744073709551615n },
];

extremeValues.forEach(t => {
  test(`writeBigUInt64BE - 极限值 ${t.name}`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(t.val, 0);
    const readBack = buf.readBigUInt64BE(0);
    return readBack === t.val;
  });

  test(`writeBigUInt64LE - 极限值 ${t.name}`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(t.val, 0);
    const readBack = buf.readBigUInt64LE(0);
    return readBack === t.val;
  });
});

// ===== BE 和 LE 交叉往返验证 =====

test('writeBigUInt64BE/LE - 交叉往返：BE写入LE读取应不同', () => {
  const buf = Buffer.alloc(8);
  const val = 0x1234567890ABCDEFn;
  buf.writeBigUInt64BE(val, 0);
  const readLE = buf.readBigUInt64LE(0);
  return readLE !== val && readLE === 0xEFCDAB9078563412n;
});

test('writeBigUInt64LE/BE - 交叉往返：LE写入BE读取应不同', () => {
  const buf = Buffer.alloc(8);
  const val = 0x1234567890ABCDEFn;
  buf.writeBigUInt64LE(val, 0);
  const readBE = buf.readBigUInt64BE(0);
  return readBE !== val && readBE === 0xEFCDAB9078563412n;
});

// ===== 多次覆盖写入 =====

test('writeBigUInt64BE - 多次覆盖写入（10次）', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 10; i++) {
    buf.writeBigUInt64BE(BigInt(i), 0);
  }
  const final = buf.readBigUInt64BE(0);
  return final === 9n;
});

test('writeBigUInt64LE - 多次覆盖写入（10次）', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 10; i++) {
    buf.writeBigUInt64LE(BigInt(i), 0);
  }
  const final = buf.readBigUInt64LE(0);
  return final === 9n;
});

// ===== 空间紧凑性验证 =====

test('writeBigUInt64BE - 最小空间8字节的完整利用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 0);
  return buf.every(b => b === 0xFF);
});

test('writeBigUInt64LE - 最小空间8字节的完整利用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xFFFFFFFFFFFFFFFFn, 0);
  return buf.every(b => b === 0xFF);
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
