// buf.writeBigInt64BE/LE - Extreme Cases and Edge Scenarios
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

// 极小Buffer（刚好8字节）
test('writeBigInt64BE - 最小可用Buffer（8字节）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  return buf.length === 8 && buf.readBigInt64BE(0) === 0x0102030405060708n;
});

test('writeBigInt64LE - 最小可用Buffer（8字节）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  return buf.length === 8 && buf.readBigInt64LE(0) === 0x0102030405060708n;
});

// 超大Buffer测试
test('writeBigInt64BE - 在10KB Buffer末尾写入', () => {
  const buf = Buffer.alloc(10240);
  const offset = 10232;
  buf.writeBigInt64BE(0x7FEDCBA987654321n, offset);
  return buf.readBigInt64BE(offset) === 0x7FEDCBA987654321n;
});

test('writeBigInt64LE - 在10KB Buffer末尾写入', () => {
  const buf = Buffer.alloc(10240);
  const offset = 10232;
  buf.writeBigInt64LE(0x7FEDCBA987654321n, offset);
  return buf.readBigInt64LE(offset) === 0x7FEDCBA987654321n;
});

// offset 为 0 的各种情况
test('writeBigInt64BE - offset 明确为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(123n, 0);
  return buf.readBigInt64BE(0) === 123n;
});

test('writeBigInt64BE - offset 隐式为 0（省略）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(456n);
  return buf.readBigInt64BE(0) === 456n;
});

test('writeBigInt64LE - offset 明确为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(123n, 0);
  return buf.readBigInt64LE(0) === 123n;
});

test('writeBigInt64LE - offset 隐式为 0（省略）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(456n);
  return buf.readBigInt64LE(0) === 456n;
});

// 单字节值的8字节表示
test('writeBigInt64BE - 小值1的完整8字节表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(1n, 0);

  for (let i = 0; i < 7; i++) {
    if (buf[i] !== 0) return false;
  }
  return buf[7] === 1;
});

test('writeBigInt64BE - 小值255的完整8字节表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(255n, 0);

  for (let i = 0; i < 7; i++) {
    if (buf[i] !== 0) return false;
  }
  return buf[7] === 255;
});

test('writeBigInt64LE - 小值1的完整8字节表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(1n, 0);

  for (let i = 1; i < 8; i++) {
    if (buf[i] !== 0) return false;
  }
  return buf[0] === 1;
});

test('writeBigInt64LE - 小值255的完整8字节表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(255n, 0);

  for (let i = 1; i < 8; i++) {
    if (buf[i] !== 0) return false;
  }
  return buf[0] === 255;
});

// 2的幂次测试
test('writeBigInt64BE - 2的各次幂', () => {
  const buf = Buffer.alloc(64);
  const powers = [1n, 2n, 4n, 8n, 16n, 32n, 64n, 128n];

  for (let i = 0; i < powers.length; i++) {
    buf.writeBigInt64BE(powers[i], i * 8);
  }

  for (let i = 0; i < powers.length; i++) {
    if (buf.readBigInt64BE(i * 8) !== powers[i]) return false;
  }
  return true;
});

test('writeBigInt64LE - 2的各次幂', () => {
  const buf = Buffer.alloc(64);
  const powers = [1n, 2n, 4n, 8n, 16n, 32n, 64n, 128n];

  for (let i = 0; i < powers.length; i++) {
    buf.writeBigInt64LE(powers[i], i * 8);
  }

  for (let i = 0; i < powers.length; i++) {
    if (buf.readBigInt64LE(i * 8) !== powers[i]) return false;
  }
  return true;
});

// 负2的幂次测试
test('writeBigInt64BE - 负2的各次幂', () => {
  const buf = Buffer.alloc(64);
  const powers = [-1n, -2n, -4n, -8n, -16n, -32n, -64n, -128n];

  for (let i = 0; i < powers.length; i++) {
    buf.writeBigInt64BE(powers[i], i * 8);
  }

  for (let i = 0; i < powers.length; i++) {
    if (buf.readBigInt64BE(i * 8) !== powers[i]) return false;
  }
  return true;
});

test('writeBigInt64LE - 负2的各次幂', () => {
  const buf = Buffer.alloc(64);
  const powers = [-1n, -2n, -4n, -8n, -16n, -32n, -64n, -128n];

  for (let i = 0; i < powers.length; i++) {
    buf.writeBigInt64LE(powers[i], i * 8);
  }

  for (let i = 0; i < powers.length; i++) {
    if (buf.readBigInt64LE(i * 8) !== powers[i]) return false;
  }
  return true;
});

