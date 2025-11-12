// buf.writeIntBE() 和 buf.writeIntLE() - Byte Length Tests
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

// 不同字节长度的最大值测试
test('writeIntBE - 1字节最大值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(127, 0, 1); // 2^7 - 1
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0x7F) throw new Error('最大值编码错误');
  return true;
});

test('writeIntBE - 1字节最小值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(-128, 0, 1); // -2^7
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0x80) throw new Error('最小值编码错误');
  return true;
});

test('writeIntLE - 1字节最大值最小值', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntLE(127, 0, 1);
  if (buf[0] !== 0x7F) throw new Error('最大值编码错误');
  buf.writeIntLE(-128, 1, 1);
  if (buf[1] !== 0x80) throw new Error('最小值编码错误');
  return true;
});

test('writeIntBE - 2字节最大值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(32767, 0, 2); // 2^15 - 1
  if (result !== 2) throw new Error('返回值应为2');
  if (buf[0] !== 0x7F || buf[1] !== 0xFF) throw new Error('最大值编码错误');
  return true;
});

test('writeIntBE - 2字节最小值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(-32768, 0, 2); // -2^15
  if (result !== 2) throw new Error('返回值应为2');
  if (buf[0] !== 0x80 || buf[1] !== 0x00) throw new Error('最小值编码错误');
  return true;
});

test('writeIntLE - 2字节最大值最小值', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntLE(32767, 0, 2);
  if (buf[0] !== 0xFF || buf[1] !== 0x7F) throw new Error('最大值编码错误');
  buf.writeIntLE(-32768, 2, 2);
  if (buf[2] !== 0x00 || buf[3] !== 0x80) throw new Error('最小值编码错误');
  return true;
});

test('writeIntBE - 3字节最大值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(8388607, 0, 3); // 2^23 - 1
  if (result !== 3) throw new Error('返回值应为3');
  if (buf[0] !== 0x7F || buf[1] !== 0xFF || buf[2] !== 0xFF) {
    throw new Error('最大值编码错误');
  }
  return true;
});

test('writeIntBE - 3字节最小值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(-8388608, 0, 3); // -2^23
  if (result !== 3) throw new Error('返回值应为3');
  if (buf[0] !== 0x80 || buf[1] !== 0x00 || buf[2] !== 0x00) {
    throw new Error('最小值编码错误');
  }
  return true;
});

test('writeIntBE - 4字节最大值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(2147483647, 0, 4); // 2^31 - 1
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[0] !== 0x7F || buf[1] !== 0xFF || buf[2] !== 0xFF || buf[3] !== 0xFF) {
    throw new Error('最大值编码错误');
  }
  return true;
});

test('writeIntBE - 4字节最小值', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(-2147483648, 0, 4); // -2^31
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[0] !== 0x80 || buf[1] !== 0x00 || buf[2] !== 0x00 || buf[3] !== 0x00) {
    throw new Error('最小值编码错误');
  }
  return true;
});

test('writeIntBE - 5字节最大值', () => {
  const buf = Buffer.alloc(6);
  const maxValue = Math.pow(2, 39) - 1; // 549755813887
  const result = buf.writeIntBE(maxValue, 0, 5);
  if (result !== 5) throw new Error('返回值应为5');
  if (buf[0] !== 0x7F || buf[1] !== 0xFF || buf[2] !== 0xFF ||
      buf[3] !== 0xFF || buf[4] !== 0xFF) {
    throw new Error('最大值编码错误');
  }
  return true;
});

test('writeIntBE - 5字节最小值', () => {
  const buf = Buffer.alloc(6);
  const minValue = -Math.pow(2, 39); // -549755813888
  const result = buf.writeIntBE(minValue, 0, 5);
  if (result !== 5) throw new Error('返回值应为5');
  if (buf[0] !== 0x80 || buf[1] !== 0x00 || buf[2] !== 0x00 ||
      buf[3] !== 0x00 || buf[4] !== 0x00) {
    throw new Error('最小值编码错误');
  }
  return true;
});

test('writeIntBE - 6字节最大值', () => {
  const buf = Buffer.alloc(6);
  const maxValue = Math.pow(2, 47) - 1; // 140737488355327
  const result = buf.writeIntBE(maxValue, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  if (buf[0] !== 0x7F || buf[1] !== 0xFF || buf[2] !== 0xFF ||
      buf[3] !== 0xFF || buf[4] !== 0xFF || buf[5] !== 0xFF) {
    throw new Error('最大值编码错误');
  }
  return true;
});

test('writeIntBE - 6字节最小值', () => {
  const buf = Buffer.alloc(6);
  const minValue = -Math.pow(2, 47); // -140737488355328
  const result = buf.writeIntBE(minValue, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  if (buf[0] !== 0x80 || buf[1] !== 0x00 || buf[2] !== 0x00 ||
      buf[3] !== 0x00 || buf[4] !== 0x00 || buf[5] !== 0x00) {
    throw new Error('最小值编码错误');
  }
  return true;
});

// 边界值测试
test('writeIntBE - 零值写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0, 0, 4);
  if (result !== 4) throw new Error('返回值应为4');
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0) throw new Error('零值编码错误');
  }
  return true;
});

test('writeIntLE - 零值写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(0, 0, 4);
  if (result !== 4) throw new Error('返回值应为4');
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0) throw new Error('零值编码错误');
  }
  return true;
});

test('writeIntBE - 1字节写入-1', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(-1, 0, 1);
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0xFF) throw new Error('-1编码错误');
  return true;
});

test('writeIntLE - 1字节写入-1', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(-1, 0, 1);
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0xFF) throw new Error('-1编码错误');
  return true;
});

test('writeIntBE - 不同字节长度对比', () => {
  const buf = Buffer.alloc(10);
  const value = 0x123456;

  buf.writeIntBE(value, 0, 3);
  buf.writeIntBE(value, 4, 4);

  // 3字节写入
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56) {
    throw new Error('3字节写入错误');
  }

  // 4字节写入（高位补0）
  if (buf[4] !== 0x00 || buf[5] !== 0x12 || buf[6] !== 0x34 || buf[7] !== 0x56) {
    throw new Error('4字节写入错误');
  }

  return true;
});

test('writeIntLE - 不同字节长度对比', () => {
  const buf = Buffer.alloc(10);
  const value = 0x123456;

  buf.writeIntLE(value, 0, 3);
  buf.writeIntLE(value, 4, 4);

  // 3字节写入
  if (buf[0] !== 0x56 || buf[1] !== 0x34 || buf[2] !== 0x12) {
    throw new Error('3字节写入错误');
  }

  // 4字节写入（高位补0）
  if (buf[4] !== 0x56 || buf[5] !== 0x34 || buf[6] !== 0x12 || buf[7] !== 0x00) {
    throw new Error('4字节写入错误');
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