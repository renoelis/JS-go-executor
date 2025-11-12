// buf.writeDoubleBE/LE - Round 7-2: Offset and Cross-Endian Tests
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

// offset undefined vs 省略参数
test('writeDoubleBE offset为undefined等同于0', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeDoubleBE(1.23, undefined);
  buf2.writeDoubleBE(1.23);

  for (let i = 0; i < 8; i++) {
    if (buf1[i] !== buf2[i]) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE offset为undefined等同于0', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeDoubleLE(1.23, undefined);
  buf2.writeDoubleLE(1.23);

  for (let i = 0; i < 8; i++) {
    if (buf1[i] !== buf2[i]) {
      return false;
    }
  }
  return true;
});

// 非对齐 offset 与特殊值组合
test('writeDoubleBE offset=1 写入Infinity', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(Infinity, 1);
  return buf.readDoubleBE(1) === Infinity;
});

test('writeDoubleLE offset=1 写入Infinity', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(Infinity, 1);
  return buf.readDoubleLE(1) === Infinity;
});

test('writeDoubleBE offset=3 写入-Infinity', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(-Infinity, 3);
  return buf.readDoubleBE(3) === -Infinity;
});

test('writeDoubleLE offset=3 写入-Infinity', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(-Infinity, 3);
  return buf.readDoubleLE(3) === -Infinity;
});

test('writeDoubleBE offset=5 写入NaN', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(NaN, 5);
  return Number.isNaN(buf.readDoubleBE(5));
});

test('writeDoubleLE offset=5 写入NaN', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(NaN, 5);
  return Number.isNaN(buf.readDoubleLE(5));
});

test('writeDoubleBE offset=7 写入MAX_VALUE', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(Number.MAX_VALUE, 7);
  return buf.readDoubleBE(7) === Number.MAX_VALUE;
});

test('writeDoubleLE offset=7 写入MIN_VALUE', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(Number.MIN_VALUE, 7);
  return buf.readDoubleLE(7) === Number.MIN_VALUE;
});

// 跨字节序读写错误检测
test('BE写LE读值不同', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456);

  const wrongRead = buf.readDoubleLE();
  return wrongRead !== 123.456;
});

test('LE写BE读值不同', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(123.456);

  const wrongRead = buf.readDoubleBE();
  return wrongRead !== 123.456;
});

test('相邻BE和LE互不干扰', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(111.111, 0);
  buf.writeDoubleLE(222.222, 8);

  const bVal = buf.readDoubleBE(0);
  const lVal = buf.readDoubleLE(8);

  return Math.abs(bVal - 111.111) < 0.001 &&
         Math.abs(lVal - 222.222) < 0.001;
});

test('交错BE和LE写入', () => {
  const buf = Buffer.alloc(32);

  buf.writeDoubleBE(1.1, 0);
  buf.writeDoubleLE(2.2, 8);
  buf.writeDoubleBE(3.3, 16);
  buf.writeDoubleLE(4.4, 24);

  const v1 = buf.readDoubleBE(0);
  const v2 = buf.readDoubleLE(8);
  const v3 = buf.readDoubleBE(16);
  const v4 = buf.readDoubleLE(24);

  return Math.abs(v1 - 1.1) < 0.001 &&
         Math.abs(v2 - 2.2) < 0.001 &&
         Math.abs(v3 - 3.3) < 0.001 &&
         Math.abs(v4 - 4.4) < 0.001;
});

// 同一位置多次用不同字节序写入
test('同一位置先BE后LE', () => {
  const buf = Buffer.alloc(8);

  buf.writeDoubleBE(100.1);
  buf.writeDoubleLE(200.2);

  const val = buf.readDoubleLE();
  return Math.abs(val - 200.2) < 0.001;
});

test('同一位置先LE后BE', () => {
  const buf = Buffer.alloc(8);

  buf.writeDoubleLE(100.1);
  buf.writeDoubleBE(200.2);

  const val = buf.readDoubleBE();
  return Math.abs(val - 200.2) < 0.001;
});

test('同一位置BE-LE-BE循环', () => {
  const buf = Buffer.alloc(8);

  buf.writeDoubleBE(1.1);
  buf.writeDoubleLE(2.2);
  buf.writeDoubleBE(3.3);

  const val = buf.readDoubleBE();
  return Math.abs(val - 3.3) < 0.001;
});

