// Buffer.alloc() - Part 7: Compatibility and Advanced Tests
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

// ArrayBuffer 互操作性
test('Buffer.alloc 创建的 Buffer 有 buffer 属性', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer.alloc 创建的 Buffer 的 byteLength', () => {
  const buf = Buffer.alloc(100);
  return buf.byteLength === 100;
});

test('Buffer.alloc 创建的 Buffer 的 byteOffset', () => {
  const buf = Buffer.alloc(10);
  return typeof buf.byteOffset === 'number';
});

// 与 TypedArray 的兼容性
test('Buffer.alloc 创建的对象是 Uint8Array 实例', () => {
  const buf = Buffer.alloc(10);
  return buf instanceof Uint8Array;
});

test('可以使用 TypedArray 方法 - slice', () => {
  const buf = Buffer.alloc(10, 0x42);
  const sliced = buf.slice(2, 5);
  return sliced.length === 3 && sliced[0] === 0x42;
});

test('可以使用 TypedArray 方法 - subarray', () => {
  const buf = Buffer.alloc(10, 0x55);
  const sub = buf.subarray(3, 7);
  return sub.length === 4 && sub[0] === 0x55;
});

test('可以使用 TypedArray 方法 - fill', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xAA);
  return buf[0] === 0xAA && buf[9] === 0xAA;
});

// Buffer 方法可用性
test('Buffer.alloc 创建的对象有 equals 方法', () => {
  const buf = Buffer.alloc(5, 0x11);
  return typeof buf.equals === 'function';
});

test('Buffer.alloc 创建的对象有 compare 方法', () => {
  const buf = Buffer.alloc(5);
  return typeof buf.compare === 'function';
});

test('Buffer.alloc 创建的对象有 copy 方法', () => {
  const buf = Buffer.alloc(5);
  return typeof buf.copy === 'function';
});

test('Buffer.alloc 创建的对象有 write 方法', () => {
  const buf = Buffer.alloc(10);
  return typeof buf.write === 'function';
});

test('Buffer.alloc 创建的对象有 toString 方法', () => {
  const buf = Buffer.alloc(5);
  return typeof buf.toString === 'function';
});

// 实际使用场景
test('分配后立即写入 - writeUInt8', () => {
  const buf = Buffer.alloc(5);
  buf.writeUInt8(255, 0);
  return buf[0] === 255;
});

test('分配后立即写入 - write', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello');
  return written === 5 && buf[0] === 0x68;
});

test('分配后 copy 到另一个 Buffer', () => {
  const src = Buffer.alloc(5, 0xAA);
  const dst = Buffer.alloc(10);
  src.copy(dst, 2);
  return dst[2] === 0xAA && dst[6] === 0xAA && dst[0] === 0 && dst[7] === 0;
});

test('分配后使用 equals 比较', () => {
  const buf1 = Buffer.alloc(5, 0x11);
  const buf2 = Buffer.alloc(5, 0x11);
  return buf1.equals(buf2);
});

test('分配后使用 compare 比较', () => {
  const buf1 = Buffer.alloc(5, 0x10);
  const buf2 = Buffer.alloc(5, 0x20);
  return buf1.compare(buf2) < 0;
});

// 迭代能力
test('Buffer.alloc 创建的对象可以用 for...of 遍历', () => {
  const buf = Buffer.alloc(3, 0x42);
  let count = 0;
  let sum = 0;
  for (const byte of buf) {
    count++;
    sum += byte;
  }
  return count === 3 && sum === 0x42 * 3;
});

test('Buffer.alloc 创建的对象有 forEach', () => {
  const buf = Buffer.alloc(3, 0x33);
  return typeof buf.forEach === 'function';
});

// JSON 序列化
test('Buffer.alloc 创建的对象可以 JSON.stringify', () => {
  const buf = Buffer.alloc(3, 0x01);
  const json = JSON.stringify(buf);
  return json.includes('"type":"Buffer"');
});

test('Buffer.alloc 创建的对象 toJSON 返回正确格式', () => {
  const buf = Buffer.alloc(3, 0x42);
  const obj = buf.toJSON();
  return obj.type === 'Buffer' && Array.isArray(obj.data);
});

// 字符串填充的重复行为
test('字符串填充 - 完整重复', () => {
  const buf = Buffer.alloc(6, 'ab');
  return buf[0] === 0x61 && buf[1] === 0x62 &&
         buf[2] === 0x61 && buf[3] === 0x62 &&
         buf[4] === 0x61 && buf[5] === 0x62;
});

test('字符串填充 - 部分重复', () => {
  const buf = Buffer.alloc(7, 'abc');
  return buf[0] === 0x61 && buf[1] === 0x62 && buf[2] === 0x63 &&
         buf[3] === 0x61 && buf[4] === 0x62 && buf[5] === 0x63 &&
         buf[6] === 0x61;
});

test('字符串填充 - 多字节字符重复', () => {
  const buf = Buffer.alloc(12, '你好');
  const pattern = Buffer.from('你好');
  return buf[0] === pattern[0] && buf[1] === pattern[1] && buf[2] === pattern[2];
});

// 与 Buffer.from 的对比
test('Buffer.alloc 与 Buffer.from 创建相同内容的 Buffer', () => {
  const alloc = Buffer.alloc(5, 0x42);
  const from = Buffer.from([0x42, 0x42, 0x42, 0x42, 0x42]);
  return alloc.equals(from);
});

test('Buffer.alloc 初始化为 0，Buffer.allocUnsafe 不保证', () => {
  const safe = Buffer.alloc(10);
  return safe.every(b => b === 0);
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
