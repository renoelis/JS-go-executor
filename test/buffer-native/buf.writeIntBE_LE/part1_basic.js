// buf.writeIntBE() 和 buf.writeIntLE() - Basic Tests
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

// 基本功能测试
test('writeIntBE - 基本1字节写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0x12, 0, 1);
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0x12) throw new Error('字节写入错误');
  return true;
});

test('writeIntLE - 基本1字节写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(0x12, 0, 1);
  if (result !== 1) throw new Error('返回值应为1');
  if (buf[0] !== 0x12) throw new Error('字节写入错误');
  return true;
});

test('writeIntBE - 基本2字节写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0x1234, 0, 2);
  if (result !== 2) throw new Error('返回值应为2');
  if (buf[0] !== 0x12 || buf[1] !== 0x34) throw new Error('字节顺序错误');
  return true;
});

test('writeIntLE - 基本2字节写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(0x1234, 0, 2);
  if (result !== 2) throw new Error('返回值应为2');
  if (buf[0] !== 0x34 || buf[1] !== 0x12) throw new Error('字节顺序错误');
  return true;
});

test('writeIntBE - 基本3字节写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0x123456, 0, 3);
  if (result !== 3) throw new Error('返回值应为3');
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56) {
    throw new Error('字节顺序错误');
  }
  return true;
});

test('writeIntLE - 基本3字节写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(0x123456, 0, 3);
  if (result !== 3) throw new Error('返回值应为3');
  if (buf[0] !== 0x56 || buf[1] !== 0x34 || buf[2] !== 0x12) {
    throw new Error('字节顺序错误');
  }
  return true;
});

test('writeIntBE - 基本4字节写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(0x12345678, 0, 4);
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56 || buf[3] !== 0x78) {
    throw new Error('字节顺序错误');
  }
  return true;
});

test('writeIntLE - 基本4字节写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(0x12345678, 0, 4);
  if (result !== 4) throw new Error('返回值应为4');
  if (buf[0] !== 0x78 || buf[1] !== 0x56 || buf[2] !== 0x34 || buf[3] !== 0x12) {
    throw new Error('字节顺序错误');
  }
  return true;
});

test('writeIntBE - 基本5字节写入', () => {
  const buf = Buffer.alloc(6);
  const result = buf.writeIntBE(0x1234567890, 0, 5);
  if (result !== 5) throw new Error('返回值应为5');
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56 ||
      buf[3] !== 0x78 || buf[4] !== 0x90) {
    throw new Error('字节顺序错误');
  }
  return true;
});

test('writeIntLE - 基本5字节写入', () => {
  const buf = Buffer.alloc(6);
  const result = buf.writeIntLE(0x1234567890, 0, 5);
  if (result !== 5) throw new Error('返回值应为5');
  if (buf[0] !== 0x90 || buf[1] !== 0x78 || buf[2] !== 0x56 ||
      buf[3] !== 0x34 || buf[4] !== 0x12) {
    throw new Error('字节顺序错误');
  }
  return true;
});

test('writeIntBE - 基本6字节写入', () => {
  const buf = Buffer.alloc(6);
  const result = buf.writeIntBE(0x1234567890AB, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56 ||
      buf[3] !== 0x78 || buf[4] !== 0x90 || buf[5] !== 0xAB) {
    throw new Error('字节顺序错误');
  }
  return true;
});

test('writeIntLE - 基本6字节写入', () => {
  const buf = Buffer.alloc(6);
  const result = buf.writeIntLE(0x1234567890AB, 0, 6);
  if (result !== 6) throw new Error('返回值应为6');
  if (buf[0] !== 0xAB || buf[1] !== 0x90 || buf[2] !== 0x78 ||
      buf[3] !== 0x56 || buf[4] !== 0x34 || buf[5] !== 0x12) {
    throw new Error('字节顺序错误');
  }
  return true;
});

test('writeIntBE - 负数写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(-1, 0, 4);
  if (result !== 4) throw new Error('返回值应为4');
  // -1 的32位补码是 0xFFFFFFFF
  if (buf[0] !== 0xFF || buf[1] !== 0xFF || buf[2] !== 0xFF || buf[3] !== 0xFF) {
    throw new Error('负数编码错误');
  }
  return true;
});

test('writeIntLE - 负数写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(-1, 0, 4);
  if (result !== 4) throw new Error('返回值应为4');
  // -1 的32位补码是 0xFFFFFFFF
  if (buf[0] !== 0xFF || buf[1] !== 0xFF || buf[2] !== 0xFF || buf[3] !== 0xFF) {
    throw new Error('负数编码错误');
  }
  return true;
});

test('writeIntBE - 带offset写入', () => {
  const buf = Buffer.alloc(6);
  const result = buf.writeIntBE(0x1234, 1, 2);
  if (result !== 3) throw new Error('返回值应为3');
  if (buf[1] !== 0x12 || buf[2] !== 0x34) throw new Error('字节写入位置错误');
  return true;
});

test('writeIntLE - 带offset写入', () => {
  const buf = Buffer.alloc(6);
  const result = buf.writeIntLE(0x1234, 1, 2);
  if (result !== 3) throw new Error('返回值应为3');
  if (buf[1] !== 0x34 || buf[2] !== 0x12) throw new Error('字节写入位置错误');
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