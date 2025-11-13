// Buffer.isBuffer() - 查缺补漏：数组方法、ES2023 新方法、Symbol 等
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

// Buffer.isEncoding 静态方法
test('Buffer.isEncoding 返回布尔值不是 Buffer', () => {
  const result = Buffer.isEncoding('utf8');
  return typeof result === 'boolean' && Buffer.isBuffer(result) === false;
});

test('Buffer.isEncoding 检测有效编码', () => {
  const encodings = ['utf8', 'hex', 'base64', 'ascii', 'latin1'];
  return encodings.every(enc => {
    const result = Buffer.isEncoding(enc);
    return typeof result === 'boolean' && Buffer.isBuffer(result) === false;
  });
});

test('Buffer.isEncoding 检测无效编码', () => {
  const result = Buffer.isEncoding('invalid-encoding');
  return result === false && Buffer.isBuffer(result) === false;
});

// ArrayBuffer.isView
test('ArrayBuffer.isView 判断 Buffer 为 true', () => {
  const buf = Buffer.from('test');
  return ArrayBuffer.isView(buf) === true && Buffer.isBuffer(buf) === true;
});

test('ArrayBuffer.isView 判断 Uint8Array 为 true', () => {
  const u8 = new Uint8Array([1, 2, 3]);
  return ArrayBuffer.isView(u8) === true && Buffer.isBuffer(u8) === false;
});

test('ArrayBuffer.isView 判断 ArrayBuffer 为 false', () => {
  const ab = new ArrayBuffer(10);
  return ArrayBuffer.isView(ab) === false && Buffer.isBuffer(ab) === false;
});

// Buffer.set 方法（TypedArray 继承）
test('Buffer.set 方法可用', () => {
  const buf = Buffer.alloc(10);
  const src = Buffer.from([1, 2, 3]);
  buf.set(src, 2);
  return Buffer.isBuffer(buf) === true && buf[2] === 1;
});

test('Buffer.set 不返回值或返回 undefined', () => {
  const buf = Buffer.alloc(10);
  const src = Buffer.from([1, 2, 3]);
  const result = buf.set(src, 2);
  return result === undefined && Buffer.isBuffer(result) === false;
});

test('Buffer.set 可设置 Uint8Array', () => {
  const buf = Buffer.alloc(10);
  const u8 = new Uint8Array([4, 5, 6]);
  buf.set(u8, 5);
  return Buffer.isBuffer(buf) === true && buf[5] === 4;
});

// Buffer.at 方法（ES2022）
test('Buffer.at 方法存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf.at === 'function';
});

test('Buffer.at 正索引返回数字', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const val = buf.at(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false && val === 1;
});

test('Buffer.at 负索引返回数字', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const val = buf.at(-1);
  return typeof val === 'number' && Buffer.isBuffer(val) === false && val === 5;
});

test('Buffer.at 超出范围返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  const val = buf.at(10);
  return val === undefined && Buffer.isBuffer(val) === false;
});

// Buffer.from 特殊对象（包含 type 和 data）
test('Buffer.from 可识别类 Buffer 对象', () => {
  const obj = { type: 'Buffer', data: [72, 101, 108, 108, 111] };
  const buf = Buffer.from(obj);
  return Buffer.isBuffer(buf) === true && buf.toString() === 'Hello';
});

test('Buffer.from 类 Buffer 对象必须有 data 数组', () => {
  const obj = { type: 'Buffer', data: [1, 2, 3, 4, 5] };
  const buf = Buffer.from(obj);
  return Buffer.isBuffer(buf) === true && buf.length === 5;
});

// Buffer 的数组迭代方法
test('Buffer.every 返回布尔值不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = buf.every(v => v > 0);
  return typeof result === 'boolean' && Buffer.isBuffer(result) === false;
});

test('Buffer.some 返回布尔值不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = buf.some(v => v > 3);
  return typeof result === 'boolean' && Buffer.isBuffer(result) === false;
});

