// buf.readInt8() - 极端情况测试
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

// 无参数调用
test('无参数调用（应使用默认 offset = 0）', () => {
  const buf = Buffer.from([99]);
  return buf.readInt8() === 99;
});

test('空参数列表与 offset=0 等效', () => {
  const buf = Buffer.from([88]);
  return buf.readInt8() === buf.readInt8(0);
});

// 冻结、密封对象测试
test('冻结的对象作为 offset（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(Object.freeze({}));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('密封的对象作为 offset（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(Object.seal({}));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// getter 属性对象
test('offset = 带 getter 的对象（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    const obj = {};
    Object.defineProperty(obj, 'valueOf', {
      get() { return () => 1; }
    });
    buf.readInt8(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// WeakMap/WeakSet
test('offset = new WeakMap()（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(new WeakMap());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = new WeakSet()（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(new WeakSet());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Error 对象作为参数
test('offset = new Error()（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(new Error());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = new TypeError()（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(new TypeError());
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// ArrayBuffer 作为参数
test('offset = new ArrayBuffer(8)（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(new ArrayBuffer(8));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// DataView 作为参数
test('offset = new DataView(new ArrayBuffer(8))（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(new DataView(new ArrayBuffer(8)));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 多个不同类型的 TypedArray
test('offset = new Int16Array([1])（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(new Int16Array([1]));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = new Float32Array([1])（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(new Float32Array([1]));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = new Float64Array([1])（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(new Float64Array([1]));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Number 对象（装箱类型）
test('offset = new Number(1)（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(new Number(1));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = new String("1")（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(new String("1"));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new Boolean(false)（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(new Boolean(false));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 跨界读取组合
test('读取最后一个字节后尝试读取下一个（应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20]);
    buf.readInt8(1); // OK
    buf.readInt8(2); // 应该抛出错误
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 全零 Buffer
test('全零 Buffer 读取', () => {
  const buf = Buffer.alloc(5);
  let allZero = true;
  for (let i = 0; i < 5; i++) {
    if (buf.readInt8(i) !== 0) {
      allZero = false;
      break;
    }
  }
  return allZero;
});

// 全 0xFF Buffer
test('全 0xFF Buffer 读取（应全为 -1）', () => {
  const buf = Buffer.alloc(5, 0xFF);
  let allNegOne = true;
  for (let i = 0; i < 5; i++) {
    if (buf.readInt8(i) !== -1) {
      allNegOne = false;
      break;
    }
  }
  return allNegOne;
});

// 全 0x80 Buffer
test('全 0x80 Buffer 读取（应全为 -128）', () => {
  const buf = Buffer.alloc(5, 0x80);
  let allMin = true;
  for (let i = 0; i < 5; i++) {
    if (buf.readInt8(i) !== -128) {
      allMin = false;
      break;
    }
  }
  return allMin;
});

// 全 0x7F Buffer
test('全 0x7F Buffer 读取（应全为 127）', () => {
  const buf = Buffer.alloc(5, 0x7F);
  let allMax = true;
  for (let i = 0; i < 5; i++) {
    if (buf.readInt8(i) !== 127) {
      allMax = false;
      break;
    }
  }
  return allMax;
});

// 交替模式
test('0x00/0xFF 交替模式', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0xFF, 0x00]);
  return buf.readInt8(0) === 0 &&
         buf.readInt8(1) === -1 &&
         buf.readInt8(2) === 0 &&
         buf.readInt8(3) === -1 &&
         buf.readInt8(4) === 0;
});

test('0x7F/0x80 交替模式', () => {
  const buf = Buffer.from([0x7F, 0x80, 0x7F, 0x80]);
  return buf.readInt8(0) === 127 &&
         buf.readInt8(1) === -128 &&
         buf.readInt8(2) === 127 &&
         buf.readInt8(3) === -128;
});

// offset 参数边界组合
test('offset = buf.length - 1 读取最后一个字节', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  return buf.readInt8(buf.length - 1) === 50;
});

test('动态计算 offset', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const offset = Math.floor(buf.length / 2);
  return buf.readInt8(offset) === 30;
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
