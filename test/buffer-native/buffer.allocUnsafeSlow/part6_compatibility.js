// Buffer.allocUnsafeSlow - 兼容性与互操作性测试
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

// 与 TypedArray 的兼容性
test('Buffer 是 Uint8Array 的实例', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Uint8Array;
});

test('可以使用 TypedArray 的方法', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  return typeof buf.fill === 'function' &&
         typeof buf.slice === 'function' &&
         typeof buf.subarray === 'function';
});

test('可以使用 forEach 遍历', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(10);
  let sum = 0;
  buf.forEach(val => sum += val);
  return sum === 50;
});

test('可以使用 map 方法', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  for (let i = 0; i < 5; i++) buf[i] = i;
  const arr = buf.map(x => x * 2);
  return arr[0] === 0 && arr[4] === 8;
});

test('可以使用 filter 方法', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  for (let i = 0; i < 10; i++) buf[i] = i;
  const filtered = buf.filter(x => x > 5);
  return filtered.length === 4;
});

test('可以使用 reduce 方法', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  for (let i = 0; i < 5; i++) buf[i] = i + 1;
  const sum = buf.reduce((acc, val) => acc + val, 0);
  return sum === 15;
});

// 与 ArrayBuffer 的关系
test('有 buffer 属性指向 ArrayBuffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('buffer 属性的 byteLength 正确', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.buffer.byteLength >= 10;
});

test('byteOffset 属性存在', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return typeof buf.byteOffset === 'number';
});

test('byteLength 属性正确', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  return buf.byteLength === 20;
});

// 与其他 Buffer API 的互操作
test('可以使用 Buffer.concat 连接', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.fill(1);
  buf2.fill(2);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 10 && result[0] === 1 && result[5] === 2;
});

test('可以使用 Buffer.compare 比较', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.fill(1);
  buf2.fill(1);
  return Buffer.compare(buf1, buf2) === 0;
});

test('可以用作 Buffer.concat 的输入', () => {
  const bufs = [];
  for (let i = 0; i < 3; i++) {
    const buf = Buffer.allocUnsafeSlow(10);
    buf.fill(i);
    bufs.push(buf);
  }
  const result = Buffer.concat(bufs);
  return result.length === 30;
});

test('Buffer.isBuffer 返回 true', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return Buffer.isBuffer(buf);
});

// 字符串编码操作
test('可以写入 utf8 字符串', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const written = buf.write('hello', 0, 'utf8');
  return written > 0 && buf.toString('utf8', 0, 5) === 'hello';
});

test('可以写入 ascii 字符串', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.write('abc', 0, 'ascii');
  return buf.toString('ascii', 0, 3) === 'abc';
});

test('可以写入 hex 字符串', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.write('48656c6c6f', 0, 'hex');
  return buf.toString('utf8', 0, 5) === 'Hello';
});

test('可以写入 base64 字符串', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.write('SGVsbG8=', 0, 'base64');
  return buf.toString('utf8', 0, 5) === 'Hello';
});

test('toString 默认使用 utf8', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.write('test', 0);
  return buf.toString('utf8', 0, 4) === 'test';
});

// 数值读写操作
test('可以写入和读取 UInt8', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeUInt8(255, 0);
  return buf.readUInt8(0) === 255;
});

test('可以写入和读取 UInt16LE', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeUInt16LE(65535, 0);
  return buf.readUInt16LE(0) === 65535;
});

test('可以写入和读取 UInt32LE', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeUInt32LE(4294967295, 0);
  return buf.readUInt32LE(0) === 4294967295;
});

test('可以写入和读取 Int8', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeInt8(-128, 0);
  return buf.readInt8(0) === -128;
});

test('可以写入和读取 Int16LE', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeInt16LE(-32768, 0);
  return buf.readInt16LE(0) === -32768;
});

test('可以写入和读取 FloatLE', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeFloatLE(3.14, 0);
  const val = buf.readFloatLE(0);
  return Math.abs(val - 3.14) < 0.01;
});

test('可以写入和读取 DoubleLE', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeDoubleLE(3.141592653589793, 0);
  const val = buf.readDoubleLE(0);
  return Math.abs(val - 3.141592653589793) < 0.000001;
});

// 复制与填充操作
test('可以使用 copy 方法', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.fill(100);
  buf2.fill(0);
  buf1.copy(buf2);
  return buf2[0] === 100 && buf2[4] === 100;
});

test('可以使用 fill 填充特定值', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(123);
  return buf[0] === 123 && buf[9] === 123;
});

test('可以部分填充', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.fill(255, 5, 8);
  return buf[4] === 0 && buf[5] === 255 && buf[7] === 255 && buf[8] === 0;
});

// slice 和 subarray 行为
test('slice 返回新 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const sliced = buf.slice(0, 5);
  return Buffer.isBuffer(sliced) && sliced.length === 5;
});

test('subarray 返回新 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const sub = buf.subarray(0, 5);
  return Buffer.isBuffer(sub) && sub.length === 5;
});

test('slice 和 subarray 共享底层内存', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const sliced = buf.slice(0, 5);
  const sub = buf.subarray(5, 10);
  sliced[0] = 100;
  sub[0] = 200;
  return buf[0] === 100 && buf[5] === 200;
});

// 迭代器支持
test('支持 for...of 遍历', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  for (let i = 0; i < 5; i++) buf[i] = i;
  const values = [];
  for (const val of buf) {
    values.push(val);
  }
  return values.length === 5 && values[4] === 4;
});

test('支持 entries 迭代器', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  for (let i = 0; i < 3; i++) buf[i] = i * 10;
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[1][0] === 1 && entries[1][1] === 10;
});

test('支持 keys 迭代器', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('支持 values 迭代器', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  for (let i = 0; i < 3; i++) buf[i] = i + 5;
  const values = Array.from(buf.values());
  return values.length === 3 && values[0] === 5 && values[2] === 7;
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