test('Buffer.forEach 不返回值', () => {
  const buf = Buffer.from([1, 2, 3]);
  let count = 0;
  const result = buf.forEach(() => count++);
  return result === undefined && count === 3 && Buffer.isBuffer(buf) === true;
});

test('Buffer.find 返回数字不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = buf.find(v => v > 2);
  return typeof result === 'number' && Buffer.isBuffer(result) === false;
});

test('Buffer.findIndex 返回数字不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = buf.findIndex(v => v > 2);
  return typeof result === 'number' && Buffer.isBuffer(result) === false;
});

test('Buffer.findLast 返回数字不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 3]);
  if (typeof buf.findLast === 'function') {
    const result = buf.findLast(v => v === 3);
    return typeof result === 'number' && Buffer.isBuffer(result) === false;
  }
  return true;
});

test('Buffer.findLastIndex 返回数字不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 3]);
  if (typeof buf.findLastIndex === 'function') {
    const result = buf.findLastIndex(v => v === 3);
    return typeof result === 'number' && Buffer.isBuffer(result) === false;
  }
  return true;
});

// Buffer.reduce 和 reduceRight
test('Buffer.reduce 返回累加值不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sum = buf.reduce((acc, val) => acc + val, 0);
  return typeof sum === 'number' && Buffer.isBuffer(sum) === false && sum === 15;
});

test('Buffer.reduceRight 返回累加值不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sum = buf.reduceRight((acc, val) => acc + val, 0);
  return typeof sum === 'number' && Buffer.isBuffer(sum) === false && sum === 15;
});

// Buffer.sort
test('Buffer.sort 返回自身仍是 Buffer', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);
  const result = buf.sort();
  return Buffer.isBuffer(result) === true && result === buf;
});

test('Buffer.sort 会修改原 Buffer', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);
  buf.sort();
  return Buffer.isBuffer(buf) === true && buf[0] === 1;
});

test('Buffer.sort 可传比较函数', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);
  buf.sort((a, b) => b - a);
  return Buffer.isBuffer(buf) === true && buf[0] === 9;
});

// Buffer.map 和 filter 返回 Buffer
test('Buffer.map 返回新 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const mapped = buf.map(v => v * 2);
  return Buffer.isBuffer(mapped) === true && mapped !== buf;
});

test('Buffer.map 返回内容正确', () => {
  const buf = Buffer.from([1, 2, 3]);
  const mapped = buf.map(v => v * 2);
  return Buffer.isBuffer(mapped) === true && mapped[0] === 2;
});

test('Buffer.filter 返回新 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const filtered = buf.filter(v => v > 2);
  return Buffer.isBuffer(filtered) === true && filtered !== buf;
});

test('Buffer.filter 返回内容正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const filtered = buf.filter(v => v > 2);
  return Buffer.isBuffer(filtered) === true && filtered.length === 3;
});

// Buffer.join
test('Buffer.join 返回字符串不是 Buffer', () => {
  const buf = Buffer.from([72, 101, 108, 108, 111]);
  const result = buf.join(',');
  return typeof result === 'string' && Buffer.isBuffer(result) === false;
});

test('Buffer.join 默认分隔符', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = buf.join();
  return typeof result === 'string' && Buffer.isBuffer(result) === false;
});

// Buffer.with 方法（ES2023）
test('Buffer.with 返回 Uint8Array 不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  if (typeof buf.with === 'function') {
    const result = buf.with(2, 99);
    return Buffer.isBuffer(result) === false && result instanceof Uint8Array;
  }
  return true;
});

test('Buffer.with 不修改原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  if (typeof buf.with === 'function') {
    buf.with(2, 99);
    return Buffer.isBuffer(buf) === true && buf[2] === 3;
  }
  return true;
});

// Buffer.toReversed（ES2023）
test('Buffer.toReversed 返回 Uint8Array 不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  if (typeof buf.toReversed === 'function') {
    const result = buf.toReversed();
    return Buffer.isBuffer(result) === false && result instanceof Uint8Array;
  }
  return true;
});

