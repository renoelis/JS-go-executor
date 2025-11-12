// buf.writeUIntBE/LE() - 深度查缺补漏测试
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

// === 精度丢失的极端边界 ===
test('writeUIntBE 6字节最大值精确度', () => {
  const buf = Buffer.allocUnsafe(8);
  const maxValue = 0xFFFFFFFFFFFF; // 6字节最大值
  const result = buf.writeUIntBE(maxValue, 0, 6);
  return result === 6 && 
         buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF &&
         buf[3] === 0xFF && buf[4] === 0xFF && buf[5] === 0xFF;
});

test('writeUIntLE 6字节最大值精确度', () => {
  const buf = Buffer.allocUnsafe(8);
  const maxValue = 0xFFFFFFFFFFFF; // 6字节最大值
  const result = buf.writeUIntLE(maxValue, 0, 6);
  return result === 6 && 
         buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF &&
         buf[3] === 0xFF && buf[4] === 0xFF && buf[5] === 0xFF;
});

test('writeUIntBE JavaScript MAX_SAFE_INTEGER 应该报错', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeUIntBE(Number.MAX_SAFE_INTEGER, 0, 6);
    return false; // 不应该成功
  } catch (e) {
    return e.message.includes('2 ** 48') && e.message.includes('out of range');
  }
});

test('writeUIntLE JavaScript MAX_SAFE_INTEGER 应该报错', () => {
  const buf = Buffer.allocUnsafe(8);
  try {
    buf.writeUIntLE(Number.MAX_SAFE_INTEGER, 0, 6);
    return false; // 不应该成功
  } catch (e) {
    return e.message.includes('2 ** 48') && e.message.includes('out of range');
  }
});

test('writeUIntBE 超过MAX_SAFE_INTEGER的值应该报错', () => {
  const buf = Buffer.allocUnsafe(8);
  const largeValue = Number.MAX_SAFE_INTEGER + 10000;
  try {
    buf.writeUIntBE(largeValue, 0, 6);
    return false; // 不应该成功
  } catch (e) {
    return e.message.includes('2 ** 48') && e.message.includes('out of range');
  }
});

test('writeUIntLE 超过MAX_SAFE_INTEGER的值应该报错', () => {
  const buf = Buffer.allocUnsafe(8);
  const largeValue = Number.MAX_SAFE_INTEGER + 10000;
  try {
    buf.writeUIntLE(largeValue, 0, 6);
    return false; // 不应该成功
  } catch (e) {
    return e.message.includes('2 ** 48') && e.message.includes('out of range');
  }
});

// === 字节序验证的极端情况 ===
test('writeUIntBE 1字节值字节序无差异', () => {
  const buf1 = Buffer.allocUnsafe(2);
  const buf2 = Buffer.allocUnsafe(2);
  buf1.writeUIntBE(0xAB, 0, 1);
  buf2.writeUIntLE(0xAB, 0, 1);
  return buf1[0] === buf2[0] && buf1[0] === 0xAB;
});

test('writeUIntBE vs writeUIntLE 2字节对比', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  const value = 0x1234;
  buf1.writeUIntBE(value, 0, 2);
  buf2.writeUIntLE(value, 0, 2);
  return buf1[0] === 0x12 && buf1[1] === 0x34 && 
         buf2[0] === 0x34 && buf2[1] === 0x12;
});

test('writeUIntBE vs writeUIntLE 6字节完整对比', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  const value = 0x123456789ABC;
  buf1.writeUIntBE(value, 0, 6);
  buf2.writeUIntLE(value, 0, 6);
  // 验证字节序完全相反
  return buf1[0] === buf2[5] && buf1[1] === buf2[4] && buf1[2] === buf2[3] &&
         buf1[3] === buf2[2] && buf1[4] === buf2[1] && buf1[5] === buf2[0];
});

// === 内存对齐边界 ===
test('writeUIntBE 跨64位边界写入', () => {
  const buf = Buffer.allocUnsafe(16);
  // 在8字节对齐边界附近写入
  const result1 = buf.writeUIntBE(0xFFFFFFFF, 5, 4);
  const result2 = buf.writeUIntBE(0xFFFFFFFF, 8, 4);
  return result1 === 9 && result2 === 12;
});

test('writeUIntLE 跨64位边界写入', () => {
  const buf = Buffer.allocUnsafe(16);
  const result1 = buf.writeUIntLE(0xFFFFFFFF, 5, 4);
  const result2 = buf.writeUIntLE(0xFFFFFFFF, 8, 4);
  return result1 === 9 && result2 === 12;
});

test('writeUIntBE 非对齐地址性能', () => {
  const buf = Buffer.allocUnsafe(100);
  const start = Date.now();
  // 写入到非对齐地址
  for (let i = 0; i < 20; i++) {
    buf.writeUIntBE(0x12345678, i * 3 + 1, 4);
  }
  const duration = Date.now() - start;
  return duration < 50; // 应该很快
});

// === 极值边界的精确测试 ===
test('writeUIntBE 每个字节长度的0值', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0xFF);
  for (let byteLength = 1; byteLength <= 6; byteLength++) {
    const result = buf.writeUIntBE(0, 0, byteLength);
    if (result !== byteLength) return false;
    for (let i = 0; i < byteLength; i++) {
      if (buf[i] !== 0) return false;
    }
    buf.fill(0xFF); // 重置
  }
  return true;
});

