// Buffer.copyBytesFrom() - Part 8: Byte Ordering and Encoding Tests
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

// 字节序测试
test('Uint16Array 字节序一致性', () => {
  const view = new Uint16Array([0x1234]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Uint16Array(buf.buffer, buf.byteOffset, 1);
  return newView[0] === 0x1234;
});

test('Uint32Array 字节序一致性', () => {
  const view = new Uint32Array([0x12345678]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Uint32Array(buf.buffer, buf.byteOffset, 1);
  return newView[0] === 0x12345678;
});

test('Float32Array 字节序一致性', () => {
  const view = new Float32Array([3.14]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Float32Array(buf.buffer, buf.byteOffset, 1);
  return Math.abs(newView[0] - 3.14) < 0.001;
});

test('Float64Array 字节序一致性', () => {
  const view = new Float64Array([3.141592653589793]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Float64Array(buf.buffer, buf.byteOffset, 1);
  return Math.abs(newView[0] - 3.141592653589793) < 0.000000000000001;
});

test('BigInt64Array 字节序一致性', () => {
  const view = new BigInt64Array([0x123456789ABCDEFn]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new BigInt64Array(buf.buffer, buf.byteOffset, 1);
  return newView[0] === 0x123456789ABCDEFn;
});

// 多字节值的正确复制
test('Uint16Array 多个值字节序', () => {
  const view = new Uint16Array([0x0102, 0x0304, 0x0506]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Uint16Array(buf.buffer, buf.byteOffset, 3);
  return newView[0] === 0x0102 && newView[1] === 0x0304 && newView[2] === 0x0506;
});

test('Int16Array 负数字节序', () => {
  const view = new Int16Array([-1, -256, -32768]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Int16Array(buf.buffer, buf.byteOffset, 3);
  return newView[0] === -1 && newView[1] === -256 && newView[2] === -32768;
});

test('Uint32Array 多个值字节序', () => {
  const view = new Uint32Array([0x01020304, 0x05060708]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Uint32Array(buf.buffer, buf.byteOffset, 2);
  return newView[0] === 0x01020304 && newView[1] === 0x05060708;
});

test('Int32Array 负数字节序', () => {
  const view = new Int32Array([-1, -65536, -2147483648]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Int32Array(buf.buffer, buf.byteOffset, 3);
  return newView[0] === -1 && newView[1] === -65536 && newView[2] === -2147483648;
});

// 浮点数精度测试
test('Float32Array 小数精度', () => {
  const view = new Float32Array([1.5, 2.25, 3.125]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Float32Array(buf.buffer, buf.byteOffset, 3);
  return newView[0] === 1.5 && newView[1] === 2.25 && newView[2] === 3.125;
});

test('Float32Array 科学计数法', () => {
  const view = new Float32Array([1.23e10, 4.56e-10]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Float32Array(buf.buffer, buf.byteOffset, 2);
  return Math.abs(newView[0] - 1.23e10) < 1e5 && Math.abs(newView[1] - 4.56e-10) < 1e-15;
});

test('Float64Array 高精度小数', () => {
  const view = new Float64Array([Math.PI, Math.E]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Float64Array(buf.buffer, buf.byteOffset, 2);
  return Math.abs(newView[0] - Math.PI) < 1e-15 && Math.abs(newView[1] - Math.E) < 1e-15;
});

test('Float64Array 极大数', () => {
  const view = new Float64Array([1.7976931348623157e308]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Float64Array(buf.buffer, buf.byteOffset, 1);
  return newView[0] === 1.7976931348623157e308;
});

test('Float64Array 极小数', () => {
  const view = new Float64Array([5e-324]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new Float64Array(buf.buffer, buf.byteOffset, 1);
  return newView[0] === 5e-324;
});

// BigInt 测试
test('BigInt64Array 大数值', () => {
  const view = new BigInt64Array([123456789012345n, -987654321098765n]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new BigInt64Array(buf.buffer, buf.byteOffset, 2);
  return newView[0] === 123456789012345n && newView[1] === -987654321098765n;
});

test('BigUint64Array 大数值', () => {
  const view = new BigUint64Array([18446744073709551614n, 9223372036854775808n]);
  const buf = Buffer.copyBytesFrom(view);
  const newView = new BigUint64Array(buf.buffer, buf.byteOffset, 2);
  return newView[0] === 18446744073709551614n && newView[1] === 9223372036854775808n;
});

// 混合偏移测试
test('Uint16Array 带 offset 字节序正确', () => {
  const view = new Uint16Array([0x1111, 0x2222, 0x3333]);
  const buf = Buffer.copyBytesFrom(view, 1);
  const newView = new Uint16Array(buf.buffer, buf.byteOffset, 2);
  return newView[0] === 0x2222 && newView[1] === 0x3333;
});

test('Uint32Array 带 offset 和 length 字节序正确', () => {
  const view = new Uint32Array([0x11111111, 0x22222222, 0x33333333, 0x44444444]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  const newView = new Uint32Array(buf.buffer, buf.byteOffset, 2);
  return newView[0] === 0x22222222 && newView[1] === 0x33333333;
});

test('Float64Array 带 offset 精度保持', () => {
  const view = new Float64Array([1.1, 2.2, 3.3, 4.4]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  const newView = new Float64Array(buf.buffer, buf.byteOffset, 2);
  return Math.abs(newView[0] - 2.2) < 1e-10 && Math.abs(newView[1] - 3.3) < 1e-10;
});

// 跨类型验证
test('Uint8Array 与 Int8Array 同值不同解释', () => {
  const u8View = new Uint8Array([255]);
  const i8View = new Int8Array([255]);
  const buf1 = Buffer.copyBytesFrom(u8View);
  const buf2 = Buffer.copyBytesFrom(i8View);
  return buf1[0] === 255 && buf2[0] === 255;
});

test('Uint16Array 字节内容验证', () => {
  const view = new Uint16Array([0xABCD]);
  const buf = Buffer.copyBytesFrom(view);
  const isLE = buf[0] === 0xCD && buf[1] === 0xAB;
  const isBE = buf[0] === 0xAB && buf[1] === 0xCD;
  return (isLE || isBE) && buf.length === 2;
});

test('Uint32Array 字节内容验证', () => {
  const view = new Uint32Array([0x12345678]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

// 特殊模式的字节
test('重复字节模式', () => {
  const view = new Uint8Array([0xAA, 0xAA, 0xAA, 0xAA]);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 0xAA && buf[1] === 0xAA && buf[2] === 0xAA && buf[3] === 0xAA;
});

test('交替字节模式', () => {
  const view = new Uint8Array([0xFF, 0x00, 0xFF, 0x00]);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0xFF && buf[3] === 0x00;
});

test('递增字节模式', () => {
  const view = new Uint8Array([0, 1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(view);
  let correct = true;
  for (let i = 0; i < 6; i++) {
    if (buf[i] !== i) correct = false;
  }
  return correct;
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
