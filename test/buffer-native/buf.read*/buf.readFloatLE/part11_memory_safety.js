// buf.readFloatLE() - 内存安全测试
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

// 边界读取测试
test('读取不会超出 Buffer 边界', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(3.14, 4);
  const result = buf.readFloatLE(4);
  return Math.abs(result - 3.14) < 0.01;
});

test('在边界处读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.718, 0);
  return Math.abs(buf.readFloatLE(0) - 2.718) < 0.001;
});

test('尝试越界读取应抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// allocUnsafe 测试
test('Buffer.allocUnsafe 读取写入的值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(123.456, 0);
  return Math.abs(buf.readFloatLE(0) - 123.456) < 0.001;
});

test('Buffer.allocUnsafe 多次读写', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatLE(1.1, 0);
  buf.writeFloatLE(2.2, 4);
  return Math.abs(buf.readFloatLE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatLE(4) - 2.2) < 0.01;
});

// 重叠位置读写
test('重叠位置写入后读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(1.5, 0);
  buf.writeFloatLE(2.5, 2);
  return buf.readFloatLE(2) === 2.5;
});

// 不同创建方式的内存安全
test('Buffer.from 数组内存安全', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F]);
  return buf.readFloatLE(0) === 1.0;
});

test('Buffer.alloc 初始化为零', () => {
  const buf = Buffer.alloc(4);
  const result = buf.readFloatLE(0);
  return result === 0 && 1 / result === Infinity;
});

// 修改后读取
test('修改 Buffer 后读取新值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.5, 0);
  buf.readFloatLE(0);
  buf.writeFloatLE(2.5, 0);
  return buf.readFloatLE(0) === 2.5;
});

// 长度检查
test('Buffer 长度恰好 4 字节可以读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14, 0);
  return Math.abs(buf.readFloatLE(0) - 3.14) < 0.01;
});

test('Buffer 长度 3 字节无法读取', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
