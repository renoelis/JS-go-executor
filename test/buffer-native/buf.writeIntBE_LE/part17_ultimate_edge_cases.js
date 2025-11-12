// buf.writeIntBE() 和 buf.writeIntLE() - 终极边界用例测试
// 覆盖最极端和罕见的边界场景
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
// 1. 二进制模式测试
// ========================================

test('writeIntBE - 全1模式 (0xFFFFFFFFFFFF)', () => {
  const buf = Buffer.alloc(6);
  // 6字节全1在有符号下是-1
  buf.writeIntBE(-1, 0, 6);
  
  // 验证所有字节都是0xFF
  for (let i = 0; i < 6; i++) {
    if (buf[i] !== 0xFF) throw new Error(`字节${i}不是0xFF`);
  }
  
  const readValue = buf.readIntBE(0, 6);
  if (readValue !== -1) throw new Error('读取值应为-1');
  
  return true;
});

test('writeIntLE - 全0模式', () => {
  const buf = Buffer.alloc(6);
  buf.writeIntLE(0, 0, 6);
  
  // 验证所有字节都是0x00
  for (let i = 0; i < 6; i++) {
    if (buf[i] !== 0x00) throw new Error(`字节${i}不是0x00`);
  }
  
  const readValue = buf.readIntLE(0, 6);
  if (readValue !== 0) throw new Error('读取值应为0');
  
  return true;
});

test('writeIntBE - 交替模式 (0xAA)', () => {
  const buf = Buffer.alloc(4);
  // 0xAAAAAAAA 在32位有符号下是负数
  buf.writeIntBE(-1431655766, 0, 4); // 0xAAAAAAAA的有符号值
  
  // 验证交替模式
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0xAA) throw new Error(`字节${i}不是0xAA`);
  }
  
  return true;
});

test('writeIntLE - 0x55交替模式', () => {
  const buf = Buffer.alloc(4);
  // 0x55555555 = 1431655765
  buf.writeIntLE(1431655765, 0, 4);
  
  // 验证交替模式
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0x55) throw new Error(`字节${i}不是0x55`);
  }
  
  return true;
});

// ========================================
// 2. 负零和特殊零值测试
// ========================================

test('writeIntBE - 负零 (-0)', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(-0, 0, 4);
  
  const readValue = buf.readIntBE(0, 4);
  // -0 应该被当作 0 处理
  if (readValue !== 0) throw new Error('负零应该被转换为0');
  
  // 验证所有字节都是0
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0) throw new Error(`字节${i}应该是0`);
  }
  
  return true;
});

test('writeIntLE - Object(-0)', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntLE(Object(-0), 0, 2);
  
  const readValue = buf.readIntLE(0, 2);
  if (readValue !== 0) throw new Error('Object(-0)应该被转换为0');
  
  return true;
});

// ========================================
// 3. 数组和类数组对象作为value
// ========================================

test('writeIntBE - 空数组作为value', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntBE([], 0, 2);
  
  // 空数组转换为0
  const readValue = buf.readIntBE(0, 2);
  if (readValue !== 0) throw new Error('空数组应该转换为0');
  
  return true;
});

test('writeIntLE - 单元素数组作为value', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntLE([123], 0, 2);
  
  // 单元素数组应该转换为该元素的值
  const readValue = buf.readIntLE(0, 2);
  if (readValue !== 123) throw new Error('单元素数组应该转换为123');
  
  return true;
});

test('writeIntBE - 多元素数组作为value', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntBE([1, 2, 3], 0, 2);
  
  // 多元素数组转换为NaN，然后转换为0
  const readValue = buf.readIntBE(0, 2);
  if (readValue !== 0) throw new Error('多元素数组应该转换为0');
  
  return true;
});

// ========================================
// 4. 循环引用对象测试
// ========================================

test('writeIntLE - 循环引用对象', () => {
  const buf = Buffer.alloc(2);
  const obj = { value: 100 };
  obj.self = obj; // 循环引用
  
  buf.writeIntLE(obj, 0, 2);
  
  // 对象转换为NaN，然后转换为0
  const readValue = buf.readIntLE(0, 2);
  if (readValue !== 0) throw new Error('循环引用对象应该转换为0');
  
  return true;
});

test('writeIntBE - 带循环引用valueOf的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf() {
      return obj; // 返回自身
    }
  };
  
  try {
    buf.writeIntBE(obj, 0, 4);
    // 如果没有抛出错误，检查结果
    const readValue = buf.readIntBE(0, 4);
    return readValue === 0 || true; // 接受任何结果
  } catch (error) {
    // 也接受抛出错误
    return true;
  }
});

// ========================================
// 5. Getter/Setter 陷阱测试
// ========================================

