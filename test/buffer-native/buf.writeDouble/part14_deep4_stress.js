// buf.writeDoubleBE/LE - Deep Round 6-4: Performance and Stress Tests
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

// 大量连续写入
test('writeDoubleBE 连续写入 1000 个值', () => {
  const buf = Buffer.alloc(8000);

  for (let i = 0; i < 1000; i++) {
    buf.writeDoubleBE(i + 0.5, i * 8);
  }

  // 抽样验证
  const v0 = buf.readDoubleBE(0);
  const v500 = buf.readDoubleBE(500 * 8);
  const v999 = buf.readDoubleBE(999 * 8);

  return Math.abs(v0 - 0.5) < 0.0001 &&
         Math.abs(v500 - 500.5) < 0.0001 &&
         Math.abs(v999 - 999.5) < 0.0001;
});

test('writeDoubleLE 连续写入 1000 个值', () => {
  const buf = Buffer.alloc(8000);

  for (let i = 0; i < 1000; i++) {
    buf.writeDoubleLE(i + 0.5, i * 8);
  }

  const v0 = buf.readDoubleLE(0);
  const v500 = buf.readDoubleLE(500 * 8);
  const v999 = buf.readDoubleLE(999 * 8);

  return Math.abs(v0 - 0.5) < 0.0001 &&
         Math.abs(v500 - 500.5) < 0.0001 &&
         Math.abs(v999 - 999.5) < 0.0001;
});

// 大 Buffer
test('writeDoubleBE 在 100KB buffer', () => {
  const buf = Buffer.alloc(100 * 1024);
  const offset = 50 * 1024;

  buf.writeDoubleBE(12345.6789, offset);
  const readBack = buf.readDoubleBE(offset);

  return Math.abs(readBack - 12345.6789) < 0.0001;
});

test('writeDoubleLE 在 100KB buffer', () => {
  const buf = Buffer.alloc(100 * 1024);
  const offset = 50 * 1024;

  buf.writeDoubleLE(12345.6789, offset);
  const readBack = buf.readDoubleLE(offset);

  return Math.abs(readBack - 12345.6789) < 0.0001;
});

test('writeDoubleBE 在 1MB buffer 末尾', () => {
  const buf = Buffer.alloc(1024 * 1024);
  const offset = buf.length - 8;

  buf.writeDoubleBE(99999.99999, offset);
  const readBack = buf.readDoubleBE(offset);

  return Math.abs(readBack - 99999.99999) < 0.0001;
});

test('writeDoubleLE 在 1MB buffer 末尾', () => {
  const buf = Buffer.alloc(1024 * 1024);
  const offset = buf.length - 8;

  buf.writeDoubleLE(99999.99999, offset);
  const readBack = buf.readDoubleLE(offset);

  return Math.abs(readBack - 99999.99999) < 0.0001;
});

// 随机 offset 写入
test('writeDoubleBE 100 个随机 offset 写入', () => {
  const buf = Buffer.alloc(1000);
  const offsets = [];

  // 生成 100 个不重叠的随机 offset
  for (let i = 0; i < 100; i++) {
    offsets.push(i * 10); // 间隔 10 字节确保不重叠
  }

  // 乱序写入
  for (let i = 0; i < 100; i++) {
    const idx = Math.floor(Math.random() * 100);
    const offset = offsets[idx];
    buf.writeDoubleBE(idx + 0.123, offset);
  }

  return true; // 只要不崩溃就算通过
});

test('writeDoubleLE 100 个随机 offset 写入', () => {
  const buf = Buffer.alloc(1000);
  const offsets = [];

  for (let i = 0; i < 100; i++) {
    offsets.push(i * 10);
  }

  for (let i = 0; i < 100; i++) {
    const idx = Math.floor(Math.random() * 100);
    const offset = offsets[idx];
    buf.writeDoubleLE(idx + 0.123, offset);
  }

  return true;
});

