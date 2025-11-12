// buf.writeUIntBE/LE() - 兼容性和特殊场景测试
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

// === TypedArray 兼容性测试 ===
test('writeUIntBE 在 Uint8Array 上的行为', () => {
  try {
    const arr = new Uint8Array(4);
    // 这应该失败，因为 Uint8Array 没有 writeUIntBE 方法
    if (typeof arr.writeUIntBE === 'function') {
      arr.writeUIntBE(255, 0, 1);
      return false; // 不应该成功
    }
    return true; // 没有方法是正确的
  } catch (e) {
    return true; // 抛出错误也是正确的
  }
});

test('writeUIntLE 在 Uint8Array 上的行为', () => {
  try {
    const arr = new Uint8Array(4);
    // 这应该失败，因为 Uint8Array 没有 writeUIntLE 方法
    if (typeof arr.writeUIntLE === 'function') {
      arr.writeUIntLE(255, 0, 1);
      return false; // 不应该成功
    }
    return true; // 没有方法是正确的
  } catch (e) {
    return true; // 抛出错误也是正确的
  }
});

// === Buffer 子类测试 ===
test('writeUIntBE 在 Buffer 子类上', () => {
  class CustomBuffer extends Buffer {}
  const buf = CustomBuffer.alloc(4);
  const result = buf.writeUIntBE(255, 0, 1);
  return result === 1 && buf[0] === 255;
});

test('writeUIntLE 在 Buffer 子类上', () => {
  class CustomBuffer extends Buffer {}
  const buf = CustomBuffer.alloc(4);
  const result = buf.writeUIntLE(255, 0, 1);
  return result === 1 && buf[0] === 255;
});

// === 非 Buffer 对象上调用 ===
test('writeUIntBE 在普通对象上正常工作', () => {
  const obj = { length: 4, 0: 0, 1: 0, 2: 0, 3: 0 };
  const result = Buffer.prototype.writeUIntBE.call(obj, 255, 0, 1);
  return result === 1 && obj[0] === 255;
});

test('writeUIntLE 在普通对象上正常工作', () => {
  const obj = { length: 4, 0: 0, 1: 0, 2: 0, 3: 0 };
  const result = Buffer.prototype.writeUIntLE.call(obj, 255, 0, 1);
  return result === 1 && obj[0] === 255;
});

// === 字符串数字边界测试 ===
test('writeUIntBE value 为空字符串转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE('', 0, 1);
  return result === 1 && buf[0] === 0;
});

test('writeUIntLE value 为空字符串转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE('', 0, 1);
  return result === 1 && buf[0] === 0;
});

test('writeUIntBE value 为空格字符串转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE('   ', 0, 1);
  return result === 1 && buf[0] === 0;
});

test('writeUIntLE value 为空格字符串转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE('   ', 0, 1);
  return result === 1 && buf[0] === 0;
});

test('writeUIntBE value 为科学计数法字符串', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE('1e2', 0, 1); // 1e2 = 100
  return result === 1 && buf[0] === 100;
});

test('writeUIntLE value 为科学计数法字符串', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE('1e2', 0, 1); // 1e2 = 100
  return result === 1 && buf[0] === 100;
});

// === 极小数值测试 ===
test('writeUIntBE value 为极小正数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE(0.1, 0, 1);
  return result === 1 && buf[0] === 0; // 0.1 截断为 0
});

test('writeUIntLE value 为极小正数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE(0.1, 0, 1);
  return result === 1 && buf[0] === 0; // 0.1 截断为 0
});

test('writeUIntBE value 为 Number.MIN_VALUE', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE(Number.MIN_VALUE, 0, 1);
  return result === 1 && buf[0] === 0; // 极小值截断为 0
});

test('writeUIntLE value 为 Number.MIN_VALUE', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE(Number.MIN_VALUE, 0, 1);
  return result === 1 && buf[0] === 0; // 极小值截断为 0
});