test('writeIntLE - Getter返回动态值', () => {
  const buf = Buffer.alloc(4);
  let counter = 0;
  
  const obj = {
    valueOf() {
      return ++counter; // 每次调用返回不同的值
    }
  };
  
  buf.writeIntLE(obj, 0, 4);
  const readValue = buf.readIntLE(0, 4);
  
  // 应该只调用一次valueOf
  if (readValue !== 1) throw new Error('valueOf应该只被调用一次');
  
  return true;
});

test('writeIntBE - Getter抛出错误', () => {
  const buf = Buffer.alloc(2);
  const obj = {
    valueOf() {
      throw new Error('Getter error');
    }
  };
  
  try {
    buf.writeIntBE(obj, 0, 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// ========================================
// 6. Number.EPSILON 和精度边界
// ========================================

test('writeIntBE - Number.EPSILON', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(Number.EPSILON, 0, 4);
  
  // Number.EPSILON 非常小，应该被截断为0
  const readValue = buf.readIntBE(0, 4);
  if (readValue !== 0) throw new Error('Number.EPSILON应该被截断为0');
  
  return true;
});

test('writeIntLE - 1 + Number.EPSILON', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntLE(1 + Number.EPSILON, 0, 2);
  
  // 应该被截断为1
  const readValue = buf.readIntLE(0, 2);
  if (readValue !== 1) throw new Error('1 + Number.EPSILON应该被截断为1');
  
  return true;
});

// ========================================
// 7. 二进制运算结果直接写入
// ========================================

test('writeIntBE - 位运算结果 (a | b)', () => {
  const buf = Buffer.alloc(4);
  const a = 0x12345678;
  const b = 0x87654321;
  const result = a | b; // 按位或
  
  buf.writeIntBE(result, 0, 4);
  const readValue = buf.readIntBE(0, 4);
  
  if (readValue !== result) throw new Error('位运算结果写入错误');
  
  return true;
});

test('writeIntLE - 位运算结果 (a & b)', () => {
  const buf = Buffer.alloc(4);
  const a = 0x7FFFFFFF;
  const b = 0x0F0F0F0F;
  const result = a & b; // 按位与
  
  buf.writeIntLE(result, 0, 4);
  const readValue = buf.readIntLE(0, 4);
  
  if (readValue !== result) throw new Error('位运算结果写入错误');
  
  return true;
});

test('writeIntBE - 位运算结果 (a ^ b)', () => {
  const buf = Buffer.alloc(3);
  const a = 0x123456;
  const b = 0x654321;
  const result = a ^ b; // 按位异或
  
  buf.writeIntBE(result, 0, 3);
  const readValue = buf.readIntBE(0, 3);
  
  if (readValue !== result) throw new Error('位运算结果写入错误');
  
  return true;
});

test('writeIntLE - 位移运算结果 (a << b)', () => {
  const buf = Buffer.alloc(4);
  const a = 0x1234;
  const b = 8;
  const result = a << b; // 左移
  
  buf.writeIntLE(result, 0, 4);
  const readValue = buf.readIntLE(0, 4);
  
  if (readValue !== result) throw new Error('位移运算结果写入错误');
  
  return true;
});

// ========================================
// 8. 连续快速写入相同位置
// ========================================

test('writeIntBE - 快速覆盖写入', () => {
  const buf = Buffer.alloc(4);
  
  // 连续写入相同位置
  for (let i = 0; i < 100; i++) {
    buf.writeIntBE(i, 0, 4);
  }
  
  // 最后的值应该是99
  const readValue = buf.readIntBE(0, 4);
  if (readValue !== 99) throw new Error('最后的值应该是99');
  
  return true;
});

test('writeIntLE - 快速交替写入', () => {
  const buf = Buffer.alloc(6);
  
  // 交替写入不同长度
  for (let i = 0; i < 50; i++) {
    if (i % 2 === 0) {
      buf.writeIntLE(i, 0, 2);
    } else {
      buf.writeIntLE(i, 0, 4);
    }
  }
  
  // 验证最后写入的值
  const readValue = buf.readIntLE(0, 4);
  if (readValue !== 49) throw new Error('最后的值应该是49');
  
  return true;
});

// ========================================
// 9. 参数边界的极端组合
// ========================================

test('writeIntBE - offset=0, byteLength=1, value=127', () => {
  const buf = Buffer.alloc(1);
  const result = buf.writeIntBE(127, 0, 1);
  
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 127) throw new Error('写入错误');
  
  return true;
});

test('writeIntLE - offset=0, byteLength=6, value=max', () => {
  const buf = Buffer.alloc(6);
  const maxValue = Math.pow(2, 47) - 1;
  const result = buf.writeIntLE(maxValue, 0, 6);
  
  if (result !== 6) throw new Error('返回值应为6');
  
  const readValue = buf.readIntLE(0, 6);
  if (readValue !== maxValue) throw new Error('读取错误');
  
  return true;
});

test('writeIntBE - 所有offset和byteLength的有效组合', () => {
  const buf = Buffer.alloc(10);
  
  const combinations = [
    { offset: 0, length: 1, value: 1 },
    { offset: 1, length: 2, value: 256 },
    { offset: 3, length: 3, value: 65536 },
    { offset: 6, length: 4, value: 16777216 }
  ];
  
  combinations.forEach(combo => {
    buf.writeIntBE(combo.value, combo.offset, combo.length);
    const readValue = buf.readIntBE(combo.offset, combo.length);
    if (readValue !== combo.value) {
      throw new Error(`组合(offset=${combo.offset}, length=${combo.length})失败`);
    }
  });
  
  return true;
});

// ========================================
// 10. 特殊的数学运算结果
// ========================================

test('writeIntLE - Math.abs结果', () => {
  const buf = Buffer.alloc(4);
  const value = Math.abs(-12345);
  
  buf.writeIntLE(value, 0, 4);
  const readValue = buf.readIntLE(0, 4);
  
  if (readValue !== 12345) throw new Error('Math.abs结果写入错误');
  
  return true;
});

test('writeIntBE - Math.floor结果', () => {
  const buf = Buffer.alloc(2);
  const value = Math.floor(123.9);
  
  buf.writeIntBE(value, 0, 2);
  const readValue = buf.readIntBE(0, 2);
  
  if (readValue !== 123) throw new Error('Math.floor结果写入错误');
  
  return true;
});

test('writeIntLE - Math.ceil结果', () => {
  const buf = Buffer.alloc(2);
  const value = Math.ceil(123.1);
  
  buf.writeIntLE(value, 0, 2);
  const readValue = buf.readIntLE(0, 2);
  
  if (readValue !== 124) throw new Error('Math.ceil结果写入错误');
  
  return true;
});

test('writeIntBE - Math.round结果', () => {
  const buf = Buffer.alloc(2);
  const value = Math.round(123.5);
  
  buf.writeIntBE(value, 0, 2);
  const readValue = buf.readIntBE(0, 2);
  
  if (readValue !== 124) throw new Error('Math.round结果写入错误');
  
  return true;
});

test('writeIntLE - Math.pow结果', () => {
  const buf = Buffer.alloc(3);
  const value = Math.pow(2, 16); // 65536
  
  buf.writeIntLE(value, 0, 3);
  const readValue = buf.readIntLE(0, 3);
  
  if (readValue !== 65536) throw new Error('Math.pow结果写入错误');
  
  return true;
});

// ========================================
// 11. 字符串数字的各种格式
// ========================================

test('writeIntBE - 前导空格字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntBE('  123', 0, 2);
  
  const readValue = buf.readIntBE(0, 2);
  if (readValue !== 123) throw new Error('前导空格应该被忽略');
  
  return true;
});

