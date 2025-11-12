// buf.writeIntBE() 和 buf.writeIntLE() - Buffer变体和内部实现测试
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

// 1. 不同Buffer创建方式的行为一致性 - 修正：使用6字节最大范围
test('writeIntBE - Buffer.alloc vs Buffer.allocUnsafe', () => {
  const buf1 = Buffer.alloc(6);
  const buf2 = Buffer.allocUnsafe(6);

  // 清零allocUnsafe以确保一致性
  buf2.fill(0);

  const value = 0x7FFFFFFFFFFF; // 6字节范围内的最大值（Number类型）

  const result1 = buf1.writeIntBE(value, 0, 6);
  const result2 = buf2.writeIntBE(value, 0, 6);

  if (result1 !== result2) {
    throw new Error(`返回值不一致: alloc返回${result1}, allocUnsafe返回${result2}`);
  }

  // 验证写入内容一致
  for (let i = 0; i < 6; i++) {
    if (buf1[i] !== buf2[i]) {
      throw new Error(`字节${i}不一致: alloc=${buf1[i]}, allocUnsafe=${buf2[i]}`);
    }
  }

  return true;
});

test('writeIntLE - Buffer.from(Array) vs Buffer.from(ArrayBuffer)', () => {
  const arr = [0, 0, 0, 0, 0, 0, 0, 0];
  const buf1 = Buffer.from(arr);

  const arrayBuffer = new ArrayBuffer(8);
  const buf2 = Buffer.from(arrayBuffer);

  const value = 0x7FFFFFFF;

  buf1.writeIntLE(value, 0, 4);
  buf2.writeIntLE(value, 0, 4);

  const read1 = buf1.readIntLE(0, 4);
  const read2 = buf2.readIntLE(0, 4);

  if (read1 !== read2) {
    throw new Error(`读取值不一致: ${read1} vs ${read2}`);
  }

  return true;
});

// 2. Buffer与TypedArray共享内存测试
test('writeIntBE - Buffer与Int32Array共享内存', () => {
  const buffer = new ArrayBuffer(16);
  const buf = Buffer.from(buffer);
  const int32Array = new Int32Array(buffer);

  // 通过Buffer写入
  buf.writeIntBE(0x12345678, 0, 4);

  // 通过TypedArray读取
  const value = int32Array[0];

  // 注意字节序问题 - Int32Array使用平台字节序
  // 这里只验证数据被正确写入，不比较具体值
  return value !== 0; // 确保写入了数据
});

test('writeIntLE - Buffer与Uint16Array交互', () => {
  const buffer = new ArrayBuffer(8);
  const buf = Buffer.from(buffer);
  const uint16Array = new Uint16Array(buffer);

  // 先清零
  buf.fill(0);

  // 写入几个值 - 使用合法的16位数值
  buf.writeIntLE(0x1234, 0, 2);
  buf.writeIntLE(0x5678, 2, 2);
  buf.writeIntLE(0x7ABC, 4, 2); // 使用小于0x8000的值

  // 验证TypedArray能看到数据
  return uint16Array[0] !== 0 || uint16Array[1] !== 0 || uint16Array[2] !== 0;
});

// 4. 超大Buffer测试 - 修正：使用正确的offset和byteLength
test('writeIntLE - 超大Buffer末尾写入', () => {
  // 模拟大Buffer但不真正分配超大内存
  const largeSize = 100 * 1024 * 1024; // 100MB
  const buf = Buffer.alloc(Math.min(largeSize, 1024 * 1024)); // 限制为1MB

  const offset = buf.length - 4; // 使用4字节写入
  const safeValue = 0x7FFFFFFF; // 使用4字节范围内的值

  const result = buf.writeIntLE(safeValue, offset, 4);

  if (result !== offset + 4) { // 返回值应该是offset + byteLength
    throw new Error(`超大Buffer返回值错误: 期望${offset + 4}, 实际${result}`);
  }

  const readValue = buf.readIntLE(offset, 4);
  if (readValue !== safeValue) {
    throw new Error(`超大Buffer读写错误: 期望${safeValue}, 实际${readValue}`);
  }

  return true;
});

// 5. Buffer池化行为测试
test('writeIntBE - Buffer池化行为', () => {
  // 测试小Buffer是否来自预分配池
  const smallBufs = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(64);
    buf.writeIntBE(i, 0, 4);
    smallBufs.push(buf);
  }

  // 验证所有写入正确
  for (let i = 0; i < 100; i++) {
    const value = smallBufs[i].readIntBE(0, 4);
    if (value !== i) {
      throw new Error(`池化Buffer写入错误: 期望${i}, 实际${value}`);
    }
  }

  return true;
});

// 6. 多字节写入的原子性测试 - 修正：使用4字节写入
test('writeIntLE - 多字节写入的原子性', () => {
  const buf = Buffer.alloc(8);

  // 分两次写入4字节 - 使用合法的32位数值
  buf.writeIntLE(0x12345678, 0, 4);
  buf.writeIntLE(0x7ABCDEF0, 4, 4); // 修改为合法范围

  // 验证分步写入的结果
  const part1 = buf.readIntLE(0, 4);
  const part2 = buf.readIntLE(4, 4);

  if (part1 !== 0x12345678 || part2 !== 0x7ABCDEF0) {
    throw new Error(`分步写入错误: ${part1.toString(16)}, ${part2.toString(16)}`);
  }

  return true;
});

