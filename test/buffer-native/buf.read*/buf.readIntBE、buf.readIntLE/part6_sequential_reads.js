// 连续读取测试
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

// 连续读取同一位置
test('连续读取同一位置: readIntBE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readIntBE(0, 4);
  const r2 = buf.readIntBE(0, 4);
  const r3 = buf.readIntBE(0, 4);
  return r1 === r2 && r2 === r3 && r1 === 0x12345678;
});

test('连续读取同一位置: readIntLE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const r1 = buf.readIntLE(0, 4);
  const r2 = buf.readIntLE(0, 4);
  const r3 = buf.readIntLE(0, 4);
  return r1 === r2 && r2 === r3 && r1 === 0x12345678;
});

// 顺序读取不同位置
test('顺序读取: readIntBE 不重叠', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB, 0xCD, 0xEF]);
  const r1 = buf.readIntBE(0, 2);
  const r2 = buf.readIntBE(2, 2);
  const r3 = buf.readIntBE(4, 2);
  const r4 = buf.readIntBE(6, 2);
  return r1 === 0x1234 && r2 === 0x5678 && r3 === -0x6f55 && r4 === -0x3211;
});

test('顺序读取: readIntLE 不重叠', () => {
  const buf = Buffer.from([0x34, 0x12, 0x78, 0x56, 0xAB, 0x90, 0xEF, 0xCD]);
  const r1 = buf.readIntLE(0, 2);
  const r2 = buf.readIntLE(2, 2);
  const r3 = buf.readIntLE(4, 2);
  const r4 = buf.readIntLE(6, 2);
  return r1 === 0x1234 && r2 === 0x5678 && r3 === -0x6f55 && r4 === -0x3211;
});

// 重叠读取
test('重叠读取: readIntBE offset+1', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90]);
  const r1 = buf.readIntBE(0, 4);
  const r2 = buf.readIntBE(1, 4);
  return r1 === 0x12345678 && r2 === 0x34567890;
});

test('重叠读取: readIntLE offset+1', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12, 0x90]);
  const r1 = buf.readIntLE(0, 4);
  const r2 = buf.readIntLE(1, 4);
  // r2 = [0x56, 0x34, 0x12, 0x90] LE = 0x90123456 (负数)
  return r1 === 0x12345678 && r2 === -0x6fedcbaa;
});

// 反向读取
test('反向读取: 从后往前', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB]);
  const r1 = buf.readIntBE(4, 2);
  const r2 = buf.readIntBE(2, 2);
  const r3 = buf.readIntBE(0, 2);
  return r1 === -0x6f55 && r2 === 0x5678 && r3 === 0x1234;
});

// 不同 byteLength 连续读取
test('不同 byteLength: 1,2,3,4,5,6', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB]);
  const r1 = buf.readIntBE(0, 1);
  const r2 = buf.readIntBE(0, 2);
  const r3 = buf.readIntBE(0, 3);
  const r4 = buf.readIntBE(0, 4);
  const r5 = buf.readIntBE(0, 5);
  const r6 = buf.readIntBE(0, 6);
  return r1 === 0x12 && r2 === 0x1234 && r3 === 0x123456 && 
         r4 === 0x12345678 && r5 === 0x1234567890 && r6 === 0x1234567890ab;
});

// 交替读取 BE/LE
test('交替读取 BE/LE: 同一位置', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const be = buf.readIntBE(0, 4);
  const le = buf.readIntLE(0, 4);
  return be === 0x12345678 && le === 0x78563412;
});

test('交替读取 BE/LE: 不同位置', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB]);
  const be1 = buf.readIntBE(0, 2);
  const le1 = buf.readIntLE(2, 2);
  const be2 = buf.readIntBE(4, 2);
  return be1 === 0x1234 && le1 === 0x7856 && be2 === -0x6f55;
});

// 读取后修改 buffer
test('读取后修改 buffer: readIntBE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const before = buf.readIntBE(0, 4);
  buf[0] = 0xFF;
  const after = buf.readIntBE(0, 4);
  return before === 0x12345678 && after === -0xcba988;
});

test('读取后修改 buffer: readIntLE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const before = buf.readIntLE(0, 4);
  buf[3] = 0xFF;
  const after = buf.readIntLE(0, 4);
  return before === 0x12345678 && after === -0xcba988;
});

// 全 buffer 扫描
test('全 buffer 扫描: readIntBE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB]);
  let results = [];
  for (let i = 0; i <= buf.length - 2; i++) {
    results.push(buf.readIntBE(i, 2));
  }
  return results.length === 5 && 
         results[0] === 0x1234 && 
         results[4] === -0x6f55;
});

test('全 buffer 扫描: readIntLE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB]);
  let results = [];
  for (let i = 0; i <= buf.length - 2; i++) {
    results.push(buf.readIntLE(i, 2));
  }
  return results.length === 5 && 
         results[0] === 0x3412 && 
         results[4] === -0x5470;
});

// 边界扫描
test('边界扫描: 最后 N 字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB]);
  const r1 = buf.readIntBE(5, 1); // 最后1字节
  const r2 = buf.readIntBE(4, 2); // 最后2字节
  const r3 = buf.readIntBE(3, 3); // 最后3字节
  return r1 === -0x55 && r2 === -0x6f55 && r3 === 0x7890ab;
});

// 性能模拟: 大量连续读取
test('大量连续读取: 100次', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  let allSame = true;
  const expected = 0x12345678;
  for (let i = 0; i < 100; i++) {
    if (buf.readIntBE(0, 4) !== expected) {
      allSame = false;
      break;
    }
  }
  return allSame;
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
