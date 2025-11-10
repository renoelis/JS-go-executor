// buf.readFloatLE() - 高级边界案例测试
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

// BigInt offset 测试
test('BigInt offset 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(0n);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('BigInt 非零 offset 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(4n);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Symbol offset 测试
test('Symbol offset 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Function offset 测试
test('Function 作为 offset 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(function() { return 0; });
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 包装对象测试
test('new Number(0) 作为 offset 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(new Number(0));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('new String("0") 作为 offset 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(new String("0"));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Date 对象测试
test('Date 对象作为 offset 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(new Date());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// RegExp 对象测试
test('RegExp 对象作为 offset 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(/test/);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 科学计数法 offset
test('科学计数法 1e2 作为 offset（超出范围）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(1e2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('科学计数法 1e-1 作为 offset（小数）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(1e-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 负浮点数 offset
test('负浮点数 -0.5 作为 offset', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(-0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// +0 和 -0 作为 offset
test('+0 作为 offset（应成功）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.5, 0);
  return buf.readFloatLE(+0) === 1.5;
});

test('-0 作为 offset（应成功）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.5, 0);
  return buf.readFloatLE(-0) === 2.5;
});

// 不同进制表示的 offset
test('十六进制 offset 0x4', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(3.5, 4);
  return buf.readFloatLE(0x4) === 3.5;
});

test('八进制 offset（已废弃，但测试行为）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(4.5, 4);
  return buf.readFloatLE(4) === 4.5;
});

// 极端 offset 值
test('Number.MAX_SAFE_INTEGER 作为 offset', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Number.MIN_SAFE_INTEGER 作为 offset', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 连续零字节读取
test('连续零字节读取应返回 +0', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const result = buf.readFloatLE(0);
  return result === 0 && 1 / result === Infinity;
});

// 连续 0xFF 字节读取
test('连续 0xFF 字节读取', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const result = buf.readFloatLE(0);
  return Number.isNaN(result);
});

// 交替模式读取
test('交替模式 0x55 读取', () => {
  const buf = Buffer.from([0x55, 0x55, 0x55, 0x55]);
  const result = buf.readFloatLE(0);
  return typeof result === 'number' && !isNaN(result);
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
