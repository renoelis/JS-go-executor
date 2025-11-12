// buf.writeInt8() - Ultimate Edge Cases (终极边界测试)
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

// ========== Getter/Setter 拦截测试 ==========

test('value 为带 valueOf 方法的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf: function() {
      return 100;
    }
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 100;
});

test('value 为只有 toString 方法的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    toString: function() {
      return '42';
    }
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 42;
});

test('offset 为带 valueOf getter 的对象应抛出错误', () => {
  const buf = Buffer.alloc(10);
  const obj = {
    get valueOf() {
      return 2;
    }
  };
  try {
    buf.writeInt8(99, obj);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('type');
  }
});

// ========== 原型链污染测试 ==========

test('修改 Number.prototype.valueOf 不影响写入', () => {
  const buf = Buffer.alloc(4);
  const originalValueOf = Number.prototype.valueOf;
  Number.prototype.valueOf = function() {
    return 999;
  };
  try {
    const result = buf.writeInt8(50, 0);
    return result === 1 && buf[0] === 50;
  } finally {
    Number.prototype.valueOf = originalValueOf;
  }
});

test('修改 Object.prototype.valueOf 不影响写入', () => {
  const buf = Buffer.alloc(4);
  const originalValueOf = Object.prototype.valueOf;
  Object.prototype.valueOf = function() {
    return 888;
  };
  try {
    const result = buf.writeInt8(60, 0);
    return result === 1 && buf[0] === 60;
  } finally {
    Object.prototype.valueOf = originalValueOf;
  }
});

// ========== 不同Buffer创建方式 ==========

test('在 Buffer.allocUnsafeSlow 创建的 buffer 上写入', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  const result = buf.writeInt8(77, 0);
  return result === 1 && buf[0] === 77;
});

test('在已有数据的 allocUnsafe buffer 上覆盖写入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xFF);
  const result = buf.writeInt8(0, 0);
  return result === 1 && buf[0] === 0;
});

// ========== 深层嵌套对象转换 ==========

test('value 为对象 valueOf 返回对象时使用 toString', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf: function() {
      return {}; // 返回对象
    },
    toString: function() {
      return '45';
    }
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 45;
});

test('value 为对象 valueOf 返回字符串', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf: function() {
      return '88';
    }
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 88;
});

// ========== 字符串转换的极端场景 ==========

test('value 为十六进制字符串 0x 前缀大写', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8('0X7F', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为带加号的字符串', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8('+100', 0);
  return result === 1 && buf[0] === 100;
});

test('value 为带多个前导零的负数字符串', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8('-00100', 0);
  return result === 1 && buf[0] === (256 - 100);
});

test('value 为空白字符的组合', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(' \t\n\r ', 0);
  return result === 1 && buf[0] === 0;
});

// ========== TypedArray 深层交互 ==========

test('通过 Int8Array 视图验证写入的值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-50, 1);
  const i8 = new Int8Array(buf.buffer, buf.byteOffset, buf.length);
  return i8[1] === -50;
});

test('在 DataView 创建的 buffer 副本上写入', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  const buf = Buffer.from(ab);
  const result = buf.writeInt8(66, 2);
  return result === 3 && dv.getInt8(2) === 66;
});

test('共享 ArrayBuffer 的 Uint8Array 和 Buffer 同步', () => {
  const ab = new ArrayBuffer(4);
  const u8 = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  buf.writeInt8(-10, 0);
  return u8[0] === (256 - 10);
});

// ========== 返回值的链式使用 ==========

test('使用返回值作为下一次写入的 offset（100次）', () => {
  const buf = Buffer.alloc(100);
  let offset = 0;
  for (let i = 0; i < 100; i++) {
    const val = (i % 256) - 128;
    // 确保值在 [-128, 127] 范围内
    const clampedVal = val > 127 ? val - 256 : (val < -128 ? val + 256 : val);
    offset = buf.writeInt8(clampedVal, offset);
  }
  const expected99 = (99 % 256) - 128;
  const clampedExpected = expected99 > 127 ? expected99 - 256 : (expected99 < -128 ? expected99 + 256 : expected99);
  return offset === 100 && buf[99] === (clampedExpected & 0xFF);
});

test('使用返回值进行嵌套调用', () => {
  const buf = Buffer.alloc(10);
  const offset = buf.writeInt8(10, buf.writeInt8(20, buf.writeInt8(30, 0)));
  return offset === 3 && buf[0] === 30 && buf[1] === 20 && buf[2] === 10;
});

