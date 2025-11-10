// buf.readFloatBE() - 最终查缺补漏验证测试
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

// === 极端数值测试 ===

test('Number.MAX_VALUE 溢出测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(Number.MAX_VALUE, 0);
  // Number.MAX_VALUE 超出 Float32 范围，会被转换为 Infinity
  const result = buf.readFloatBE(0);
  return result === Infinity;
});

test('Number.MIN_VALUE 精度测试', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(Number.MIN_VALUE, 0);
  // Number.MIN_VALUE 远小于 Float32 最小值，会被转换为 0
  const result = buf.readFloatBE(0);
  return result === 0;
});

test('负的 Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(-Number.MAX_VALUE, 0);
  const result = buf.readFloatBE(0);
  return result === -Infinity;
});

// === 特殊的 offset 数值边界 ===

test('offset = 2^32 - 1（最大 32 位无符号整数）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatBE(4294967295); // 2^32 - 1
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -2^31（最小 32 位有符号整数）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(-2147483648);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 2^31 - 1（最大 32 位有符号整数）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(2147483647);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 读取连续位置的一致性 ===

test('连续读取 100 个 Buffer 位置', () => {
  const buf = Buffer.alloc(404); // 100 * 4 + 4
  for (let i = 0; i < 100; i++) {
    buf.writeFloatBE(i * 1.5, i * 4);
  }
  
  let allPass = true;
  for (let i = 0; i < 100; i++) {
    const expected = i * 1.5;
    const actual = buf.readFloatBE(i * 4);
    if (Math.abs(actual - expected) > 0.001) {
      allPass = false;
      break;
    }
  }
  return allPass;
});

// === 二进制精确比较 ===

test('官方文档示例值精确验证', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const result = buf.readFloatBE(0);
  // Node.js 官方文档：应为 2.387939260590663e-38
  return Math.abs(result - 2.387939260590663e-38) < 1e-45;
});

test('0x7F800000 应读取为 Infinity', () => {
  const buf = Buffer.from([0x7F, 0x80, 0x00, 0x00]);
  return buf.readFloatBE(0) === Infinity;
});

test('0xFF800000 应读取为 -Infinity', () => {
  const buf = Buffer.from([0xFF, 0x80, 0x00, 0x00]);
  return buf.readFloatBE(0) === -Infinity;
});

test('0x7FC00000 应读取为 NaN', () => {
  const buf = Buffer.from([0x7F, 0xC0, 0x00, 0x00]);
  const result = buf.readFloatBE(0);
  return result !== result; // NaN !== NaN
});

test('0x00000000 应读取为 +0', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const result = buf.readFloatBE(0);
  return result === 0 && 1 / result === Infinity;
});

test('0x80000000 应读取为 -0', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  const result = buf.readFloatBE(0);
  return result === 0 && 1 / result === -Infinity;
});

// === 不同 Buffer 分配方式的一致性 ===

test('Buffer.alloc vs Buffer.allocUnsafe 读取一致', () => {
  const safe = Buffer.alloc(4);
  const unsafe = Buffer.allocUnsafe(4);
  
  safe.writeFloatBE(999.999, 0);
  unsafe.writeFloatBE(999.999, 0);
  
  return Math.abs(safe.readFloatBE(0) - unsafe.readFloatBE(0)) < 0.001;
});

test('Buffer.from(array) 读取', () => {
  const buf = Buffer.from([0x40, 0x49, 0x0f, 0xdb]); // 3.14159274...
  const result = buf.readFloatBE(0);
  return Math.abs(result - 3.14159) < 0.001;
});

// === 方法调用方式 ===

test('通过 Buffer.prototype 调用', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123.456, 0);
  const result = Buffer.prototype.readFloatBE.call(buf, 0);
  return Math.abs(result - 123.456) < 0.001;
});

test('bind 到正确的 Buffer', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(789.012, 0);
  const fn = buf.readFloatBE.bind(buf);
  return Math.abs(fn(0) - 789.012) < 0.001;
});

// === 与 DataView 一致性验证 ===

test('与 DataView.getFloat32 完全一致（正数）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(42.5, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dvResult = dv.getFloat32(0, false); // false = big-endian
  const bufResult = buf.readFloatBE(0);
  
  return dvResult === bufResult;
});

test('与 DataView.getFloat32 完全一致（负数）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(-123.456, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dvResult = dv.getFloat32(0, false);
  const bufResult = buf.readFloatBE(0);
  
  return Math.abs(dvResult - bufResult) < 0.001;
});

test('与 DataView.getFloat32 完全一致（Infinity）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(Infinity, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dvResult = dv.getFloat32(0, false);
  const bufResult = buf.readFloatBE(0);
  
  return dvResult === bufResult && dvResult === Infinity;
});

test('与 DataView.getFloat32 完全一致（NaN）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(NaN, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dvResult = dv.getFloat32(0, false);
  const bufResult = buf.readFloatBE(0);
  
  return (dvResult !== dvResult) && (bufResult !== bufResult); // 都是 NaN
});

// === 极端 Buffer 大小 ===

test('超大 Buffer（100MB）中间位置读取', () => {
  const size = 100 * 1024 * 1024; // 100MB
  const buf = Buffer.alloc(size);
  const offset = size / 2 - 2; // 中间位置
  buf.writeFloatBE(888.888, offset);
  return Math.abs(buf.readFloatBE(offset) - 888.888) < 0.001;
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
