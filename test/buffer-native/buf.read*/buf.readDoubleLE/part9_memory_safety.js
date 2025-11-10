// buf.readDoubleLE() - 内存安全测试
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
    buf.readDoubleLE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('恰好在边界读取成功', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(123.456, 0);
  return Math.abs(buf.readDoubleLE(0) - 123.456) < 0.001;
});

// 多次读取同一位置
test('多次读取同一位置一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(3.14159, 0);
  const r1 = buf.readDoubleLE(0);
  const r2 = buf.readDoubleLE(0);
  const r3 = buf.readDoubleLE(0);
  return r1 === r2 && r2 === r3;
});

// 并发读取
test('连续读取不同位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleLE(1.1, 0);
  buf.writeDoubleLE(2.2, 8);
  buf.writeDoubleLE(3.3, 16);
  const r1 = buf.readDoubleLE(0);
  const r2 = buf.readDoubleLE(8);
  const r3 = buf.readDoubleLE(16);
  return Math.abs(r1 - 1.1) < 0.01 && 
         Math.abs(r2 - 2.2) < 0.01 && 
         Math.abs(r3 - 3.3) < 0.01;
});

// 读取后修改
test('读取后修改不影响已读值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(100.5, 0);
  const r1 = buf.readDoubleLE(0);
  buf.writeDoubleLE(200.5, 0);
  return Math.abs(r1 - 100.5) < 0.01;
});

// 零长度 Buffer
test('零长度 Buffer 抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readDoubleLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 不同大小 Buffer
test('8 字节 Buffer（最小）', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(88.88, 0);
  return Math.abs(buf.readDoubleLE(0) - 88.88) < 0.01;
});

test('7 字节 Buffer 抛出错误', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readDoubleLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('大 Buffer 多次读取', () => {
  const buf = Buffer.alloc(1024);
  for (let i = 0; i <= 1024 - 8; i += 8) {
    buf.writeDoubleLE(i * 0.5, i);
  }
  let success = true;
  for (let i = 0; i <= 1024 - 8; i += 8) {
    const expected = i * 0.5;
    const actual = buf.readDoubleLE(i);
    if (Math.abs(actual - expected) >= 0.0001) {
      success = false;
      break;
    }
  }
  return success;
});

// 不可变性
test('readDoubleLE 不修改 Buffer', () => {
  const original = Buffer.from([0x18, 0x2D, 0x44, 0x54, 0xFB, 0x21, 0x09, 0x40]);
  const copy = Buffer.from(original);
  original.readDoubleLE(0);
  return original.equals(copy);
});

// 覆盖读取
test('覆盖读取', () => {
  const buf = Buffer.alloc(12);
  buf.writeDoubleLE(11.11, 0);
  const before = buf.readDoubleLE(0);
  buf.writeDoubleLE(22.22, 4);
  // 读取覆盖区域（0-7 和 4-11）
  // 第二次写入会覆盖第一次写入的后4字节，所以第一个值会改变
  const r1 = buf.readDoubleLE(0);
  const r2 = buf.readDoubleLE(4);
  return Math.abs(before - 11.11) < 0.01 && r1 !== before && typeof r2 === 'number' && Math.abs(r2 - 22.22) < 0.01;
});

// 内存对齐
test('未对齐地址读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(33.33, 1);
  return Math.abs(buf.readDoubleLE(1) - 33.33) < 0.01;
});

test('奇数偏移读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(55.55, 3);
  return Math.abs(buf.readDoubleLE(3) - 55.55) < 0.01;
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
