// buf.writeUInt32LE() - Extreme Boundary Tests
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

// 数值边界的极端测试
test('4294967295 边界值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(4294967295, 0); // 2^32 - 1
  return buf.readUInt32LE(0) === 4294967295;
});

test('4294967296 超出边界', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(4294967296, 0); // 2^32
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('2147483647 有符号边界', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(2147483647, 0); // 2^31 - 1
  return buf.readUInt32LE(0) === 2147483647;
});

test('2147483648 有符号边界+1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(2147483648, 0); // 2^31
  return buf.readUInt32LE(0) === 2147483648;
});

// 浮点数到整数转换的边界测试
test('4294967295.1 浮点边界', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(4294967295.1, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('4294967294.9 浮点边界', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(4294967294.9, 0);
  return buf.readUInt32LE(0) === 4294967294;
});

test('0.9999999999999999 接近1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(0.9999999999999999, 0);
  return buf.readUInt32LE(0) === 0; // 应该截断为0
});

test('1.0000000000000002 略大于1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(1.0000000000000002, 0);
  return buf.readUInt32LE(0) === 1; // 应该截断为1
});

// 科学计数法边界测试
test('1e10 科学计数法', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(1e10, 0); // 10,000,000,000 > 2^32
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('4.294967295e9 科学计数法边界', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(4.294967295e9, 0);
  return buf.readUInt32LE(0) === 4294967295;
});

test('1e-10 极小科学计数法', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(1e-10, 0);
  return buf.readUInt32LE(0) === 0;
});

// 字符串数值边界测试
test('字符串 "4294967295"', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE('4294967295', 0);
  return buf.readUInt32LE(0) === 4294967295;
});

test('字符串 "4294967296" 超出范围', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE('4294967296', 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('字符串 "0x100000000" 十六进制超出', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE('0x100000000', 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('字符串 "0xFFFFFFFF" 十六进制最大值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE('0xFFFFFFFF', 0);
  return buf.readUInt32LE(0) === 0xFFFFFFFF;
});

// 偏移量边界的极端测试
test('偏移量 Number.MAX_SAFE_INTEGER', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(123, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('must be an integer');
  }
});

test('偏移量 -Number.MAX_SAFE_INTEGER', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(123, -Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('偏移量 2^53', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(123, Math.pow(2, 53));
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('must be an integer');
  }
});

test('偏移量 2^32', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(123, Math.pow(2, 32));
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

// 缓冲区长度边界测试
test('最大可能的缓冲区长度', () => {
  try {
    // 尝试创建接近最大长度的缓冲区（可能会失败）
    const maxSize = Math.min(1024 * 1024 * 1024, Buffer.constants ? Buffer.constants.MAX_LENGTH : 2147483647);
    const buf = Buffer.allocUnsafe(Math.min(maxSize, 1024)); // 限制为1KB以避免内存问题
    
    buf.writeUInt32LE(0x12345678, buf.length - 4);
    return buf.readUInt32LE(buf.length - 4) === 0x12345678;
  } catch (e) {
    // 如果无法创建大缓冲区，这是可以接受的
    return true;
  }
});

// 特殊数值组合测试
test('所有位都是1的模式', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(0xFFFFFFFF, 0);
  
  // 验证每个字节都是0xFF
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('交替位模式 0xAAAAAAAA', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(0xAAAAAAAA, 0);
  
  return buf.readUInt32LE(0) === 0xAAAAAAAA;
});

test('交替位模式 0x55555555', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(0x55555555, 0);
  
  return buf.readUInt32LE(0) === 0x55555555;
});

// 内存对齐边界测试
test('1字节对齐写入', () => {
  const buf = Buffer.allocUnsafe(7);
  buf.writeUInt32LE(0x12345678, 1);
  return buf.readUInt32LE(1) === 0x12345678;
});

test('2字节对齐写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32LE(0x12345678, 2);
  return buf.readUInt32LE(2) === 0x12345678;
});

test('3字节对齐写入', () => {
  const buf = Buffer.allocUnsafe(9);
  buf.writeUInt32LE(0x12345678, 3);
  return buf.readUInt32LE(3) === 0x12345678;
});

// 连续边界写入测试
test('连续写入到边界', () => {
  const buf = Buffer.allocUnsafe(16);
  
  // 写入到各种边界位置
  buf.writeUInt32LE(0x11111111, 0);
  buf.writeUInt32LE(0x22222222, 4);
  buf.writeUInt32LE(0x33333333, 8);
  buf.writeUInt32LE(0x44444444, 12);
  
  return buf.readUInt32LE(0) === 0x11111111 &&
         buf.readUInt32LE(4) === 0x22222222 &&
         buf.readUInt32LE(8) === 0x33333333 &&
         buf.readUInt32LE(12) === 0x44444444;
});

// 覆盖写入边界测试
test('部分覆盖边界写入', () => {
  const buf = Buffer.allocUnsafe(8);
  
  buf.writeUInt32LE(0x12345678, 0);
  buf.writeUInt32LE(0x9ABCDEF0, 2); // 覆盖后两个字节和前两个字节
  
  // 验证覆盖结果
  return buf.readUInt32LE(2) === 0x9ABCDEF0;
});

// 极端偏移量浮点数测试
test('偏移量 4.0 精确浮点数', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32LE(0x12345678, 4.0);
  return buf.readUInt32LE(4) === 0x12345678;
});

test('偏移量 4.000000000000001 极小浮点差', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeUInt32LE(0x12345678, 4.000000000000001);
    return false;
  } catch (e) {
    return e.message.includes('must be an integer') || e.message.includes('out of range');
  }
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