test('同一位置LE-BE-LE循环', () => {
  const buf = Buffer.alloc(8);

  buf.writeDoubleLE(1.1);
  buf.writeDoubleBE(2.2);
  buf.writeDoubleLE(3.3);

  const val = buf.readDoubleLE();
  return Math.abs(val - 3.3) < 0.001;
});

// 返回值在不同场景的一致性
test('writeDoubleBE 返回值总是offset+8', () => {
  const buf = Buffer.alloc(32);
  const offsets = [0, 1, 4, 7, 12, 24];

  for (const offset of offsets) {
    const result = buf.writeDoubleBE(1.0, offset);
    if (result !== offset + 8) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE 返回值总是offset+8', () => {
  const buf = Buffer.alloc(32);
  const offsets = [0, 1, 4, 7, 12, 24];

  for (const offset of offsets) {
    const result = buf.writeDoubleLE(1.0, offset);
    if (result !== offset + 8) {
      return false;
    }
  }
  return true;
});

// 返回值可链式使用
test('writeDoubleBE 返回值链式写入', () => {
  const buf = Buffer.alloc(24);

  let offset = 0;
  offset = buf.writeDoubleBE(1.1, offset);
  offset = buf.writeDoubleBE(2.2, offset);
  offset = buf.writeDoubleBE(3.3, offset);

  return offset === 24 &&
         Math.abs(buf.readDoubleBE(0) - 1.1) < 0.001 &&
         Math.abs(buf.readDoubleBE(8) - 2.2) < 0.001 &&
         Math.abs(buf.readDoubleBE(16) - 3.3) < 0.001;
});

test('writeDoubleLE 返回值链式写入', () => {
  const buf = Buffer.alloc(24);

  let offset = 0;
  offset = buf.writeDoubleLE(1.1, offset);
  offset = buf.writeDoubleLE(2.2, offset);
  offset = buf.writeDoubleLE(3.3, offset);

  return offset === 24 &&
         Math.abs(buf.readDoubleLE(0) - 1.1) < 0.001 &&
         Math.abs(buf.readDoubleLE(8) - 2.2) < 0.001 &&
         Math.abs(buf.readDoubleLE(16) - 3.3) < 0.001;
});

// 混合字节序链式写入
test('混合BE和LE链式写入', () => {
  const buf = Buffer.alloc(32);

  let offset = 0;
  offset = buf.writeDoubleBE(1.1, offset);
  offset = buf.writeDoubleLE(2.2, offset);
  offset = buf.writeDoubleBE(3.3, offset);
  offset = buf.writeDoubleLE(4.4, offset);

  return offset === 32 &&
         Math.abs(buf.readDoubleBE(0) - 1.1) < 0.001 &&
         Math.abs(buf.readDoubleLE(8) - 2.2) < 0.001 &&
         Math.abs(buf.readDoubleBE(16) - 3.3) < 0.001 &&
         Math.abs(buf.readDoubleLE(24) - 4.4) < 0.001;
});

// 非对齐 offset 的所有奇数位置
test('writeDoubleBE 所有奇数offset', () => {
  const buf = Buffer.alloc(24);

  for (let i = 1; i < 16; i += 2) {
    try {
      buf.writeDoubleBE(i, i);
    } catch (e) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE 所有奇数offset', () => {
  const buf = Buffer.alloc(24);

  for (let i = 1; i < 16; i += 2) {
    try {
      buf.writeDoubleLE(i, i);
    } catch (e) {
      return false;
    }
  }
  return true;
});

// offset 在边界值的精确测试
test('writeDoubleBE 各种buffer大小的最大offset', () => {
  for (let size = 8; size <= 20; size++) {
    const buf = Buffer.alloc(size);
    const maxOffset = size - 8;

    try {
      buf.writeDoubleBE(1.0, maxOffset);
    } catch (e) {
      return false;
    }

    // 超过最大 offset 应该失败
    try {
      buf.writeDoubleBE(1.0, maxOffset + 1);
      return false;
    } catch (e) {
      // 预期失败
    }
  }
  return true;
});

test('writeDoubleLE 各种buffer大小的最大offset', () => {
  for (let size = 8; size <= 20; size++) {
    const buf = Buffer.alloc(size);
    const maxOffset = size - 8;

    try {
      buf.writeDoubleLE(1.0, maxOffset);
    } catch (e) {
      return false;
    }

    try {
      buf.writeDoubleLE(1.0, maxOffset + 1);
      return false;
    } catch (e) {
      // 预期失败
    }
  }
  return true;
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
