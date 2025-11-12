// buf.writeUInt8() - 终极边界测试
// 覆盖最极端和最隐蔽的边界情况
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

// ==================== 1. 内存对齐和字节序无关性 ====================

test('writeUInt8 不受字节序影响', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0x12, 0);
  buf.writeUInt8(0x34, 1);
  buf.writeUInt8(0x56, 2);
  buf.writeUInt8(0x78, 3);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78;
});

test('奇数偏移写入正常', () => {
  const buf = Buffer.alloc(10);
  for (let i = 1; i < 10; i += 2) {
    buf.writeUInt8(i * 10, i);
  }
  return buf[1] === 10 && buf[3] === 30 && buf[5] === 50 && buf[7] === 70 && buf[9] === 90;
});

// ==================== 2. 数值精度边界 ====================

test('JavaScript 数值精度边界不影响整数部分', () => {
  const buf = Buffer.alloc(1);
  const val = 100 + Number.EPSILON;
  buf.writeUInt8(val, 0);
  return buf[0] === 100;
});

test('非常接近整数的浮点数截断正确', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(99.99999999999999, 0);
  buf.writeUInt8(100.00000000000001, 1);
  buf.writeUInt8(127.99999999999999, 2);
  return buf[0] === 99 && buf[1] === 100 && buf[2] === 127;
});

// ==================== 3. 特殊数学常数 ====================

test('Math.PI 截断正确', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(Math.PI, 0);
  return buf[0] === 3;
});

test('Math.E 截断正确', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(Math.E, 0);
  return buf[0] === 2;
});

test('Math.LN2 截断正确', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(Math.LN2, 0);
  return buf[0] === 0;
});

test('Math.SQRT2 截断正确', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(Math.SQRT2, 0);
  return buf[0] === 1;
});

// ==================== 4. 位运算结果 ====================

test('位运算结果写入正确', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0xFF & 0x7F, 0);
  buf.writeUInt8(0x100 >> 1, 1);
  buf.writeUInt8(0x80 | 0x40, 2);
  buf.writeUInt8(0xFF ^ 0xAA, 3);
  return buf[0] === 127 && buf[1] === 128 && buf[2] === 192 && buf[3] === 85;
});

test('移位运算超出范围检测', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(1 << 8, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') && e.message.includes('256');
  }
});

// ==================== 5. 类型转换的边界情况 ====================

test('字符串数字的边界转换', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8('0', 0);
  buf.writeUInt8('255', 1);
  buf.writeUInt8('000123', 2);
  return buf[0] === 0 && buf[1] === 255 && buf[2] === 123;
});

test('十六进制字符串正确转换', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt8('0xFF', 0);
  buf.writeUInt8('0x10', 1);
  return buf[0] === 255 && buf[1] === 16;
});

test('二进制字符串正确转换', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt8('0b11111111', 0);
  buf.writeUInt8('0b10000000', 1);
  return buf[0] === 255 && buf[1] === 128;
});

// ==================== 6. 对象的 valueOf/toString 边界 ====================

test('valueOf 返回边界值', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8({ valueOf: () => 0 }, 0);
  buf.writeUInt8({ valueOf: () => 255 }, 1);
  buf.writeUInt8({ valueOf: () => 127.5 }, 2);
  return buf[0] === 0 && buf[1] === 255 && buf[2] === 127;
});

test('toString 优先级低于 valueOf', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8({
    valueOf: () => 100,
    toString: () => '200'
  }, 0);
  return buf[0] === 100;
});

test('只有 toString 的对象', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8({
    toString: () => '150'
  }, 0);
  return buf[0] === 150;
});

// ==================== 7. 数组的特殊转换 ====================

test('单元素数组转换', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8([100], 0);
  buf.writeUInt8([255], 1);
  buf.writeUInt8([0], 2);
  return buf[0] === 100 && buf[1] === 255 && buf[2] === 0;
});

test('嵌套数组转换', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt8([[100]], 0);
  buf.writeUInt8([[[200]]], 1);
  return buf[0] === 100 && buf[1] === 200;
});

// ==================== 8. 极端性能场景 ====================

test('单字节 Buffer 重复写入', () => {
  const buf = Buffer.alloc(1);
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt8(i % 256, 0);
  }
  return buf[0] === (999 % 256);
});

test('较大 Buffer 边界写入', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);
  buf.writeUInt8(0xAA, 0);
  buf.writeUInt8(0xBB, size - 1);
  buf.writeUInt8(0xCC, size >> 1);
  return buf[0] === 0xAA && buf[size - 1] === 0xBB && buf[size >> 1] === 0xCC;
});

// ==================== 9. 内存视图一致性 ====================

test('ArrayBuffer 视图一致性', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const u8 = new Uint8Array(ab);
  
  buf.writeUInt8(0x42, 3);
  return u8[3] === 0x42;
});

test('DataView 一致性', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  
  buf.writeUInt8(0x55, 5);
  return dv.getUint8(5) === 0x55;
});

// ==================== 10. 边界条件的组合 ====================

test('最小 Buffer 最大值写入', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(255, 0);
  return buf[0] === 255 && buf.length === 1;
});

test('连续边界值写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0, 0);
  buf.writeUInt8(1, 1);
  buf.writeUInt8(254, 2);
  buf.writeUInt8(255, 3);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 254 && buf[3] === 255;
});

// ==================== 11. 特殊数值表示 ====================

test('八进制数值写入', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt8(0o177, 0);
  buf.writeUInt8(0o377, 1);
  return buf[0] === 127 && buf[1] === 255;
});

test('科学计数法边界', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(1e0, 0);
  buf.writeUInt8(1e1, 1);
  buf.writeUInt8(1e2, 2);
  return buf[0] === 1 && buf[1] === 10 && buf[2] === 100;
});

// ==================== 12. 返回值链式调用极端场景 ====================

test('长链式调用验证', () => {
  const buf = Buffer.alloc(10);
  let offset = 0;
  for (let i = 0; i < 10; i++) {
    offset = buf.writeUInt8(i * 25, offset);
  }
  return offset === 10;
});

test('返回值类型严格验证', () => {
  const buf = Buffer.alloc(1);
  const ret = buf.writeUInt8(100, 0);
  return typeof ret === 'number' && ret === 1 && Number.isInteger(ret);
});

// ==================== 13. 与其他 write 方法的独立性 ====================

test('writeUInt8 不影响 writeInt8', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt8(200, 0);
  buf.writeInt8(-56, 1);
  return buf[0] === 200 && buf.readInt8(1) === -56;
});

test('writeUInt8 不影响 writeUInt16', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0xFF, 0);
  buf.writeUInt16LE(0x1234, 2);
  return buf[0] === 0xFF && buf.readUInt16LE(2) === 0x1234;
});

// ==================== 14. 空格和特殊字符串 ====================

test('空格字符串转为 NaN', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(' ', 0);
  buf.writeUInt8('  ', 1);
  buf.writeUInt8('\t', 2);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('空字符串转为 NaN', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8('', 0);
  return buf[0] === 0;
});

// ==================== 15. 极端浮点数 ====================

test('极小浮点数截断', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(0.000001, 0);
  buf.writeUInt8(0.1, 1);
  buf.writeUInt8(0.9, 2);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('极大浮点数范围检查', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(1e10, 0);
    return false;
  } catch (e) {
    return e.message.includes('range');
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
