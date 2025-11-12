// buf.writeIntBE() 和 buf.writeIntLE() - 最终综合测试
// 覆盖所有可能遗漏的交互场景和极端组合
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
// 1. 字节序交叉测试（BE写LE读，LE写BE读）
// ========================================

test('writeIntBE后用readIntLE读取 - 1字节', () => {
  const buf = Buffer.alloc(1);
  buf.writeIntBE(0x7F, 0, 1);
  
  // 1字节时BE和LE应该相同
  const readLE = buf.readIntLE(0, 1);
  const readBE = buf.readIntBE(0, 1);
  
  if (readLE !== 0x7F || readBE !== 0x7F) {
    throw new Error('1字节BE/LE应该相同');
  }
  
  return true;
});

test('writeIntLE后用readIntBE读取 - 2字节', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntLE(0x1234, 0, 2); // LE: 34 12
  
  // BE读取会得到不同的值
  const readBE = buf.readIntBE(0, 2); // 读取为 0x3412
  const readLE = buf.readIntLE(0, 2); // 读取为 0x1234
  
  if (readLE !== 0x1234) throw new Error('LE读取错误');
  if (readBE !== 0x3412) throw new Error('BE读取应该是字节反转的值');
  
  return true;
});

test('writeIntBE后用readIntLE读取 - 4字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(0x12345678, 0, 4); // BE: 12 34 56 78
  
  // LE读取会得到反转的值
  const readLE = buf.readIntLE(0, 4); // 读取为 0x78563412
  const readBE = buf.readIntBE(0, 4); // 读取为 0x12345678
  
  if (readBE !== 0x12345678) throw new Error('BE读取错误');
  if (readLE !== 0x78563412) throw new Error('LE读取应该是字节反转的值');
  
  return true;
});

test('writeIntLE后用readIntBE读取 - 6字节', () => {
  const buf = Buffer.alloc(6);
  const value = 0x123456789ABC;
  buf.writeIntLE(value, 0, 6); // LE: BC 9A 78 56 34 12
  
  // BE读取会得到完全反转的值
  const readLE = buf.readIntLE(0, 6);
  const readBE = buf.readIntBE(0, 6);
  
  if (readLE !== value) throw new Error('LE读取错误');
  // BE读取的值应该是字节反转：0x12 34 56 78 9A BC = -25345817763652
  if (readBE === value) throw new Error('BE读取不应该等于原值');
  
  return true;
});

// ========================================
// 2. 与其他Buffer方法的完整交互
// ========================================

test('writeIntBE后Buffer.copy - 数据保持一致', () => {
  const src = Buffer.alloc(6);
  const dst = Buffer.alloc(6);
  
  src.writeIntBE(0x123456789ABC, 0, 6);
  src.copy(dst);
  
  const readValue = dst.readIntBE(0, 6);
  if (readValue !== 0x123456789ABC) throw new Error('copy后数据不一致');
  
  return true;
});

test('writeIntLE后Buffer.slice - 视图共享数据', () => {
  const original = Buffer.alloc(10);
  original.writeIntLE(0x12345678, 2, 4);
  
  const sliced = original.slice(2, 6);
  const readValue = sliced.readIntLE(0, 4);
  
  if (readValue !== 0x12345678) throw new Error('slice后读取错误');
  
  // 修改slice应该影响原Buffer
  sliced.writeIntLE(0x7EDCBA98, 0, 4); // 使用合法的32位有符号整数范围内的值
  const originalRead = original.readIntLE(2, 4);
  
  if (originalRead !== 0x7EDCBA98) throw new Error('slice修改未反映到原Buffer');
  
  return true;
});

test('Buffer.fill后writeIntBE覆盖', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  
  // 所有字节都应该是0xFF
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xFF) throw new Error('fill失败');
  }
  
  // 覆盖中间4字节
  buf.writeIntBE(0x12345678, 2, 4);
  
  // 验证前后未被覆盖
  if (buf[0] !== 0xFF || buf[1] !== 0xFF) throw new Error('前2字节应该保持0xFF');
  if (buf[6] !== 0xFF || buf[7] !== 0xFF) throw new Error('后2字节应该保持0xFF');
  
  // 验证中间被覆盖
  const readValue = buf.readIntBE(2, 4);
  if (readValue !== 0x12345678) throw new Error('覆盖写入失败');
  
  return true;
});

