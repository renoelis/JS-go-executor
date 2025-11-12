// buf.writeBigInt64BE/LE - Second Round Deep Gap Filling
// 第二轮深度查缺补漏：更多易遗漏的边界场景
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

// ==================== ArrayBuffer/TypedArray 高级场景 ====================

test('writeBigInt64BE - ArrayBuffer 带 byteOffset', () => {
  const ab = new ArrayBuffer(24);
  const buf = Buffer.from(ab, 8, 8);
  buf.writeBigInt64BE(0x1234567890ABCDEFn, 0);
  const view = new DataView(ab);
  const result = view.getBigInt64(8, false);
  return result === 0x1234567890ABCDEFn;
});

test('writeBigInt64LE - ArrayBuffer 带 byteOffset', () => {
  const ab = new ArrayBuffer(24);
  const buf = Buffer.from(ab, 8, 8);
  buf.writeBigInt64LE(0x7EDCBA0987654321n, 0);
  const view = new DataView(ab);
  const result = view.getBigInt64(8, true);
  return result === 0x7EDCBA0987654321n;
});

test('writeBigInt64BE - TypedArray 底层修改', () => {
  const arr = new Uint8Array(16);
  const buf = Buffer.from(arr.buffer, 4, 8);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  return arr[4] === 0x11 && arr[11] === 0x11;
});

test('writeBigInt64LE - 与 DataView 互操作', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return dv.getBigInt64(0, true) === 0x0102030405060708n;
});

// ==================== offset 参数特殊类型测试 ====================

test('writeBigInt64BE - offset 为 BigInt（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, 0n);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('number');
  }
});

test('writeBigInt64LE - offset 为 BigInt（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, 0n);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('number');
  }
});

test('writeBigInt64BE - offset 对象 valueOf（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const obj = { valueOf: () => 0 };
  try {
    buf.writeBigInt64BE(123n, obj);
    return false;
  } catch (e) {
    return e.message.includes('Object') || e.message.includes('number');
  }
});

test('writeBigInt64LE - offset 对象 toString（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const obj = { toString: () => '0' };
  try {
    buf.writeBigInt64LE(123n, obj);
    return false;
  } catch (e) {
    return e.message.includes('Object') || e.message.includes('number');
  }
});

test('writeBigInt64BE - offset 负浮点数（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, -0.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('writeBigInt64LE - offset 极小浮点数（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, 1e-10);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

// ==================== value 参数更多对象类型测试 ====================