// 相邻值写入不干扰
test('writeBigInt64BE - 紧密相邻的两个值互不干扰', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  buf.writeBigInt64BE(0x2222222222222222n, 8);

  return buf.readBigInt64BE(0) === 0x1111111111111111n &&
         buf.readBigInt64BE(8) === 0x2222222222222222n;
});

test('writeBigInt64LE - 紧密相邻的两个值互不干扰', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(0x1111111111111111n, 0);
  buf.writeBigInt64LE(0x2222222222222222n, 8);

  return buf.readBigInt64LE(0) === 0x1111111111111111n &&
         buf.readBigInt64LE(8) === 0x2222222222222222n;
});

// 每个字节不同的模式
test('writeBigInt64BE - 每个字节递增模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0001020304050607n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== i) return false;
  }
  return true;
});

test('writeBigInt64BE - 每个字节递减模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0706050403020100n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 7 - i) return false;
  }
  return true;
});

test('writeBigInt64LE - 每个字节递增模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0706050403020100n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== i) return false;
  }
  return true;
});

test('writeBigInt64LE - 每个字节递减模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0001020304050607n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 7 - i) return false;
  }
  return true;
});

// BigInt表达式作为参数
test('writeBigInt64BE - 使用BigInt表达式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n * 200n + 50n, 0);
  return buf.readBigInt64BE(0) === 20050n;
});

test('writeBigInt64BE - 使用BigInt位运算', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0xFFn << 8n | 0xAAn, 0);
  return buf.readBigInt64BE(0) === 0xFFAAn;
});

test('writeBigInt64LE - 使用BigInt表达式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n * 200n + 50n, 0);
  return buf.readBigInt64LE(0) === 20050n;
});

test('writeBigInt64LE - 使用BigInt位运算', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0xFFn << 8n | 0xAAn, 0);
  return buf.readBigInt64LE(0) === 0xFFAAn;
});

// 零附近的值
test('writeBigInt64BE - 正负零边界', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeBigInt64BE(0n, 0);
  buf2.writeBigInt64BE(-0n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf1[i] !== buf2[i]) return false;
  }
  return true;
});

test('writeBigInt64BE - 正1和负1', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeBigInt64BE(1n, 0);
  buf2.writeBigInt64BE(-1n, 0);

  if (buf1.readBigInt64BE(0) !== 1n) return false;
  if (buf2.readBigInt64BE(0) !== -1n) return false;
  return true;
});

test('writeBigInt64LE - 正负零边界', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeBigInt64LE(0n, 0);
  buf2.writeBigInt64LE(-0n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf1[i] !== buf2[i]) return false;
  }
  return true;
});

test('writeBigInt64LE - 正1和负1', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeBigInt64LE(1n, 0);
  buf2.writeBigInt64LE(-1n, 0);

  if (buf1.readBigInt64LE(0) !== 1n) return false;
  if (buf2.readBigInt64LE(0) !== -1n) return false;
  return true;
});

// 不同Buffer类型混合测试
test('writeBigInt64BE - 在allocUnsafe的Buffer上覆盖写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64BE(0n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('writeBigInt64LE - 在allocUnsafe的Buffer上覆盖写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64LE(0n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

// 特殊位置的offset
test('writeBigInt64BE - offset为奇数', () => {
  const buf = Buffer.alloc(25);
  const values = [111n, 222n, 333n];
  const offsets = [1, 9, 17];

  for (let i = 0; i < values.length; i++) {
    buf.writeBigInt64BE(values[i], offsets[i]);
  }

  for (let i = 0; i < values.length; i++) {
    if (buf.readBigInt64BE(offsets[i]) !== values[i]) return false;
  }
  return true;
});

test('writeBigInt64LE - offset为奇数', () => {
  const buf = Buffer.alloc(25);
  const values = [111n, 222n, 333n];
  const offsets = [1, 9, 17];

  for (let i = 0; i < values.length; i++) {
    buf.writeBigInt64LE(values[i], offsets[i]);
  }

  for (let i = 0; i < values.length; i++) {
    if (buf.readBigInt64LE(offsets[i]) !== values[i]) return false;
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
