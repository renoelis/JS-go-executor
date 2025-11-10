// buf.fill() - Edge Cases and Boundary Tests
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

// === 边界值测试 ===

test('填充长度为 0 的 Buffer', () => {
  const buf = Buffer.alloc(0);
  buf.fill(0xFF);
  return buf.length === 0;
});

test('填充长度为 1 的 Buffer', () => {
  const buf = Buffer.alloc(1);
  buf.fill(0x42);
  return buf[0] === 0x42;
});

test('填充大 Buffer（10000 字节）', () => {
  const buf = Buffer.alloc(10000);
  buf.fill(0xAB);
  return buf[0] === 0xAB && buf[9999] === 0xAB && buf[5000] === 0xAB;
});

test('offset 为 0', () => {
  const buf = Buffer.alloc(5);
  buf.fill(1, 0);
  return buf.every(b => b === 1);
});

test('offset 为负数应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0);
    buf.fill(1, -2);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('offset 为负数超出范围应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill(1, -10);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('end 为负数应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0);
    buf.fill(1, 0, -1);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('end 为负数超出范围应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0);
    buf.fill(1, 0, -10);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('offset 等于 length', () => {
  const buf = Buffer.alloc(5, 0);
  buf.fill(1, 5);
  return buf.every(b => b === 0);
});

test('end 等于 length', () => {
  const buf = Buffer.alloc(5);
  buf.fill(1, 0, 5);
  return buf.every(b => b === 1);
});

test('offset 和 end 相同', () => {
  const buf = Buffer.alloc(5, 0);
  buf.fill(1, 2, 2);
  return buf.every(b => b === 0);
});

test('offset 大于 end', () => {
  const buf = Buffer.alloc(5, 0);
  buf.fill(1, 4, 2);
  return buf.every(b => b === 0);
});

test('offset 和 end 都超出范围应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0);
    buf.fill(1, 10, 20);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

// === 特殊值填充测试 ===

test('填充 0', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.fill(0);
  return buf.every(b => b === 0);
});

test('填充 255', () => {
  const buf = Buffer.alloc(5);
  buf.fill(255);
  return buf.every(b => b === 255);
});

test('填充 256（超出字节范围）', () => {
  const buf = Buffer.alloc(5);
  buf.fill(256);
  // 256 % 256 = 0
  return buf.every(b => b === 0);
});

test('填充 257', () => {
  const buf = Buffer.alloc(5);
  buf.fill(257);
  // 257 % 256 = 1
  return buf.every(b => b === 1);
});

test('填充负数', () => {
  const buf = Buffer.alloc(5);
  buf.fill(-1);
  // -1 会被转换为 255 (0xFF)
  return buf.every(b => b === 255);
});

test('填充负数 -128', () => {
  const buf = Buffer.alloc(5);
  buf.fill(-128);
  // -128 会被转换为 128
  return buf.every(b => b === 128);
});

test('填充空字符串会填充 0', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.fill('');
  // 空字符串会被当作 null 字符处理
  return buf.every(b => b === 0);
});

test('填充单字符字符串', () => {
  const buf = Buffer.alloc(5);
  buf.fill('A');
  return buf.every(b => b === 0x41);
});

test('填充长字符串', () => {
  const buf = Buffer.alloc(10);
  buf.fill('abcdefghij');
  return buf.toString() === 'abcdefghij';
});

test('填充超长字符串', () => {
  const buf = Buffer.alloc(5);
  buf.fill('abcdefghij');
  // 字符串会循环填充
  return buf.toString() === 'abcde';
});

test('填充空 Buffer 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(5, 0xFF);
    buf.fill(Buffer.alloc(0));
    return false;
  } catch (e) {
    return e.message.includes('invalid');
  }
});

test('填充单字节 Buffer', () => {
  const buf = Buffer.alloc(5);
  buf.fill(Buffer.from([0x42]));
  return buf.every(b => b === 0x42);
});

test('填充多字节 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.fill(Buffer.from([1, 2, 3]));
  const expected = Buffer.from([1, 2, 3, 1, 2, 3, 1, 2, 3, 1]);
  return buf.equals(expected);
});

// === 特殊字符测试 ===

test('填充换行符', () => {
  const buf = Buffer.alloc(5);
  buf.fill('\n');
  return buf.every(b => b === 0x0A);
});

test('填充制表符', () => {
  const buf = Buffer.alloc(5);
  buf.fill('\t');
  return buf.every(b => b === 0x09);
});

test('填充空格', () => {
  const buf = Buffer.alloc(5);
  buf.fill(' ');
  return buf.every(b => b === 0x20);
});

test('填充 null 字符', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.fill('\0');
  return buf.every(b => b === 0);
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

