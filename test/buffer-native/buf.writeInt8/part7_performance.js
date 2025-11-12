// buf.writeInt8() - Performance and Stress Tests
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

// 大量连续写入
test('连续写入 1000 个值', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    const value = (i % 256) - 128;
    if (value >= -128 && value <= 127) {
      buf.writeInt8(value, i);
    }
  }
  return buf[0] === 0x80 && buf[999] === 103;
});

test('在大 buffer 中随机位置写入', () => {
  const buf = Buffer.alloc(10000);
  const positions = [0, 1234, 5678, 9999];
  const values = [-128, -1, 0, 127];

  for (let i = 0; i < positions.length; i++) {
    buf.writeInt8(values[i], positions[i]);
  }

  return buf[0] === 0x80 && buf[1234] === 0xFF &&
         buf[5678] === 0 && buf[9999] === 0x7F;
});

// 重复覆盖
test('同一位置重复写入 100 次', () => {
  const buf = Buffer.alloc(4);
  let lastValue = 0;
  for (let i = 0; i < 100; i++) {
    const value = ((i % 256) - 128);
    if (value >= -128 && value <= 127) {
      buf.writeInt8(value, 0);
      lastValue = value;
    }
  }
  return buf[0] === (lastValue & 0xFF);
});

// 全范围测试
test('写入所有有效值 -128 到 127', () => {
  const buf = Buffer.alloc(256);
  for (let i = -128; i <= 127; i++) {
    buf.writeInt8(i, i + 128);
  }

  let pass = true;
  for (let i = -128; i <= 127; i++) {
    const expected = i & 0xFF;
    if (buf[i + 128] !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// 交替正负值
test('交替写入正负值', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.writeInt8(i * 10, i * 2);
    buf.writeInt8(-i * 10, i * 2 + 1);
  }
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 10 && buf[3] === (256 - 10);
});

// 边界附近值
test('在边界附近连续写入', () => {
  const buf = Buffer.alloc(10);
  const values = [-128, -127, -126, 125, 126, 127];
  for (let i = 0; i < values.length; i++) {
    buf.writeInt8(values[i], i);
  }
  return buf[0] === 0x80 && buf[1] === 0x81 && buf[5] === 0x7F;
});

// 稀疏写入
test('稀疏位置写入', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i += 100) {
    buf.writeInt8(i % 128, i);
  }
  return buf[0] === 0 && buf[100] === 100 && buf[200] === 72;
});

// 返回值链式验证
test('100 次链式写入验证返回值', () => {
  const buf = Buffer.alloc(100);
  let offset = 0;
  for (let i = 0; i < 100; i++) {
    offset = buf.writeInt8(i - 50, offset);
  }
  return offset === 100;
});

// 不同类型值混合写入
test('混合类型值写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt8(42, 0);
  buf.writeInt8(42.7, 1);
  buf.writeInt8('65', 2);
  buf.writeInt8(true, 3);
  buf.writeInt8(false, 4);
  buf.writeInt8(NaN, 5);
  buf.writeInt8([], 6);

  return buf[0] === 42 && buf[1] === 42 && buf[2] === 65 &&
         buf[3] === 1 && buf[4] === 0 && buf[5] === 0 && buf[6] === 0;
});

// Buffer 重用测试
test('清空后重新写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(100, 0);
  buf.fill(0);
  buf.writeInt8(50, 0);
  return buf[0] === 50;
});

// 多 buffer 并行写入
test('多个 buffer 独立写入', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  const buf3 = Buffer.alloc(4);

  buf1.writeInt8(10, 0);
  buf2.writeInt8(20, 0);
  buf3.writeInt8(30, 0);

  return buf1[0] === 10 && buf2[0] === 20 && buf3[0] === 30;
});

// 子数组独立性
test('多个 subarray 独立写入', () => {
  const buf = Buffer.alloc(12);
  const sub1 = buf.subarray(0, 4);
  const sub2 = buf.subarray(4, 8);
  const sub3 = buf.subarray(8, 12);

  sub1.writeInt8(11, 0);
  sub2.writeInt8(22, 0);
  sub3.writeInt8(33, 0);

  return buf[0] === 11 && buf[4] === 22 && buf[8] === 33;
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
