// buf.writeInt16LE() - 基本功能测试
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
test('写入正整数到offset 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt16LE(258, 0);
  return result === 2 && buf[0] === 0x02 && buf[1] === 0x01;
});

test('写入正整数到offset 1', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt16LE(258, 1);
  return result === 3 && buf[1] === 0x02 && buf[2] === 0x01;
});

test('写入负整数', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt16LE(-1, 0);
  return result === 2 && buf[0] === 0xFF && buf[1] === 0xFF;
});

test('写入最大值 32767', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt16LE(32767, 0);
  return result === 2 && buf[0] === 0xFF && buf[1] === 0x7F;
});

test('写入最小值 -32768', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt16LE(-32768, 0);
  return result === 2 && buf[0] === 0x00 && buf[1] === 0x80;
});

test('写入零值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt16LE(0, 0);
  return result === 2 && buf[0] === 0x00 && buf[1] === 0x00;
});

test('返回值是 offset + 2', () => {
  const buf = Buffer.alloc(10);
  const result1 = buf.writeInt16LE(100, 0);
  const result2 = buf.writeInt16LE(200, 3);
  const result3 = buf.writeInt16LE(300, 8);
  return result1 === 2 && result2 === 5 && result3 === 10;
});

test('在不同位置连续写入', () => {
  const buf = Buffer.alloc(6);
  buf.writeInt16LE(0x0102, 0);
  buf.writeInt16LE(0x0304, 2);
  buf.writeInt16LE(0x0506, 4);
  return buf[0] === 0x02 && buf[1] === 0x01 &&
         buf[2] === 0x04 && buf[3] === 0x03 &&
         buf[4] === 0x06 && buf[5] === 0x05;
});

test('写入会覆盖原有数据', () => {
  const buf = Buffer.alloc(4, 0xFF);
  buf.writeInt16LE(0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('字节序验证 - Little Endian', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16LE(0x1234, 0);
  // Little Endian: 低字节在前
  return buf[0] === 0x34 && buf[1] === 0x12;
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
