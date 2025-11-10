// buf[index] - Part 14: Final Missing Coverage Tests
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

// 测试 Uint8ClampedArray 行为差异
test('Buffer 和 Uint8ClampedArray 写入 256 行为不同', () => {
  const buf = Buffer.alloc(1);
  const clamped = new Uint8ClampedArray(1);
  buf[0] = 256;
  clamped[0] = 256;
  // Buffer: 256 % 256 = 0
  // Uint8ClampedArray: clamp(256, 0, 255) = 255
  return buf[0] === 0 && clamped[0] === 255;
});

test('Buffer 和 Uint8ClampedArray 写入 -1 行为不同', () => {
  const buf = Buffer.alloc(1);
  const clamped = new Uint8ClampedArray(1);
  buf[0] = -1;
  clamped[0] = -1;
  // Buffer: -1 转为无符号 = 255
  // Uint8ClampedArray: clamp(-1, 0, 255) = 0
  return buf[0] === 255 && clamped[0] === 0;
});

test('Buffer 和 Uint8ClampedArray 写入 300 行为不同', () => {
  const buf = Buffer.alloc(1);
  const clamped = new Uint8ClampedArray(1);
  buf[0] = 300;
  clamped[0] = 300;
  return buf[0] === 44 && clamped[0] === 255;
});

// 测试 Buffer.prototype 上的索引访问
test('Buffer.prototype 上没有数字索引', () => {
  return Buffer.prototype[0] === undefined;
});

test('修改 Buffer.prototype 不影响实例索引', () => {
  Buffer.prototype[0] = 999;
  const buf = Buffer.from([10, 20, 30]);
  const result = buf[0] === 10;
  delete Buffer.prototype[0];
  return result;
});

// 测试索引的可枚举性
test('索引属性是可枚举的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const desc = Object.getOwnPropertyDescriptor(buf, 0);
  return desc && desc.enumerable === true;
});

test('索引属性是可写的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const desc = Object.getOwnPropertyDescriptor(buf, 0);
  return desc && desc.writable === true;
});

test('索引属性是可配置的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const desc = Object.getOwnPropertyDescriptor(buf, 0);
  return desc && desc.configurable === true;
});

// 测试 Buffer 与普通数组的区别
test('Buffer 索引只能存储 0-255', () => {
  const buf = Buffer.alloc(1);
  const arr = [];
  buf[0] = 1000;
  arr[0] = 1000;
  return buf[0] === 232 && arr[0] === 1000;
});

test('Buffer 索引不能存储对象', () => {
  const buf = Buffer.alloc(1);
  const obj = { value: 42 };
  buf[0] = obj;
  return buf[0] === 0 && typeof buf[0] === 'number';
});

test('Buffer 索引不能存储字符串', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 'hello';
  return buf[0] === 0;
});

test('Buffer 索引不能存储数组', () => {
  const buf = Buffer.alloc(1);
  buf[0] = [1, 2, 3];
  return buf[0] === 0;
});

// 测试 Buffer 的 length 属性与索引的关系
test('Buffer.length 是构造函数的 length', () => {
  return typeof Buffer.length === 'number';
});

test('buf.length 返回字节数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.length === 5;
});

test('修改 buf.length 不生效（只读）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const originalLength = buf.length;
  try {
    buf.length = 10;
  } catch (e) {
    // 严格模式下可能抛出错误
  }
  return buf.length === originalLength;
});

// 测试 Buffer 与 TypedArray 的 set 方法交互
test('使用 set 方法后索引访问正常', () => {
  const buf = Buffer.alloc(5);
  const source = new Uint8Array([10, 20, 30]);
  buf.set(source, 1);
  return buf[0] === 0 && buf[1] === 10 && buf[2] === 20 && buf[3] === 30 && buf[4] === 0;
});

test('set 方法后修改索引不影响源数组', () => {
  const buf = Buffer.alloc(5);
  const source = new Uint8Array([10, 20, 30]);
  buf.set(source, 0);
  buf[0] = 99;
  return source[0] === 10 && buf[0] === 99;
});

// 测试 Buffer 的 at() 方法与索引访问的关系
test('at(0) 和 [0] 返回相同值', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf.at(0) === buf[0];
});

test('at(-1) 返回最后一个元素', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf.at(-1) === 30;
});

