// buf.readDoubleLE() - 方法完整性和属性测试
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
test('readDoubleLE 方法存在', () => {
  return typeof Buffer.prototype.readDoubleLE === 'function';
});

test('readDoubleLE 是函数', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.readDoubleLE === 'function';
});

// 方法名称
test('readDoubleLE.name 属性存在', () => {
  const name = Buffer.prototype.readDoubleLE.name;
  return typeof name === 'string' && name.length > 0;
});

// 方法长度（参数数量）
test('readDoubleLE.length 属性', () => {
  const len = Buffer.prototype.readDoubleLE.length;
  return len === 0 || len === 1;
});

// 方法可以被调用
test('readDoubleLE 可以被调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(123.456, 0);
  const result = buf.readDoubleLE(0);
  return Math.abs(result - 123.456) < 0.001;
});

// 方法可以通过 call 调用
test('readDoubleLE 可以通过 call 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(456.789, 0);
  const result = Buffer.prototype.readDoubleLE.call(buf, 0);
  return Math.abs(result - 456.789) < 0.001;
});

// 方法可以通过 apply 调用
test('readDoubleLE 可以通过 apply 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(789.012, 0);
  const result = Buffer.prototype.readDoubleLE.apply(buf, [0]);
  return Math.abs(result - 789.012) < 0.001;
});

// 方法可以被赋值给变量
test('readDoubleLE 可以被赋值给变量', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(111.222, 0);
  const fn = buf.readDoubleLE;
  const result = fn.call(buf, 0);
  return Math.abs(result - 111.222) < 0.001;
});

// 方法属性存在于原型上
test('readDoubleLE 属性存在于原型上', () => {
  return 'readDoubleLE' in Buffer.prototype;
});

test('readDoubleLE 可以被枚举（通过 for...in）', () => {
  const props = [];
  for (const key in Buffer.prototype) {
    props.push(key);
  }
  return props.includes('readDoubleLE');
});

test('readDoubleLE 可以被删除和重新赋值', () => {
  const original = Buffer.prototype.readDoubleLE;
  try {
    delete Buffer.prototype.readDoubleLE;
    const deleted = !Buffer.prototype.readDoubleLE;
    Buffer.prototype.readDoubleLE = original;
    return deleted && Buffer.prototype.readDoubleLE === original;
  } catch (e) {
    Buffer.prototype.readDoubleLE = original;
    return false;
  }
});

// 返回值类型
test('readDoubleLE 返回 number', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readDoubleLE(0);
  return typeof result === 'number';
});

test('readDoubleLE 返回值是 Number 类型', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readDoubleLE(0);
  return Object.prototype.toString.call(result) === '[object Number]';
});

// 方法不修改 this
test('readDoubleLE 不修改原 Buffer', () => {
  const buf = Buffer.from([0x18, 0x2D, 0x44, 0x54, 0xFB, 0x21, 0x09, 0x40]);
  const before = buf.toString('hex');
  buf.readDoubleLE(0);
  const after = buf.toString('hex');
  return before === after;
});

// 错误的 this 绑定
test('readDoubleLE 在非 Buffer 对象上调用抛出错误', () => {
  try {
    const notBuffer = { length: 8 };
    Buffer.prototype.readDoubleLE.call(notBuffer, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readDoubleLE 在普通对象上调用抛出错误', () => {
  try {
    Buffer.prototype.readDoubleLE.call({}, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readDoubleLE 在 null 上调用抛出错误', () => {
  try {
    Buffer.prototype.readDoubleLE.call(null, 0);
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
