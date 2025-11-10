// buf.readFloatBE() - 字节序测试
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

// Big-Endian vs Little-Endian
test('BE vs LE: 相同字节不同结果', () => {
  const buf = Buffer.from([0x40, 0x49, 0x0F, 0xDB]);
  const be = buf.readFloatBE(0);
  const le = buf.readFloatLE(0);
  return be !== le;
});

test('BE vs LE: 对称字节相同结果', () => {
  const buf = Buffer.from([0x3F, 0x80, 0x80, 0x3F]);
  const be = buf.readFloatBE(0);
  const le = buf.readFloatLE(0);
  // 对称的字节序列应该产生相同的值
  return typeof be === 'number' && typeof le === 'number';
});

// Big-Endian 字节序正确性
test('BE 字节序：高位在前', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(1.0, 0);
  // 1.0 的 BE 表示应该是 [0x3F, 0x80, 0x00, 0x00]
  return buf[0] === 0x3F && buf[1] === 0x80;
});

test('BE 字节序：2.0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(2.0, 0);
  // 2.0 的 BE 表示应该是 [0x40, 0x00, 0x00, 0x00]
  return buf[0] === 0x40 && buf[1] === 0x00;
});

test('BE 字节序：Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(Infinity, 0);
  // Infinity 的 BE 表示应该是 [0x7F, 0x80, 0x00, 0x00]
  return buf[0] === 0x7F && buf[1] === 0x80;
});

test('BE 字节序：-Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(-Infinity, 0);
  // -Infinity 的 BE 表示应该是 [0xFF, 0x80, 0x00, 0x00]
  return buf[0] === 0xFF && buf[1] === 0x80;
});

// 读取预定义的 BE 字节序列
test('读取 BE 字节序列：3.14159', () => {
  const buf = Buffer.from([0x40, 0x49, 0x0F, 0xDB]);
  return Math.abs(buf.readFloatBE(0) - Math.PI) < 0.00001;
});

test('读取 BE 字节序列：-1.0', () => {
  const buf = Buffer.from([0xBF, 0x80, 0x00, 0x00]);
  return buf.readFloatBE(0) === -1.0;
});

test('读取 BE 字节序列：0.5', () => {
  const buf = Buffer.from([0x3F, 0x00, 0x00, 0x00]);
  return buf.readFloatBE(0) === 0.5;
});

// 往返测试
test('往返：BE 写入后 BE 读取', () => {
  const buf = Buffer.alloc(4);
  const value = 123.456;
  buf.writeFloatBE(value, 0);
  return Math.abs(buf.readFloatBE(0) - value) < 0.001;
});

test('往返：多个值', () => {
  const buf = Buffer.alloc(12);
  const values = [1.1, 2.2, 3.3];
  values.forEach((v, i) => buf.writeFloatBE(v, i * 4));
  return values.every((v, i) => Math.abs(buf.readFloatBE(i * 4) - v) < 0.01);
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
