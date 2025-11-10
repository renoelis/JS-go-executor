// buf.readDoubleLE() - 最终边缘场景补充测试
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

// Map/Set 作为 offset
test('offset = new Map()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(new Map());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new Set()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(new Set());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new WeakMap()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(new WeakMap());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new WeakSet()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(new WeakSet());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Promise 作为 offset
test('offset = Promise.resolve(0)（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(Promise.resolve(0));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// ArrayBuffer 作为 offset
test('offset = new ArrayBuffer(8)（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(new ArrayBuffer(8));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Error 对象作为 offset
test('offset = new Error()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(new Error());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new TypeError()（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(new TypeError());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Buffer 作为 offset
test('offset = Buffer.from([0])（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(Buffer.from([0]));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// TypedArray 作为 offset
test('offset = new Uint8Array([0])（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(new Uint8Array([0]));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = new Int32Array([0])（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE(new Int32Array([0]));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 带 getter 的对象（模拟属性访问副作用）
test('offset 对象带 getter 访问计数', () => {
  try {
    const buf = Buffer.alloc(8);
    let getterCalled = 0;
    const obj = {
      get value() {
        getterCalled++;
        return 0;
      }
    };
    buf.readDoubleLE(obj);
    return false;
  } catch (e) {
    // 无论是否调用 getter，最终都应该抛出 TypeError
    return e.name === 'TypeError';
  }
});

// 空数组和非空数组
test('offset = []（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE([]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = [0, 1]（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readDoubleLE([0, 1]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 稀疏数组
test('offset = 稀疏数组（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    const sparse = [];
    sparse[10] = 0;
    buf.readDoubleLE(sparse);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 类数组对象
test('offset = 类数组对象（应抛出 TypeError）', () => {
  try {
    const buf = Buffer.alloc(8);
    const arrayLike = { length: 1, 0: 0 };
    buf.readDoubleLE(arrayLike);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 特殊的八进制/十六进制/二进制字面量
test('offset = 0x0（十六进制 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(123.456, 0);
  const result = buf.readDoubleLE(0x0);
  return Math.abs(result - 123.456) < 0.001;
});

test('offset = 0o0（八进制 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(456.789, 0);
  const result = buf.readDoubleLE(0o0);
  return Math.abs(result - 456.789) < 0.001;
});

test('offset = 0b0（二进制 0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(789.012, 0);
  const result = buf.readDoubleLE(0b0);
  return Math.abs(result - 789.012) < 0.001;
});

test('offset = 0x8（十六进制 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(111.222, 8);
  const result = buf.readDoubleLE(0x8);
  return Math.abs(result - 111.222) < 0.001;
});

test('offset = 0o10（八进制 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(333.444, 8);
  const result = buf.readDoubleLE(0o10);
  return Math.abs(result - 333.444) < 0.001;
});

test('offset = 0b1000（二进制 8）', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(555.666, 8);
  const result = buf.readDoubleLE(0b1000);
  return Math.abs(result - 555.666) < 0.001;
});

// 边界对齐测试
test('读取 1MB Buffer 的最后 8 字节', () => {
  const size = 1024 * 1024;
  const buf = Buffer.alloc(size);
  buf.writeDoubleLE(999.999, size - 8);
  const result = buf.readDoubleLE(size - 8);
  return Math.abs(result - 999.999) < 0.001;
});

// 多次重复读取同一位置
test('重复读取 1000 次同一位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(123.456789, 0);
  const expected = buf.readDoubleLE(0);
  for (let i = 0; i < 1000; i++) {
    const result = buf.readDoubleLE(0);
    if (result !== expected) return false;
  }
  return true;
});

// 并发多位置读取
test('并发读取 100 个不同位置', () => {
  const buf = Buffer.alloc(800);
  const values = [];
  for (let i = 0; i < 100; i++) {
    const value = Math.random() * 1000;
    values.push(value);
    buf.writeDoubleLE(value, i * 8);
  }
  
  for (let i = 0; i < 100; i++) {
    const result = buf.readDoubleLE(i * 8);
    if (Math.abs(result - values[i]) > 0.001) return false;
  }
  return true;
});

// 检查方法不可变性（多次调用不影响原方法）
test('多次调用不影响方法本身', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(100.5, 0);
  const method = buf.readDoubleLE;
  const r1 = method.call(buf, 0);
  const r2 = method.call(buf, 0);
  const r3 = buf.readDoubleLE(0);
  return Math.abs(r1 - 100.5) < 0.01 && 
         Math.abs(r2 - 100.5) < 0.01 && 
         Math.abs(r3 - 100.5) < 0.01;
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
