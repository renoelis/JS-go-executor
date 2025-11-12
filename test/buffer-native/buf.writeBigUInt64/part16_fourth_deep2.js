// buf.writeBigUInt64BE/LE - 第四轮深度补充2：特殊数值边界与数学属性
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

// ===== 连续幂次缺口（2^13-2^19）=====

const missingPowers = [13, 14, 15, 16, 17, 18, 19];

missingPowers.forEach(exp => {
  const val = 1n << BigInt(exp);

  test(`writeBigUInt64BE - 写入 2^${exp} (${val}n)`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(val, 0);
    const readBack = buf.readBigUInt64BE(0);
    return readBack === val;
  });

  test(`writeBigUInt64LE - 写入 2^${exp} (${val}n)`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(val, 0);
    const readBack = buf.readBigUInt64LE(0);
    return readBack === val;
  });
});

// ===== 特殊数值边界（2^24、2^40、2^56）=====

const specialPowers = [
  { name: '2^24', val: 16777216n },
  { name: '2^24-1', val: 16777215n },
  { name: '2^40', val: 1099511627776n },
  { name: '2^40-1', val: 1099511627775n },
  { name: '2^56', val: 72057594037927936n },
  { name: '2^56-1', val: 72057594037927935n },
];

specialPowers.forEach(t => {
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

// ===== 连续1位模式（不同长度的连续1）=====

const consecutiveOnes = [
  { name: '连续1（21位）', val: 0x1FFFFFn },
  { name: '连续1（22位）', val: 0x3FFFFFn },
  { name: '连续1（31位）', val: 0x7FFFFFFFn },
  { name: '连续1（32位）', val: 0xFFFFFFFFn },
  { name: '连续1（33位）', val: 0x1FFFFFFFFn },
  { name: '连续1（47位）', val: 0x7FFFFFFFFFFFn },
  { name: '连续1（48位）', val: 0xFFFFFFFFFFFFn },
  { name: '连续1（53位）', val: 0x1FFFFFFFFFFFFFn },
  { name: '连续1（54位）', val: 0x3FFFFFFFFFFFFFn },
  { name: '连续1（63位）', val: 0x7FFFFFFFFFFFFFFFn },
];

consecutiveOnes.forEach(t => {
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

// ===== 按位运算特性（4位交替、2位交替）=====

const bitPatterns = [
  { name: '0x5555555555555555（2位交替01）', val: 0x5555555555555555n },
  { name: '0xAAAAAAAAAAAAAAAA（2位交替10）', val: 0xAAAAAAAAAAAAAAAAn },
  { name: '0x0F0F0F0F0F0F0F0F（4位交替0000/1111）', val: 0x0F0F0F0F0F0F0F0Fn },
  { name: '0xF0F0F0F0F0F0F0F0（4位交替1111/0000）', val: 0xF0F0F0F0F0F0F0F0n },
  { name: '0x3333333333333333（2位交替00/11）', val: 0x3333333333333333n },
  { name: '0xCCCCCCCCCCCCCCCC（2位交替11/00）', val: 0xCCCCCCCCCCCCCCCCn },
];

bitPatterns.forEach(t => {
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

// ===== offset 和 value 的特殊组合 =====

test('writeBigUInt64BE - offset=0, val=max', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 0);
  return buf.slice(0, 8).toString('hex') === 'ffffffffffffffff' &&
         buf.slice(8, 16).toString('hex') === '0000000000000000';
});

test('writeBigUInt64BE - offset=1, val=max', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 1);
  return buf[0] === 0x00 &&
         buf.slice(1, 9).toString('hex') === 'ffffffffffffffff' &&
         buf.slice(9).every(b => b === 0x00);
});

test('writeBigUInt64BE - offset=7, val=max', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 7);
  return buf.slice(0, 7).every(b => b === 0x00) &&
         buf.slice(7, 15).toString('hex') === 'ffffffffffffffff' &&
         buf[15] === 0x00;
});

test('writeBigUInt64BE - offset=0, val=1', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64BE(0x0000000000000001n, 0);
  return buf.slice(0, 7).every(b => b === 0x00) &&
         buf[7] === 0x01 &&
         buf.slice(8).every(b => b === 0x00);
});

test('writeBigUInt64BE - offset=7, val=1', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64BE(0x0000000000000001n, 7);
  return buf.slice(0, 7).every(b => b === 0x00) &&
         buf.slice(7, 14).every(b => b === 0x00) &&
         buf[14] === 0x01 &&
         buf[15] === 0x00;
});

test('writeBigUInt64LE - offset=0, val=max', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64LE(0xFFFFFFFFFFFFFFFFn, 0);
  return buf.slice(0, 8).toString('hex') === 'ffffffffffffffff' &&
         buf.slice(8, 16).toString('hex') === '0000000000000000';
});

test('writeBigUInt64LE - offset=1, val=max', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64LE(0xFFFFFFFFFFFFFFFFn, 1);
  return buf[0] === 0x00 &&
         buf.slice(1, 9).toString('hex') === 'ffffffffffffffff' &&
         buf.slice(9).every(b => b === 0x00);
});

test('writeBigUInt64LE - offset=7, val=max', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64LE(0xFFFFFFFFFFFFFFFFn, 7);
  return buf.slice(0, 7).every(b => b === 0x00) &&
         buf.slice(7, 15).toString('hex') === 'ffffffffffffffff' &&
         buf[15] === 0x00;
});

test('writeBigUInt64LE - offset=0, val=1', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64LE(0x0000000000000001n, 0);
  return buf[0] === 0x01 &&
         buf.slice(1, 8).every(b => b === 0x00) &&
         buf.slice(8).every(b => b === 0x00);
});

test('writeBigUInt64LE - offset=7, val=1', () => {
  const buf = Buffer.alloc(16, 0x00);
  buf.writeBigUInt64LE(0x0000000000000001n, 7);
  return buf.slice(0, 7).every(b => b === 0x00) &&
         buf[7] === 0x01 &&
         buf.slice(8, 15).every(b => b === 0x00) &&
         buf[15] === 0x00;
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
