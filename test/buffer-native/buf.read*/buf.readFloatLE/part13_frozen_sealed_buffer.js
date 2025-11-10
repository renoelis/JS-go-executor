// buf.readFloatLE() - 冻结和密封 Buffer 测试
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

// 冻结 Buffer 测试
test('尝试冻结非空 Buffer 应抛出错误', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.5, 0);
  
  try {
    Object.freeze(buf);
    return false; // Buffer 不能被冻结
  } catch (e) {
    return true;
  }
});

test('冻结空 Buffer 应成功', () => {
  const buf = Buffer.alloc(0);
  Object.freeze(buf);
  return Object.isFrozen(buf);
});

test('冻结后的空 Buffer 读取应抛出 RangeError', () => {
  const buf = Buffer.alloc(0);
  Object.freeze(buf);
  
  try {
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 密封 Buffer 测试
test('尝试密封非空 Buffer 应抛出错误', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.5, 0);
  
  try {
    Object.seal(buf);
    return false; // Buffer 不能被密封
  } catch (e) {
    return true;
  }
});

test('密封空 Buffer 应成功', () => {
  const buf = Buffer.alloc(0);
  Object.seal(buf);
  return Object.isSealed(buf);
});

test('密封后的空 Buffer 读取应抛出 RangeError', () => {
  const buf = Buffer.alloc(0);
  Object.seal(buf);
  
  try {
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// preventExtensions 测试
test('preventExtensions 对 Buffer 无影响', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14, 0);
  Object.preventExtensions(buf);
  
  return Math.abs(buf.readFloatLE(0) - 3.14) < 0.01;
});

test('preventExtensions 后仍可读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.718, 0);
  Object.preventExtensions(buf);
  
  return Math.abs(buf.readFloatLE(0) - 2.718) < 0.001;
});

test('preventExtensions 后写入和读取', () => {
  const buf = Buffer.alloc(4);
  Object.preventExtensions(buf);
  buf.writeFloatLE(1.5, 0);
  
  return buf.readFloatLE(0) === 1.5;
});

// isExtensible 测试
test('正常 Buffer 是可扩展的', () => {
  const buf = Buffer.alloc(4);
  return Object.isExtensible(buf);
});

test('preventExtensions 后 Buffer 不可扩展', () => {
  const buf = Buffer.alloc(4);
  Object.preventExtensions(buf);
  return !Object.isExtensible(buf);
});

// 读取操作不受影响
test('不可扩展的 Buffer 仍可正常读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(1.1, 0);
  buf.writeFloatLE(2.2, 4);
  Object.preventExtensions(buf);
  
  return Math.abs(buf.readFloatLE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatLE(4) - 2.2) < 0.01;
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
