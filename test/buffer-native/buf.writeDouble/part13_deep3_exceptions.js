// buf.writeDoubleBE/LE - Deep Round 6-3: Exception Paths and Edge Cases
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

// Buffer 长度边界精确测试
test('writeDoubleBE 在 8 字节 buffer offset=0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1.23, 0);
  return buf.readDoubleBE(0) > 0;
});

test('writeDoubleBE 在 9 字节 buffer offset=1', () => {
  const buf = Buffer.alloc(9);
  buf.writeDoubleBE(1.23, 1);
  return buf.readDoubleBE(1) > 0;
});

test('writeDoubleBE 在 9 字节 buffer offset=2 失败', () => {
  const buf = Buffer.alloc(9);
  try {
    buf.writeDoubleBE(1.23, 2);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('outside buffer');
  }
});

test('writeDoubleLE 在 10 字节 buffer offset=2', () => {
  const buf = Buffer.alloc(10);
  buf.writeDoubleLE(4.56, 2);
  return buf.readDoubleLE(2) > 0;
});

test('writeDoubleLE 在 10 字节 buffer offset=3 失败', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeDoubleLE(4.56, 3);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('outside buffer');
  }
});

// 连续边界测试（刚好可以 vs 刚好不行）
test('writeDoubleBE 15 字节 buffer offset=7 成功', () => {
  const buf = Buffer.alloc(15);
  buf.writeDoubleBE(1.0, 7);
  return buf.readDoubleBE(7) === 1.0;
});

test('writeDoubleBE 15 字节 buffer offset=8 失败', () => {
  const buf = Buffer.alloc(15);
  try {
    buf.writeDoubleBE(1.0, 8);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('outside buffer');
  }
});

test('writeDoubleLE 14 字节 buffer offset=6 成功', () => {
  const buf = Buffer.alloc(14);
  buf.writeDoubleLE(2.0, 6);
  return buf.readDoubleLE(6) === 2.0;
});

test('writeDoubleLE 14 字节 buffer offset=7 失败', () => {
  const buf = Buffer.alloc(14);
  try {
    buf.writeDoubleLE(2.0, 7);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('outside buffer');
  }
});

// 所有可能的 offset 在 16 字节 buffer
test('writeDoubleBE 16 字节 buffer 所有合法 offset', () => {
  const buf = Buffer.alloc(16);
  const validOffsets = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  for (const offset of validOffsets) {
    try {
      buf.writeDoubleBE(offset + 0.5, offset);
    } catch (e) {
      return false;
    }
  }
  return true;
});

test('writeDoubleBE 16 字节 buffer offset=9 失败', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, 9);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('outside buffer');
  }
});

// 连续覆盖同一位置
test('writeDoubleBE 同位置连续覆盖 10 次', () => {
  const buf = Buffer.alloc(8);

  for (let i = 0; i < 10; i++) {
    buf.writeDoubleBE(i * 1.1);
  }

  const final = buf.readDoubleBE();
  return Math.abs(final - 9.9) < 0.0001;
});

test('writeDoubleLE 同位置连续覆盖 10 次', () => {
  const buf = Buffer.alloc(8);

  for (let i = 0; i < 10; i++) {
    buf.writeDoubleLE(i * 1.1);
  }

  const final = buf.readDoubleLE();
  return Math.abs(final - 9.9) < 0.0001;
});

// 部分重叠写入的具体场景
test('writeDoubleBE 重叠写入 offset 0 和 4', () => {
  const buf = Buffer.alloc(12);
  buf.fill(0);
  buf.writeDoubleBE(111.111, 0); // 写入字节 0-7
  buf.writeDoubleBE(222.222, 4); // 写入字节 4-11，覆盖 4-7

  // 字节 0-3 应该保留第一次写入的前 4 字节
  // 字节 4-11 应该是第二次写入的完整 8 字节
  const val2 = buf.readDoubleBE(4);
  return Math.abs(val2 - 222.222) < 0.0001;
});

test('writeDoubleLE 重叠写入 offset 0 和 4', () => {
  const buf = Buffer.alloc(12);
  buf.fill(0);
  buf.writeDoubleLE(111.111, 0);
  buf.writeDoubleLE(222.222, 4);

  const val2 = buf.readDoubleLE(4);
  return Math.abs(val2 - 222.222) < 0.0001;
});

test('writeDoubleBE 完全重叠写入 offset 2 和 2', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(100.1, 2);
  buf.writeDoubleBE(200.2, 2);

  const val = buf.readDoubleBE(2);
  return Math.abs(val - 200.2) < 0.0001;
});

test('writeDoubleLE 完全重叠写入 offset 5 和 5', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(100.1, 5);
  buf.writeDoubleLE(200.2, 5);

  const val = buf.readDoubleLE(5);
  return Math.abs(val - 200.2) < 0.0001;
});