// 7. Buffer.slice的视图行为 - 修正：使用Number类型的值
test('writeIntBE - Buffer.slice视图写入', () => {
  const original = Buffer.alloc(16);
  const slice = original.slice(4, 12); // 8字节视图

  // 使用安全值 - 使用6字节范围内的Number类型值
  const safeValue = 0x123456789ABC; // 6字节范围内的值（小于0x800000000000）
  slice.writeIntBE(safeValue, 0, 6);
  const checkValue = original.readIntBE(4, 6);

  if (checkValue !== safeValue) {
    throw new Error(`视图写入失败: 期望${safeValue}, 实际${checkValue}`);
  }

  return true;
});

// 8. 内存对齐对多字节写入的影响 - 修正：使用6字节写入
test('writeIntLE - 跨对齐边界写入', () => {
  const buf = Buffer.alloc(16);

  // 在接近8字节边界的地方写入 - 使用6字节
  const safeValue = 0x123456789ABC; // 6字节范围内的值（小于0x800000000000）
  buf.writeIntLE(safeValue, 6, 6);

  const readValue = buf.readIntLE(6, 6);
  if (readValue !== safeValue) {
    throw new Error(`跨边界写入错误: 期望${safeValue}, 实际${readValue}`);
  }

  return true;
});

// 9. Buffer.copy的交互 - 修正：使用合法的4字节数值
test('writeIntBE - Buffer.copy后的写入', () => {
  const src = Buffer.alloc(16);
  const dst = Buffer.alloc(16);

  // 源Buffer写入数据 - 使用合法的4字节数值
  src.writeIntBE(0x12345678, 0, 4);
  src.writeIntBE(0x7ABCDEF0, 4, 4); // 修改第二个值为合法范围

  // 复制到目标Buffer
  src.copy(dst);

  // 在目标Buffer上继续写入
  dst.writeIntBE(0x11223344, 8, 4);

  // 验证原始数据正确复制
  const copyCheck1 = dst.readIntBE(0, 4);
  const copyCheck2 = dst.readIntBE(4, 4);

  if (copyCheck1 !== 0x12345678 || copyCheck2 !== 0x7ABCDEF0) {
    throw new Error(`复制数据错误: ${copyCheck1.toString(16)}, ${copyCheck2.toString(16)}`);
  }

  // 验证新写入数据
  const newValue = dst.readIntBE(8, 4);
  if (newValue !== 0x11223344) {
    throw new Error(`新数据写入错误: 期望0x11223344, 实际${newValue.toString(16)}`);
  }

  return true;
});

// 10. 内部优化路径测试
test('writeIntLE - 小数值优化路径', () => {
  const buf = Buffer.alloc(64);

  // 写入多个小数值，可能触发快速路径
  for (let i = 0; i < 16; i++) {
    buf.writeIntLE(i, i * 4, 4);
  }

  // 验证所有写入
  for (let i = 0; i < 16; i++) {
    const value = buf.readIntLE(i * 4, 4);
    if (value !== i) {
      throw new Error(`小数值写入错误: 位置${i}, 期望${i}, 实际${value}`);
    }
  }

  return true;
});

// 11. Buffer.fill与writeInt的交互
test('writeIntBE - Buffer.fill后的覆盖写入', () => {
  const buf = Buffer.alloc(16);

  // 先填充特定模式
  buf.fill(0xFF);

  // 然后写入整数，应该完全覆盖fill的内容
  buf.writeIntBE(0x12345678, 4, 4);

  // 验证fill的内容被覆盖
  const writtenValue = buf.readIntBE(4, 4);
  if (writtenValue !== 0x12345678) {
    throw new Error(`覆盖写入错误: 期望0x12345678, 实际${writtenValue.toString(16)}`);
  }

  // 验证其他位置仍然是fill的内容
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0xFF) {
      throw new Error(`fill内容在位置${i}被意外修改`);
    }
  }
  for (let i = 8; i < 16; i++) {
    if (buf[i] !== 0xFF) {
      throw new Error(`fill内容在位置${i}被意外修改`);
    }
  }

  return true;
});

// 12. 不同Node.js版本的兼容性测试 - 修正：使用合适的offset步长
test('writeIntLE - 多字节小端序一致性', () => {
  const buf = Buffer.alloc(24); // 分配足够大的缓冲区

  // 写入已知的测试模式
  const testValues = [
    0x12345678, // 4字节
    0x123456789A, // 5字节
    0x123456789ABC, // 6字节
  ];

  let offset = 0;
  for (let i = 0; i < testValues.length; i++) {
    const value = testValues[i];
    const bytes = i + 4; // 4,5,6字节

    buf.writeIntLE(value, offset, bytes);
    const readValue = buf.readIntLE(offset, bytes);

    if (readValue !== value) {
      throw new Error(`${bytes}字节小端序错误: 期望${value.toString(16)}, 实际${readValue.toString(16)}`);
    }

    offset += bytes; // 移动到下一个位置
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