// === 并发和重入测试 ===
test('writeUIntBE 连续快速调用', () => {
  const buf = Buffer.allocUnsafe(100);
  let success = true;
  for (let i = 0; i < 50; i++) {
    const offset = i * 2;
    const value = i % 256;
    const result = buf.writeUIntBE(value, offset, 1);
    if (result !== offset + 1 || buf[offset] !== value) {
      success = false;
      break;
    }
  }
  return success;
});

test('writeUIntLE 连续快速调用', () => {
  const buf = Buffer.allocUnsafe(100);
  let success = true;
  for (let i = 0; i < 50; i++) {
    const offset = i * 2;
    const value = i % 256;
    const result = buf.writeUIntLE(value, offset, 1);
    if (result !== offset + 1 || buf[offset] !== value) {
      success = false;
      break;
    }
  }
  return success;
});

// === 内存边界对齐测试 ===
test('writeUIntBE 跨页边界写入', () => {
  // 创建一个较大的 buffer 来测试跨页情况
  const buf = Buffer.allocUnsafe(8192); // 通常页面大小
  const offset = 4090; // 接近页边界
  const result = buf.writeUIntBE(0x12345678, offset, 4);
  return result === offset + 4 && 
         buf[offset] === 0x12 && buf[offset + 1] === 0x34 &&
         buf[offset + 2] === 0x56 && buf[offset + 3] === 0x78;
});

test('writeUIntLE 跨页边界写入', () => {
  const buf = Buffer.allocUnsafe(8192);
  const offset = 4090;
  const result = buf.writeUIntLE(0x12345678, offset, 4);
  return result === offset + 4 && 
         buf[offset] === 0x78 && buf[offset + 1] === 0x56 &&
         buf[offset + 2] === 0x34 && buf[offset + 3] === 0x12;
});

// === 特殊编码字符串 ===
test('writeUIntBE value 为 Unicode 数字字符串', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE('１２３', 0, 1); // 全角数字
  return result === 1 && buf[0] === 0; // 应该转为 NaN -> 0
});

test('writeUIntLE value 为 Unicode 数字字符串', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE('１２３', 0, 1); // 全角数字
  return result === 1 && buf[0] === 0; // 应该转为 NaN -> 0
});

// === 性能退化测试 ===
test('writeUIntBE 大量小写入性能', () => {
  const buf = Buffer.allocUnsafe(1000);
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    buf.writeUIntBE(i % 256, i, 1);
  }
  const duration = Date.now() - start;
  return duration < 100; // 应该在100ms内完成
});

test('writeUIntLE 大量小写入性能', () => {
  const buf = Buffer.allocUnsafe(1000);
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    buf.writeUIntLE(i % 256, i, 1);
  }
  const duration = Date.now() - start;
  return duration < 100; // 应该在100ms内完成
});

// === 边界值精确测试 ===
test('writeUIntBE 每个 byteLength 的精确最大值', () => {
  const buf = Buffer.allocUnsafe(8);
  const maxValues = [0xFF, 0xFFFF, 0xFFFFFF, 0xFFFFFFFF, 0xFFFFFFFFFF, 0xFFFFFFFFFFFF];
  
  for (let byteLength = 1; byteLength <= 6; byteLength++) {
    const maxVal = maxValues[byteLength - 1];
    const result = buf.writeUIntBE(maxVal, 0, byteLength);
    if (result !== byteLength) return false;
    
    // 验证写入的字节
    for (let i = 0; i < byteLength; i++) {
      if (buf[i] !== 0xFF) return false;
    }
  }
  return true;
});

test('writeUIntLE 每个 byteLength 的精确最大值', () => {
  const buf = Buffer.allocUnsafe(8);
  const maxValues = [0xFF, 0xFFFF, 0xFFFFFF, 0xFFFFFFFF, 0xFFFFFFFFFF, 0xFFFFFFFFFFFF];
  
  for (let byteLength = 1; byteLength <= 6; byteLength++) {
    const maxVal = maxValues[byteLength - 1];
    const result = buf.writeUIntLE(maxVal, 0, byteLength);
    if (result !== byteLength) return false;
    
    // 验证写入的字节（小端序）
    for (let i = 0; i < byteLength; i++) {
      if (buf[i] !== 0xFF) return false;
    }
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
