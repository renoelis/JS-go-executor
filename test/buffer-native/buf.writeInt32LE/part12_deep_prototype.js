// buf.writeInt32LE() - 深度补充：原型链与特殊对象
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

// 方法存在性检查
test('方法存在：writeInt32LE 在原型上', () => {
  return 'writeInt32LE' in Buffer.prototype;
});

test('方法存在：writeInt32LE 是函数', () => {
  return typeof Buffer.prototype.writeInt32LE === 'function';
});

test('方法存在：实例可访问', () => {
  const buf = Buffer.allocUnsafe(4);
  return typeof buf.writeInt32LE === 'function';
});

test('方法存在：不是静态方法', () => {
  return typeof Buffer.writeInt32LE === 'undefined';
});

// 方法属性
test('方法属性：length 属性', () => {
  return typeof Buffer.prototype.writeInt32LE.length === 'number';
});

test('方法属性：name 属性', () => {
  return Buffer.prototype.writeInt32LE.name === 'writeInt32LE';
});

// 继承与原型链
test('原型链：Buffer 实例包含 writeInt32LE 方法', () => {
  const buf = Buffer.allocUnsafe(4);
  return typeof buf.writeInt32LE === 'function' && buf instanceof Buffer;
});

test('原型链：方法不在实例自身', () => {
  const buf = Buffer.allocUnsafe(4);
  return !buf.hasOwnProperty('writeInt32LE');
});

test('原型链：方法可被覆盖（实例层面）', () => {
  const buf = Buffer.allocUnsafe(4);
  const original = buf.writeInt32LE;
  buf.writeInt32LE = null;
  buf.writeInt32LE = original;
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

// 不同 Buffer 创建方式
test('创建方式：Buffer.alloc', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('创建方式：Buffer.allocUnsafe', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('创建方式：Buffer.allocUnsafeSlow', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('创建方式：Buffer.from(array)', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('创建方式：Buffer.from(ArrayBuffer)', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('创建方式：Buffer.from(buffer)', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.from(buf1);
  buf2.writeInt32LE(123, 0);
  return buf2.readInt32LE(0) === 123;
});

test('创建方式：new Uint8Array 转 Buffer', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

// TypedArray 类型测试
test('TypedArray：Uint8Array', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(0x12345678, 0);
  return arr[0] === 0x78 && arr[3] === 0x12;
});

test('TypedArray：Uint16Array 底层 buffer', () => {
  const arr = new Uint16Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(0x12345678, 0);
  return buf.readInt32LE(0) === 0x12345678;
});

test('TypedArray：Uint32Array 底层 buffer', () => {
  const arr = new Uint32Array(1);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(0x12345678, 0);
  return buf.readInt32LE(0) === 0x12345678;
});

test('TypedArray：Int8Array 底层 buffer', () => {
  const arr = new Int8Array(4);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('TypedArray：Int16Array 底层 buffer', () => {
  const arr = new Int16Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('TypedArray：Int32Array 底层 buffer', () => {
  const arr = new Int32Array(1);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('TypedArray：Float32Array 底层 buffer', () => {
  const arr = new Float32Array(1);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('TypedArray：Float64Array 底层 buffer', () => {
  const arr = new Float64Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

// Buffer 作为 Uint8Array 子类
test('继承关系：Buffer 是 Uint8Array 子类', () => {
  const buf = Buffer.allocUnsafe(4);
  return buf instanceof Uint8Array;
});

test('继承关系：可用 Uint8Array 方法', () => {
  const buf = Buffer.allocUnsafe(4);
  return typeof buf.slice === 'function' && typeof buf.subarray === 'function';
});

// call/apply/bind
test('call：正常调用', () => {
  const buf = Buffer.allocUnsafe(4);
  Buffer.prototype.writeInt32LE.call(buf, 123, 0);
  return buf.readInt32LE(0) === 123;
});

test('apply：正常调用', () => {
  const buf = Buffer.allocUnsafe(4);
  Buffer.prototype.writeInt32LE.apply(buf, [123, 0]);
  return buf.readInt32LE(0) === 123;
});

test('bind：绑定后调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const bound = Buffer.prototype.writeInt32LE.bind(buf);
  bound(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('bind：部分参数绑定', () => {
  const buf = Buffer.allocUnsafe(4);
  const bound = Buffer.prototype.writeInt32LE.bind(buf, 123);
  bound(0);
  return buf.readInt32LE(0) === 123;
});

// Frozen/Sealed 对象
test('Frozen Buffer：无法 freeze TypedArray', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.message.includes('freeze') || e.message.includes('array buffer');
  }
});

test('Sealed Buffer：无法 seal TypedArray', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.message.includes('seal') || e.message.includes('array buffer');
  }
});

// 特殊属性
test('特殊属性：length 属性', () => {
  const buf = Buffer.allocUnsafe(4);
  return buf.length === 4;
});

test('特殊属性：byteLength 属性', () => {
  const buf = Buffer.allocUnsafe(4);
  return buf.byteLength === 4;
});

test('特殊属性：byteOffset 属性', () => {
  const buf = Buffer.allocUnsafe(4);
  return typeof buf.byteOffset === 'number';
});

test('特殊属性：buffer 属性', () => {
  const buf = Buffer.allocUnsafe(4);
  return buf.buffer instanceof ArrayBuffer;
});

// subarray 后的原型链
test('subarray：保持原型链', () => {
  const parent = Buffer.allocUnsafe(8);
  const child = parent.subarray(0, 4);
  child.writeInt32LE(123, 0);
  return parent.readInt32LE(0) === 123;
});

test('subarray：方法仍可用', () => {
  const parent = Buffer.allocUnsafe(8);
  const child = parent.subarray(0, 4);
  return typeof child.writeInt32LE === 'function';
});

// slice 后的原型链
test('slice：保持原型链', () => {
  const original = Buffer.allocUnsafe(8);
  const sliced = original.slice(0, 4);
  return typeof sliced.writeInt32LE === 'function';
});

test('slice：是 Buffer 实例', () => {
  const original = Buffer.allocUnsafe(8);
  const sliced = original.slice(0, 4);
  return sliced instanceof Buffer;
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
