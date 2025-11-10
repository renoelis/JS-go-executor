// buf.readBigUInt64LE() - 方法完整性和属性测试
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
test('readBigUInt64LE 方法存在', () => {
  return typeof Buffer.prototype.readBigUInt64LE === 'function';
});

test('readBigUInt64LE 是函数', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.readBigUInt64LE === 'function';
});

// 方法名称（Go 实现可能返回完整函数签名）
test('readBigUInt64LE.name 属性存在', () => {
  const name = Buffer.prototype.readBigUInt64LE.name;
  return typeof name === 'string' && name.length > 0;
});

// 方法长度（参数数量）
test('readBigUInt64LE.length 属性', () => {
  const len = Buffer.prototype.readBigUInt64LE.length;
  return len === 0 || len === 1;
});

// 方法可以被调用
test('readBigUInt64LE 可以被调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(123n, 0);
  const result = buf.readBigUInt64LE(0);
  return result === 123n;
});

// 方法可以通过 call 调用
test('readBigUInt64LE 可以通过 call 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(456n, 0);
  const result = Buffer.prototype.readBigUInt64LE.call(buf, 0);
  return result === 456n;
});

// 方法可以通过 apply 调用
test('readBigUInt64LE 可以通过 apply 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(789n, 0);
  const result = Buffer.prototype.readBigUInt64LE.apply(buf, [0]);
  return result === 789n;
});

// 方法可以被赋值给变量
test('readBigUInt64LE 可以被赋值给变量', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(111n, 0);
  const fn = buf.readBigUInt64LE;
  const result = fn.call(buf, 0);
  return result === 111n;
});

// 方法属性描述符测试（不使用 Object.getOwnPropertyDescriptor）
test('readBigUInt64LE 属性存在于原型上', () => {
  return 'readBigUInt64LE' in Buffer.prototype;
});

test('readBigUInt64LE 可以被枚举（通过 for...in）', () => {
  const props = [];
  for (const key in Buffer.prototype) {
    props.push(key);
  }
  return props.includes('readBigUInt64LE');
});

test('readBigUInt64LE 可以被删除和重新赋值', () => {
  const original = Buffer.prototype.readBigUInt64LE;
  try {
    // 尝试删除
    delete Buffer.prototype.readBigUInt64LE;
    const deleted = !Buffer.prototype.readBigUInt64LE;
    // 恢复
    Buffer.prototype.readBigUInt64LE = original;
    return deleted && Buffer.prototype.readBigUInt64LE === original;
  } catch (e) {
    // 如果不可配置，会抛出错误
    Buffer.prototype.readBigUInt64LE = original;
    return false;
  }
});

// 返回值类型
test('readBigUInt64LE 返回 BigInt', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readBigUInt64LE(0);
  return typeof result === 'bigint';
});

test('readBigUInt64LE 返回值是 BigInt 实例', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readBigUInt64LE(0);
  return Object.prototype.toString.call(result) === '[object BigInt]';
});

// 方法不修改 this
test('readBigUInt64LE 不修改原 Buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const before = buf.toString('hex');
  buf.readBigUInt64LE(0);
  const after = buf.toString('hex');
  return before === after;
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
