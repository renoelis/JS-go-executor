// buf.readFloatBE() - 补充覆盖测试
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

// 多参数测试
test('传入 2 个参数（第二个参数应被忽略）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(123.456, 0);
  const result = buf.readFloatBE(0, 999);
  return Math.abs(result - 123.456) < 0.001;
});

test('传入 3 个参数（多余参数应被忽略）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(789.012, 4);
  const result = buf.readFloatBE(4, 'extra', 'params');
  return Math.abs(result - 789.012) < 0.001;
});

// BigInt offset 测试
test('offset = BigInt(0)（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(BigInt(0));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = BigInt(1)（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatBE(BigInt(1));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Symbol offset 测试
test('offset = Symbol()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = Symbol.for("0")（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(Symbol.for('0'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 函数作为 offset
test('offset = function() { return 0; }（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(function() { return 0; });
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = () => 0（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(() => 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 空对象和特殊对象
test('offset = new Number(0)（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new Number(0));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new String("0")（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new String('0'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 零长度和边界测试
test('Buffer 长度正好 4 字节，offset = 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(111.111, 0);
  const result = buf.readFloatBE(0);
  return Math.abs(result - 111.111) < 0.001;
});

test('Buffer 长度 5 字节，offset = 1', () => {
  const buf = Buffer.alloc(5);
  buf.writeFloatBE(222.222, 1);
  const result = buf.readFloatBE(1);
  return Math.abs(result - 222.222) < 0.001;
});

test('Buffer 长度 5 字节，offset = 0', () => {
  const buf = Buffer.alloc(5);
  buf.writeFloatBE(333.333, 0);
  const result = buf.readFloatBE(0);
  return Math.abs(result - 333.333) < 0.001;
});

// 特殊的负零测试
test('读取 +0 和 -0 是不同的', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeFloatBE(0, 0);
  buf2.writeFloatBE(-0, 0);
  const v1 = buf1.readFloatBE(0);
  const v2 = buf2.readFloatBE(0);
  return Object.is(v1, 0) && Object.is(v2, -0);
});

// 连续读取测试
test('连续读取多个值', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatBE(1.1, 0);
  buf.writeFloatBE(2.2, 4);
  buf.writeFloatBE(3.3, 8);
  const v1 = buf.readFloatBE(0);
  const v2 = buf.readFloatBE(4);
  const v3 = buf.readFloatBE(8);
  return Math.abs(v1 - 1.1) < 0.01 && 
         Math.abs(v2 - 2.2) < 0.01 && 
         Math.abs(v3 - 3.3) < 0.01;
});

// 交错读取
test('交错读取不同位置', () => {
  const buf = Buffer.alloc(16);
  buf.writeFloatBE(10.5, 0);
  buf.writeFloatBE(20.5, 4);
  buf.writeFloatBE(30.5, 8);
  buf.writeFloatBE(40.5, 12);
  const v3 = buf.readFloatBE(8);
  const v1 = buf.readFloatBE(0);
  const v4 = buf.readFloatBE(12);
  const v2 = buf.readFloatBE(4);
  return Math.abs(v1 - 10.5) < 0.01 && 
         Math.abs(v2 - 20.5) < 0.01 && 
         Math.abs(v3 - 30.5) < 0.01 &&
         Math.abs(v4 - 40.5) < 0.01;
});

// 小于 0 的浮点 offset
test('offset = -0.5（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(-0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 科学计数法 offset
test('offset = 1e2（100.0，应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(1e2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1e-1（0.1，应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(1e-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Date 对象作为 offset
test('offset = new Date()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(new Date());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// RegExp 作为 offset
test('offset = /0/（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatBE(/0/);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 空值和未初始化
test('读取未初始化的 Buffer', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.readFloatBE(0);
  return typeof result === 'number';
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
