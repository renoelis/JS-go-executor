// buf.readFloatBE() - 内存安全测试
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
  buf.writeFloatBE(3.14, 4);
  const result = buf.readFloatBE(4);
  return Math.abs(result - 3.14) < 0.01;
});

test('在边界处读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(2.718, 0);
  return Math.abs(buf.readFloatBE(0) - 2.718) < 0.001;
});

test('尝试越界读取应抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// allocUnsafe 测试
test('Buffer.allocUnsafe 读取写入的值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(123.456, 0);
  return Math.abs(buf.readFloatBE(0) - 123.456) < 0.001;
});

test('Buffer.allocUnsafe 多次读写', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatBE(1.1, 0);
  buf.writeFloatBE(2.2, 4);
  return Math.abs(buf.readFloatBE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatBE(4) - 2.2) < 0.01;
});

// 重叠读写
test('重叠位置读写', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(111.111, 0);
  buf.writeFloatBE(222.222, 2);
  const r1 = buf.readFloatBE(0);
  const r2 = buf.readFloatBE(2);
  return typeof r1 === 'number' && typeof r2 === 'number';
});

// 不同Buffer创建方式
test('Buffer.alloc 后读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(999.999, 0);
  return Math.abs(buf.readFloatBE(0) - 999.999) < 0.001;
});

test('Buffer.from 数组后读取', () => {
  const buf = Buffer.from([0x3F, 0x80, 0x00, 0x00]);
  return buf.readFloatBE(0) === 1.0;
});

// 修改后读取
test('写入后修改再读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123.456, 0);
  buf[0] = 0x40;
  const result = buf.readFloatBE(0);
  return result !== 123.456;
});

// 长度检查
test('确保至少4字节可用', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset + 4 <= buffer.length', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(3.14, 4);
  try {
    buf.readFloatBE(5);
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
