// buf.readDoubleBE() - 方法完整性和属性测试
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
test('readDoubleBE 方法存在', () => {
  return typeof Buffer.prototype.readDoubleBE === 'function';
});

test('readDoubleBE 是函数', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.readDoubleBE === 'function';
});

// 方法名称
test('readDoubleBE.name 属性存在', () => {
  const name = Buffer.prototype.readDoubleBE.name;
  return typeof name === 'string' && name.length > 0;
});

// 方法长度（参数数量）
test('readDoubleBE.length 属性', () => {
  const len = Buffer.prototype.readDoubleBE.length;
  return len === 0 || len === 1;
});

// 方法可以被调用
test('readDoubleBE 可以被调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456, 0);
  const result = buf.readDoubleBE(0);
  return Math.abs(result - 123.456) < 0.001;
});

// 方法可以通过 call 调用
test('readDoubleBE 可以通过 call 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(456.789, 0);
  const result = Buffer.prototype.readDoubleBE.call(buf, 0);
  return Math.abs(result - 456.789) < 0.001;
});

// 方法可以通过 apply 调用
test('readDoubleBE 可以通过 apply 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(789.012, 0);
  const result = Buffer.prototype.readDoubleBE.apply(buf, [0]);
  return Math.abs(result - 789.012) < 0.001;
});

// 方法可以被赋值给变量
test('readDoubleBE 可以被赋值给变量', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(111.222, 0);
  const fn = buf.readDoubleBE;
  const result = fn.call(buf, 0);
  return Math.abs(result - 111.222) < 0.001;
});

// 方法属性存在于原型上
test('readDoubleBE 属性存在于原型上', () => {
  return 'readDoubleBE' in Buffer.prototype;
});

test('readDoubleBE 可以被枚举（通过 for...in）', () => {
  const props = [];
  for (const key in Buffer.prototype) {
    props.push(key);
  }
  return props.includes('readDoubleBE');
});

test('readDoubleBE 可以被删除和重新赋值', () => {
  const original = Buffer.prototype.readDoubleBE;
  try {
    delete Buffer.prototype.readDoubleBE;
    const deleted = !Buffer.prototype.readDoubleBE;
    Buffer.prototype.readDoubleBE = original;
    return deleted && Buffer.prototype.readDoubleBE === original;
  } catch (e) {
    Buffer.prototype.readDoubleBE = original;
    return false;
  }
});

// 返回值类型
test('readDoubleBE 返回 number', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readDoubleBE(0);
  return typeof result === 'number';
});

test('readDoubleBE 返回值是 Number 类型', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readDoubleBE(0);
  return Object.prototype.toString.call(result) === '[object Number]';
});

// 方法不修改 this
test('readDoubleBE 不修改原 Buffer', () => {
  const buf = Buffer.from([0x40, 0x09, 0x21, 0xFB, 0x54, 0x44, 0x2D, 0x18]);
  const before = buf.toString('hex');
  buf.readDoubleBE(0);
  const after = buf.toString('hex');
  return before === after;
});

// 错误的 this 绑定
test('readDoubleBE 在非 Buffer 对象上调用抛出错误', () => {
  try {
    const notBuffer = { length: 8 };
    Buffer.prototype.readDoubleBE.call(notBuffer, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readDoubleBE 在普通对象上调用抛出错误', () => {
  try {
    Buffer.prototype.readDoubleBE.call({}, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readDoubleBE 在 null 上调用抛出错误', () => {
  try {
    Buffer.prototype.readDoubleBE.call(null, 0);
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