test('writeIntLE后Buffer.equals - 比较一致性', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  
  buf1.writeIntLE(0x12345678, 0, 4);
  buf2.writeIntLE(0x12345678, 0, 4);
  
  if (!buf1.equals(buf2)) throw new Error('相同内容的Buffer应该相等');
  
  return true;
});

test('writeIntBE后Buffer.compare - 顺序正确', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  
  buf1.writeIntBE(100, 0, 4);
  buf2.writeIntBE(200, 0, 4);
  
  const result = buf1.compare(buf2);
  if (result >= 0) throw new Error('buf1应该小于buf2');
  
  return true;
});

// ========================================
// 3. 2的幂次方边界值测试
// ========================================

test('writeIntBE - 2的幂次方边界 (7位)', () => {
  const buf = Buffer.alloc(1);
  const values = [64, 127, -128, -64]; // 2^6, 2^7-1, -2^7, -2^6
  
  values.forEach(value => {
    buf.writeIntBE(value, 0, 1);
    const read = buf.readIntBE(0, 1);
    if (read !== value) throw new Error(`${value}写入/读取不一致`);
  });
  
  return true;
});

test('writeIntLE - 2的幂次方边界 (15位)', () => {
  const buf = Buffer.alloc(2);
  const values = [16384, 32767, -32768, -16384]; // 2^14, 2^15-1, -2^15, -2^14
  
  values.forEach(value => {
    buf.writeIntLE(value, 0, 2);
    const read = buf.readIntLE(0, 2);
    if (read !== value) throw new Error(`${value}写入/读取不一致`);
  });
  
  return true;
});

test('writeIntBE - 2的幂次方边界 (23位)', () => {
  const buf = Buffer.alloc(3);
  const values = [4194304, 8388607, -8388608, -4194304]; // 2^22, 2^23-1, -2^23, -2^22
  
  values.forEach(value => {
    buf.writeIntBE(value, 0, 3);
    const read = buf.readIntBE(0, 3);
    if (read !== value) throw new Error(`${value}写入/读取不一致`);
  });
  
  return true;
});

test('writeIntLE - 2的幂次方边界 (31位)', () => {
  const buf = Buffer.alloc(4);
  const values = [1073741824, 2147483647, -2147483648, -1073741824]; // 2^30, 2^31-1, -2^31, -2^30
  
  values.forEach(value => {
    buf.writeIntLE(value, 0, 4);
    const read = buf.readIntLE(0, 4);
    if (read !== value) throw new Error(`${value}写入/读取不一致`);
  });
  
  return true;
});

test('writeIntBE - 2的幂次方边界 (39位)', () => {
  const buf = Buffer.alloc(5);
  const values = [274877906944, 549755813887, -549755813888, -274877906944]; // 2^38, 2^39-1, -2^39, -2^38
  
  values.forEach(value => {
    buf.writeIntBE(value, 0, 5);
    const read = buf.readIntBE(0, 5);
    if (read !== value) throw new Error(`${value}写入/读取不一致`);
  });
  
  return true;
});

test('writeIntLE - 2的幂次方边界 (47位)', () => {
  const buf = Buffer.alloc(6);
  const values = [70368744177664, 140737488355327, -140737488355328, -70368744177664]; // 2^46, 2^47-1, -2^47, -2^46
  
  values.forEach(value => {
    buf.writeIntLE(value, 0, 6);
    const read = buf.readIntLE(0, 6);
    if (read !== value) throw new Error(`${value}写入/读取不一致`);
  });
  
  return true;
});

// ========================================
// 4. 边界值±1测试（确保边界检查精确）
// ========================================

test('writeIntBE - 最大值+1应该抛出错误 (1字节)', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeIntBE(128, 0, 1); // 127+1
    return false;
  } catch (error) {
    return true;
  }
});

test('writeIntLE - 最小值-1应该抛出错误 (1字节)', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeIntLE(-129, 0, 1); // -128-1
    return false;
  } catch (error) {
    return true;
  }
});

test('writeIntBE - 最大值+1应该抛出错误 (2字节)', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeIntBE(32768, 0, 2); // 32767+1
    return false;
  } catch (error) {
    return true;
  }
});

