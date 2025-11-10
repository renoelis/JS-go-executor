// buf.readDoubleBE() - 内存安全测试
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

// 越界检测
test('读取超出边界抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleBE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('恰好在边界读取成功', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456, 0);
  return Math.abs(buf.readDoubleBE(0) - 123.456) < 0.001;
});

// 多次读取同一位置
test('多次读取同一位置一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(3.14159, 0);
  const r1 = buf.readDoubleBE(0);
  const r2 = buf.readDoubleBE(0);
  const r3 = buf.readDoubleBE(0);
  return r1 === r2 && r2 === r3;
});

// 并发读取
test('连续读取不同位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleBE(1.1, 0);
  buf.writeDoubleBE(2.2, 8);
  buf.writeDoubleBE(3.3, 16);
  const r1 = buf.readDoubleBE(0);
  const r2 = buf.readDoubleBE(8);
  const r3 = buf.readDoubleBE(16);
  return Math.abs(r1 - 1.1) < 0.01 && 
         Math.abs(r2 - 2.2) < 0.01 && 
         Math.abs(r3 - 3.3) < 0.01;
});

// 读取后修改
test('读取后修改不影响已读值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(100.5, 0);
  const r1 = buf.readDoubleBE(0);
  buf.writeDoubleBE(200.5, 0);
  return Math.abs(r1 - 100.5) < 0.01;
});

// 零长度 Buffer
test('零长度 Buffer 抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readDoubleBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 不同大小 Buffer
test('8 字节 Buffer（最小）', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(88.88, 0);
  return Math.abs(buf.readDoubleBE(0) - 88.88) < 0.01;
});

test('7 字节 Buffer 抛出错误', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readDoubleBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('大 Buffer 多次读取', () => {
  const buf = Buffer.alloc(1024);
  for (let i = 0; i <= 1024 - 8; i += 8) {
    buf.writeDoubleBE(i * 0.5, i);
  }
  let success = true;
  for (let i = 0; i <= 1024 - 8; i += 8) {
    const expected = i * 0.5;
    const actual = buf.readDoubleBE(i);
    if (Math.abs(actual - expected) >= 0.0001) {
      success = false;
      break;
    }
  }
  return success;
});

// 不可变性
test('readDoubleBE 不修改 Buffer', () => {
  const original = Buffer.from([0x40, 0x09, 0x21, 0xFB, 0x54, 0x44, 0x2D, 0x18]);
  const copy = Buffer.from(original);
  original.readDoubleBE(0);
  return original.equals(copy);
});

// 覆盖读取
test('覆盖读取', () => {
  const buf = Buffer.alloc(12);
  buf.writeDoubleBE(11.11, 0);
  buf.writeDoubleBE(22.22, 4);
  // 读取覆盖区域（0-7 和 4-11）
  const r1 = buf.readDoubleBE(0);
  const r2 = buf.readDoubleBE(4);
  return Math.abs(r1 - 11.11) < 0.01 && typeof r2 === 'number';
});

// 内存对齐
test('未对齐地址读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(33.33, 1);
  return Math.abs(buf.readDoubleBE(1) - 33.33) < 0.01;
});

test('奇数偏移读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(55.55, 3);
  return Math.abs(buf.readDoubleBE(3) - 55.55) < 0.01;
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
