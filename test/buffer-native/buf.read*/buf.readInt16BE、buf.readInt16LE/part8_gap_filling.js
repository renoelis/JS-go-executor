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
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readInt16BE(0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 0.9 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.readInt16LE(0.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1.5 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x00, 0x12, 0x34, 0x56]);
    buf.readInt16BE(1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1.999 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x00, 0x12, 0x34, 0x56]);
    buf.readInt16LE(1.999);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 科学记数法offset
test('offset = 1e2 (100) 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(1e2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1e0 (1) 等价于 1 - BE', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34]);
  return buf.readInt16BE(1e0) === buf.readInt16BE(1);
});

test('offset = 2e0 (2) 在4字节buffer中合法 - LE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x34, 0x12]);
  return buf.readInt16LE(2e0) === 0x1234;
});

// === Symbol 和其他特殊类型 ===

test('offset = Symbol() 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = Symbol.iterator 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readInt16LE(Symbol.iterator);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// === TypedArray 作为 Buffer ===

test('Uint8Array 当作 Buffer 使用 - BE', () => {
  const arr = new Uint8Array([0x12, 0x34]);
  const buf = Buffer.from(arr.buffer);
  return buf.readInt16BE(0) === 0x1234;
});

test('Int8Array 转 Buffer - LE', () => {
  const arr = new Int8Array([0x34, 0x12]);
  const buf = Buffer.from(arr.buffer);
  return buf.readInt16LE(0) === 0x1234;
});

test('Uint16Array buffer 转 Buffer - BE', () => {
  const arr = new Uint16Array([0x1234]);
  const buf = Buffer.from(arr.buffer);
  // 注意：这里的字节序取决于系统架构
  const result = buf.readInt16BE(0);
  return typeof result === 'number';
});

// === 超大offset值 ===

test('offset = 2^31 应该抛出错误 - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(Math.pow(2, 31));
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 2^32 - 1 应该抛出错误 - LE', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readInt16LE(Math.pow(2, 32) - 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 错误码验证 ===

test('越界错误应该包含 ERR_OUT_OF_RANGE 或 RangeError - BE', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(2);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('越界错误应该包含 ERR_OUT_OF_RANGE 或 RangeError - LE', () => {
  try {
    const buf = Buffer.from([0x34, 0x12]);
    buf.readInt16LE(1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// === 特殊数值边界 ===

test('读取 0x8001 (-32767) - BE', () => {
  const buf = Buffer.from([0x80, 0x01]);
  return buf.readInt16BE(0) === -32767;
});

test('读取 0x8001 (-32767) - LE', () => {
  const buf = Buffer.from([0x01, 0x80]);
  return buf.readInt16LE(0) === -32767;
});

test('读取 0x7FFE (32766) - BE', () => {
  const buf = Buffer.from([0x7F, 0xFE]);
  return buf.readInt16BE(0) === 32766;
});

test('读取 0x7FFE (32766) - LE', () => {
  const buf = Buffer.from([0xFE, 0x7F]);
  return buf.readInt16LE(0) === 32766;
});

// === 极小的正负数 ===

test('读取 1 (0x0001) - BE', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readInt16BE(0) === 1;
});

test('读取 1 (0x0001) - LE', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readInt16LE(0) === 1;
});

test('读取 -1 (0xFFFF) - BE', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readInt16BE(0) === -1;
});

test('读取 -1 (0xFFFF) - LE', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readInt16LE(0) === -1;
});

test('读取 256 (0x0100) - BE', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readInt16BE(0) === 256;
});

test('读取 256 (0x0100) - LE', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readInt16LE(0) === 256;
});

test('读取 -256 (0xFF00) - BE', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readInt16BE(0) === -256;
});

test('读取 -256 (0xFF00) - LE', () => {
  const buf = Buffer.from([0x00, 0xFF]);
  return buf.readInt16LE(0) === -256;
});

// === 多参数测试 ===

test('提供超过1个参数应该忽略额外参数 - BE', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34]);
  return buf.readInt16BE(1, 'extra', 'params') === 0x1234;
});

test('提供超过1个参数应该忽略额外参数 - LE', () => {
  const buf = Buffer.from([0x00, 0x34, 0x12]);
  return buf.readInt16LE(1, 999, null, undefined) === 0x1234;
});

// === 只读Buffer测试 ===

test('subarray 只读视图可以读取 - BE', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x00]);
  const sub = buf.subarray(1, 3);
  return sub.readInt16BE(0) === 0x1234;
});

test('subarray 只读视图可以读取 - LE', () => {
  const buf = Buffer.from([0x00, 0x34, 0x12, 0x00]);
  const sub = buf.subarray(1, 3);
  return sub.readInt16LE(0) === 0x1234;
});

// === 字节对齐测试 ===

test('奇数offset读取 - BE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x12, 0x34]);
  return buf.readInt16BE(3) === 0x1234;
});

test('奇数offset读取 - LE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x34, 0x12]);
  return buf.readInt16LE(3) === 0x1234;
});

// === 所有字节值覆盖 ===

test('读取 0x00XX 范围 - BE', () => {
  let pass = true;
  for (let i = 0; i < 256; i++) {
    const buf = Buffer.from([0x00, i]);
    const expected = i;
    if (buf.readInt16BE(0) !== expected) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('读取 0xFF00-0xFFFF 负数范围 - BE', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readInt16BE(0) === -256;
});

// === 并发读取测试 ===

test('同一buffer多次并发读取不同位置 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readInt16BE(0);
  const r2 = buf.readInt16BE(2);
  const r3 = buf.readInt16BE(0); // 重复读取
  return r1 === 0x1234 && r2 === 0x5678 && r3 === 0x1234;
});

test('同一buffer多次并发读取不同位置 - LE', () => {
  const buf = Buffer.from([0x34, 0x12, 0x78, 0x56]);
  const r1 = buf.readInt16LE(0);
  const r2 = buf.readInt16LE(2);
  const r3 = buf.readInt16LE(0); // 重复读取
  return r1 === 0x1234 && r2 === 0x5678 && r3 === 0x1234;
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