test('writeBigInt64BE - value 为 Function（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(function(){}, 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('writeBigInt64LE - value 为 Date（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(new Date(), 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('writeBigInt64BE - value 为 RegExp（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(/test/, 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('writeBigInt64LE - value 为 Array（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE([123n], 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('writeBigInt64BE - value 为 Map（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(new Map(), 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('writeBigInt64LE - value 为 Set（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(new Set(), 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('writeBigInt64BE - value 为 Promise（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(Promise.resolve(123n), 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('writeBigInt64LE - value 为 Error（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(new Error('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

// ==================== 错误对象属性验证 ====================

test('writeBigInt64BE - RangeError 有 code 属性', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, 100);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('writeBigInt64LE - RangeError 有 name 属性', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, 100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigInt64BE - TypeError 有 stack', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE('not a bigint', 0);
    return false;
  } catch (e) {
    return !!e.stack && e.stack.length > 0;
  }
});

// ==================== 参数数量测试 ====================

test('writeBigInt64BE - 超长参数列表（忽略额外参数）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(123n, 0, 'extra1', 'extra2', 'extra3');
  return buf.readBigInt64BE(0) === 123n;
});

test('writeBigInt64LE - 超长参数列表（忽略额外参数）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(456n, 0, null, undefined, {}, []);
  return buf.readBigInt64LE(0) === 456n;
});

// ==================== 特殊 Buffer 状态测试 ====================

test('writeBigInt64BE - 0-length Buffer（应抛错）', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeBigInt64BE(123n, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('bounds') || e.message.includes('range');
  }
});

test('writeBigInt64LE - 0-length Buffer（应抛错）', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeBigInt64LE(123n, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('bounds') || e.message.includes('range');
  }
});

test('writeBigInt64BE - 7-bytes Buffer（应抛错）', () => {
  const buf = Buffer.alloc(7);
  try {
    buf.writeBigInt64BE(123n, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('bounds') || e.message.includes('range');
  }
});

test('writeBigInt64LE - 7-bytes Buffer（应抛错）', () => {
  const buf = Buffer.alloc(7);
  try {
    buf.writeBigInt64LE(123n, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer') || e.message.includes('bounds') || e.message.includes('range');
  }
});

// ==================== 函数元信息测试 ====================

test('writeBigInt64BE - toString tag', () => {
  const tag = Object.prototype.toString.call(Buffer.prototype.writeBigInt64BE);
  return tag === '[object Function]';
});

test('writeBigInt64LE - toString tag', () => {
  const tag = Object.prototype.toString.call(Buffer.prototype.writeBigInt64LE);
  return tag === '[object Function]';
});

test('writeBigInt64BE - 函数有空 prototype', () => {
  const proto = Buffer.prototype.writeBigInt64BE.prototype;
  return proto !== undefined && Object.keys(proto).length === 0;
});

test('writeBigInt64LE - 函数有空 prototype', () => {
  const proto = Buffer.prototype.writeBigInt64LE.prototype;
  return proto !== undefined && Object.keys(proto).length === 0;
});

// ==================== 原型修改测试 ====================

test('writeBigInt64BE - 原型方法可被覆盖', () => {
  const buf = Buffer.alloc(8);
  const original = Buffer.prototype.writeBigInt64BE;
  Buffer.prototype.writeBigInt64BE = function() { return 999; };
  const result = buf.writeBigInt64BE(123n, 0);
  Buffer.prototype.writeBigInt64BE = original;
  return result === 999;
});

test('writeBigInt64LE - 原型方法可被覆盖', () => {
  const buf = Buffer.alloc(8);
  const original = Buffer.prototype.writeBigInt64LE;
  Buffer.prototype.writeBigInt64LE = function() { return 888; };
  const result = buf.writeBigInt64LE(123n, 0);
  Buffer.prototype.writeBigInt64LE = original;
  return result === 888;
});

// ==================== 混合写入场景 ====================

test('writeBigInt64BE - 与 writeInt8 混合写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeInt8(0x11, 0);
  buf.writeBigInt64BE(0x2222222222222222n, 1);
  buf.writeInt8(0x33, 9);
  return buf[0] === 0x11 && buf[1] === 0x22 && buf[9] === 0x33;
});

test('writeBigInt64LE - 与 writeInt16LE 混合写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeInt16LE(0x1122, 0);
  buf.writeBigInt64LE(0x3333333333333333n, 2);
  buf.writeInt16LE(0x4455, 10);
  return buf[0] === 0x22 && buf[1] === 0x11 && buf[10] === 0x55;
});

test('writeBigInt64BE - 同时使用 BE 和 LE', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  buf.writeBigInt64LE(0x2222222222222222n, 8);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(8);
  return be === 0x1111111111111111n && le === 0x2222222222222222n;
});

// ==================== BigInt 字符串化测试 ====================

test('writeBigInt64BE - BigInt toString(16)', () => {
  const value = 0x1234567890ABCDEFn;
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(value, 0);
  return value.toString(16) === '1234567890abcdef';
});

test('writeBigInt64LE - BigInt toString(2)', () => {
  const value = 0xFFn;
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(value, 0);
  return value.toString(2) === '11111111';
});

test('writeBigInt64BE - 负数 BigInt toString', () => {
  const value = -1n;
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(value, 0);
  return value.toString() === '-1';
});

// ==================== arguments 对象测试 ====================

test('writeBigInt64BE - 使用 arguments 对象', () => {
  const buf = Buffer.alloc(8);
  (function() {
    buf.writeBigInt64BE.apply(buf, arguments);
  })(123n, 0);
  return buf.readBigInt64BE(0) === 123n;
});

test('writeBigInt64LE - 使用 arguments 对象', () => {
  const buf = Buffer.alloc(8);
  (function() {
    buf.writeBigInt64LE.apply(buf, arguments);
  })(456n, 0);
  return buf.readBigInt64LE(0) === 456n;
});

// ==================== 输出结果 ====================

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
