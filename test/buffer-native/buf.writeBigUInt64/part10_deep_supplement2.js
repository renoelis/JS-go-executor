// buf.writeBigUInt64BE/LE - 深度补充轮2：参数组合穷举与极端压测
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

// ===== 所有 2 的幂次完整覆盖 =====

const powers = [
  { n: 0, val: 1n },
  { n: 1, val: 2n },
  { n: 2, val: 4n },
  { n: 3, val: 8n },
  { n: 4, val: 16n },
  { n: 5, val: 32n },
  { n: 6, val: 64n },
  { n: 7, val: 128n },
  { n: 8, val: 256n },
  { n: 9, val: 512n },
  { n: 10, val: 1024n },
  { n: 11, val: 2048n },
  { n: 12, val: 4096n },
  { n: 15, val: 32768n },
  { n: 20, val: 1048576n },
  { n: 30, val: 1073741824n },
  { n: 40, val: 1099511627776n },
  { n: 50, val: 1125899906842624n },
  { n: 60, val: 1152921504606846976n },
  { n: 63, val: 9223372036854775808n },
];

powers.forEach(p => {
  test(`writeBigUInt64BE - 写入 2^${p.n} (${p.val}n)`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(p.val, 0);
    const readBack = buf.readBigUInt64BE(0);
    return readBack === p.val;
  });

  test(`writeBigUInt64LE - 写入 2^${p.n} (${p.val}n)`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(p.val, 0);
    const readBack = buf.readBigUInt64LE(0);
    return readBack === p.val;
  });
});

// ===== 所有 offset 可能的边界组合 =====

const offsetTests = [
  { bufSize: 8, offsets: [0] },
  { bufSize: 9, offsets: [0, 1] },
  { bufSize: 10, offsets: [0, 1, 2] },
  { bufSize: 16, offsets: [0, 4, 7, 8] },
  { bufSize: 32, offsets: [0, 8, 16, 23, 24] },
];

offsetTests.forEach(t => {
  t.offsets.forEach(off => {
    test(`writeBigUInt64BE - bufSize=${t.bufSize}, offset=${off}`, () => {
      const buf = Buffer.alloc(t.bufSize);
      const result = buf.writeBigUInt64BE(0xABCDEF0123456789n, off);
      return result === off + 8;
    });

    test(`writeBigUInt64LE - bufSize=${t.bufSize}, offset=${off}`, () => {
      const buf = Buffer.alloc(t.bufSize);
      const result = buf.writeBigUInt64LE(0xABCDEF0123456789n, off);
      return result === off + 8;
    });
  });
});

// ===== 每个字节独立为最大值的组合 =====

const byteMaxTests = [
  { name: "第1字节最大", val: 0xFF00000000000000n },
  { name: "第2字节最大", val: 0x00FF000000000000n },
  { name: "第3字节最大", val: 0x0000FF0000000000n },
  { name: "第4字节最大", val: 0x000000FF00000000n },
  { name: "第5字节最大", val: 0x00000000FF000000n },
  { name: "第6字节最大", val: 0x0000000000FF0000n },
  { name: "第7字节最大", val: 0x000000000000FF00n },
  { name: "第8字节最大", val: 0x00000000000000FFn },
];

byteMaxTests.forEach(t => {
  test(`writeBigUInt64BE - ${t.name}`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(t.val, 0);
    const readBack = buf.readBigUInt64BE(0);
    return readBack === t.val;
  });

  test(`writeBigUInt64LE - ${t.name}`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(t.val, 0);
    const readBack = buf.readBigUInt64LE(0);
    return readBack === t.val;
  });
});

// ===== 交替位模式完整测试 =====

const bitPatterns = [
  { name: "全0", val: 0x0000000000000000n },
  { name: "全1", val: 0xFFFFFFFFFFFFFFFFn },
  { name: "交替10", val: 0xAAAAAAAAAAAAAAAAn },
  { name: "交替01", val: 0x5555555555555555n },
  { name: "前32位1", val: 0xFFFFFFFF00000000n },
  { name: "后32位1", val: 0x00000000FFFFFFFFn },
  { name: "奇数位1", val: 0xAAAAAAAAAAAAAAAAn },
  { name: "偶数位1", val: 0x5555555555555555n },
];

bitPatterns.forEach(t => {
  test(`writeBigUInt64BE - 位模式：${t.name}`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(t.val, 0);
    const readBack = buf.readBigUInt64BE(0);
    return readBack === t.val;
  });

  test(`writeBigUInt64LE - 位模式：${t.name}`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(t.val, 0);
    const readBack = buf.readBigUInt64LE(0);
    return readBack === t.val;
  });
});

// ===== 连续写入不相邻位置 =====

test('writeBigUInt64BE - 连续写入 offset=0,16,32', () => {
  const buf = Buffer.alloc(40);
  buf.writeBigUInt64BE(0x1111111111111111n, 0);
  buf.writeBigUInt64BE(0x2222222222222222n, 16);
  buf.writeBigUInt64BE(0x3333333333333333n, 32);
  return buf[0] === 0x11 && buf[16] === 0x22 && buf[32] === 0x33;
});

test('writeBigUInt64LE - 连续写入 offset=0,16,32', () => {
  const buf = Buffer.alloc(40);
  buf.writeBigUInt64LE(0x1111111111111111n, 0);
  buf.writeBigUInt64LE(0x2222222222222222n, 16);
  buf.writeBigUInt64LE(0x3333333333333333n, 32);
  return buf[0] === 0x11 && buf[16] === 0x22 && buf[32] === 0x33;
});

// ===== 相邻但不重叠的连续写入 =====

test('writeBigUInt64BE - 紧邻写入 offset=0,8,16', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64BE(0xAAAAAAAAAAAAAAAAn, 0);
  buf.writeBigUInt64BE(0xBBBBBBBBBBBBBBBBn, 8);
  buf.writeBigUInt64BE(0xCCCCCCCCCCCCCCCCn, 16);
  return buf[7] === 0xAA && buf[8] === 0xBB && buf[15] === 0xBB && buf[16] === 0xCC;
});

test('writeBigUInt64LE - 紧邻写入 offset=0,8,16', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64LE(0xAAAAAAAAAAAAAAAAn, 0);
  buf.writeBigUInt64LE(0xBBBBBBBBBBBBBBBBn, 8);
  buf.writeBigUInt64LE(0xCCCCCCCCCCCCCCCCn, 16);
  return buf[0] === 0xAA && buf[7] === 0xAA && buf[8] === 0xBB && buf[16] === 0xCC;
});

// ===== 大量连续小值写入 =====

test('writeBigUInt64BE - 写入100个连续小值', () => {
  const buf = Buffer.alloc(800);
  for (let i = 0; i < 100; i++) {
    buf.writeBigUInt64BE(BigInt(i), i * 8);
  }
  return buf.readBigUInt64BE(0) === 0n &&
         buf.readBigUInt64BE(8) === 1n &&
         buf.readBigUInt64BE(792) === 99n;
});

test('writeBigUInt64LE - 写入100个连续小值', () => {
  const buf = Buffer.alloc(800);
  for (let i = 0; i < 100; i++) {
    buf.writeBigUInt64LE(BigInt(i), i * 8);
  }
  return buf.readBigUInt64LE(0) === 0n &&
         buf.readBigUInt64LE(8) === 1n &&
         buf.readBigUInt64LE(792) === 99n;
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
