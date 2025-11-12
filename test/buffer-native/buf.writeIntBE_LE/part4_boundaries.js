// buf.writeIntBE() 和 buf.writeIntLE() - Boundary Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅ ' + name);
    } else {
      console.log('❌ ' + name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌ ' + name + ' - Error: ' + e.message);
  }
}

// 边界值测试
test('writeIntBE - 空Buffer写入', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.writeIntBE(0x12, 0, 1);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 1字节Buffer写入1字节数据', () => {
  const buf = Buffer.alloc(1);
  const result = buf.writeIntLE(0x12, 0, 1);
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0x12) throw new Error('数据写入错误');
  return true;
});

test('writeIntBE - 精确匹配Buffer长度', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0x12345678, 0, 4);
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56 || buf[3] !== 0x78) {
    throw new Error('数据写入错误');
  }
  return true;
});

test('writeIntLE - 精确匹配Buffer长度', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(0x12345678, 0, 4);
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[0] !== 0x78 || buf[1] !== 0x56 || buf[2] !== 0x34 || buf[3] !== 0x12) {
    throw new Error('数据写入错误');
  }
  return true;
});

// offset边界测试
test('writeIntBE - offset为0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0x1234, 0, 2);
  if (result !== 2) throw new Error('返回值应为2');
  if (buf[0] !== 0x12 || buf[1] !== 0x34) throw new Error('数据写入错误');
  return true;
});

test('writeIntLE - offset为Buffer长度-写入长度', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(0x1234, 2, 2);
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[2] !== 0x34 || buf[3] !== 0x12) throw new Error('数据写入位置错误');
  return true;
});

test('writeIntBE - offset为Buffer长度-1（1字节写入）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0x12, 3, 1);
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[3] !== 0x12) throw new Error('数据写入位置错误');
  return true;
});

// 大数据测试
test('writeIntBE - 大Buffer写入', () => {
  const buf = Buffer.alloc(1024);
  const result = buf.writeIntBE(0x12345678, 512, 4);
  if (result !== 516) throw new Error('返回值应为516');
  if (buf[512] !== 0x12 || buf[513] !== 0x34 || buf[514] !== 0x56 || buf[515] !== 0x78) {
    throw new Error('大数据写入错误');
  }
  return true;
});

test('writeIntLE - 大Buffer末尾写入', () => {
  const buf = Buffer.alloc(1024);
  const result = buf.writeIntLE(0x12345678, 1020, 4);
  if (result !== 1024) throw new Error('返回值应为1024');
  if (buf[1020] !== 0x78 || buf[1021] !== 0x56 || buf[1022] !== 0x34 || buf[1023] !== 0x12) {
    throw new Error('末尾数据写入错误');
  }
  return true;
});

// 特殊数值边界
test('writeIntBE - 写入最大值-1', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(2147483646, 0, 4); // MAX_VALUE - 1
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[0] !== 0x7F || buf[1] !== 0xFF || buf[2] !== 0xFF || buf[3] !== 0xFE) {
    throw new Error('最大值-1编码错误');
  }
  return true;
});

test('writeIntLE - 写入最小值+1', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(-2147483647, 0, 4); // MIN_VALUE + 1
  if (result !== 4) throw new Error('返回值应为4');
  // -2147483647 的补码是 0x80000001
  if (buf[0] !== 0x01 || buf[1] !== 0x00 || buf[2] !== 0x00 || buf[3] !== 0x80) {
    throw new Error('最小值+1编码错误');
  }
  return true;
});

// 多字节写入边界
test('writeIntBE - 多字节跨越边界', () => {
  const buf = Buffer.alloc(6);
  const result = buf.writeIntBE(0x1234567890AB, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56 ||
      buf[3] !== 0x78 || buf[4] !== 0x90 || buf[5] !== 0xAB) {
    throw new Error('多字节跨越边界写入错误');
  }
  return true;
});

test('writeIntLE - 多字节跨越边界', () => {
  const buf = Buffer.alloc(6);
  const result = buf.writeIntLE(0x1234567890AB, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  if (buf[0] !== 0xAB || buf[1] !== 0x90 || buf[2] !== 0x78 ||
      buf[3] !== 0x56 || buf[4] !== 0x34 || buf[5] !== 0x12) {
    throw new Error('多字节跨越边界写入错误');
  }
  return true;
});

// 连续写入测试
test('writeIntBE - 连续写入不重叠', () => {
  const buf = Buffer.alloc(8);
  buf.writeIntBE(0x1234, 0, 2);  // 有效2字节值
  buf.writeIntBE(0x5678, 2, 2);  // 有效2字节值
  buf.writeIntBE(0x7ABC, 4, 2);  // 使用有效值，32767范围内
  buf.writeIntBE(0x7EF0, 6, 2);  // 使用有效值，32767范围内

  if (buf[0] !== 0x12 || buf[1] !== 0x34) throw new Error('第一次写入错误');
  if (buf[2] !== 0x56 || buf[3] !== 0x78) throw new Error('第二次写入错误');
  if (buf[4] !== 0x7A || buf[5] !== 0xBC) throw new Error('第三次写入错误');
  if (buf[6] !== 0x7E || buf[7] !== 0xF0) throw new Error('第四次写入错误');
  return true;
});

test('writeIntLE - 连续写入重叠检测', () => {
  const buf = Buffer.alloc(8);
  buf.writeIntLE(0x1234, 0, 2);
  buf.writeIntLE(0x5678, 1, 2); // 与第一次重叠1字节

  if (buf[0] !== 0x34 || buf[1] !== 0x78 || buf[2] !== 0x56) {
    throw new Error('重叠写入错误');
  }
  return true;
});

// 极端offset测试
test('writeIntBE - 极大offset', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x12, 1000000, 1);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 负极大offset', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x12, -1000000, 1);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 字节长度边界
test('writeIntBE - byteLength为1', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(127, 0, 1);
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0x7F) throw new Error('1字节写入错误');
  return true;
});

test('writeIntLE - byteLength为6（最大支持）', () => {
  const buf = Buffer.alloc(6);
  const max6ByteValue = Math.pow(2, 47) - 1;
  const result = buf.writeIntLE(max6ByteValue, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  if (buf[0] !== 0xFF || buf[1] !== 0xFF || buf[2] !== 0xFF ||
      buf[3] !== 0xFF || buf[4] !== 0xFF || buf[5] !== 0x7F) {
    throw new Error('6字节最大值写入错误');
  }
  return true;
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