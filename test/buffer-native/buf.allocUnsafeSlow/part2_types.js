const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ name, passed: result, details: result ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, error: e.message, stack: e.stack });
  }
}

test('类型处理 - Node.js v25.0.0 格式要求：整数数字', () => {
  const buf = Buffer.allocUnsafeSlow(1024);
  return buf.length === 1024 && buf instanceof Buffer;
});

test('类型处理 - Node.js v25.0.0 格式要求：浮点数转换为整数', () => {
  const buf = Buffer.allocUnsafeSlow(1024.0);
  return buf.length === 1024 && buf instanceof Buffer;
});

test('类型处理 - Node.js v25.0.0 格式要求：十六进制数字', () => {
  const buf = Buffer.allocUnsafeSlow(0x400);
  return buf.length === 1024 && buf instanceof Buffer;
});

test('类型处理 - 特殊数字 0', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0 && buf instanceof Buffer;
});

test('类型处理 - 特殊数字 NaN', () => {
  try {
    Buffer.allocUnsafeSlow(NaN);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number') || e.message.includes('Invalid');
  }
});

test('类型处理 - 特殊数字 Infinity', () => {
  try {
    Buffer.allocUnsafeSlow(Infinity);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number') || e.message.includes('Invalid');
  }
});

test('类型处理 - 负数', () => {
  try {
    Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('negative') || e.message.includes('Invalid');
  }
});

test('类型处理 - 超大数值', () => {
  try {
    Buffer.allocUnsafeSlow(1e50);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('range') || e.message.includes('Invalid');
  }
});

test('类型处理 - 非数字字符串', () => {
  try {
    Buffer.allocUnsafeSlow('invalid');
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number') || e.message.includes('Invalid');
  }
});

test('类型处理 - null 作为 size', () => {
  try {
    Buffer.allocUnsafeSlow(null);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number') || e.message.includes('Invalid');
  }
});

test('类型处理 - undefined 作为 size', () => {
  try {
    Buffer.allocUnsafeSlow(undefined);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('number') || e.message.includes('Invalid');
  }
});

test('类型处理 - boolean true', () => {
  try {
    Buffer.allocUnsafeSlow(true);
    return false;
  } catch (e) {
    return e.message.includes('number') && e.message.includes('boolean');
  }
});

test('类型处理 - boolean false', () => {
  try {
    Buffer.allocUnsafeSlow(false);
    return false;
  } catch (e) {
    return e.message.includes('number') && e.message.includes('boolean');
  }
});

test('类型处理 - 对象转换行为', () => {
  try {
    Buffer.allocUnsafeSlow({ valueOf: () => 5 });
    return false;
  } catch (e) {
    return e.message && e.message.includes('size');
  }
});

test('类型处理 - fill 为 ArrayBuffer', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 65; view[1] = 66; view[2] = 67;
  const buf = Buffer.allocUnsafeSlow(6, view);
  // allocUnsafeSlow不会填充内容，只分配未初始化内存
  return buf.length === 6;
});

test('类型处理 - fill 为 DataView', () => {
  const ab = new ArrayBuffer(3);
  const dv = new DataView(ab);
  dv.setUint8(0, 65); dv.setUint8(1, 66); dv.setUint8(2, 67);
  const buf = Buffer.allocUnsafeSlow(6, dv);
  // allocUnsafeSlow不会填充内容，只分配未初始化内存
  return buf.length === 6;
});

test('类型处理 - encoding 为 utf8', () => {
  const buf = Buffer.allocUnsafeSlow(10, 'hello世界', 'utf8');
  return buf.length === 10;
});

test('类型处理 - encoding 为 ascii', () => {
  const buf = Buffer.allocUnsafeSlow(5, 'hello', 'ascii');
  // allocUnsafeSlow不会填充内容，只分配未初始化内存
  return buf.length === 5;
});

test('类型处理 - encoding 为 hex', () => {
  const buf = Buffer.allocUnsafeSlow(4, '41424344', 'hex');
  // allocUnsafeSlow不会填充内容，只分配未初始化内存
  return buf.length === 4;
});

test('类型处理 - encoding 为 base64', () => {
  const buf = Buffer.allocUnsafeSlow(5, 'SGVsbG8=', 'base64');
  // allocUnsafeSlow不会填充内容，只分配未初始化内存
  return buf.length === 5;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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