// buf.readFloatBE() - 边界案例和极端场景测试
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

// 连续零字节
test('连续零字节读取', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const result = buf.readFloatBE(0);
  return result === 0 && 1 / result === Infinity;
});

// 连续 0xFF 字节
test('连续 0xFF 字节读取', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const result = buf.readFloatBE(0);
  return Number.isNaN(result);
});

// 交替模式
test('交替 0x55 模式', () => {
  const buf = Buffer.from([0x55, 0x55, 0x55, 0x55]);
  const result = buf.readFloatBE(0);
  return typeof result === 'number';
});

test('交替 0xAA 模式', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA]);
  const result = buf.readFloatBE(0);
  return typeof result === 'number';
});

// 单字节变化
test('只有最高字节非零', () => {
  const buf = Buffer.from([0x3F, 0x00, 0x00, 0x00]);
  const result = buf.readFloatBE(0);
  return result === 0.5;
});

test('只有最低字节非零', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  const result = buf.readFloatBE(0);
  return result > 0 && result < 1e-40;
});

// 大 Buffer 中的小偏移
test('1MB Buffer 读取', () => {
  const buf = Buffer.alloc(1024 * 1024);
  buf.writeFloatBE(999.999, 1024);
  return Math.abs(buf.readFloatBE(1024) - 999.999) < 0.001;
});

// 随机位置读取
test('随机位置读取', () => {
  const buf = Buffer.alloc(1000);
  const positions = [0, 100, 500, 996];
  positions.forEach((pos, i) => {
    buf.writeFloatBE(i * 111.111, pos);
  });
  return positions.every((pos, i) => 
    Math.abs(buf.readFloatBE(pos) - i * 111.111) < 0.001
  );
});

// 多次重复读取同一位置
test('多次读取同一位置', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123.456, 0);
  const r1 = buf.readFloatBE(0);
  const r2 = buf.readFloatBE(0);
  const r3 = buf.readFloatBE(0);
  return r1 === r2 && r2 === r3;
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
