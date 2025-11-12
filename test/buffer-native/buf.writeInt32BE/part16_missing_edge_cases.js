// buf.writeInt32BE() - 遗漏的边缘情况测试
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

// ==================== 极端数值测试 ====================

test('offset 为 Number.MAX_SAFE_INTEGER 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(100, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('out of range');
  }
});

test('offset 为 Number.MAX_VALUE 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(100, Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('value 为 Number.MAX_SAFE_INTEGER 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(Number.MAX_SAFE_INTEGER, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('out of range');
  }
});

test('value 为 Number.MIN_SAFE_INTEGER 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(Number.MIN_SAFE_INTEGER, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('out of range');
  }
});

// ==================== Object 方法测试 ====================

test('冻结的 Buffer 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    Object.freeze(buf);
    buf.writeInt32BE(123, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('密封的 Buffer 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    Object.seal(buf);
    buf.writeInt32BE(123, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('不可扩展的 Buffer 应正常工作', () => {
  try {
    const buf = Buffer.alloc(8);
    Object.preventExtensions(buf);
    buf.writeInt32BE(123, 0);
    return buf.readInt32BE(0) === 123;
  } catch (e) {
    return false;
  }
});

// ==================== 特殊数值边界 ====================

test('写入 2^31 - 1 (最大正值)', () => {
  const buf = Buffer.alloc(8);
  const maxInt32 = 2147483647;
  buf.writeInt32BE(maxInt32, 0);
  return buf.readInt32BE(0) === maxInt32;
});

test('写入 -2^31 (最小负值)', () => {
  const buf = Buffer.alloc(8);
  const minInt32 = -2147483648;
  buf.writeInt32BE(minInt32, 0);
  return buf.readInt32BE(0) === minInt32;
});

test('写入 2^31 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(2147483648, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('写入 -2^31 - 1 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(-2147483649, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ==================== 特殊 offset 值 ====================

test('offset 为 Number.EPSILON 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(123, Number.EPSILON);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset 为 -Number.EPSILON 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(123, -Number.EPSILON);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ==================== 内存对齐测试 ====================

test('在奇数地址写入（模拟非对齐）', () => {
  const buf = Buffer.alloc(9);
  buf.writeInt32BE(0x12345678, 1);
  return buf[1] === 0x12 && buf[2] === 0x34 && buf[3] === 0x56 && buf[4] === 0x78;
});

test('跨页边界写入（大 Buffer）', () => {
  const buf = Buffer.alloc(8192);
  const offset = 4090; // 接近 4KB 边界
  buf.writeInt32BE(0x12345678, offset);
  return buf.readInt32BE(offset) === 0x12345678;
});

// ==================== 并发和竞态条件 ====================

test('快速连续写入同一位置', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 1000; i++) {
    buf.writeInt32BE(i, 0);
  }
  return buf.readInt32BE(0) === 999;
});

test('交替写入相邻位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(0x12345678, 0);
  buf.writeInt32BE(0x7ABCDEF0, 4); // 修改为有效的32位有符号整数
  return buf.readInt32BE(0) === 0x12345678 && buf.readInt32BE(4) === 0x7ABCDEF0;
});

// ==================== 输出结果 ====================

const summary = {
  total: tests.length,
  passed: tests.filter(t => t.status === '✅').length,
  failed: tests.filter(t => t.status === '❌').length,
  successRate: ((tests.filter(t => t.status === '✅').length / tests.length) * 100).toFixed(2) + '%'
};

const result = {
  success: summary.failed === 0,
  summary,
  tests
};

console.log(JSON.stringify(result, null, 2));
return result;