test('writeIntLE - 最小值-1应该抛出错误 (2字节)', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeIntLE(-32769, 0, 2); // -32768-1
    return false;
  } catch (error) {
    return true;
  }
});

test('writeIntBE - 最大值+1应该抛出错误 (6字节)', () => {
  const buf = Buffer.alloc(6);
  const maxPlus1 = Math.pow(2, 47); // 140737488355327+1
  try {
    buf.writeIntBE(maxPlus1, 0, 6);
    return false;
  } catch (error) {
    return true;
  }
});

test('writeIntLE - 最小值-1应该抛出错误 (6字节)', () => {
  const buf = Buffer.alloc(6);
  const minMinus1 = -Math.pow(2, 47) - 1; // -140737488355328-1
  try {
    buf.writeIntLE(minMinus1, 0, 6);
    return false;
  } catch (error) {
    return true;
  }
});

// ========================================
// 5. offset边界±1测试
// ========================================

test('writeIntBE - offset太大（length-byteLength+1）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.writeIntBE(100, 3, 3); // offset(3) + byteLength(3) = 6 > length(5)
    return false;
  } catch (error) {
    return true;
  }
});

test('writeIntLE - offset刚好合法（length-byteLength）', () => {
  const buf = Buffer.alloc(5);
  const result = buf.writeIntLE(100, 2, 3); // offset(2) + byteLength(3) = 5 = length
  
  if (result !== 5) throw new Error('返回值应为5');
  const readValue = buf.readIntLE(2, 3);
  if (readValue !== 100) throw new Error('读取错误');
  
  return true;
});

// ========================================
// 6. 幂等性测试（多次调用相同参数）
// ========================================

test('writeIntBE - 多次写入相同值保持幂等', () => {
  const buf = Buffer.alloc(4);
  const value = 0x12345678;
  
  // 写入10次
  for (let i = 0; i < 10; i++) {
    buf.writeIntBE(value, 0, 4);
  }
  
  const readValue = buf.readIntBE(0, 4);
  if (readValue !== value) throw new Error('多次写入后值不一致');
  
  return true;
});

test('writeIntLE - 交替写入两个值', () => {
  const buf = Buffer.alloc(4);
  const value1 = 1000;
  const value2 = 2000;
  
  for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) {
      buf.writeIntLE(value1, 0, 4);
    } else {
      buf.writeIntLE(value2, 0, 4);
    }
  }
  
  // 最后一次是偶数次，应该是value2
  const readValue = buf.readIntLE(0, 4);
  if (readValue !== value2) throw new Error('最后的值应该是value2');
  
  return true;
});

// ========================================
// 7. 与Buffer.from的交互
// ========================================

test('Buffer.from创建后writeIntBE', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  buf.writeIntBE(0x12345678, 0, 4);
  
  const readValue = buf.readIntBE(0, 4);
  if (readValue !== 0x12345678) throw new Error('写入错误');
  
  return true;
});

test('Buffer.from字符串后writeIntLE覆盖', () => {
  const buf = Buffer.from('abcd'); // 4字节
  buf.writeIntLE(0x31323334, 0, 4); // ASCII: '4321'
  
  // 验证覆盖成功
  if (buf[0] !== 0x34 || buf[1] !== 0x33 || buf[2] !== 0x32 || buf[3] !== 0x31) {
    throw new Error('覆盖失败');
  }
  
  return true;
});

// ========================================
// 8. 负数的特殊组合
// ========================================

test('writeIntBE - 连续负数序列', () => {
  const buf = Buffer.alloc(6);
  const negatives = [-1, -2, -3];
  
  buf.writeIntBE(negatives[0], 0, 2);
  buf.writeIntBE(negatives[1], 2, 2);
  buf.writeIntBE(negatives[2], 4, 2);
  
  if (buf.readIntBE(0, 2) !== -1) throw new Error('第1个负数错误');
  if (buf.readIntBE(2, 2) !== -2) throw new Error('第2个负数错误');
  if (buf.readIntBE(4, 2) !== -3) throw new Error('第3个负数错误');
  
  return true;
});

