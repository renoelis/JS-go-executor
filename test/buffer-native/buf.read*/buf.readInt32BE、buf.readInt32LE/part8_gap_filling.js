// 查缺补漏测试 - 边界和特殊场景
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

// === 特殊offset值测试 ===

// 小数offset测试（应该被拒绝）
test('offset = 0.1 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
    buf.readInt32BE(0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 0.9 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
    buf.readInt32LE(0.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1.5 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x9A]);
    buf.readInt32BE(1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1.999 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x9A]);
    buf.readInt32LE(1.999);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 科学记数法offset
test('offset = 1e2 (100) 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(1e2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1e0 (1) 等价于 1 - BE', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(1e0) === buf.readInt32BE(1);
});

test('offset = 2e0 (2) 在6字节buffer中合法 - LE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE(2e0) === 0x12345678;
});

// === Symbol 和其他特殊类型 ===

test('offset = Symbol() 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = Symbol.iterator 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(Symbol.iterator);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === 超大offset值 ===

test('offset = 2^31 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readInt32BE(Math.pow(2, 31));
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 2^32 - 1 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readInt32LE(Math.pow(2, 32) - 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 多参数测试（额外参数应被忽略）===

test('多余参数被忽略 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v1 = buf.readInt32BE(0);
  const v2 = buf.readInt32BE(0, 'ignored', 123, {});
  return v1 === v2 && v1 === 0x12345678;
});

test('多余参数被忽略 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const v1 = buf.readInt32LE(0);
  const v2 = buf.readInt32LE(0, 'ignored', 123, {});
  return v1 === v2 && v1 === 0x12345678;
});

// === TypedArray转Buffer详细测试 ===

test('Int8Array 转 Buffer - BE', () => {
  const arr = new Int8Array([0x12, 0x34, 0x56, 0x78]);
  const buf = Buffer.from(arr);
  return buf.readInt32BE(0) === 0x12345678;
});

test('Uint16Array 转 Buffer - LE', () => {
  const arr = new Uint16Array([0x5678, 0x1234]);
  const buf = Buffer.from(arr.buffer);
  return buf.readInt32LE(0) === 0x12345678;
});

// === 奇数offset读取 ===

test('奇数offset=1 读取 - BE', () => {
  const buf = Buffer.from([0xFF, 0x12, 0x34, 0x56, 0x78]);
  return buf.readInt32BE(1) === 0x12345678;
});

test('奇数offset=3 读取 - LE', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x78, 0x56, 0x34, 0x12]);
  return buf.readInt32LE(3) === 0x12345678;
});

// === 所有字节值范围测试 ===

test('所有4字节组合采样 - BE', () => {
  const values = [
    [0x00, 0x00, 0x00, 0x00, 0],
    [0xFF, 0xFF, 0xFF, 0xFF, -1],
    [0x7F, 0xFF, 0xFF, 0xFF, 2147483647],
    [0x80, 0x00, 0x00, 0x00, -2147483648],
    [0x01, 0x23, 0x45, 0x67, 0x01234567],
  ];
  
  let pass = true;
  for (const [b0, b1, b2, b3, expected] of values) {
    const buf = Buffer.from([b0, b1, b2, b3]);
    if (buf.readInt32BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('所有4字节组合采样 - LE', () => {
  const values = [
    [0x00, 0x00, 0x00, 0x00, 0],
    [0xFF, 0xFF, 0xFF, 0xFF, -1],
    [0xFF, 0xFF, 0xFF, 0x7F, 2147483647],
    [0x00, 0x00, 0x00, 0x80, -2147483648],
    [0x67, 0x45, 0x23, 0x01, 0x01234567],
  ];
  
  let pass = true;
  for (const [b0, b1, b2, b3, expected] of values) {
    const buf = Buffer.from([b0, b1, b2, b3]);
    if (buf.readInt32LE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 并发读取一致性 ===

test('同一buffer连续100次读取一致 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const first = buf.readInt32BE(0);
  let pass = true;
  for (let i = 0; i < 100; i++) {
    if (buf.readInt32BE(0) !== first) {
      pass = false;
      break;
    }
  }
  return pass && first === 0x12345678;
});

test('同一buffer连续100次读取一致 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const first = buf.readInt32LE(0);
  let pass = true;
  for (let i = 0; i < 100; i++) {
    if (buf.readInt32LE(0) !== first) {
      pass = false;
      break;
    }
  }
  return pass && first === 0x12345678;
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