// 不同 offset 写入不互相影响
test('writeDoubleBE 相邻但不重叠的写入', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleBE(1.1, 0);
  buf.writeDoubleBE(2.2, 8);
  buf.writeDoubleBE(3.3, 16);

  const v1 = buf.readDoubleBE(0);
  const v2 = buf.readDoubleBE(8);
  const v3 = buf.readDoubleBE(16);

  return Math.abs(v1 - 1.1) < 0.0001 &&
         Math.abs(v2 - 2.2) < 0.0001 &&
         Math.abs(v3 - 3.3) < 0.0001;
});

test('writeDoubleLE 相邻但不重叠的写入', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleLE(1.1, 0);
  buf.writeDoubleLE(2.2, 8);
  buf.writeDoubleLE(3.3, 16);

  const v1 = buf.readDoubleLE(0);
  const v2 = buf.readDoubleLE(8);
  const v3 = buf.readDoubleLE(16);

  return Math.abs(v1 - 1.1) < 0.0001 &&
         Math.abs(v2 - 2.2) < 0.0001 &&
         Math.abs(v3 - 3.3) < 0.0001;
});

// 混合 BE 和 LE 在相邻位置
test('混合 BE 在 offset 0, LE 在 offset 8', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(12.34, 0);
  buf.writeDoubleLE(56.78, 8);

  const vBE = buf.readDoubleBE(0);
  const vLE = buf.readDoubleLE(8);

  return Math.abs(vBE - 12.34) < 0.0001 &&
         Math.abs(vLE - 56.78) < 0.0001;
});

test('混合 LE 在 offset 0, BE 在 offset 8', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(12.34, 0);
  buf.writeDoubleBE(56.78, 8);

  const vLE = buf.readDoubleLE(0);
  const vBE = buf.readDoubleBE(8);

  return Math.abs(vLE - 12.34) < 0.0001 &&
         Math.abs(vBE - 56.78) < 0.0001;
});

// 交错混合写入
test('交错混合 BE/LE 写入', () => {
  const buf = Buffer.alloc(32);

  for (let i = 0; i < 4; i++) {
    if (i % 2 === 0) {
      buf.writeDoubleBE((i + 1) * 10, i * 8);
    } else {
      buf.writeDoubleLE((i + 1) * 10, i * 8);
    }
  }

  const v0 = buf.readDoubleBE(0);
  const v1 = buf.readDoubleLE(8);
  const v2 = buf.readDoubleBE(16);
  const v3 = buf.readDoubleLE(24);

  return v0 === 10 && v1 === 20 && v2 === 30 && v3 === 40;
});

// 在填充后的 buffer 写入
test('writeDoubleBE 在 fill(0xff) 的 buffer', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0xff);
  buf.writeDoubleBE(99.99, 4);

  // 前 4 字节应该还是 0xff
  const unchanged = buf[0] === 0xff && buf[1] === 0xff &&
                    buf[2] === 0xff && buf[3] === 0xff;

  // 后 4 字节也应该还是 0xff
  const unchanged2 = buf[12] === 0xff && buf[13] === 0xff &&
                     buf[14] === 0xff && buf[15] === 0xff;

  const value = Math.abs(buf.readDoubleBE(4) - 99.99) < 0.0001;

  return unchanged && unchanged2 && value;
});

test('writeDoubleLE 在 fill(0xaa) 的 buffer', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0xaa);
  buf.writeDoubleLE(88.88, 4);

  const unchanged = buf[0] === 0xaa && buf[1] === 0xaa &&
                    buf[2] === 0xaa && buf[3] === 0xaa;

  const unchanged2 = buf[12] === 0xaa && buf[13] === 0xaa &&
                     buf[14] === 0xaa && buf[15] === 0xaa;

  const value = Math.abs(buf.readDoubleLE(4) - 88.88) < 0.0001;

  return unchanged && unchanged2 && value;
});

// 在不同模式间切换
test('同一位置先 BE 后 LE 再 BE', () => {
  const buf = Buffer.alloc(8);

  buf.writeDoubleBE(1.1);
  const r1 = buf.readDoubleBE();

  buf.writeDoubleLE(2.2);
  const r2 = buf.readDoubleLE();

  buf.writeDoubleBE(3.3);
  const r3 = buf.readDoubleBE();

  return Math.abs(r1 - 1.1) < 0.0001 &&
         Math.abs(r2 - 2.2) < 0.0001 &&
         Math.abs(r3 - 3.3) < 0.0001;
});

// 零长度后紧跟的写入
test('writeDoubleBE 在空 buffer 后的正常 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(8);

  try {
    buf1.writeDoubleBE(1.0);
  } catch (e) {
    // 预期失败
  }

  buf2.writeDoubleBE(2.0);
  return buf2.readDoubleBE() === 2.0;
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
