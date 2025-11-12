// buf.writeFloatBE/LE() - 基本功能测试
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

// 基本写入功能
test('writeFloatBE 写入正数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(123.456, 0);
  return result === 4 && buf[0] === 0x42 && buf[1] === 0xf6 && buf[2] === 0xe9 && buf[3] === 0x79;
});

test('writeFloatLE 写入正数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(123.456, 0);
  return result === 4 && buf[0] === 0x79 && buf[1] === 0xe9 && buf[2] === 0xf6 && buf[3] === 0x42;
});

test('writeFloatBE 写入负数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(-123.456, 0);
  return result === 4 && buf[0] === 0xc2 && buf[1] === 0xf6 && buf[2] === 0xe9 && buf[3] === 0x79;
});

test('writeFloatLE 写入负数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(-123.456, 0);
  return result === 4 && buf[0] === 0x79 && buf[1] === 0xe9 && buf[2] === 0xf6 && buf[3] === 0xc2;
});

test('writeFloatBE 写入 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(0, 0);
  return result === 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(0, 0);
  return result === 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatBE 写入 -0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(-0, 0);
  return result === 4 && buf[0] === 0x80 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 -0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(-0, 0);
  return result === 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x80;
});

test('writeFloatBE 写入 1.0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(1.0, 0);
  return result === 4 && buf[0] === 0x3f && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 1.0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(1.0, 0);
  return result === 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0x3f;
});

test('writeFloatBE 写入 -1.0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(-1.0, 0);
  return result === 4 && buf[0] === 0xbf && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 -1.0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(-1.0, 0);
  return result === 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0xbf;
});

// 不同 offset 位置
test('writeFloatBE offset=1', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0xff);
  const result = buf.writeFloatBE(42.5, 1);
  return result === 5 && buf[0] === 0xff && buf[1] === 0x42 && buf[2] === 0x2a && buf[3] === 0x00 && buf[4] === 0x00 && buf[5] === 0xff;
});

test('writeFloatLE offset=1', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0xff);
  const result = buf.writeFloatLE(42.5, 1);
  return result === 5 && buf[0] === 0xff && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x2a && buf[4] === 0x42 && buf[5] === 0xff;
});

test('writeFloatBE 最后 4 字节', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0);
  const result = buf.writeFloatBE(3.14, 4);
  return result === 8;
});

test('writeFloatLE 最后 4 字节', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0);
  const result = buf.writeFloatLE(3.14, 4);
  return result === 8;
});

// 返回值检查
test('writeFloatBE 返回值是 offset + 4', () => {
  const buf = Buffer.allocUnsafe(10);
  const result1 = buf.writeFloatBE(1.5, 0);
  const result2 = buf.writeFloatBE(2.5, 3);
  const result3 = buf.writeFloatBE(3.5, 6);
  return result1 === 4 && result2 === 7 && result3 === 10;
});

test('writeFloatLE 返回值是 offset + 4', () => {
  const buf = Buffer.allocUnsafe(10);
  const result1 = buf.writeFloatLE(1.5, 0);
  const result2 = buf.writeFloatLE(2.5, 3);
  const result3 = buf.writeFloatLE(3.5, 6);
  return result1 === 4 && result2 === 7 && result3 === 10;
});

// 链式写入
test('writeFloatBE 连续写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatBE(1.5, 0);
  buf.writeFloatBE(2.5, 4);
  return buf.readFloatBE(0) === 1.5 && buf.readFloatBE(4) === 2.5;
});

test('writeFloatLE 连续写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatLE(1.5, 0);
  buf.writeFloatLE(2.5, 4);
  return buf.readFloatLE(0) === 1.5 && buf.readFloatLE(4) === 2.5;
});

// 覆盖写入
test('writeFloatBE 覆盖已有数据', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(10.5, 0);
  buf.writeFloatBE(20.5, 0);
  const value = buf.readFloatBE(0);
  return value === 20.5;
});

test('writeFloatLE 覆盖已有数据', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(10.5, 0);
  buf.writeFloatLE(20.5, 0);
  const value = buf.readFloatLE(0);
  return value === 20.5;
});

// 大小端对比
test('BE 和 LE 写入相同值字节序相反', () => {
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeFloatBE(99.99, 0);
  bufLE.writeFloatLE(99.99, 0);
  return bufBE[0] === bufLE[3] && bufBE[1] === bufLE[2] && bufBE[2] === bufLE[1] && bufBE[3] === bufLE[0];
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
