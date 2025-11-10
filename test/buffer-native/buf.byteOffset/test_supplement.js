// buf.byteOffset - 补充测试（额外覆盖场景）
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

// ========== Part 1: Buffer.allocUnsafe 和 Buffer.allocUnsafeSlow ==========

test('Buffer.allocUnsafe - byteOffset 是数字类型', () => {
  const buf = Buffer.allocUnsafe(10);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('Buffer.allocUnsafe - byteOffset 非负整数', () => {
  const buf = Buffer.allocUnsafe(100);
  return Number.isInteger(buf.byteOffset) && buf.byteOffset >= 0;
});

test('Buffer.allocUnsafeSlow - byteOffset 是数字类型', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('Buffer.allocUnsafeSlow - byteOffset 为 0', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf.byteOffset === 0;
});

test('Buffer.allocUnsafe(0) - byteOffset 为 0', () => {
  const buf = Buffer.allocUnsafe(0);
  return buf.byteOffset === 0;
});

test('Buffer.allocUnsafeSlow(0) - byteOffset 为 0', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.byteOffset === 0;
});

test('Buffer.allocUnsafe slice - offset 累积正确', () => {
  const buf = Buffer.allocUnsafe(20);
  const slice = buf.slice(5);
  return slice.byteOffset === buf.byteOffset + 5;
});

test('Buffer.allocUnsafeSlow slice - offset 累积正确', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  const slice = buf.slice(5);
  return slice.byteOffset === buf.byteOffset + 5;
});

// ========== Part 2: BigInt TypedArray 相关 ==========
// 注意：Node.js 不支持直接从 BigInt TypedArray 创建 Buffer，会抛出错误

test('从 BigInt64Array 创建 - 应该抛出错误', () => {
  try {
    const ab = new ArrayBuffer(80);
    const bi64 = new BigInt64Array(ab, 16);
    const buf = Buffer.from(bi64);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('从 BigUint64Array 创建 - 应该抛出错误', () => {
  try {
    const ab = new ArrayBuffer(80);
    const bu64 = new BigUint64Array(ab, 16);
    const buf = Buffer.from(bu64);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('从 BigInt64Array 创建（有 offset）- 应该抛出错误', () => {
  try {
    const ab = new ArrayBuffer(80);
    const bi64 = new BigInt64Array(ab, 8, 5);
    const buf = Buffer.from(bi64);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

test('从 BigUint64Array 创建（有 offset）- 应该抛出错误', () => {
  try {
    const ab = new ArrayBuffer(80);
    const bu64 = new BigUint64Array(ab, 8, 5);
    const buf = Buffer.from(bu64);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('BigInt') || e.message.includes('mix');
  }
});

// ========== Part 3: DataView 共享 ArrayBuffer ==========

test('Buffer 和 DataView 共享 ArrayBuffer - byteOffset 不同', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 4, 10);
  const dv = new DataView(ab, 8, 8);
  return buf.byteOffset === 4 && dv.byteOffset === 8;
});

test('Buffer 和 DataView 共享 ArrayBuffer - 修改互通', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 0, 20);
  const dv = new DataView(ab, 5, 10);
  buf[5] = 99;
  return dv.getUint8(0) === 99 && buf.byteOffset === 0 && dv.byteOffset === 5;
});

test('从 Buffer 的 buffer 创建 DataView - offset 对应正确', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  return dv.byteOffset === buf.byteOffset && dv.byteLength === buf.length;
});

// ========== Part 4: slice 极端负数索引 ==========

test('slice 极大负数索引 - offset 为 0', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(-1000);
  return slice.byteOffset === buf.byteOffset + 0 && slice.length === 10;
});

test('slice 负数 start 和极大负数 end - offset 为 0', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(-5, -1000);
  return slice.byteOffset === buf.byteOffset + 5 && slice.length === 0;
});

test('subarray 极大负数索引 - offset 为 0', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(-1000);
  return sub.byteOffset === buf.byteOffset + 0 && sub.length === 10;
});

test('subarray 负数 start 和极大负数 end - offset 为 0', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(-5, -1000);
  return sub.byteOffset === buf.byteOffset + 5 && sub.length === 0;
});

test('从有 offset 的 Buffer slice 极大负数索引 - offset 正确', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  const slice = buf.slice(-1000);
  return slice.byteOffset === buf.byteOffset + 0 && slice.length === 10;
});

// ========== Part 5: 超出边界的正数索引 ==========

test('slice 超出边界的 start - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(100);
  return slice.byteOffset === buf.byteOffset + 10 && slice.length === 0;
});

test('slice 超出边界的 end - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(3, 100);
  return slice.byteOffset === buf.byteOffset + 3 && slice.length === 7;
});

test('subarray 超出边界的 start - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(100);
  return sub.byteOffset === buf.byteOffset + 10 && sub.length === 0;
});

test('subarray 超出边界的 end - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3, 100);
  return sub.byteOffset === buf.byteOffset + 3 && sub.length === 7;
});

test('从有 offset 的 Buffer slice 超出边界 - offset 正确', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  const slice = buf.slice(100);
  return slice.byteOffset === buf.byteOffset + 10 && slice.length === 0;
});

