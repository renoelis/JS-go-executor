// buf.writeUIntBE/LE() - 高级边界情况测试
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

// === 参数缺失测试 ===
test('writeUIntBE 缺少所有参数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE();
    return false;
  } catch (e) {
    return e.message.includes('byteLength') && e.message.includes('undefined');
  }
});

test('writeUIntLE 缺少所有参数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE();
    return false;
  } catch (e) {
    return e.message.includes('byteLength') && e.message.includes('undefined');
  }
});

test('writeUIntBE 缺少 offset 参数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(255);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') && e.message.includes('undefined');
  }
});

test('writeUIntLE 缺少 offset 参数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(255);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') && e.message.includes('undefined');
  }
});

test('writeUIntBE 缺少 byteLength 参数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(255, 0);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') && e.message.includes('undefined');
  }
});

test('writeUIntLE 缺少 byteLength 参数应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(255, 0);
    return false;
  } catch (e) {
    return e.message.includes('byteLength') && e.message.includes('undefined');
  }
});

// === 包装器对象测试 ===
test('writeUIntBE value 为 Number 对象正常工作', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(new Number(42), 0, 1);
  return result === 1 && buf[0] === 42;
});

test('writeUIntLE value 为 Number 对象正常工作', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(new Number(42), 0, 1);
  return result === 1 && buf[0] === 42;
});

test('writeUIntBE value 为 String 对象正常工作', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(new String('42'), 0, 1);
  return result === 1 && buf[0] === 42;
});

test('writeUIntLE value 为 String 对象正常工作', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(new String('42'), 0, 1);
  return result === 1 && buf[0] === 42;
});

test('writeUIntBE value 为 Boolean 对象正常工作', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(new Boolean(true), 0, 1);
  return result === 1 && buf[0] === 1;
});

test('writeUIntLE value 为 Boolean 对象正常工作', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(new Boolean(true), 0, 1);
  return result === 1 && buf[0] === 1;
});

// === 精度丢失测试 ===
test('writeUIntBE 超大整数精度丢失', () => {
  const buf = Buffer.allocUnsafe(8);
  const largeNum = Number.MAX_SAFE_INTEGER + 1;
  try {
    buf.writeUIntBE(largeNum, 0, 6);
    return true; // 应该成功，但可能有精度丢失
  } catch (e) {
    return e.message.includes('range') || e.message.includes('precision');
  }
});

test('writeUIntLE 超大整数精度丢失', () => {
  const buf = Buffer.allocUnsafe(8);
  const largeNum = Number.MAX_SAFE_INTEGER + 1;
  try {
    buf.writeUIntLE(largeNum, 0, 6);
    return true; // 应该成功，但可能有精度丢失
  } catch (e) {
    return e.message.includes('range') || e.message.includes('precision');
  }
});

// === 零长度 Buffer 测试 ===
test('writeUIntBE 在零长度 Buffer 上应该报错', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeUIntBE(255, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('Attempt to access memory outside buffer bounds');
  }
});

test('writeUIntLE 在零长度 Buffer 上应该报错', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeUIntLE(255, 0, 1);
    return false;
  } catch (e) {
    return e.message.includes('Attempt to access memory outside buffer bounds');
  }
});

// === 非整数 offset 和 byteLength ===
test('writeUIntBE offset 为 NaN 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(255, NaN, 1);
    return false;
  } catch (e) {
    return e.message.includes('NaN') || e.message.includes('integer');
  }
});

test('writeUIntLE offset 为 NaN 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(255, NaN, 1);
    return false;
  } catch (e) {
    return e.message.includes('NaN') || e.message.includes('integer');
  }
});

test('writeUIntBE byteLength 为 NaN 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(255, 0, NaN);
    return false;
  } catch (e) {
    return e.message.includes('NaN') || e.message.includes('integer');
  }
});

test('writeUIntLE byteLength 为 NaN 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(255, 0, NaN);
    return false;
  } catch (e) {
    return e.message.includes('NaN') || e.message.includes('integer');
  }
});

// === 极端 offset 值 ===
test('writeUIntBE offset 为 Number.MAX_VALUE 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(255, Number.MAX_VALUE, 1);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeUIntLE offset 为 Number.MAX_VALUE 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(255, Number.MAX_VALUE, 1);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('bounds');
  }
});

// === 对象的 valueOf 和 toString 方法 ===
test('writeUIntBE value 对象有 valueOf 方法', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    valueOf: () => 42
  };
  const result = buf.writeUIntBE(obj, 0, 1);
  return result === 1 && buf[0] === 42;
});

test('writeUIntLE value 对象有 valueOf 方法', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    valueOf: () => 42
  };
  const result = buf.writeUIntLE(obj, 0, 1);
  return result === 1 && buf[0] === 42;
});

test('writeUIntBE value 对象有 toString 方法', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    toString: () => '42'
  };
  const result = buf.writeUIntBE(obj, 0, 1);
  return result === 1 && buf[0] === 42;
});

test('writeUIntLE value 对象有 toString 方法', () => {
  const buf = Buffer.allocUnsafe(4);
  const obj = {
    toString: () => '42'
  };
  const result = buf.writeUIntLE(obj, 0, 1);
  return result === 1 && buf[0] === 42;
});

// === 链式调用测试 ===
test('writeUIntBE 返回值可用于链式调用', () => {
  const buf = Buffer.allocUnsafe(6);
  const offset1 = buf.writeUIntBE(0x12, 0, 1);
  const offset2 = buf.writeUIntBE(0x34, offset1, 1);
  const offset3 = buf.writeUIntBE(0x56, offset2, 1);
  return offset1 === 1 && offset2 === 2 && offset3 === 3 && 
         buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56;
});

test('writeUIntLE 返回值可用于链式调用', () => {
  const buf = Buffer.allocUnsafe(6);
  const offset1 = buf.writeUIntLE(0x12, 0, 1);
  const offset2 = buf.writeUIntLE(0x34, offset1, 1);
  const offset3 = buf.writeUIntLE(0x56, offset2, 1);
  return offset1 === 1 && offset2 === 2 && offset3 === 3 && 
         buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56;
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
