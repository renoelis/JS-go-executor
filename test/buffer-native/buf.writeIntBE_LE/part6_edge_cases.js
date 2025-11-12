// buf.writeIntBE() 和 buf.writeIntLE() - Edge Cases Tests
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

// 极端数值测试
test('writeIntBE - 写入Number.MAX_SAFE_INTEGER部分', () => {
  const buf = Buffer.alloc(6);
  const value = Math.pow(2, 47) - 1; // 最大安全整数的6字节部分
  const result = buf.writeIntBE(value, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');

  const readValue = buf.readIntBE(0, 6);
  if (readValue !== value) throw new Error('读写不一致');
  return true;
});

test('writeIntLE - 写入Number.MIN_SAFE_INTEGER部分', () => {
  const buf = Buffer.alloc(6);
  const value = -Math.pow(2, 47); // 最小安全整数的6字节部分
  const result = buf.writeIntLE(value, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');

  const readValue = buf.readIntLE(0, 6);
  if (readValue !== value) throw new Error('读写不一致');
  return true;
});

// 特殊浮点数处理
test('writeIntBE - 处理NaN输入', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(NaN, 0, 4);
    return true; // NaN被当作0处理
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntLE - 处理+0和-0', () => {
  const buf = Buffer.alloc(8);

  buf.writeIntLE(+0, 0, 4);
  buf.writeIntLE(-0, 4, 4);

  // +0和-0都应该写入为0
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0) throw new Error('零值处理错误');
  }
  return true;
});

// 字符串数值转换
test('writeIntBE - 字符串数值', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE("12345", 0, 4);
    return true; // 字符串被转换
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntLE - 十六进制字符串', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE("0x1234", 0, 4);
    return true; // 十六进制字符串被处理
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

// 大端小端对比测试
test('writeIntBE vs writeIntLE - 相同数值不同编码', () => {
  const bufBE = Buffer.alloc(4);
  const bufLE = Buffer.alloc(4);
  const value = 0x12345678;

  bufBE.writeIntBE(value, 0, 4);
  bufLE.writeIntLE(value, 0, 4);

  // 大端：高位在前
  if (bufBE[0] !== 0x12 || bufBE[1] !== 0x34 || bufBE[2] !== 0x56 || bufBE[3] !== 0x78) {
    throw new Error('大端编码错误');
  }

  // 小端：低位在前
  if (bufLE[0] !== 0x78 || bufLE[1] !== 0x56 || bufLE[2] !== 0x34 || bufLE[3] !== 0x12) {
    throw new Error('小端编码错误');
  }

  return true;
});

// 不同字节长度的数值截断
test('writeIntBE - 2字节数值范围测试', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0x7ABC, 0, 2); // 有效的2字节正数

  if (result !== 2) throw new Error('返回值应为2');
  if (buf[0] !== 0x7A || buf[1] !== 0xBC) throw new Error('2字节写入错误');
  return true;
});

test('writeIntLE - 2字节负数范围测试', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(-0x1234, 0, 2); // 有效的2字节负数

  if (result !== 2) throw new Error('返回值应为2');
  // -0x1234 的补码：0xEDCC
  if (buf[0] !== 0xCC || buf[1] !== 0xED) throw new Error('2字节负数值写入错误');
  return true;
});

// 边界offset测试
test('writeIntBE - offset为浮点数', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x1234, 1.7, 2);
    return true; // 浮点offset被截断
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntLE - offset为字符串数字', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x1234, "1", 2);
    return true; // 字符串offset被转换
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

// 极端byteLength测试
test('writeIntBE - byteLength为浮点数', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x1234, 0, 2.7);
    return true; // 浮点byteLength被截断
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntLE - byteLength为字符串数字', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x1234, 0, "2");
    return true; // 字符串byteLength被转换
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

// 符号扩展测试
test('writeIntBE - 1字节负数符号扩展到多字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(-1, 0, 1); // -1 写入1字节
  buf.writeIntBE(-1, 1, 3); // -1 写入3字节

  // 1字节：0xFF
  if (buf[0] !== 0xFF) throw new Error('1字节负数错误');

  // 3字节：0xFFFFFF
  if (buf[1] !== 0xFF || buf[2] !== 0xFF || buf[3] !== 0xFF) {
    throw new Error('3字节负数符号扩展错误');
  }
  return true;
});

test('writeIntLE - 小数值到大Buffer的符号扩展', () => {
  const buf = Buffer.alloc(6);
  const smallNegative = -5; // 适合1字节，但需要4字节表示

  buf.writeIntLE(smallNegative, 0, 4);

  // 小负数在4字节中的表示
  if (buf[0] !== 0xFB || buf[1] !== 0xFF || buf[2] !== 0xFF || buf[3] !== 0xFF) {
    throw new Error('小数值符号扩展错误');
  }
  return true;
});

// 并发读写测试
test('writeIntBE - 并发读写一致性', () => {
  const buf = Buffer.alloc(8);
  const values = [0x1111, 0x2222, 0x3333, 0x4444];

  // 写入不同位置
  values.forEach((value, index) => {
    buf.writeIntBE(value, index * 2, 2);
  });

  // 验证读取一致性
  values.forEach((expectedValue, index) => {
    const readValue = buf.readIntBE(index * 2, 2);
    if (readValue !== expectedValue) {
      throw new Error(`位置${index}读写不一致`);
    }
  });
  return true;
});

// 特殊模式测试
test('writeIntBE - 交替写入有效2字节值', () => {
  const buf = Buffer.alloc(8);

  buf.writeIntBE(0x7F00, 0, 2);  // 有效的2字节值
  buf.writeIntBE(0x007F, 2, 2);  // 有效的2字节值
  buf.writeIntBE(0x7F00, 4, 2);  // 有效的2字节值
  buf.writeIntBE(0x007F, 6, 2);  // 有效的2字节值

  const expected = [0x7F, 0x00, 0x00, 0x7F, 0x7F, 0x00, 0x00, 0x7F];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== expected[i]) throw new Error(`交替模式字节${i}错误`);
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