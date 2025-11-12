// buf.writeUInt32LE() - Special Cases Tests
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

// 特殊场景测试
test('零长度缓冲区边缘情况', () => {
  try {
    const buf = Buffer.allocUnsafe(0);
    buf.writeUInt32LE(0x12345678, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('Attempt to access memory outside buffer bounds');
  }
});

test('刚好4字节缓冲区', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUInt32LE(0x12345678, 0);

  return result === 4 && buf.readUInt32LE(0) === 0x12345678;
});

test('5字节缓冲区末尾写入', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.writeUInt32LE(0x12345678, 1); // 从偏移量1开始，到字节4

  return result === 5 && buf.readUInt32LE(1) === 0x12345678;
});

test('6字节缓冲区末尾写入', () => {
  const buf = Buffer.allocUnsafe(6);
  const result = buf.writeUInt32LE(0x12345678, 2); // 从偏移量2开始，到字节5

  return result === 6 && buf.readUInt32LE(2) === 0x12345678;
});

test('7字节缓冲区多种偏移', () => {
  // 测试1：验证偏移量边界检查
  try {
    const buf = Buffer.allocUnsafe(7);
    buf.writeUInt32LE(0x12345678, 4); // 这会超出边界，应该失败
    return false;
  } catch (e) {
    if (!e.message.includes('"offset" is out of range')) return false;
  }

  // 测试2：验证相邻写入的数据覆盖
  const buf2 = Buffer.allocUnsafe(7);
  buf2.writeUInt32LE(0x11111111, 0); // 写入字节0-3

  try {
    buf2.writeUInt32LE(0x22222222, 4); // 这会超出边界，应该失败
    return false;
  } catch (e) {
    // 验证第一个值保持不变
    return buf2.readUInt32LE(0) === 0x11111111 &&
           e.message.includes('"offset" is out of range');
  }
});

test('最大值边界处理', () => {
  const buf = Buffer.allocUnsafe(4);

  buf.writeUInt32LE(0xFFFFFFFF, 0); // 32位无符号最大值

  return buf.readUInt32LE(0) === 0xFFFFFFFF;
});

test('最小值边界处理', () => {
  const buf = Buffer.allocUnsafe(4);

  buf.writeUInt32LE(0x00000000, 0); // 最小值

  return buf.readUInt32LE(0) === 0;
});

test('中间值和特殊位模式', () => {
  const buf = Buffer.allocUnsafe(16);

  // 测试各种位模式
  buf.writeUInt32LE(0x80000000, 0);   // 只有最高位
  buf.writeUInt32LE(0x7FFFFFFF, 4);   // 只有最高位为0
  buf.writeUInt32LE(0x55555555, 8);   // 交替位模式
  buf.writeUInt32LE(0xAAAAAAAA, 12);  // 交替位模式（反向）

  return buf.readUInt32LE(0) === 0x80000000 &&
         buf.readUInt32LE(4) === 0x7FFFFFFF &&
         buf.readUInt32LE(8) === 0x55555555 &&
         buf.readUInt32LE(12) === 0xAAAAAAAA;
});

test('数值类型转换的极端情况', () => {
  const buf = Buffer.allocUnsafe(16);

  // 测试各种数值转换
  buf.writeUInt32LE(Number.MIN_VALUE, 0);     // 最小正数
  try {
    buf.writeUInt32LE(Number.MAX_VALUE, 4);     // 最大数（应该抛出异常）
    return false;
  } catch (e) {
    // 继续其他测试
  }
  buf.writeUInt32LE(1.999999, 8);             // 接近2的浮点数
  buf.writeUInt32LE(2.000001, 12);            // 刚刚超过2的浮点数

  // 验证转换结果
  return buf.readUInt32LE(0) === 0 &&           // MIN_VALUE转换为0
         buf.readUInt32LE(8) === 1 &&            // 1.999999向下取整为1
         buf.readUInt32LE(12) === 2;             // 2.000001向下取整为2
});

test('字符串解析的极端情况', () => {
  const buf = Buffer.allocUnsafe(16);

  // 测试各种字符串格式
  buf.writeUInt32LE('0x0', 0);           // 十六进制0
  buf.writeUInt32LE('0x00', 4);          // 十六进制00
  buf.writeUInt32LE('0x000', 8);         // 十六进制000
  buf.writeUInt32LE('0x0000', 12);       // 十六进制0000

  return buf.readUInt32LE(0) === 0 &&
         buf.readUInt32LE(4) === 0 &&
         buf.readUInt32LE(8) === 0 &&
         buf.readUInt32LE(12) === 0;
});

test('偏移量计算的边界情况', () => {
  const buf = Buffer.allocUnsafe(8);

  // 测试各种数值类型的偏移量
  buf.writeUInt32LE(0x12345678, 0);       // 整数偏移量
  buf.writeUInt32LE(0x9ABCDEF0, 4);       // 整数偏移量

  // 验证写入位置
  return buf.readUInt32LE(0) === 0x12345678 &&
         buf.readUInt32LE(4) === 0x9ABCDEF0;
});

test('缓冲区状态变化的测试', () => {
  const buf = Buffer.allocUnsafe(8);

  // 初始状态
  buf.fill(0xFF);

  // 写入数据
  buf.writeUInt32LE(0x12345678, 0);
  buf.writeUInt32LE(0x9ABCDEF0, 4);

  // 验证状态变化
  return buf[0] === 0x78 && buf[1] === 0x56 &&
         buf[2] === 0x34 && buf[3] === 0x12 &&
         buf[4] === 0xF0 && buf[5] === 0xDE &&
         buf[6] === 0xBC && buf[7] === 0x9A;
});

test('内存布局验证', () => {
  const buf = Buffer.allocUnsafe(8);

  // 写入两个32位数
  buf.writeUInt32LE(0x01020304, 0);
  buf.writeUInt32LE(0x05060708, 4);

  // 验证内存布局
  return buf[0] === 0x04 && buf[1] === 0x03 && buf[2] === 0x02 && buf[3] === 0x01 &&
         buf[4] === 0x08 && buf[5] === 0x07 && buf[6] === 0x06 && buf[7] === 0x05;
});

test('与其他Buffer方法的交互', () => {
  const buf = Buffer.allocUnsafe(8);

  // 使用不同方法写入和读取
  buf.writeUInt32LE(0x12345678, 0);
  buf.writeUInt32LE(0x9ABCDEF0, 4);

  // 使用其他方法验证
  const val1 = buf.readUInt32LE(0);
  const val2 = buf.readUInt32BE(0); // 用BE方式读取LE数据，应该不同
  const val3 = buf.readUInt32LE(4);
  const val4 = buf.readUInt32BE(4); // 用BE方式读取LE数据，应该不同

  return val1 === 0x12345678 && val2 !== val1 &&
         val3 === 0x9ABCDEF0 && val4 !== val3;
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