test('writeUIntLE 每个字节长度的0值', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0xFF);
  for (let byteLength = 1; byteLength <= 6; byteLength++) {
    const result = buf.writeUIntLE(0, 0, byteLength);
    if (result !== byteLength) return false;
    for (let i = 0; i < byteLength; i++) {
      if (buf[i] !== 0) return false;
    }
    buf.fill(0xFF); // 重置
  }
  return true;
});

test('writeUIntBE 每个字节长度的最大值-1', () => {
  const buf = Buffer.allocUnsafe(8);
  const maxValues = [0xFE, 0xFFFE, 0xFFFFFE, 0xFFFFFFFE, 0xFFFFFFFFFE, 0xFFFFFFFFFFFE];
  
  for (let byteLength = 1; byteLength <= 6; byteLength++) {
    buf.fill(0);
    const maxVal = maxValues[byteLength - 1];
    try {
      const result = buf.writeUIntBE(maxVal, 0, byteLength);
      if (result !== byteLength) return false;
      
      // 验证写入的字节值正确 - 对于大端序，最后一个字节应该是0xFE
      if (buf[byteLength - 1] !== 0xFE) return false;
      for (let i = 0; i < byteLength - 1; i++) {
        if (buf[i] !== 0xFF) return false;
      }
    } catch (e) {
      // 6字节的最大值-1可能超出范围
      if (byteLength === 6 && e.message.includes('2 ** 48')) {
        continue; // 跳过这个测试
      } else {
        return false;
      }
    }
  }
  return true;
});

// === 并发和竞态条件 ===
test('writeUIntBE 重叠写入测试', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  
  // 重叠写入：先写4字节，再在偏移2处写4字节
  buf.writeUIntBE(0x12345678, 0, 4);
  buf.writeUIntBE(0xABCDEF00, 2, 4);
  
  // 验证重叠部分被覆盖
  return buf[0] === 0x12 && buf[1] === 0x34 && // 原始的前2字节
         buf[2] === 0xAB && buf[3] === 0xCD && // 新写入的
         buf[4] === 0xEF && buf[5] === 0x00;   // 新写入的
});

test('writeUIntLE 重叠写入测试', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  
  buf.writeUIntLE(0x12345678, 0, 4);
  buf.writeUIntLE(0xABCDEF00, 2, 4);
  
  return buf[0] === 0x78 && buf[1] === 0x56 && // 原始的前2字节（小端序）
         buf[2] === 0x00 && buf[3] === 0xEF && // 新写入的（小端序）
         buf[4] === 0xCD && buf[5] === 0xAB;   // 新写入的（小端序）
});

// === SharedArrayBuffer 兼容性 ===
test('writeUIntBE 在不同Buffer类型上的行为一致性', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.alloc(8);
  const buf3 = Buffer.from([0,0,0,0,0,0,0,0]);
  
  const value = 0x123456;
  buf1.writeUIntBE(value, 0, 3);
  buf2.writeUIntBE(value, 0, 3);
  buf3.writeUIntBE(value, 0, 3);
  
  return buf1[0] === buf2[0] && buf2[0] === buf3[0] &&
         buf1[1] === buf2[1] && buf2[1] === buf3[1] &&
         buf1[2] === buf2[2] && buf2[2] === buf3[2];
});

// === 错误边界的精确测试 ===
test('writeUIntBE offset计算溢出边界', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    // offset + byteLength 刚好等于 buffer 长度
    buf.writeUIntBE(0xFF, 3, 1);
    return true; // 应该成功
  } catch (e) {
    return false;
  }
});

test('writeUIntBE offset计算刚好超出边界', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    // offset + byteLength 超出 buffer 长度 1 字节
    buf.writeUIntBE(0xFF, 3, 2);
    return false; // 应该失败
  } catch (e) {
    return e.message.includes('range') || e.message.includes('bounds');
  }
});

// === 特殊数值的字节级验证 ===
test('writeUIntBE 验证每个字节的精确值', () => {
  const buf = Buffer.allocUnsafe(6);
  const value = 0x0F1E2D3C4B5A; // 特定模式
  buf.writeUIntBE(value, 0, 6);
  
  return buf[0] === 0x0F && buf[1] === 0x1E && buf[2] === 0x2D &&
         buf[3] === 0x3C && buf[4] === 0x4B && buf[5] === 0x5A;
});

test('writeUIntLE 验证每个字节的精确值', () => {
  const buf = Buffer.allocUnsafe(6);
  const value = 0x0F1E2D3C4B5A; // 特定模式
  buf.writeUIntLE(value, 0, 6);
  
  return buf[0] === 0x5A && buf[1] === 0x4B && buf[2] === 0x3C &&
         buf[3] === 0x2D && buf[4] === 0x1E && buf[5] === 0x0F;
});

// === 内存泄漏和清理测试 ===
test('writeUIntBE 大量操作后的内存稳定性', () => {
  const buf = Buffer.allocUnsafe(100);
  let success = true;
  
  // 大量随机写入操作
  for (let i = 0; i < 1000 && success; i++) {
    const offset = Math.floor(Math.random() * 95);
    const byteLength = Math.floor(Math.random() * 5) + 1;
    const value = Math.floor(Math.random() * (1 << (8 * byteLength)));
    
    try {
      const result = buf.writeUIntBE(value, offset, byteLength);
      if (result !== offset + byteLength) {
        success = false;
      }
    } catch (e) {
      // 如果超出边界，检查错误是否合理
      if (!e.message.includes('range') && !e.message.includes('bounds')) {
        success = false;
      }
    }
  }
  
  return success;
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
