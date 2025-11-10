// buf.readUInt8() - 极端边界深度测试
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

// Object.freeze/seal 测试（Buffer 不能被 freeze/seal，应抛出错误）
test('尝试 freeze buffer（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 200, 50]);
    Object.freeze(buf);
    return false;
  } catch (e) {
    // Node.js 不允许 freeze 有元素的 Buffer
    return e.name === 'TypeError';
  }
});

test('尝试 seal buffer（应抛出错误）', () => {
  try {
    const buf = Buffer.from([255, 128, 0]);
    Object.seal(buf);
    return false;
  } catch (e) {
    // Node.js 不允许 seal 有元素的 Buffer
    return e.name === 'TypeError';
  }
});

// 非常大的 offset（在安全整数范围内但远超 buffer 长度）
test('offset = 1000000（远超 buffer 长度，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(1000000);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.MAX_VALUE（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 精确的浮点数边界
test('offset = 0.9999999999（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 200]);
    buf.readUInt8(0.9999999999);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1.0000000001（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 200]);
    buf.readUInt8(1.0000000001);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 科学计数法
test('offset = 1e0（等于 1，应正常工作）', () => {
  const buf = Buffer.from([100, 200]);
  return buf.readUInt8(1e0) === 200;
});

test('offset = 1e1（等于 10，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(1e1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 1e-1（等于 0.1，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(1e-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 最小正数
test('offset = Number.MIN_VALUE（接近 0，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(Number.MIN_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = Number.EPSILON（非常小的正数，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readUInt8(Number.EPSILON);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 与其他读取方法混合使用
test('readUInt8 和 readInt8 交替读取同一 buffer', () => {
  const buf = Buffer.from([100, 200, 50]);
  const u1 = buf.readUInt8(0);
  const s1 = buf.readInt8(0);
  const u2 = buf.readUInt8(1);
  const s2 = buf.readInt8(1);
  // 100 作为 uint8 和 int8 都是 100
  // 200 作为 uint8 是 200，作为 int8 是 -56
  return u1 === 100 && s1 === 100 && u2 === 200 && s2 === -56;
});

test('readUInt8 和 readUInt16LE 混合读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const u8 = buf.readUInt8(0);
  const u16 = buf.readUInt16LE(1);
  return u8 === 0x12 && u16 === 0x5634;
});

// 极端长度的 buffer
test('读取 100000 字节 buffer 的第一个字节', () => {
  const buf = Buffer.alloc(100000);
  buf.writeUInt8(255, 0);
  return buf.readUInt8(0) === 255;
});

test('读取 100000 字节 buffer 的最后一个字节', () => {
  const buf = Buffer.alloc(100000);
  buf.writeUInt8(128, 99999);
  return buf.readUInt8(99999) === 128;
});

test('读取 100000 字节 buffer 的中间字节', () => {
  const buf = Buffer.alloc(100000);
  buf.writeUInt8(77, 50000);
  return buf.readUInt8(50000) === 77;
});

// 共享 ArrayBuffer 的多个视图
test('多个 Buffer 共享同一 ArrayBuffer', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);
  buf1.writeUInt8(123, 0);
  // buf2 应该看到相同的值
  return buf2.readUInt8(0) === 123;
});

test('Buffer 和 Uint8Array 共享 ArrayBuffer 互相影响', () => {
  const ab = new ArrayBuffer(5);
  const buf = Buffer.from(ab);
  const u8 = new Uint8Array(ab);
  
  buf.writeUInt8(99, 0);
  u8[1] = 88;
  
  return buf.readUInt8(0) === 99 && buf.readUInt8(1) === 88;
});

// offset 为字符串数字的变体
test('offset = "0x1"（十六进制字符串，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 200]);
    buf.readUInt8("0x1");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = "1.0"（浮点数字符串，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 200]);
    buf.readUInt8("1.0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = " 1 "（带空格的数字字符串，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 200]);
    buf.readUInt8(" 1 ");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 读取后立即修改
test('读取后立即修改同一位置再读取', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(100, 1);
  const v1 = buf.readUInt8(1);
  buf.writeUInt8(200, 1);
  const v2 = buf.readUInt8(1);
  return v1 === 100 && v2 === 200;
});

// 连续多次修改和读取
test('快速连续修改和读取循环', () => {
  const buf = Buffer.alloc(1);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt8(i % 256, 0);
    if (buf.readUInt8(0) !== i % 256) return false;
  }
  return true;
});

// Buffer 的 subarray 边界
test('subarray 的起始位置读取', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(2);
  return sub.readUInt8(0) === 30;
});

test('subarray 的结束边界读取', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(1, 4);
  return sub.readUInt8(2) === 40 && sub.length === 3;
});

test('空 subarray 读取（应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20, 30]);
    const sub = buf.subarray(2, 2); // 空 subarray
    sub.readUInt8(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊的数值组合
test('读取所有偶数值', () => {
  const buf = Buffer.from([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== i * 2) return false;
  }
  return true;
});

test('读取所有奇数值', () => {
  const buf = Buffer.from([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== i * 2 + 1) return false;
  }
  return true;
});

// 读取二进制计数模式
test('读取二进制递增模式（0-15）', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  for (let i = 0; i < 16; i++) {
    if (buf.readUInt8(i) !== i) return false;
  }
  return true;
});

// 灰度码测试
test('读取格雷码序列', () => {
  const grayCode = [0, 1, 3, 2, 6, 7, 5, 4];
  const buf = Buffer.from(grayCode);
  for (let i = 0; i < grayCode.length; i++) {
    if (buf.readUInt8(i) !== grayCode[i]) return false;
  }
  return true;
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