// ========== 数字精度边界 ==========

test('value 为 Number.EPSILON 的倍数', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(Number.EPSILON * 1e10, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为非常接近127的浮点数', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(126.99999999999999, 0);
  return result === 1 && buf[0] === 126;
});

test('value 为非常接近-128的浮点数', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(-127.99999999999999, 0);
  return result === 1 && buf[0] === (256 - 127);
});

// ========== 特殊数学常量 ==========

test('value 为 Math.E 截断', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(Math.E, 0);
  return result === 1 && buf[0] === 2;
});

test('value 为 Math.PI 截断', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(Math.PI, 0);
  return result === 1 && buf[0] === 3;
});

test('value 为 Math.LN2 截断', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(Math.LN2, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 Math.SQRT2 截断', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(Math.SQRT2, 0);
  return result === 1 && buf[0] === 1;
});

// ========== Buffer 子类场景 ==========

test('在继承 Buffer 的子类实例上写入', () => {
  // Node.js v25 中 Buffer.alloc 返回的是 Buffer 实例，不是子类实例
  // 所以这个测试主要验证写入功能
  class MyBuffer extends Buffer {
    customMethod() {
      return 'custom';
    }
  }
  // 使用 from 创建才能保持子类类型
  const buf = MyBuffer.from(Buffer.alloc(4));
  const result = buf.writeInt8(55, 0);
  // 检查是否有 customMethod，如果没有说明不是子类实例，但写入仍应成功
  const hasCustom = typeof buf.customMethod === 'function';
  return result === 1 && buf[0] === 55 && (!hasCustom || buf.customMethod() === 'custom');
});

// ========== 属性描述符相关 ==========

test('在不可配置的 Buffer 上写入（无法设置）', () => {
  const buf = Buffer.alloc(4);
  // 无法冻结 Buffer 的索引属性，但可以正常写入
  const result = buf.writeInt8(33, 0);
  return result === 1 && buf[0] === 33;
});

// ========== 异常的 offset 组合 ==========

test('offset 为 0.0000000001（非常小的浮点数）抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, 0.0000000001);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('integer');
  }
});

test('offset 为 -0.0000000001 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, -0.0000000001);
    return false;
  } catch (e) {
    return e.message.includes('offset') && (e.message.includes('integer') || e.message.includes('range'));
  }
});

// ========== 多次操作后的状态一致性 ==========

test('连续写入和读取验证状态一致性', () => {
  const buf = Buffer.alloc(4);
  const values = [127, -128, 0, -1];
  for (let i = 0; i < values.length; i++) {
    buf.writeInt8(values[i], i);
  }
  let allMatch = true;
  for (let i = 0; i < values.length; i++) {
    if (buf.readInt8(i) !== values[i]) {
      allMatch = false;
      break;
    }
  }
  return allMatch;
});

test('在同一位置反复写入不同值', () => {
  const buf = Buffer.alloc(4);
  for (let i = -128; i <= 127; i++) {
    buf.writeInt8(i, 0);
    if (buf.readInt8(0) !== i) {
      return false;
    }
  }
  return true;
});

// ========== 与其他 Buffer 方法的交互 ==========

test('writeInt8 后 fill 再 writeInt8', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(100, 0);
  buf.fill(0);
  buf.writeInt8(50, 1);
  return buf[0] === 0 && buf[1] === 50;
});

test('write 和 writeInt8 混合使用', () => {
  const buf = Buffer.alloc(10);
  buf.write('abc', 0);
  buf.writeInt8(127, 3);
  return buf[0] === 97 && buf[1] === 98 && buf[2] === 99 && buf[3] === 127;
});

test('copy 后 writeInt8 不影响原 buffer', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.alloc(4);
  buf1.copy(buf2);
  buf2.writeInt8(99, 0);
  return buf1[0] === 1 && buf2[0] === 99;
});

// ========== 空字符相关 ==========

test('value 为 null 字符码 (0)', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8('\0'.charCodeAt(0), 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 DEL 字符码 (127)', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8('\x7F'.charCodeAt(0), 0);
  return result === 1 && buf[0] === 127;
});

// ========== 极端计算结果 ==========

test('value 为 127 / Infinity', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(127 / Infinity, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 0 * Infinity', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(0 * Infinity, 0);
  return result === 1 && buf[0] === 0; // NaN
});

test('value 为 Infinity - Infinity', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(Infinity - Infinity, 0);
  return result === 1 && buf[0] === 0; // NaN
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
