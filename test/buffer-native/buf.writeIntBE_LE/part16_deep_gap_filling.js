// buf.writeIntBE() 和 buf.writeIntLE() - 深度查缺补漏测试
// 覆盖官方文档中的细节和遗漏场景
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

// ========================================
// 1. 48位精度边界的详细测试
// ========================================

test('writeIntBE - 48位精度最大值 (2^47-1)', () => {
  const buf = Buffer.alloc(6);
  const max48bit = Math.pow(2, 47) - 1; // 140737488355327
  
  const result = buf.writeIntBE(max48bit, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  
  const readValue = buf.readIntBE(0, 6);
  if (readValue !== max48bit) {
    throw new Error(`读取值${readValue}不等于${max48bit}`);
  }
  
  // 验证字节内容
  if (buf[0] !== 0x7F || buf[1] !== 0xFF || buf[2] !== 0xFF ||
      buf[3] !== 0xFF || buf[4] !== 0xFF || buf[5] !== 0xFF) {
    throw new Error('字节内容不正确');
  }
  return true;
});

test('writeIntLE - 48位精度最大值 (2^47-1)', () => {
  const buf = Buffer.alloc(6);
  const max48bit = Math.pow(2, 47) - 1; // 140737488355327
  
  const result = buf.writeIntLE(max48bit, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  
  const readValue = buf.readIntLE(0, 6);
  if (readValue !== max48bit) {
    throw new Error(`读取值${readValue}不等于${max48bit}`);
  }
  
  // 验证字节内容（小端序）
  if (buf[0] !== 0xFF || buf[1] !== 0xFF || buf[2] !== 0xFF ||
      buf[3] !== 0xFF || buf[4] !== 0xFF || buf[5] !== 0x7F) {
    throw new Error('字节内容不正确');
  }
  return true;
});

test('writeIntBE - 48位精度最小值 (-2^47)', () => {
  const buf = Buffer.alloc(6);
  const min48bit = -Math.pow(2, 47); // -140737488355328
  
  const result = buf.writeIntBE(min48bit, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  
  const readValue = buf.readIntBE(0, 6);
  if (readValue !== min48bit) {
    throw new Error(`读取值${readValue}不等于${min48bit}`);
  }
  
  // 验证字节内容（负数的补码）
  if (buf[0] !== 0x80 || buf[1] !== 0x00 || buf[2] !== 0x00 ||
      buf[3] !== 0x00 || buf[4] !== 0x00 || buf[5] !== 0x00) {
    throw new Error('字节内容不正确');
  }
  return true;
});

test('writeIntLE - 48位精度最小值 (-2^47)', () => {
  const buf = Buffer.alloc(6);
  const min48bit = -Math.pow(2, 47); // -140737488355328
  
  const result = buf.writeIntLE(min48bit, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  
  const readValue = buf.readIntLE(0, 6);
  if (readValue !== min48bit) {
    throw new Error(`读取值${readValue}不等于${min48bit}`);
  }
  
  // 验证字节内容（小端序，负数的补码）
  if (buf[0] !== 0x00 || buf[1] !== 0x00 || buf[2] !== 0x00 ||
      buf[3] !== 0x00 || buf[4] !== 0x00 || buf[5] !== 0x80) {
    throw new Error('字节内容不正确');
  }
  return true;
});

// ========================================
// 2. 精度损失测试（超过范围的值）
// ========================================

test('writeIntBE - 超过6字节范围会报错', () => {
  const buf = Buffer.alloc(6);
  const tooLarge = Math.pow(2, 47); // 刚好超过最大值
  
  try {
    buf.writeIntBE(tooLarge, 0, 6);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 超过6字节负数范围会报错', () => {
  const buf = Buffer.alloc(6);
  const tooSmall = -Math.pow(2, 47) - 1; // 刚好超过最小值
  
  try {
    buf.writeIntLE(tooSmall, 0, 6);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// ========================================
// 3. 返回值链式调用测试
// ========================================

test('writeIntBE - 使用返回值链式写入', () => {
  const buf = Buffer.alloc(12);
  
  let offset = buf.writeIntBE(0x1234, 0, 2);
  if (offset !== 2) throw new Error('第一次返回值应为2');
  
  offset = buf.writeIntBE(0x56, offset, 1);
  if (offset !== 3) throw new Error('第二次返回值应为3');
  
  offset = buf.writeIntBE(0x789ABC, offset, 3);
  if (offset !== 6) throw new Error('第三次返回值应为6');
  
  // 验证写入的数据
  if (buf[0] !== 0x12 || buf[1] !== 0x34) throw new Error('前2字节错误');
  if (buf[2] !== 0x56) throw new Error('第3字节错误');
  if (buf[3] !== 0x78 || buf[4] !== 0x9A || buf[5] !== 0xBC) {
    throw new Error('后3字节错误');
  }
  
  return true;
});

test('writeIntLE - 使用返回值链式写入', () => {
  const buf = Buffer.alloc(10);
  
  let offset = buf.writeIntLE(-128, 0, 1);
  if (offset !== 1) throw new Error('第一次返回值应为1');
  
  offset = buf.writeIntLE(-32768, offset, 2);
  if (offset !== 3) throw new Error('第二次返回值应为3');
  
  offset = buf.writeIntLE(0x12345678, offset, 4);
  if (offset !== 7) throw new Error('第三次返回值应为7');
  
  // 验证写入的数据
  if (buf[0] !== 0x80) throw new Error('第1字节错误');
  if (buf[1] !== 0x00 || buf[2] !== 0x80) throw new Error('第2-3字节错误');
  if (buf[3] !== 0x78 || buf[4] !== 0x56 || buf[5] !== 0x34 || buf[6] !== 0x12) {
    throw new Error('第4-7字节错误');
  }
  
  return true;
});

// ========================================
// 4. 分数截断行为测试
// ========================================

test('writeIntBE - 小数被截断为整数', () => {
  const buf = Buffer.alloc(4);
  
  buf.writeIntBE(123.7, 0, 2);
  const read1 = buf.readIntBE(0, 2);
  if (read1 !== 123) throw new Error('123.7应该被截断为123');
  
  buf.writeIntBE(-456.9, 2, 2);
  const read2 = buf.readIntBE(2, 2);
  if (read2 !== -456) throw new Error('-456.9应该被截断为-456');
  
  return true;
});

test('writeIntLE - 小数被截断为整数', () => {
  const buf = Buffer.alloc(6);
  
  buf.writeIntLE(999.123, 0, 2);
  const read1 = buf.readIntLE(0, 2);
  if (read1 !== 999) throw new Error('999.123应该被截断为999');
  
  buf.writeIntLE(-1234.567, 2, 2);
  const read2 = buf.readIntLE(2, 2);
  if (read2 !== -1234) throw new Error('-1234.567应该被截断为-1234');
  
  buf.writeIntLE(0.9999, 4, 1);
  const read3 = buf.readIntLE(4, 1);
  if (read3 !== 0) throw new Error('0.9999应该被截断为0');
  
  return true;
});

test('writeIntBE - Math.floor/ceil/round行为', () => {
  const buf = Buffer.alloc(8);
  
  // 测试向下取整行为
  buf.writeIntBE(5.1, 0, 1);
  buf.writeIntBE(5.5, 1, 1);
  buf.writeIntBE(5.9, 2, 1);
  
  if (buf[0] !== 5 || buf[1] !== 5 || buf[2] !== 5) {
    throw new Error('正数小数应该向下取整');
  }
  
  // 测试负数
  buf.writeIntBE(-5.1, 3, 1);
  buf.writeIntBE(-5.5, 4, 1);
  buf.writeIntBE(-5.9, 5, 1);
  
  const r1 = buf.readIntBE(3, 1);
  const r2 = buf.readIntBE(4, 1);
  const r3 = buf.readIntBE(5, 1);
  
  if (r1 !== -5 || r2 !== -5 || r3 !== -5) {
    throw new Error('负数小数应该向上取整（趋向零）');
  }
  
  return true;
});

// ========================================
// 5. 符号扩展详细验证
// ========================================

test('writeIntBE - 1字节符号扩展验证', () => {
  const buf = Buffer.alloc(4);
  
  // 写入1字节的-1 (0xFF)
  buf.writeIntBE(-1, 0, 1);
  if (buf[0] !== 0xFF) throw new Error('0xFF写入错误');
  
  // 读取应该正确扩展符号
  const read1 = buf.readIntBE(0, 1);
  if (read1 !== -1) throw new Error('读取-1失败');
  
  // 写入1字节的-128 (0x80)
  buf.writeIntBE(-128, 1, 1);
  if (buf[1] !== 0x80) throw new Error('0x80写入错误');
  
  const read2 = buf.readIntBE(1, 1);
  if (read2 !== -128) throw new Error('读取-128失败');
  
  return true;
});

test('writeIntLE - 2字节符号扩展验证', () => {
  const buf = Buffer.alloc(6);
  
  // 写入2字节的-1 (0xFFFF)
  buf.writeIntLE(-1, 0, 2);
  if (buf[0] !== 0xFF || buf[1] !== 0xFF) throw new Error('0xFFFF写入错误');
  
  const read1 = buf.readIntLE(0, 2);
  if (read1 !== -1) throw new Error('读取-1失败');
  
  // 写入2字节的-32768 (0x8000)
  buf.writeIntLE(-32768, 2, 2);
  if (buf[2] !== 0x00 || buf[3] !== 0x80) throw new Error('0x8000写入错误');
  
  const read2 = buf.readIntLE(2, 2);
  if (read2 !== -32768) throw new Error('读取-32768失败');
  
  return true;
});

test('writeIntBE - 3字节符号扩展验证', () => {
  const buf = Buffer.alloc(9);
  
  // 写入3字节的-1 (0xFFFFFF)
  buf.writeIntBE(-1, 0, 3);
  if (buf[0] !== 0xFF || buf[1] !== 0xFF || buf[2] !== 0xFF) {
    throw new Error('0xFFFFFF写入错误');
  }
  
  const read1 = buf.readIntBE(0, 3);
  if (read1 !== -1) throw new Error('读取-1失败');
  
  // 写入3字节的-8388608 (0x800000)
  buf.writeIntBE(-8388608, 3, 3);
  if (buf[3] !== 0x80 || buf[4] !== 0x00 || buf[5] !== 0x00) {
    throw new Error('0x800000写入错误');
  }
  
  const read2 = buf.readIntBE(3, 3);
  if (read2 !== -8388608) throw new Error('读取-8388608失败');
  
  return true;
});

// ========================================
// 6. offset边界的精确测试
// ========================================

test('writeIntBE - offset + byteLength = buffer.length (1字节)', () => {
  const buf = Buffer.alloc(5);
  const result = buf.writeIntBE(0x42, 4, 1);
  
  if (result !== 5) throw new Error('返回值应为5');
  if (buf[4] !== 0x42) throw new Error('末尾字节写入错误');
  
  return true;
});

test('writeIntLE - offset + byteLength = buffer.length (2字节)', () => {
  const buf = Buffer.alloc(6);
  const result = buf.writeIntLE(0x1234, 4, 2);
  
  if (result !== 6) throw new Error('返回值应为6');
  if (buf[4] !== 0x34 || buf[5] !== 0x12) throw new Error('末尾字节写入错误');
  
  return true;
});

test('writeIntBE - offset + byteLength = buffer.length (6字节)', () => {
  const buf = Buffer.alloc(10);
  const value = 0x123456789ABC;
  const result = buf.writeIntBE(value, 4, 6);
  
  if (result !== 10) throw new Error('返回值应为10');
  if (buf[4] !== 0x12 || buf[5] !== 0x34 || buf[6] !== 0x56 ||
      buf[7] !== 0x78 || buf[8] !== 0x9A || buf[9] !== 0xBC) {
    throw new Error('末尾6字节写入错误');
  }
  
  return true;
});

// ========================================
// 7. 空Buffer和极小Buffer测试
// ========================================

test('writeIntBE - 1字节Buffer写入1字节', () => {
  const buf = Buffer.alloc(1);
  const result = buf.writeIntBE(127, 0, 1);
  
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 127) throw new Error('写入错误');
  if (buf.readIntBE(0, 1) !== 127) throw new Error('读取错误');
  
  return true;
});

test('writeIntLE - 1字节Buffer写入负数', () => {
  const buf = Buffer.alloc(1);
  const result = buf.writeIntLE(-128, 0, 1);
  
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0x80) throw new Error('写入错误');
  if (buf.readIntLE(0, 1) !== -128) throw new Error('读取错误');
  
  return true;
});

test('writeIntBE - 2字节Buffer写入2字节', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeIntBE(32767, 0, 2);
  
  if (result !== 2) throw new Error('返回值应为2');
  if (buf[0] !== 0x7F || buf[1] !== 0xFF) throw new Error('写入错误');
  if (buf.readIntBE(0, 2) !== 32767) throw new Error('读取错误');
  
  return true;
});

// ========================================
// 8. 交叉读写一致性测试
// ========================================

test('writeIntBE - 写入4字节后用2字节读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(0x12345678, 0, 4);
  
  // 读取高2字节
  const high = buf.readIntBE(0, 2);
  if (high !== 0x1234) throw new Error('高2字节读取错误');
  
  // 读取低2字节
  const low = buf.readIntBE(2, 2);
  if (low !== 0x5678) throw new Error('低2字节读取错误');
  
  return true;
});

test('writeIntLE - 写入6字节后分段读取', () => {
  const buf = Buffer.alloc(6);
  buf.writeIntLE(0x123456789ABC, 0, 6);
  
  // 分3段读取
  const part1 = buf.readIntLE(0, 2);
  const part2 = buf.readIntLE(2, 2);
  const part3 = buf.readIntLE(4, 2);
  
  if (part1 !== -25924) throw new Error('第1段读取错误'); // 0x9ABC的有符号值是-25924
  if (part2 !== 22136) throw new Error('第2段读取错误'); // 0x5678 = 22136
  if (part3 !== 4660) throw new Error('第3段读取错误'); // 0x1234 = 4660
  
  return true;
});

test('writeIntBE - 重叠写入测试', () => {
  const buf = Buffer.alloc(6);
  
  // 先写入6字节
  buf.writeIntBE(0x111111111111, 0, 6);
  
  // 在中间重叠写入4字节
  buf.writeIntBE(0x22222222, 1, 4);
  
  // 验证结果：0x11 22 22 22 22 11
  if (buf[0] !== 0x11) throw new Error('第1字节应保持不变');
  if (buf[1] !== 0x22 || buf[2] !== 0x22 || buf[3] !== 0x22 || buf[4] !== 0x22) {
    throw new Error('中间4字节应被覆盖');
  }
  if (buf[5] !== 0x11) throw new Error('最后1字节应保持不变');
  
  return true;
});

// ========================================
// 9. 各种byteLength的完整性测试
// ========================================

test('writeIntBE - 所有byteLength (1-6) 的往返测试', () => {
  const testCases = [
    { length: 1, value: 127, min: -128, max: 127 },
    { length: 2, value: 32767, min: -32768, max: 32767 },
    { length: 3, value: 8388607, min: -8388608, max: 8388607 },
    { length: 4, value: 2147483647, min: -2147483648, max: 2147483647 },
    { length: 5, value: 549755813887, min: -549755813888, max: 549755813887 },
    { length: 6, value: 140737488355327, min: -140737488355328, max: 140737488355327 }
  ];
  
  testCases.forEach(tc => {
    const buf = Buffer.alloc(tc.length);
    
    // 测试最大值
    buf.writeIntBE(tc.max, 0, tc.length);
    const readMax = buf.readIntBE(0, tc.length);
    if (readMax !== tc.max) {
      throw new Error(`${tc.length}字节最大值往返失败: 期望${tc.max}, 实际${readMax}`);
    }
    
    // 测试最小值
    buf.writeIntBE(tc.min, 0, tc.length);
    const readMin = buf.readIntBE(0, tc.length);
    if (readMin !== tc.min) {
      throw new Error(`${tc.length}字节最小值往返失败: 期望${tc.min}, 实际${readMin}`);
    }
  });
  
  return true;
});

test('writeIntLE - 所有byteLength (1-6) 的往返测试', () => {
  const testCases = [
    { length: 1, value: 127, min: -128, max: 127 },
    { length: 2, value: 32767, min: -32768, max: 32767 },
    { length: 3, value: 8388607, min: -8388608, max: 8388607 },
    { length: 4, value: 2147483647, min: -2147483648, max: 2147483647 },
    { length: 5, value: 549755813887, min: -549755813888, max: 549755813887 },
    { length: 6, value: 140737488355327, min: -140737488355328, max: 140737488355327 }
  ];
  
  testCases.forEach(tc => {
    const buf = Buffer.alloc(tc.length);
    
    // 测试最大值
    buf.writeIntLE(tc.max, 0, tc.length);
    const readMax = buf.readIntLE(0, tc.length);
    if (readMax !== tc.max) {
      throw new Error(`${tc.length}字节最大值往返失败: 期望${tc.max}, 实际${readMax}`);
    }
    
    // 测试最小值
    buf.writeIntLE(tc.min, 0, tc.length);
    const readMin = buf.readIntLE(0, tc.length);
    if (readMin !== tc.min) {
      throw new Error(`${tc.length}字节最小值往返失败: 期望${tc.min}, 实际${readMin}`);
    }
  });
  
  return true;
});

// ========================================
// 总结输出
// ========================================

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