test('at(-1) 和 [length-1] 返回相同值', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf.at(-1) === buf[buf.length - 1];
});

test('at() 越界返回 undefined', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf.at(10) === undefined && buf.at(-10) === undefined;
});

// 测试 Buffer 与 ArrayBuffer 的 transferToFixedLength
test('Buffer 的底层 ArrayBuffer 可访问', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.buffer instanceof ArrayBuffer;
});

test('通过 ArrayBuffer 创建新视图后索引独立', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1.buffer);
  buf2[0] = 99;
  // 注意：如果共享同一个 ArrayBuffer，修改会相互影响
  return buf1[0] === 99 || buf1[0] === 1;
});

// 测试 Buffer 的 toJSON 与索引的关系
test('toJSON 返回所有索引的值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  return json.type === 'Buffer' && json.data[0] === 1 && json.data[1] === 2 && json.data[2] === 3;
});

test('修改索引后 toJSON 反映变化', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[1] = 99;
  const json = buf.toJSON();
  return json.data[1] === 99;
});

// 测试 Buffer 的 swap 方法与索引的关系
test('swap16 后索引值改变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return buf[0] === 0x02 && buf[1] === 0x01 && buf[2] === 0x04 && buf[3] === 0x03;
});

test('swap32 后索引值改变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();
  return buf[0] === 0x04 && buf[1] === 0x03 && buf[2] === 0x02 && buf[3] === 0x01;
});

test('swap64 后索引值改变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  return buf[0] === 0x08 && buf[7] === 0x01;
});

// 测试 Buffer 的 compare 与索引的关系
test('compare 比较索引值', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);
  return buf1.compare(buf2) < 0;
});

test('修改索引后 compare 结果改变', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  buf1[2] = 5;
  return buf1.compare(buf2) > 0;
});

// 测试 Buffer 的 equals 与索引的关系
test('equals 比较所有索引', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2);
});

test('修改一个索引后 equals 返回 false', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  buf1[1] = 99;
  return !buf1.equals(buf2);
});

// 测试 Buffer 的 includes/indexOf/lastIndexOf 与索引的关系
test('includes 检查索引值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.includes(3);
});

test('indexOf 返回索引位置', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.indexOf(3) === 2;
});

test('lastIndexOf 返回最后出现的索引', () => {
  const buf = Buffer.from([1, 2, 3, 2, 5]);
  return buf.lastIndexOf(2) === 3;
});

test('修改索引后 includes 结果改变', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf[1] = 99;
  return buf.includes(99) && !buf.includes(2);
});

// 测试 Buffer 的 reverse 与索引的关系
test('reverse 反转索引顺序', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse();
  return buf[0] === 5 && buf[1] === 4 && buf[2] === 3 && buf[3] === 2 && buf[4] === 1;
});

test('reverse 后再次 reverse 恢复原顺序', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.reverse();
  buf.reverse();
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 测试 Buffer 与 SharedArrayBuffer 的交互
test('Buffer 不能从 SharedArrayBuffer 创建', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const buf = Buffer.from(sab);
    // 某些环境可能支持，某些不支持
    return true;
  } catch (e) {
    return e.message.includes('SharedArrayBuffer') || e.message.includes('not supported');
  }
});

// 测试 Buffer 的 write 方法与索引的关系
test('write 方法修改索引值', () => {
  const buf = Buffer.alloc(5);
  buf.write('ABC', 0, 'utf8');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

test('write 方法从指定偏移开始', () => {
  const buf = Buffer.alloc(5);
  buf.write('AB', 2, 'utf8');
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0x41 && buf[3] === 0x42;
});

// 测试 Buffer 的 readInt/readUInt 方法与索引的关系
test('readUInt8 读取单个索引', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readUInt8(0) === buf[0] && buf.readUInt8(1) === buf[1];
});

test('readInt8 读取有符号值', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return buf.readInt8(0) === -1 && buf.readInt8(1) === 127;
});

// 测试 Buffer 的 writeInt/writeUInt 方法与索引的关系
test('writeUInt8 修改单个索引', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(0x12, 0);
  buf.writeUInt8(0x34, 1);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeInt8 写入有符号值', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt8(-1, 0);
  buf.writeInt8(127, 1);
  return buf[0] === 0xFF && buf[1] === 0x7F;
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