// ========== Part 6: Buffer.from 各种编码的 byteOffset ==========

test('从字符串（ascii）创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('hello', 'ascii');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从字符串（latin1）创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('hello', 'latin1');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从字符串（binary）创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('hello', 'binary');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从字符串（ucs2）创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从字符串（utf16le）创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从字符串（base64url）创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('aGVsbG8', 'base64url');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

// ========== Part 7: Buffer.concat 更多场景 ==========

test('Buffer.concat 单个 buffer - byteOffset 是数字类型', () => {
  const buf = Buffer.from('hello');
  const concat = Buffer.concat([buf]);
  return typeof concat.byteOffset === 'number' && concat.byteOffset >= 0;
});

test('Buffer.concat 多个有 offset 的 buffer - byteOffset 是数字类型', () => {
  const ab1 = new ArrayBuffer(10);
  const ab2 = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab1, 3);
  const buf2 = Buffer.from(ab2, 5);
  const concat = Buffer.concat([buf1, buf2]);
  return typeof concat.byteOffset === 'number' && concat.byteOffset >= 0;
});

test('Buffer.concat slice 后 - offset 正确', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const concat = Buffer.concat([buf1, buf2]);
  const slice = concat.slice(5);
  return slice.byteOffset === concat.byteOffset + 5;
});

// ========== Part 8: 多重 ArrayBuffer 创建链 ==========

test('从 ArrayBuffer 创建 Buffer，再 slice，再 from - offset 是数字类型', () => {
  const ab = new ArrayBuffer(20);
  const buf1 = Buffer.from(ab, 5);
  const slice = buf1.slice(3);
  const buf2 = Buffer.from(slice);
  return typeof buf2.byteOffset === 'number' && buf2.byteOffset >= 0;
});

test('从 Uint8Array 创建 Buffer，再 slice，再 from - offset 是数字类型', () => {
  const ab = new ArrayBuffer(20);
  const u8 = new Uint8Array(ab, 4);
  const buf1 = Buffer.from(u8);
  const slice = buf1.slice(2);
  const buf2 = Buffer.from(slice);
  return typeof buf2.byteOffset === 'number' && buf2.byteOffset >= 0;
});

// ========== Part 9: Uint8ClampedArray ==========

test('从 Uint8ClampedArray 创建 - byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(20);
  const u8c = new Uint8ClampedArray(ab, 4);
  const buf = Buffer.from(u8c);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从 Uint8ClampedArray 创建（有 offset）- byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(20);
  const u8c = new Uint8ClampedArray(ab, 4, 10);
  const buf = Buffer.from(u8c);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

// ========== Part 10: buffer 属性验证 ==========

test('Buffer 的 buffer 属性是 ArrayBuffer', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('从 ArrayBuffer 创建的 Buffer.buffer 是同一个对象', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return buf.buffer === ab;
});

test('从 ArrayBuffer（有 offset）创建的 Buffer.buffer 是同一个对象', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5);
  return buf.buffer === ab && buf.byteOffset === 5;
});

test('slice 后的 buffer 属性是同一个对象', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5);
  return slice.buffer === buf.buffer;
});

test('subarray 后的 buffer 属性是同一个对象', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(5);
  return sub.buffer === buf.buffer;
});

// ========== Part 11: NaN 和 undefined 索引 ==========

test('slice(NaN) - byteOffset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(NaN);
  return slice.byteOffset === buf.byteOffset + 0 && slice.length === 10;
});

test('slice(undefined) - byteOffset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(undefined);
  return slice.byteOffset === buf.byteOffset + 0 && slice.length === 10;
});

test('slice(5, NaN) - byteOffset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, NaN);
  // NaN 作为 end 参数时，被视为 0，所以 slice(5, 0) 返回空 buffer
  return slice.byteOffset === buf.byteOffset + 5 && slice.length === 0;
});

test('slice(5, undefined) - byteOffset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, undefined);
  return slice.byteOffset === buf.byteOffset + 5 && slice.length === 5;
});

test('subarray(NaN) - byteOffset 正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(NaN);
  return sub.byteOffset === buf.byteOffset + 0 && sub.length === 10;
});

test('subarray(undefined) - byteOffset 正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(undefined);
  return sub.byteOffset === buf.byteOffset + 0 && sub.length === 10;
});

// ========== Part 12: 小数索引 ==========

test('slice(3.7) - byteOffset 正确（向下取整）', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(3.7);
  return slice.byteOffset === buf.byteOffset + 3;
});

test('slice(3.2, 7.9) - byteOffset 正确（向下取整）', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(3.2, 7.9);
  return slice.byteOffset === buf.byteOffset + 3 && slice.length === 4;
});

test('subarray(3.7) - byteOffset 正确（向下取整）', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3.7);
  return sub.byteOffset === buf.byteOffset + 3;
});

test('subarray(3.2, 7.9) - byteOffset 正确（向下取整）', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3.2, 7.9);
  return sub.byteOffset === buf.byteOffset + 3 && sub.length === 4;
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