test('writeIntLE - 负数与正数交替', () => {
  const buf = Buffer.alloc(8);
  
  buf.writeIntLE(-100, 0, 2);
  buf.writeIntLE(200, 2, 2);
  buf.writeIntLE(-300, 4, 2);
  buf.writeIntLE(400, 6, 2);
  
  if (buf.readIntLE(0, 2) !== -100) throw new Error('第1个值错误');
  if (buf.readIntLE(2, 2) !== 200) throw new Error('第2个值错误');
  if (buf.readIntLE(4, 2) !== -300) throw new Error('第3个值错误');
  if (buf.readIntLE(6, 2) !== 400) throw new Error('第4个值错误');
  
  return true;
});

// ========================================
// 9. 所有byteLength的临界值测试
// ========================================

test('writeIntBE - 所有byteLength的max-1, max, max+1', () => {
  const testCases = [
    { length: 1, max: 127 },
    { length: 2, max: 32767 },
    { length: 3, max: 8388607 },
    { length: 4, max: 2147483647 },
    { length: 5, max: 549755813887 },
    { length: 6, max: 140737488355327 }
  ];
  
  testCases.forEach(tc => {
    const buf = Buffer.alloc(tc.length);
    
    // max-1 应该成功
    buf.writeIntBE(tc.max - 1, 0, tc.length);
    const read1 = buf.readIntBE(0, tc.length);
    if (read1 !== tc.max - 1) {
      throw new Error(`${tc.length}字节 max-1 失败`);
    }
    
    // max 应该成功
    buf.writeIntBE(tc.max, 0, tc.length);
    const read2 = buf.readIntBE(0, tc.length);
    if (read2 !== tc.max) {
      throw new Error(`${tc.length}字节 max 失败`);
    }
    
    // max+1 应该失败
    try {
      buf.writeIntBE(tc.max + 1, 0, tc.length);
      throw new Error(`${tc.length}字节 max+1 应该失败`);
    } catch (error) {
      // 期望抛出错误
    }
  });
  
  return true;
});

test('writeIntLE - 所有byteLength的min-1, min, min+1', () => {
  const testCases = [
    { length: 1, min: -128 },
    { length: 2, min: -32768 },
    { length: 3, min: -8388608 },
    { length: 4, min: -2147483648 },
    { length: 5, min: -549755813888 },
    { length: 6, min: -140737488355328 }
  ];
  
  testCases.forEach(tc => {
    const buf = Buffer.alloc(tc.length);
    
    // min+1 应该成功
    buf.writeIntLE(tc.min + 1, 0, tc.length);
    const read1 = buf.readIntLE(0, tc.length);
    if (read1 !== tc.min + 1) {
      throw new Error(`${tc.length}字节 min+1 失败`);
    }
    
    // min 应该成功
    buf.writeIntLE(tc.min, 0, tc.length);
    const read2 = buf.readIntLE(0, tc.length);
    if (read2 !== tc.min) {
      throw new Error(`${tc.length}字节 min 失败`);
    }
    
    // min-1 应该失败
    try {
      buf.writeIntLE(tc.min - 1, 0, tc.length);
      throw new Error(`${tc.length}字节 min-1 应该失败`);
    } catch (error) {
      // 期望抛出错误
    }
  });
  
  return true;
});

// ========================================
// 10. 错误后状态恢复测试
// ========================================

test('writeIntBE - 错误后Buffer状态不变', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(0x12345678, 0, 4);
  
  const beforeValue = buf.readIntBE(0, 4);
  
  // 尝试错误的写入
  try {
    buf.writeIntBE(99999999999, 0, 4); // 超出范围
  } catch (error) {
    // 预期错误
  }
  
  // 验证Buffer内容未被破坏
  const afterValue = buf.readIntBE(0, 4);
  if (afterValue !== beforeValue) {
    throw new Error('错误后Buffer被意外修改');
  }
  
  return true;
});

test('writeIntLE - 越界错误后Buffer状态不变', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntLE(1000, 0, 2);
  
  const beforeValue = buf.readIntLE(0, 2);
  
  // 尝试越界写入
  try {
    buf.writeIntLE(2000, 3, 2); // offset(3) + byteLength(2) > length(4)
  } catch (error) {
    // 预期错误
  }
  
  // 验证原有内容未被破坏
  const afterValue = buf.readIntLE(0, 2);
  if (afterValue !== beforeValue) {
    throw new Error('错误后Buffer被意外修改');
  }
  
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
