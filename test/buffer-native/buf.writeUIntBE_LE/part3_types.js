// buf.writeUIntBE/LE() - 参数类型测试（修正版）
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

// 不同 Buffer 类型
test('writeUIntBE 在 Buffer.alloc 创建的 buffer 上', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUIntBE(0x1234, 0, 2);
  return result === 2 && buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUIntBE 在 Buffer.allocUnsafe 创建的 buffer 上', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(0x1234, 0, 2);
  return result === 2 && buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUIntBE 在 Buffer.from 创建的 buffer 上', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  const result = buf.writeUIntBE(0x1234, 0, 2);
  return result === 2 && buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUIntLE 在 Buffer.alloc 创建的 buffer 上', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeUIntLE(0x1234, 0, 2);
  return result === 2 && buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUIntLE 在 Buffer.allocUnsafe 创建的 buffer 上', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(0x1234, 0, 2);
  return result === 2 && buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUIntLE 在 Buffer.from 创建的 buffer 上', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  const result = buf.writeUIntLE(0x1234, 0, 2);
  return result === 2 && buf[0] === 0x34 && buf[1] === 0x12;
});

// 在 slice 创建的视图上
test('writeUIntBE 在 slice 视图上', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(2, 8);
  const result = slice.writeUIntBE(0x1234, 0, 2);
  return result === 2 && slice[0] === 0x12 && slice[1] === 0x34 && buf[2] === 0x12 && buf[3] === 0x34;
});

test('writeUIntLE 在 slice 视图上', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(2, 8);
  const result = slice.writeUIntLE(0x1234, 0, 2);
  return result === 2 && slice[0] === 0x34 && slice[1] === 0x12 && buf[2] === 0x34 && buf[3] === 0x12;
});

// 不同数值类型 - value
test('writeUIntBE value 为整数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(255, 0, 1);
  return result === 1 && buf[0] === 255;
});

test('writeUIntBE value 为整数小数（会被截断）', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(1.5, 0, 1);
  return result === 1 && buf[0] === 1;
});

test('writeUIntBE value 为字符串数字', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE('255', 0, 1);
  return result === 1 && buf[0] === 255;
});

test('writeUIntLE value 为整数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(255, 0, 1);
  return result === 1 && buf[0] === 255;
});

test('writeUIntLE value 为整数小数（会被截断）', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(1.5, 0, 1);
  return result === 1 && buf[0] === 1;
});

test('writeUIntLE value 为字符串数字', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE('255', 0, 1);
  return result === 1 && buf[0] === 255;
});

// offset 和 byteLength 必须是整数，不接受字符串或小数
test('writeUIntBE offset 为字符串应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, '1', 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('type');
  }
});

test('writeUIntBE offset 为小数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, 1.7, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer');
  }
});

test('writeUIntLE offset 为字符串应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x12, '1', 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('type');
  }
});

test('writeUIntLE offset 为小数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x12, 1.7, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer');
  }
});

// byteLength 的类型检查
test('writeUIntBE byteLength 为字符串应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x1234, 0, '2');
    return false;
  } catch (e) {
    return e.message.includes('byteLength') || e.message.includes('type');
  }
});

test('writeUIntBE byteLength 为小数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x1234, 0, 2.7);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') || e.message.includes('integer');
  }
});

test('writeUIntLE byteLength 为字符串应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x1234, 0, '2');
    return false;
  } catch (e) {
    return e.message.includes('byteLength') || e.message.includes('type');
  }
});

test('writeUIntLE byteLength 为小数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x1234, 0, 2.7);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') || e.message.includes('integer');
  }
});

// 特殊值处理 - NaN 会被转为 0
test('writeUIntBE value 为 NaN 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntBE(NaN, 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntBE value 为 Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(Infinity, 0, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntBE offset 为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x12, NaN, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE value 为 NaN 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntLE(NaN, 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntLE value 为 Infinity', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(Infinity, 0, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE offset 为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0x12, NaN, 1);
    return false;
  } catch (e) {
    return true;
  }
});

// undefined 和 null
test('writeUIntBE value 为 undefined 转为 NaN 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntBE(undefined, 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntBE value 为 null 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntBE(null, 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntLE value 为 undefined 转为 NaN 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntLE(undefined, 0, 1);
  return r === 1 && buf[0] === 0;
});

test('writeUIntLE value 为 null 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const r = buf.writeUIntLE(null, 0, 1);
  return r === 1 && buf[0] === 0;
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
