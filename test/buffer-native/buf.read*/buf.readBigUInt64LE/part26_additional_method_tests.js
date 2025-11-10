// buf.readBigUInt64LE() - 补充方法测试
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

// 方法可以被 bind
test('readBigUInt64LE 可以通过 bind 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(12345n, 0);
  const boundFn = buf.readBigUInt64LE.bind(buf);
  return boundFn(0) === 12345n;
});

test('readBigUInt64LE bind 后可以传递参数', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(99999n, 8);
  const boundFn = buf.readBigUInt64LE.bind(buf, 8);
  return boundFn() === 99999n;
});

// 多参数传递（超过需要的参数应被忽略）
test('readBigUInt64LE 传递多余参数不影响结果', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(777n, 0);
  return buf.readBigUInt64LE(0, 'extra', 123, true) === 777n;
});

test('readBigUInt64LE 传递 3 个参数', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(888n, 8);
  return buf.readBigUInt64LE(8, null, undefined) === 888n;
});

// 方法属性可写性测试（不使用 Object.getOwnPropertyDescriptor）
test('readBigUInt64LE 方法可以被重新赋值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(555n, 0);
  const original = buf.readBigUInt64LE;
  buf.readBigUInt64LE = function() { return 999n; };
  const modified = buf.readBigUInt64LE();
  buf.readBigUInt64LE = original;
  return modified === 999n && buf.readBigUInt64LE(0) === 555n;
});

test('Buffer.prototype.readBigUInt64LE 可以被删除和恢复', () => {
  const original = Buffer.prototype.readBigUInt64LE;
  const canDelete = delete Buffer.prototype.readBigUInt64LE;
  const isDeleted = typeof Buffer.prototype.readBigUInt64LE === 'undefined';
  Buffer.prototype.readBigUInt64LE = original;
  const isRestored = typeof Buffer.prototype.readBigUInt64LE === 'function';
  return canDelete && isDeleted && isRestored;
});

// 与其他 Buffer 方法的交互
test('slice 后立即读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(12345n, 0);
  buf.writeBigUInt64LE(67890n, 8);
  const sliced = buf.slice(8);
  return sliced.readBigUInt64LE(0) === 67890n;
});

test('subarray 后立即读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(11111n, 0);
  buf.writeBigUInt64LE(22222n, 8);
  const sub = buf.subarray(0, 8);
  return sub.readBigUInt64LE(0) === 11111n;
});

test('Buffer.from 后立即读取', () => {
  const arr = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const buf = Buffer.from(arr);
  return buf.readBigUInt64LE(0) === 256n;
});

test('Buffer.concat 后读取', () => {
  const buf1 = Buffer.from([0x00, 0x01, 0x00, 0x00]);
  const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const combined = Buffer.concat([buf1, buf2]);
  return combined.readBigUInt64LE(0) === 256n;
});

// 连续调用测试
test('连续调用 readBigUInt64LE 10 次', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(123456789n, 0);
  for (let i = 0; i < 10; i++) {
    if (buf.readBigUInt64LE(0) !== 123456789n) {
      return false;
    }
  }
  return true;
});

test('在循环中读取不同位置', () => {
  const buf = Buffer.alloc(80);
  for (let i = 0; i < 10; i++) {
    buf.writeBigUInt64LE(BigInt(i * 1000), i * 8);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readBigUInt64LE(i * 8) !== BigInt(i * 1000)) {
      return false;
    }
  }
  return true;
});

// 方法名称和 toString 测试
test('readBigUInt64LE.toString() 返回字符串', () => {
  const str = Buffer.prototype.readBigUInt64LE.toString();
  return typeof str === 'string' && str.length > 0;
});

test('readBigUInt64LE 方法有 length 属性', () => {
  const len = Buffer.prototype.readBigUInt64LE.length;
  return typeof len === 'number' && len >= 0;
});

// 空参数列表调用
test('readBigUInt64LE 无参数调用使用默认 offset', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(999n, 0);
  return buf.readBigUInt64LE() === 999n;
});

test('readBigUInt64LE 传递 undefined 作为 offset', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(888n, 0);
  return buf.readBigUInt64LE(undefined) === 888n;
});

// 方法在不同 Buffer 实例间的独立性
test('不同 Buffer 实例的 readBigUInt64LE 互不影响', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigUInt64LE(111n, 0);
  buf2.writeBigUInt64LE(222n, 0);
  return buf1.readBigUInt64LE(0) === 111n && buf2.readBigUInt64LE(0) === 222n;
});

test('修改一个 Buffer 不影响另一个', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigUInt64LE(333n, 0);
  buf2.writeBigUInt64LE(444n, 0);
  buf1.writeBigUInt64LE(555n, 0);
  return buf1.readBigUInt64LE(0) === 555n && buf2.readBigUInt64LE(0) === 444n;
});

// 使用 new Uint8Array 创建 Buffer
test('从 new Uint8Array 创建 Buffer 并读取', () => {
  const arr = new Uint8Array(8);
  arr[0] = 0xFF;
  const buf = Buffer.from(arr.buffer);
  return buf.readBigUInt64LE(0) === 255n;
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
