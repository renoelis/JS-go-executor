// buf.readIntBE/readIntLE - 跨方法一致性测试
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

// write/read 往返一致性
test('writeIntBE + readIntBE 往返一致性 (4字节)', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(0x12345678, 0, 4);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('writeIntLE + readIntLE 往返一致性 (4字节)', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntLE(0x12345678, 0, 4);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('writeIntBE + readIntBE 往返一致性 (6字节)', () => {
  const buf = Buffer.alloc(6);
  buf.writeIntBE(140737488355327, 0, 6);
  return buf.readIntBE(0, 6) === 140737488355327;
});

test('writeIntLE + readIntLE 往返一致性 (6字节)', () => {
  const buf = Buffer.alloc(6);
  buf.writeIntLE(140737488355327, 0, 6);
  return buf.readIntLE(0, 6) === 140737488355327;
});

// 字节序差异
test('writeIntLE + readIntBE 字节序不同', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntLE(0x12345678, 0, 4);
  const result = buf.readIntBE(0, 4);
  return result !== 0x12345678;
});

test('writeIntBE + readIntLE 字节序不同', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(0x12345678, 0, 4);
  const result = buf.readIntLE(0, 4);
  return result !== 0x12345678;
});

// 同一 Buffer 混合使用多个 read 方法
test('同一 Buffer 上使用不同 read 方法', () => {
  const buf = Buffer.alloc(12);
  buf.writeIntBE(0x1234, 0, 2);
  buf.writeIntLE(0x5678, 2, 2);
  buf.writeInt32BE(-1698898192, 4);
  const r1 = buf.readIntBE(0, 2);
  const r2 = buf.readIntLE(2, 2);
  const r3 = buf.readInt32BE(4);
  return r1 === 0x1234 && r2 === 0x5678 && r3 === -1698898192;
});

// 跨多个offset连续读取
test('连续读取不覆盖', () => {
  const buf = Buffer.alloc(12);
  buf.writeIntBE(0x1234, 0, 2);
  buf.writeIntBE(0x5678, 2, 2);
  buf.writeIntBE(-0x6544, 4, 2);
  const values = [
    buf.readIntBE(0, 2),
    buf.readIntBE(2, 2),
    buf.readIntBE(4, 2)
  ];
  return values[0] === 0x1234 && values[1] === 0x5678 && values[2] === -0x6544;
});

// subarray 测试
test('在 subarray 上 readIntBE', () => {
  const buf = Buffer.alloc(12);
  buf.writeIntBE(0x123456, 4, 3);
  const sub = buf.subarray(4, 7);
  return sub.readIntBE(0, 3) === 0x123456;
});

test('在 subarray 上 readIntLE', () => {
  const buf = Buffer.alloc(12);
  buf.writeIntLE(0x123456, 4, 3);
  const sub = buf.subarray(4, 7);
  return sub.readIntLE(0, 3) === 0x123456;
});

// 修改原Buffer后subarray的读取
test('修改原 Buffer 影响 subarray', () => {
  const buf = Buffer.alloc(6);
  buf.writeIntBE(0x123456, 0, 3);
  const sub = buf.subarray(0, 3);
  const before = sub.readIntBE(0, 3);
  buf.writeIntBE(0x789ABC, 0, 3);
  const after = sub.readIntBE(0, 3);
  return before === 0x123456 && after === 0x789ABC;
});

// Buffer.concat后读取
test('Buffer.concat 后读取', () => {
  const buf1 = Buffer.alloc(3);
  const buf2 = Buffer.alloc(3);
  buf1.writeIntBE(0x123456, 0, 3);
  buf2.writeIntLE(0x789ABC, 0, 3);
  const concatenated = Buffer.concat([buf1, buf2]);
  return concatenated.readIntBE(0, 3) === 0x123456 &&
         concatenated.readIntLE(3, 3) === 0x789ABC;
});

// 从不同编码创建Buffer后读取
test('从 base64 创建 Buffer 后读取', () => {
  const buf1 = Buffer.alloc(4);
  buf1.writeIntBE(0x12345678, 0, 4);
  const base64 = buf1.toString('base64');
  const buf2 = Buffer.from(base64, 'base64');
  return buf2.readIntBE(0, 4) === 0x12345678;
});

test('从 hex 创建 Buffer 后读取', () => {
  const buf = Buffer.from('12345678', 'hex');
  return buf.readIntBE(0, 4) === 0x12345678;
});

// 大offset但在有效范围内
test('大 offset 但有效（10000字节Buffer）', () => {
  const buf = Buffer.alloc(10006);
  buf.writeIntBE(0x123456, 10000, 3);
  return buf.readIntBE(10000, 3) === 0x123456;
});

// 同一位置重复读取
test('同一位置重复读取 100 次结果一致', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(buf.readIntBE(0, 4));
  }
  return results.every(r => r === 0x12345678);
});

// 覆盖写入后读取
test('覆盖写入后读取正确', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(0x11111111, 0, 4);
  buf.writeIntBE(0x22222222, 0, 4);
  buf.writeIntBE(0x33333333, 0, 4);
  return buf.readIntBE(0, 4) === 0x33333333;
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
