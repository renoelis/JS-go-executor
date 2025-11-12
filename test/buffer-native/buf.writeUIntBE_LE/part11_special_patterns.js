// buf.writeUIntBE/LE() - 性能与特殊场景测试
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

// 大批量连续写入性能
test('writeUIntBE 连续写入1000次', () => {
  const buf = Buffer.allocUnsafe(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUIntBE(i & 0xffff, i * 2, 2);
  }
  return buf[0] === 0x00 && buf[2] === 0x00 && buf[1998] === 0x03;
});

test('writeUIntLE 连续写入1000次', () => {
  const buf = Buffer.allocUnsafe(2000);
  for (let i = 0; i < 1000; i++) {
    buf.writeUIntLE(i & 0xffff, i * 2, 2);
  }
  return buf[0] === 0x00 && buf[2] === 0x01 && buf[1998] === 0xe7;
});

// 零值和最大值交替
test('writeUIntBE 零值和最大值交替写入', () => {
  const buf = Buffer.allocUnsafe(20);
  for (let i = 0; i < 10; i++) {
    buf.writeUIntBE(i % 2 === 0 ? 0 : 0xff, i, 1);
  }
  return buf[0] === 0 && buf[1] === 0xff && buf[2] === 0 && buf[3] === 0xff;
});

// 边界对称值
test('writeUIntBE 写入对称值', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(0x121212, 0, 3);
  return buf[0] === 0x12 && buf[1] === 0x12 && buf[2] === 0x12;
});

test('writeUIntLE 写入对称值', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntLE(0x121212, 0, 3);
  return buf[0] === 0x12 && buf[1] === 0x12 && buf[2] === 0x12;
});

// 质数值写入
test('writeUIntBE 写入质数序列', () => {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  const buf = Buffer.allocUnsafe(10);
  for (let i = 0; i < primes.length; i++) {
    buf.writeUIntBE(primes[i], i, 1);
  }
  return buf[0] === 2 && buf[4] === 11 && buf[9] === 29;
});

// 斐波那契数列写入
test('writeUIntBE 写入斐波那契数列', () => {
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  const buf = Buffer.allocUnsafe(10);
  for (let i = 0; i < fib.length; i++) {
    buf.writeUIntBE(fib[i], i, 1);
  }
  return buf[0] === 1 && buf[4] === 5 && buf[9] === 55;
});

// 2的幂次写入
test('writeUIntBE 写入2的幂次', () => {
  const buf = Buffer.allocUnsafe(8);
  for (let i = 0; i < 8; i++) {
    buf.writeUIntBE(Math.pow(2, i), i, 1);
  }
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 4 && buf[3] === 8;
});

// 带符号转无符号边界
test('writeUIntBE 正整数边界', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(127, 0, 1);
  buf.writeUIntBE(128, 1, 1);
  buf.writeUIntBE(255, 2, 1);
  return buf[0] === 127 && buf[1] === 128 && buf[2] === 255;
});

// ASCII值范围
test('writeUIntBE 写入ASCII可打印字符范围', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(32, 0, 1);  // space
  buf.writeUIntBE(65, 1, 1);  // A
  buf.writeUIntBE(90, 2, 1);  // Z
  buf.writeUIntBE(97, 3, 1);  // a
  buf.writeUIntBE(122, 4, 1); // z
  return buf[0] === 32 && buf[1] === 65 && buf[4] === 122;
});

// BCD (Binary Coded Decimal) 模式
test('writeUIntBE 写入BCD模式数据', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.writeUIntBE(0x12, 0, 1);
  buf.writeUIntBE(0x34, 1, 1);
  buf.writeUIntBE(0x56, 2, 1);
  buf.writeUIntBE(0x78, 3, 1);
  buf.writeUIntBE(0x90, 4, 1);
  return buf[0] === 0x12 && buf[2] === 0x56 && buf[4] === 0x90;
});

// 格雷码序列
test('writeUIntBE 写入格雷码序列', () => {
  const gray = [0, 1, 3, 2, 6, 7, 5, 4];
  const buf = Buffer.allocUnsafe(8);
  for (let i = 0; i < gray.length; i++) {
    buf.writeUIntBE(gray[i], i, 1);
  }
  return buf[0] === 0 && buf[2] === 3 && buf[4] === 6;
});

// 循环冗余检查模式
test('writeUIntBE 写入CRC风格数据', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUIntBE(0xdead, 0, 2);
  buf.writeUIntBE(0xbeef, 2, 2);
  buf.writeUIntBE(0xcafe, 4, 2);
  buf.writeUIntBE(0xbabe, 6, 2);
  return buf[0] === 0xde && buf[2] === 0xbe && buf[4] === 0xca && buf[6] === 0xba;
});

// 魔术数字（Magic Numbers）
test('writeUIntBE 写入常见文件魔术数字', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.writeUIntBE(0x89504e47, 0, 4);  // PNG
  buf.writeUIntBE(0xffd8ff, 4, 3);     // JPEG
  buf.writeUIntBE(0x474946, 7, 3);     // GIF
  return buf[0] === 0x89 && buf[4] === 0xff && buf[7] === 0x47;
});

// 网络字节序常见端口号
test('writeUIntBE 写入常见端口号（网络字节序）', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(80, 0, 2);    // HTTP
  buf.writeUIntBE(443, 2, 2);   // HTTPS
  buf.writeUIntBE(22, 4, 2);    // SSH
  buf.writeUIntBE(3306, 6, 2);  // MySQL
  return buf[0] === 0 && buf[1] === 80 && buf[2] === 0x01 && buf[3] === 0xbb;
});

// UUID风格数据
test('writeUIntBE 写入UUID风格分段数据', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeUIntBE(0x12345678, 0, 4);
  buf.writeUIntBE(0x1234, 4, 2);
  buf.writeUIntBE(0x5678, 6, 2);
  buf.writeUIntBE(0x9abc, 8, 2);
  buf.writeUIntBE(0xdef012345678, 10, 6);
  return buf[0] === 0x12 && buf[4] === 0x12 && buf[10] === 0xde;
});

// 时间戳风格（秒级）
test('writeUIntBE 写入32位时间戳', () => {
  const buf = Buffer.allocUnsafe(8);
  const timestamp = 1700000000; // 2023-11-14
  buf.writeUIntBE(timestamp, 0, 4);
  // 1700000000 = 0x6553F100
  return buf[0] === 0x65 && buf[1] === 0x53 && buf[2] === 0xf1 && buf[3] === 0x00;
});

// 颜色值（RGB）
test('writeUIntBE 写入RGB颜色值', () => {
  const buf = Buffer.allocUnsafe(9);
  buf.writeUIntBE(0xff0000, 0, 3);  // Red
  buf.writeUIntBE(0x00ff00, 3, 3);  // Green
  buf.writeUIntBE(0x0000ff, 6, 3);  // Blue
  return buf[0] === 0xff && buf[1] === 0 && buf[4] === 0xff && buf[8] === 0xff;
});

// 嵌套循环写入
test('writeUIntBE 嵌套循环矩阵式写入', () => {
  const buf = Buffer.allocUnsafe(100);
  let offset = 0;
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      buf.writeUIntBE((i * 10 + j) & 0xff, offset++, 1);
    }
  }
  return buf[0] === 0 && buf[11] === 11 && buf[99] === 99;
});

// 倒序写入
test('writeUIntBE 倒序位置写入', () => {
  const buf = Buffer.allocUnsafe(10);
  for (let i = 0; i < 10; i++) {
    buf.writeUIntBE(i, 9 - i, 1);
  }
  return buf[9] === 0 && buf[0] === 9 && buf[5] === 4;
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
