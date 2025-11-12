// buf.writeUInt32BE() - Edge Cases Tests
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

// 极端边界测试
test('超大缓冲区写入', () => {
  const buf = Buffer.allocUnsafe(1024 * 1024); // 1MB
  const offset = 1024 * 512; // 中间位置
  buf.writeUInt32BE(0x12345678, offset);

  return buf.readUInt32BE(offset) === 0x12345678;
});

test('缓冲区末尾精确写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 4); // 正好在最后4字节

  return buf.readUInt32BE(4) === 0x12345678;
});

test('缓冲区开头精确写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0); // 正好在前4字节

  return buf.readUInt32BE(0) === 0x12345678;
});

test('极限数值边界', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.writeUInt32BE(0xFFFFFFFF, 0);  // 最大值
  buf.writeUInt32BE(0x00000000, 4);  // 最小值
  buf.writeUInt32BE(0x80000000, 8);  // 最高位为1

  return buf.readUInt32BE(0) === 0xFFFFFFFF &&
         buf.readUInt32BE(4) === 0x00000000 &&
         buf.readUInt32BE(8) === 0x80000000;
});

test('数值转换边界', () => {
  const buf = Buffer.allocUnsafe(16);

  // 测试各种数值转换
  buf.writeUInt32BE(1.9, 0);      // 浮点数向下取整
  buf.writeUInt32BE(2.1, 4);      // 浮点数向下取整
  buf.writeUInt32BE(true, 8);     // 布尔值转换
  buf.writeUInt32BE(false, 12);   // 布尔值转换

  return buf.readUInt32BE(0) === 1 &&
         buf.readUInt32BE(4) === 2 &&
         buf.readUInt32BE(8) === 1 &&
         buf.readUInt32BE(12) === 0;
});

test('字符串数值转换', () => {
  const buf = Buffer.allocUnsafe(12);

  buf.writeUInt32BE('123', 0);      // 十进制字符串
  buf.writeUInt32BE('0xFF', 4);     // 十六进制字符串
  buf.writeUInt32BE('1e2', 8);      // 科学计数法字符串

  return buf.readUInt32BE(0) === 123 &&
         buf.readUInt32BE(4) === 255 &&
         buf.readUInt32BE(8) === 100;
});

test('偏移量转换边界', () => {
  const buf = Buffer.allocUnsafe(8);

  // undefined 偏移量应该为 0
  buf.writeUInt32BE(0x12345678, undefined);

  return buf.readUInt32BE(0) === 0x12345678;
});

test('数值溢出处理', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(0x1FFFFFFFF, 0); // 超过32位
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('负数处理', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(-1, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('特殊浮点数处理', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(Infinity, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('缓冲区共享测试', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = buf1.slice(0, 4); // 共享内存

  buf1.writeUInt32BE(0x12345678, 0);

  return buf2.readUInt32BE(0) === 0x12345678;
});

test('缓冲区切片写入', () => {
  const buf = Buffer.allocUnsafe(8);
  const slice = buf.slice(2, 6); // 4字节切片

  slice.writeUInt32BE(0x12345678, 0);

  return slice.readUInt32BE(0) === 0x12345678 &&
         buf.readUInt32BE(2) === 0x12345678;
});

test('连续覆盖写入', () => {
  const buf = Buffer.allocUnsafe(4);

  buf.writeUInt32BE(0x11111111, 0);
  buf.writeUInt32BE(0x22222222, 0); // 覆盖
  buf.writeUInt32BE(0x33333333, 0); // 再次覆盖

  return buf.readUInt32BE(0) === 0x33333333;
});

test('字节序一致性', () => {
  const buf = Buffer.allocUnsafe(4);
  const value = 0x01020304;

  buf.writeUInt32BE(value, 0);

  // 手动验证字节序
  const manual = (buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3];

  return manual === value;
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