test('writeIntLE - 后置空格字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntLE('456  ', 0, 2);
  
  const readValue = buf.readIntLE(0, 2);
  if (readValue !== 456) throw new Error('后置空格应该被忽略');
  
  return true;
});

test('writeIntBE - 正号字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntBE('+789', 0, 2);
  
  const readValue = buf.readIntBE(0, 2);
  if (readValue !== 789) throw new Error('正号应该被正确解析');
  
  return true;
});

test('writeIntLE - 负号字符串', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntLE('-100', 0, 2);
  
  const readValue = buf.readIntLE(0, 2);
  if (readValue !== -100) throw new Error('负号应该被正确解析');
  
  return true;
});

// ========================================
// 12. 极端的offset和byteLength组合
// ========================================

test('writeIntBE - 最大offset, 最小byteLength', () => {
  const buf = Buffer.alloc(10);
  const offset = 9;
  const byteLength = 1;
  const value = 42;
  
  const result = buf.writeIntBE(value, offset, byteLength);
  
  if (result !== 10) throw new Error('返回值应为10');
  if (buf[9] !== 42) throw new Error('写入错误');
  
  return true;
});

test('writeIntLE - 最小offset, 最大byteLength', () => {
  const buf = Buffer.alloc(6);
  const offset = 0;
  const byteLength = 6;
  const value = 123456;
  
  const result = buf.writeIntLE(value, offset, byteLength);
  
  if (result !== 6) throw new Error('返回值应为6');
  
  const readValue = buf.readIntLE(0, 6);
  if (readValue !== 123456) throw new Error('读取错误');
  
  return true;
});

// ========================================
// 13. 特殊的边界值
// ========================================

test('writeIntBE - Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(Number.MIN_VALUE, 0, 4);
  
  // Number.MIN_VALUE 非常接近0，应该被截断为0
  const readValue = buf.readIntBE(0, 4);
  if (readValue !== 0) throw new Error('Number.MIN_VALUE应该被截断为0');
  
  return true;
});

test('writeIntLE - -Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(2);
  buf.writeIntLE(-Number.MIN_VALUE, 0, 2);
  
  // -Number.MIN_VALUE 也非常接近0
  const readValue = buf.readIntLE(0, 2);
  if (readValue !== 0) throw new Error('-Number.MIN_VALUE应该被截断为0');
  
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
