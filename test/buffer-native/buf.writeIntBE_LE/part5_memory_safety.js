// buf.writeIntBE() 和 buf.writeIntLE() - Memory Safety Tests
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

// 内存越界保护测试
test('writeIntBE - 防止Buffer末尾越界', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x12345678, 1, 4); // offset=1, length=4, 需要5字节空间
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 防止Buffer末尾越界', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x12345678, 2, 3); // offset=2, length=3, 需要5字节空间
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntBE - 精确边界不越界', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0x12345678, 0, 4); // 精确匹配
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56 || buf[3] !== 0x78) {
    throw new Error('边界写入错误');
  }
  return true;
});

test('writeIntLE - 精确边界不越界', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(0x12345678, 0, 4); // 精确匹配
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[0] !== 0x78 || buf[1] !== 0x56 || buf[2] !== 0x34 || buf[3] !== 0x12) {
    throw new Error('边界写入错误');
  }
  return true;
});

// 内存覆盖保护
test('writeIntBE - 不覆盖其他内存区域', () => {
  const originalData = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
  const buf = Buffer.from(originalData); // 复制一份

  buf.writeIntBE(0x1234, 1, 2); // 在中间写入

  // 检查其他位置未被修改
  if (buf[0] !== 0xAA) throw new Error('前导字节被修改');
  if (buf[3] !== 0xDD || buf[4] !== 0xEE || buf[5] !== 0xFF) {
    throw new Error('后续字节被修改');
  }

  // 检查写入位置
  if (buf[1] !== 0x12 || buf[2] !== 0x34) throw new Error('写入位置错误');
  return true;
});

test('writeIntLE - 不覆盖其他内存区域', () => {
  const originalData = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
  const buf = Buffer.from(originalData); // 复制一份

  buf.writeIntLE(0x1234, 2, 2); // 在中间写入

  // 检查其他位置未被修改
  if (buf[0] !== 0xAA || buf[1] !== 0xBB) throw new Error('前导字节被修改');
  if (buf[4] !== 0xEE || buf[5] !== 0xFF) throw new Error('后续字节被修改');

  // 检查写入位置
  if (buf[2] !== 0x34 || buf[3] !== 0x12) throw new Error('写入位置错误');
  return true;
});

// 零拷贝行为验证
test('writeIntBE - 修改是否影响原Buffer', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.from(buf1); // 创建新Buffer

  buf1.writeIntBE(0x12345678, 0, 4);

  // 检查原Buffer被修改，新Buffer未被修改
  if (buf1[0] !== 0x12 || buf1[1] !== 0x34 || buf1[2] !== 0x56 || buf1[3] !== 0x78) {
    throw new Error('原Buffer未被正确修改');
  }

  if (buf2[0] !== 0x00 || buf2[1] !== 0x00 || buf2[2] !== 0x00 || buf2[3] !== 0x00) {
    throw new Error('新Buffer被意外修改');
  }
  return true;
});

test('writeIntLE - 多次写入独立性', () => {
  const buf = Buffer.alloc(8);

  buf.writeIntLE(0x12345678, 0, 4);  // 有效4字节值
  buf.writeIntLE(0x7ABCDEF0, 4, 4);  // 使用有效值，2147483647范围内

  // 检查两次写入互不影响
  if (buf[0] !== 0x78 || buf[1] !== 0x56 || buf[2] !== 0x34 || buf[3] !== 0x12) {
    throw new Error('第一次写入被破坏');
  }

  if (buf[4] !== 0xF0 || buf[5] !== 0xDE || buf[6] !== 0xBC || buf[7] !== 0x7A) {
    throw new Error('第二次写入错误');
  }
  return true;
});

// 大数值内存安全
test('writeIntBE - 6字节大数值不溢出', () => {
  const buf = Buffer.alloc(6);
  const bigValue = Math.pow(2, 47) - 1; // 最大6字节有符号整数

  const result = buf.writeIntBE(bigValue, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');

  // 验证数值正确性
  const readValue = buf.readIntBE(0, 6);
  if (readValue !== bigValue) throw new Error('大数值读写不一致');
  return true;
});

test('writeIntLE - 6字节最小值不溢出', () => {
  const buf = Buffer.alloc(6);
  const minValue = -Math.pow(2, 47); // 最小6字节有符号整数

  const result = buf.writeIntLE(minValue, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');

  // 验证数值正确性
  const readValue = buf.readIntLE(0, 6);
  if (readValue !== minValue) throw new Error('最小值读写不一致');
  return true;
});

// 边界内存保护
test('writeIntBE - offset为负数时内存保护', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x1234, -1, 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误，保护内存安全
  }
});

test('writeIntLE - byteLength过大时内存保护', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x12345678, 0, 100);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误，保护内存安全
  }
});

// 并发写入安全
test('writeIntBE - 并发写入不冲突', () => {
  const buf = Buffer.alloc(12);

  // 模拟并发写入不同位置
  const writes = [
    { value: 0x1111, offset: 0, length: 2 },
    { value: 0x2222, offset: 2, length: 2 },
    { value: 0x3333, offset: 4, length: 2 },
    { value: 0x4444, offset: 6, length: 2 },
    { value: 0x5555, offset: 8, length: 2 },
    { value: 0x6666, offset: 10, length: 2 }
  ];

  writes.forEach(write => {
    buf.writeIntBE(write.value, write.offset, write.length);
  });

  // 验证所有写入都正确
  writes.forEach((write, index) => {
    const highByte = (write.value >> 8) & 0xFF;
    const lowByte = write.value & 0xFF;

    if (buf[write.offset] !== highByte || buf[write.offset + 1] !== lowByte) {
      throw new Error(`并发写入${index}验证失败`);
    }
  });
  return true;
});

// 特殊边界内存保护
test('writeIntBE - 1字节写入在Buffer末尾', () => {
  const buf = Buffer.alloc(1);
  const result = buf.writeIntBE(0x12, 0, 1);
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0x12) throw new Error('末尾字节写入错误');
  return true;
});

test('writeIntLE - 2字节写入跨越边界-1', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.writeIntLE(0x1234, 1, 2); // offset=1, length=2, 需要3字节空间
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
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