// 所有特殊值批量写入
test('writeDoubleBE 批量写入所有特殊值', () => {
  const buf = Buffer.alloc(200);
  const specials = [
    0, -0, 1, -1,
    Infinity, -Infinity, NaN,
    Number.MAX_VALUE, Number.MIN_VALUE,
    Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER,
    Math.PI, Math.E,
    0.1, 0.2, 0.3,
    1e100, 1e-100,
    2.2250738585072014e-308 // 最小正规数
  ];

  for (let i = 0; i < specials.length; i++) {
    buf.writeDoubleBE(specials[i], i * 8);
  }

  // 验证几个关键值
  const inf = buf.readDoubleBE(4 * 8);
  const ninf = buf.readDoubleBE(5 * 8);
  const nan = buf.readDoubleBE(6 * 8);

  return inf === Infinity &&
         ninf === -Infinity &&
         Number.isNaN(nan);
});

test('writeDoubleLE 批量写入所有特殊值', () => {
  const buf = Buffer.alloc(200);
  const specials = [
    0, -0, 1, -1,
    Infinity, -Infinity, NaN,
    Number.MAX_VALUE, Number.MIN_VALUE,
    Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER,
    Math.PI, Math.E,
    0.1, 0.2, 0.3,
    1e100, 1e-100,
    2.2250738585072014e-308
  ];

  for (let i = 0; i < specials.length; i++) {
    buf.writeDoubleLE(specials[i], i * 8);
  }

  const inf = buf.readDoubleLE(4 * 8);
  const ninf = buf.readDoubleLE(5 * 8);
  const nan = buf.readDoubleLE(6 * 8);

  return inf === Infinity &&
         ninf === -Infinity &&
         Number.isNaN(nan);
});

// 递增递减序列
test('writeDoubleBE 递增序列', () => {
  const buf = Buffer.alloc(800);

  for (let i = 0; i < 100; i++) {
    buf.writeDoubleBE(i, i * 8);
  }

  // 验证递增
  for (let i = 0; i < 100; i++) {
    const val = buf.readDoubleBE(i * 8);
    if (val !== i) {
      return false;
    }
  }

  return true;
});

test('writeDoubleLE 递减序列', () => {
  const buf = Buffer.alloc(800);

  for (let i = 0; i < 100; i++) {
    buf.writeDoubleLE(100 - i, i * 8);
  }

  // 验证递减
  for (let i = 0; i < 100; i++) {
    const val = buf.readDoubleLE(i * 8);
    if (val !== 100 - i) {
      return false;
    }
  }

  return true;
});

// 正弦波数据
test('writeDoubleBE 正弦波数据', () => {
  const buf = Buffer.alloc(1000);
  const samples = 100;

  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    const value = Math.sin(angle);
    buf.writeDoubleBE(value, i * 8);
  }

  // 验证几个关键点
  const v0 = buf.readDoubleBE(0);
  const v25 = buf.readDoubleBE(25 * 8);
  const v50 = buf.readDoubleBE(50 * 8);

  return Math.abs(v0 - 0) < 0.0001 &&
         Math.abs(v25 - 1) < 0.0001 &&
         Math.abs(v50 - 0) < 0.0001;
});

test('writeDoubleLE 余弦波数据', () => {
  const buf = Buffer.alloc(1000);
  const samples = 100;

  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    const value = Math.cos(angle);
    buf.writeDoubleLE(value, i * 8);
  }

  const v0 = buf.readDoubleLE(0);
  const v50 = buf.readDoubleLE(50 * 8);

  return Math.abs(v0 - 1) < 0.0001 &&
         Math.abs(v50 - (-1)) < 0.0001;
});

