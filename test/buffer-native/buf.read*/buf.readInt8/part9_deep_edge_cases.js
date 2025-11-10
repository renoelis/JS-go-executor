// buf.readInt8() - 深度边界测试
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

// Buffer 共享内存测试
test('slice 后共享底层数据，读取一致', () => {
  const buf = Buffer.from([100, 50, 25, 10]);
  const sliced = buf.slice(1, 3);
  const original = buf.readInt8(1);
  const fromSlice = sliced.readInt8(0);
  return original === fromSlice && fromSlice === 50;
});

test('subarray 后共享底层数据，修改后读取变化', () => {
  const buf = Buffer.from([100, 50, 25]);
  const sub = buf.subarray(1, 3);
  buf.writeInt8(-100, 1);
  return sub.readInt8(0) === -100;
});

test('修改原 Buffer 影响 slice', () => {
  const buf = Buffer.from([10, 20, 30]);
  const sliced = buf.slice(0, 2);
  buf.writeInt8(99, 0);
  return sliced.readInt8(0) === 99;
});

// TypedArray 互操作
test('从 Buffer 创建的 Uint8Array 视图读取', () => {
  const buf = Buffer.from([127, 128, 255]);
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  return u8[0] === 127 && u8[1] === 128 && u8[2] === 255;
});

test('修改 TypedArray 影响 Buffer 读取', () => {
  const buf = Buffer.from([100, 50]);
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  u8[0] = 200;
  return buf.readInt8(0) === -56; // 200 as signed int8 = -56
});

// 其他进制数字字面量
test('offset = 0b10（二进制 2，应抛出错误或接受）', () => {
  try {
    const buf = Buffer.from([10, 20, 30, 40]);
    const result = buf.readInt8(0b10);
    return result === 30; // offset = 2
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset = 0o10（八进制 8，应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20, 30]);
    buf.readInt8(0o10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = 0x02（十六进制 2）', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  return buf.readInt8(0x02) === 30;
});

test('offset = 0x10（十六进制 16，应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20]);
    buf.readInt8(0x10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 字符串数字
test('offset = "0"（字符串，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8("0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset = "2"（字符串，应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20, 30]);
    buf.readInt8("2");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 特殊对象作为 offset
test('offset = Buffer.from([0])（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(Buffer.from([0]));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = new Uint8Array([1])（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50, 25]);
    buf.readInt8(new Uint8Array([1]));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = Math（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(Math);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = JSON（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(JSON);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Set/Map 作为参数
test('offset = new Set([1])（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(new Set([1]));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset = new Map([[0, 1]])（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100, 50]);
    buf.readInt8(new Map([[0, 1]]));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Promise 作为参数
test('offset = Promise.resolve(0)（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(Promise.resolve(0));
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 显式正零
test('offset = +0（显式正零，应被接受）', () => {
  const buf = Buffer.from([123]);
  return buf.readInt8(+0) === 123;
});

test('+0 与 0 行为一致', () => {
  const buf = Buffer.from([99]);
  return buf.readInt8(+0) === buf.readInt8(0);
});

// 极小的非零浮点数
test('offset = 0.0000001（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(0.0000001);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -0.0000001（应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(-0.0000001);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 超大整数（接近 2^53）
test('offset = 9007199254740991（2^53-1，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(9007199254740991);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset = -9007199254740991（-(2^53-1)，应抛出错误）', () => {
  try {
    const buf = Buffer.from([100]);
    buf.readInt8(-9007199254740991);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 连续位置读取
test('顺序读取所有位置', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let allCorrect = true;
  for (let i = 0; i < 5; i++) {
    if (buf.readInt8(i) !== i + 1) {
      allCorrect = false;
      break;
    }
  }
  return allCorrect;
});

test('倒序读取所有位置', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const values = [10, 20, 30, 40, 50];
  let allCorrect = true;
  for (let i = 4; i >= 0; i--) {
    if (buf.readInt8(i) !== values[i]) {
      allCorrect = false;
      break;
    }
  }
  return allCorrect;
});

// 混合符号数据连续读取
test('混合正负数连续读取', () => {
  const buf = Buffer.from([127, 128, 0, 1, 255]);
  return buf.readInt8(0) === 127 &&
         buf.readInt8(1) === -128 &&
         buf.readInt8(2) === 0 &&
         buf.readInt8(3) === 1 &&
         buf.readInt8(4) === -1;
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
