// buf.readFloatBE() - 方法完整性和属性测试
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

// 方法存在性
test('readFloatBE 方法存在', () => {
  return typeof Buffer.prototype.readFloatBE === 'function';
});

test('readFloatBE 是函数', () => {
  const buf = Buffer.alloc(4);
  return typeof buf.readFloatBE === 'function';
});

// 方法名称
test('readFloatBE.name 属性存在', () => {
  const name = Buffer.prototype.readFloatBE.name;
  return typeof name === 'string' && name.length > 0;
});

// 方法长度（参数数量）
test('readFloatBE.length 属性', () => {
  const len = Buffer.prototype.readFloatBE.length;
  return len === 0 || len === 1;
});

// 方法可以被调用
test('readFloatBE 可以被调用', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123.456, 0);
  const result = buf.readFloatBE(0);
  return Math.abs(result - 123.456) < 0.001;
});

// 方法可以通过 call 调用
test('readFloatBE 可以通过 call 调用', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(456.789, 0);
  const result = Buffer.prototype.readFloatBE.call(buf, 0);
  return Math.abs(result - 456.789) < 0.001;
});

// 方法可以通过 apply 调用
test('readFloatBE 可以通过 apply 调用', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(789.012, 0);
  const result = Buffer.prototype.readFloatBE.apply(buf, [0]);
  return Math.abs(result - 789.012) < 0.001;
});

// 方法可以被赋值给变量
test('readFloatBE 可以被赋值给变量', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(111.222, 0);
  const fn = buf.readFloatBE;
  const result = fn.call(buf, 0);
  return Math.abs(result - 111.222) < 0.001;
});

// 方法属性存在于原型上
test('readFloatBE 属性存在于原型上', () => {
  return 'readFloatBE' in Buffer.prototype;
});

// 返回值类型
test('readFloatBE 返回 number', () => {
  const buf = Buffer.alloc(4);
  const result = buf.readFloatBE(0);
  return typeof result === 'number';
});

// 方法不修改 this
test('readFloatBE 不修改原 Buffer', () => {
  const buf = Buffer.from([0x40, 0x49, 0x0F, 0xDB]);
  const before = buf.toString('hex');
  buf.readFloatBE(0);
  const after = buf.toString('hex');
  return before === after;
});

// 错误的 this 绑定
test('readFloatBE 在非 Buffer 对象上调用抛出错误', () => {
  try {
    const notBuffer = { length: 4 };
    Buffer.prototype.readFloatBE.call(notBuffer, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readFloatBE 在普通对象上调用抛出错误', () => {
  try {
    Buffer.prototype.readFloatBE.call({}, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readFloatBE 在 null 上调用抛出错误', () => {
  try {
    Buffer.prototype.readFloatBE.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('readFloatBE 在 undefined 上调用抛出错误', () => {
  try {
    Buffer.prototype.readFloatBE.call(undefined, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
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