// 斐波那契数列
test('writeDoubleBE 斐波那契数列', () => {
  const buf = Buffer.alloc(400);
  let a = 0, b = 1;

  buf.writeDoubleBE(a, 0);
  buf.writeDoubleBE(b, 8);

  for (let i = 2; i < 50; i++) {
    const c = a + b;
    buf.writeDoubleBE(c, i * 8);
    a = b;
    b = c;
  }

  // 验证前几项
  const f0 = buf.readDoubleBE(0);
  const f1 = buf.readDoubleBE(8);
  const f2 = buf.readDoubleBE(16);
  const f3 = buf.readDoubleBE(24);

  return f0 === 0 && f1 === 1 && f2 === 1 && f3 === 2;
});

test('writeDoubleLE 阶乘序列', () => {
  const buf = Buffer.alloc(200);
  let factorial = 1;

  buf.writeDoubleLE(factorial, 0);

  for (let i = 1; i < 20; i++) {
    factorial *= i;
    buf.writeDoubleLE(factorial, i * 8);
  }

  // 验证前几项
  const f0 = buf.readDoubleLE(0);
  const f1 = buf.readDoubleLE(8);
  const f2 = buf.readDoubleLE(16);
  const f3 = buf.readDoubleLE(24);

  return f0 === 1 && f1 === 1 && f2 === 2 && f3 === 6;
});

// 密集写入模式
test('writeDoubleBE 密集交错写入', () => {
  const buf = Buffer.alloc(80);

  // 第一遍：写入所有偶数位置
  for (let i = 0; i < 5; i++) {
    buf.writeDoubleBE(i * 2, i * 16);
  }

  // 第二遍：写入所有奇数位置
  for (let i = 0; i < 5; i++) {
    buf.writeDoubleBE(i * 2 + 1, i * 16 + 8);
  }

  // 验证交错模式
  const v0 = buf.readDoubleBE(0);
  const v1 = buf.readDoubleBE(8);
  const v2 = buf.readDoubleBE(16);
  const v3 = buf.readDoubleBE(24);

  return v0 === 0 && v1 === 1 && v2 === 2 && v3 === 3;
});

test('writeDoubleLE 密集交错写入', () => {
  const buf = Buffer.alloc(80);

  for (let i = 0; i < 5; i++) {
    buf.writeDoubleLE(i * 2, i * 16);
  }

  for (let i = 0; i < 5; i++) {
    buf.writeDoubleLE(i * 2 + 1, i * 16 + 8);
  }

  const v0 = buf.readDoubleLE(0);
  const v1 = buf.readDoubleLE(8);
  const v2 = buf.readDoubleLE(16);
  const v3 = buf.readDoubleLE(24);

  return v0 === 0 && v1 === 1 && v2 === 2 && v3 === 3;
});

// 边界附近的密集操作
test('writeDoubleBE 末尾边界密集操作', () => {
  const buf = Buffer.alloc(32);

  // 在末尾附近反复写入
  for (let i = 0; i < 3; i++) {
    const offset = 24 - (i * 8);
    buf.writeDoubleBE((i + 1) * 11.11, offset);
  }

  const v0 = buf.readDoubleBE(24);
  const v1 = buf.readDoubleBE(16);
  const v2 = buf.readDoubleBE(8);

  return Math.abs(v0 - 11.11) < 0.01 &&
         Math.abs(v1 - 22.22) < 0.01 &&
         Math.abs(v2 - 33.33) < 0.01;
});

// 混合正负极值
test('writeDoubleBE 混合极大极小值', () => {
  const buf = Buffer.alloc(64);
  const extremes = [
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    Number.MIN_VALUE,
    -Number.MIN_VALUE,
    1e308,
    -1e308,
    1e-308,
    -1e-308
  ];

  for (let i = 0; i < extremes.length; i++) {
    buf.writeDoubleBE(extremes[i], i * 8);
  }

  // 验证几个
  const max = buf.readDoubleBE(0);
  const nmax = buf.readDoubleBE(8);
  const min = buf.readDoubleBE(16);

  return max === Number.MAX_VALUE &&
         nmax === -Number.MAX_VALUE &&
         min === Number.MIN_VALUE;
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
