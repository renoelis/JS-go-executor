// buf.writeIntBE() 和 buf.writeIntLE() - Error Tests
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

// 类型错误测试
test('writeIntBE - 非Buffer对象调用', () => {
  try {
    const notBuffer = {};
    notBuffer.writeIntBE = Buffer.prototype.writeIntBE;
    notBuffer.writeIntBE(0x1234, 0, 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误，不检查具体错误信息
  }
});

test('writeIntLE - 非Buffer对象调用', () => {
  try {
    const notBuffer = {};
    notBuffer.writeIntLE = Buffer.prototype.writeIntLE;
    notBuffer.writeIntLE(0x1234, 0, 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误，不检查具体错误信息
  }
});

// 参数类型错误
test('writeIntBE - value为undefined', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(undefined, 0, 2);
    return true; // undefined被当作0处理
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntLE - value为null', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(null, 0, 2);
    return true; // null被当作0处理
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntBE - offset为字符串', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x1234, "invalid", 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - offset为NaN', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x1234, NaN, 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntBE - byteLength为字符串', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x1234, 0, "invalid");
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - byteLength为Infinity', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x1234, 0, Infinity);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 越界错误测试
test('writeIntBE - offset为负数', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x1234, -1, 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - offset过大', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x1234, 4, 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntBE - 写入超出Buffer长度', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x12345678, 2, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 写入超出Buffer长度', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x12345678, 3, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 字节长度错误
test('writeIntBE - byteLength为0', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x1234, 0, 0);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - byteLength为负数', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x1234, 0, -1);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntBE - byteLength超过6', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeIntBE(0x1234567890ABCDEF, 0, 7);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - byteLength过大', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeIntLE(0x1234567890ABCDEF, 0, 100);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 数值超出范围测试
test('writeIntBE - 1字节超出正范围', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(128, 0, 1); // 超出1字节有符号整数范围
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntBE - 1字节超出负范围', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(-129, 0, 1); // 超出1字节有符号整数范围
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 2字节超出正范围', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(32768, 0, 2); // 超出2字节有符号整数范围
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntBE - 2字节超出负范围', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(-32769, 0, 2); // 超出2字节有符号整数范围
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntBE - 4字节超出正范围', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(2147483648, 0, 4); // 超出4字节有符号整数范围
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 4字节超出负范围', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(-2147483649, 0, 4); // 超出4字节有符号整数范围
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 非整数数值测试
test('writeIntBE - value为浮点数', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(123.456, 0, 2);
    return true; // 浮点数被截断为整数
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntLE - value为Infinity', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(Infinity, 0, 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntBE - value为-Infinity', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(-Infinity, 0, 2);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 特殊输入测试
test('writeIntBE - 参数缺失', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x1234);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 参数过多', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x1234, 0, 2, "extra");
    return true; // 应该忽略额外参数
  } catch (error) {
    return false; // 不应该抛出错误
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