test('Buffer.toReversed 不修改原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  if (typeof buf.toReversed === 'function') {
    buf.toReversed();
    return Buffer.isBuffer(buf) === true && buf[0] === 1;
  }
  return true;
});

// Buffer.toSorted（ES2023）
test('Buffer.toSorted 返回 Uint8Array 不是 Buffer', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);
  if (typeof buf.toSorted === 'function') {
    const result = buf.toSorted();
    return Buffer.isBuffer(result) === false && result instanceof Uint8Array;
  }
  return true;
});

test('Buffer.toSorted 不修改原 Buffer', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);
  if (typeof buf.toSorted === 'function') {
    buf.toSorted();
    return Buffer.isBuffer(buf) === true && buf[0] === 5;
  }
  return true;
});

// Buffer.toSpliced（ES2023）
test('Buffer.toSpliced 存在时返回 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  if (typeof buf.toSpliced === 'function') {
    const result = buf.toSpliced(1, 2);
    return Buffer.isBuffer(result) === false && result instanceof Uint8Array;
  }
  return true;
});

// Buffer.copyWithin
test('Buffer.copyWithin 返回自身仍是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = buf.copyWithin(0, 3);
  return Buffer.isBuffer(result) === true && result === buf;
});

test('Buffer.copyWithin 会修改原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.copyWithin(0, 3);
  return Buffer.isBuffer(buf) === true && buf[0] === 4;
});

test('Buffer.copyWithin 可指定范围', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.copyWithin(0, 2, 4);
  return Buffer.isBuffer(buf) === true;
});

// Buffer.lastIndexOf 的各种参数
test('Buffer.lastIndexOf 查找字符串', () => {
  const buf = Buffer.from('hello world hello');
  const idx = buf.lastIndexOf('hello');
  return typeof idx === 'number' && Buffer.isBuffer(idx) === false;
});

test('Buffer.lastIndexOf 查找 Buffer', () => {
  const buf = Buffer.from('hello world hello');
  const idx = buf.lastIndexOf(Buffer.from('hello'));
  return typeof idx === 'number' && Buffer.isBuffer(idx) === false;
});

test('Buffer.lastIndexOf 带 offset', () => {
  const buf = Buffer.from('hello world hello');
  const idx = buf.lastIndexOf('hello', 10);
  return typeof idx === 'number' && Buffer.isBuffer(idx) === false;
});

test('Buffer.lastIndexOf 查找单字节', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);
  const idx = buf.lastIndexOf(2);
  return typeof idx === 'number' && Buffer.isBuffer(idx) === false && idx === 3;
});

// Symbol 属性
test('Buffer Symbol.toStringTag 值', () => {
  const buf = Buffer.from('test');
  const tag = buf[Symbol.toStringTag];
  return typeof tag === 'string' && Buffer.isBuffer(tag) === false;
});

test('Buffer Symbol.iterator 是函数', () => {
  const buf = Buffer.from('test');
  const iter = buf[Symbol.iterator];
  return typeof iter === 'function' && Buffer.isBuffer(iter) === false;
});

test('Buffer Symbol.isConcatSpreadable', () => {
  const buf = Buffer.from('test');
  if (Symbol.isConcatSpreadable) {
    const spreadable = buf[Symbol.isConcatSpreadable];
    return (spreadable === undefined || typeof spreadable === 'boolean') &&
           Buffer.isBuffer(spreadable) === false;
  }
  return true;
});

// SharedArrayBuffer 补充（goja 不支持，跳过）
// test('从 SharedArrayBuffer 和 ArrayBuffer 创建行为一致', () => {
//   const ab = new ArrayBuffer(10);
//   const sab = new SharedArrayBuffer(10);
//   const fromAB = Buffer.from(ab);
//   const fromSAB = Buffer.from(sab);
//   return Buffer.isBuffer(fromAB) === true && Buffer.isBuffer(fromSAB) === true;
// });

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
