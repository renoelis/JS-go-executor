// buf.writeUIntBE/LE() - offset 变化测试
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

// offset 从 0 到 buffer 长度-1 的全范围测试（1字节）
test('writeUIntBE offset=0', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(0x11, 0, 1);
  return r === 1 && buf[0] === 0x11;
});

test('writeUIntBE offset=1', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(0x22, 1, 1);
  return r === 2 && buf[1] === 0x22;
});

test('writeUIntBE offset=2', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(0x33, 2, 1);
  return r === 3 && buf[2] === 0x33;
});

test('writeUIntBE offset=3', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(0x44, 3, 1);
  return r === 4 && buf[3] === 0x44;
});

test('writeUIntLE offset=0', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(0x11, 0, 1);
  return r === 1 && buf[0] === 0x11;
});

test('writeUIntLE offset=1', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(0x22, 1, 1);
  return r === 2 && buf[1] === 0x22;
});

test('writeUIntLE offset=2', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(0x33, 2, 1);
  return r === 3 && buf[2] === 0x33;
});

test('writeUIntLE offset=3', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(0x44, 3, 1);
  return r === 4 && buf[3] === 0x44;
});

// 不同 offset 和 byteLength 组合
test('writeUIntBE offset=0 byteLength=2', () => {
  const buf = Buffer.allocUnsafe(8);
  const r = buf.writeUIntBE(0x1234, 0, 2);
  return r === 2 && buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUIntBE offset=1 byteLength=2', () => {
  const buf = Buffer.allocUnsafe(8);
  const r = buf.writeUIntBE(0x1234, 1, 2);
  return r === 3 && buf[1] === 0x12 && buf[2] === 0x34;
});

test('writeUIntBE offset=5 byteLength=3', () => {
  const buf = Buffer.allocUnsafe(10);
  const r = buf.writeUIntBE(0x123456, 5, 3);
  return r === 8 && buf[5] === 0x12 && buf[6] === 0x34 && buf[7] === 0x56;
});

test('writeUIntLE offset=0 byteLength=2', () => {
  const buf = Buffer.allocUnsafe(8);
  const r = buf.writeUIntLE(0x1234, 0, 2);
  return r === 2 && buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUIntLE offset=1 byteLength=2', () => {
  const buf = Buffer.allocUnsafe(8);
  const r = buf.writeUIntLE(0x1234, 1, 2);
  return r === 3 && buf[1] === 0x34 && buf[2] === 0x12;
});

test('writeUIntLE offset=5 byteLength=3', () => {
  const buf = Buffer.allocUnsafe(10);
  const r = buf.writeUIntLE(0x123456, 5, 3);
  return r === 8 && buf[5] === 0x56 && buf[6] === 0x34 && buf[7] === 0x12;
});

// 返回值验证（应该是 offset + byteLength）
test('writeUIntBE 返回值 offset=0 byteLength=1', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntBE(0x12, 0, 1);
  return r === 1;
});

test('writeUIntBE 返回值 offset=0 byteLength=6', () => {
  const buf = Buffer.allocUnsafe(8);
  const r = buf.writeUIntBE(0x123456789abc, 0, 6);
  return r === 6;
});

test('writeUIntBE 返回值 offset=2 byteLength=3', () => {
  const buf = Buffer.allocUnsafe(8);
  const r = buf.writeUIntBE(0x123456, 2, 3);
  return r === 5;
});

test('writeUIntLE 返回值 offset=0 byteLength=1', () => {
  const buf = Buffer.allocUnsafe(4);
  const r = buf.writeUIntLE(0x12, 0, 1);
  return r === 1;
});

test('writeUIntLE 返回值 offset=0 byteLength=6', () => {
  const buf = Buffer.allocUnsafe(8);
  const r = buf.writeUIntLE(0x123456789abc, 0, 6);
  return r === 6;
});

test('writeUIntLE 返回值 offset=2 byteLength=3', () => {
  const buf = Buffer.allocUnsafe(8);
  const r = buf.writeUIntLE(0x123456, 2, 3);
  return r === 5;
});

// offset 和 buffer 边界测试
test('writeUIntBE offset + byteLength 刚好等于 buffer.length', () => {
  const buf = Buffer.allocUnsafe(10);
  const r = buf.writeUIntBE(0x123456, 7, 3);
  return r === 10 && buf[7] === 0x12 && buf[8] === 0x34 && buf[9] === 0x56;
});

test('writeUIntLE offset + byteLength 刚好等于 buffer.length', () => {
  const buf = Buffer.allocUnsafe(10);
  const r = buf.writeUIntLE(0x123456, 7, 3);
  return r === 10 && buf[7] === 0x56 && buf[8] === 0x34 && buf[9] === 0x12;
});

// 在不同位置写入后验证其他位置未被修改
test('writeUIntBE 写入后其他位置保持不变', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);
  buf.writeUIntBE(0xaabb, 2, 2);
  return buf[0] === 0x11 && buf[1] === 0x22 && buf[2] === 0xaa && buf[3] === 0xbb && buf[4] === 0x55 && buf[5] === 0x66;
});

test('writeUIntLE 写入后其他位置保持不变', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);
  buf.writeUIntLE(0xaabb, 2, 2);
  return buf[0] === 0x11 && buf[1] === 0x22 && buf[2] === 0xbb && buf[3] === 0xaa && buf[4] === 0x55 && buf[5] === 0x66;
});

// 链式写入验证
test('writeUIntBE 链式写入不同位置', () => {
  const buf = Buffer.allocUnsafe(10);
  const r1 = buf.writeUIntBE(0x11, 0, 1);
  const r2 = buf.writeUIntBE(0x22, r1, 1);
  const r3 = buf.writeUIntBE(0x33, r2, 1);
  return r3 === 3 && buf[0] === 0x11 && buf[1] === 0x22 && buf[2] === 0x33;
});

test('writeUIntLE 链式写入不同位置', () => {
  const buf = Buffer.allocUnsafe(10);
  const r1 = buf.writeUIntLE(0x11, 0, 1);
  const r2 = buf.writeUIntLE(0x22, r1, 1);
  const r3 = buf.writeUIntLE(0x33, r2, 1);
  return r3 === 3 && buf[0] === 0x11 && buf[1] === 0x22 && buf[2] === 0x33;
});

// 大 offset 测试
test('writeUIntBE 大 offset', () => {
  const buf = Buffer.allocUnsafe(1000);
  const r = buf.writeUIntBE(0x123456, 997, 3);
  return r === 1000 && buf[997] === 0x12 && buf[998] === 0x34 && buf[999] === 0x56;
});

test('writeUIntLE 大 offset', () => {
  const buf = Buffer.allocUnsafe(1000);
  const r = buf.writeUIntLE(0x123456, 997, 3);
  return r === 1000 && buf[997] === 0x56 && buf[998] === 0x34 && buf[999] === 0x12;
});

// offset 小数测试（应该报错）
test('writeUIntBE offset 为小数应该报错', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeUIntBE(0x12, 2.7, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer');
  }
});

test('writeUIntLE offset 为小数应该报错', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeUIntLE(0x12, 2.7, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer');
  }
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
