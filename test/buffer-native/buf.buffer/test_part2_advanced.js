// buf.buffer - Advanced & Edge Case Tests (Part 2)
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

// ========== 测试 byteOffset 和 buffer 的关系 ==========

test('buffer 与 byteOffset 配合使用', () => {
  const buf = Buffer.alloc(20);
  const slice = buf.slice(5, 15);
  // slice 的 byteOffset 应该指向在原始 ArrayBuffer 中的偏移
  return slice.byteOffset >= 5 && slice.buffer instanceof ArrayBuffer;
});

test('从 ArrayBuffer 特定偏移创建 Buffer', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  return buf.buffer === ab && buf.byteOffset === 5 && buf.length === 10;
});

test('subarray 共享相同 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  return sub.buffer === buf.buffer && sub.byteOffset > buf.byteOffset;
});

// ========== 不同创建方式的 buffer 属性 ==========

test('Buffer.from(string) 的 buffer 属性', () => {
  const buf = Buffer.from('hello', 'utf8');
  return buf.buffer instanceof ArrayBuffer && buf.buffer.byteLength >= buf.length;
});

test('Buffer.from(array) 的 buffer 属性', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer.allocUnsafe 的 buffer 属性', () => {
  const buf = Buffer.allocUnsafe(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer.concat 结果的 buffer 属性', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concat = Buffer.concat([buf1, buf2]);
  return concat.buffer instanceof ArrayBuffer && concat.length === 4;
});

// ========== TypedArray 互操作 ==========

test('Uint8Array 和 Buffer 共享同一 ArrayBuffer', () => {
  const ab = new ArrayBuffer(10);
  const u8 = new Uint8Array(ab);
  const buf = Buffer.from(ab);
  return buf.buffer === ab && buf.buffer === u8.buffer;
});

test('从 TypedArray 创建 Buffer 的 buffer 属性', () => {
  const u8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(u8);
  // 注意：Buffer.from(TypedArray) 可能会复制数据
  return buf.buffer instanceof ArrayBuffer;
});

test('修改共享 ArrayBuffer 影响所有视图', () => {
  const ab = new ArrayBuffer(5);
  const buf = Buffer.from(ab);
  const u8 = new Uint8Array(ab);
  buf[0] = 42;
  return u8[0] === 42;
});

// ========== 大型 Buffer 和内存池 ==========

test('小型 Buffer 可能使用内存池', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  // 小型 Buffer 可能共享同一个大的 ArrayBuffer（内存池）
  return buf1.buffer instanceof ArrayBuffer && buf2.buffer instanceof ArrayBuffer;
});

test('大型 Buffer 独立 ArrayBuffer', () => {
  const buf = Buffer.alloc(8192); // 大于内存池阈值
  return buf.buffer instanceof ArrayBuffer && buf.buffer.byteLength >= 8192;
});

// ========== 边界和极端情况 ==========

test('Buffer.alloc(1) 的 buffer 属性', () => {
  const buf = Buffer.alloc(1);
  return buf.buffer instanceof ArrayBuffer && buf.buffer.byteLength >= 1;
});

test('极大 Buffer 的 buffer 属性', () => {
  try {
    const buf = Buffer.alloc(100000);
    return buf.buffer instanceof ArrayBuffer && buf.buffer.byteLength >= 100000;
  } catch (e) {
    // 如果内存不足可能失败
    return false;
  }
});

test('多次 slice 的 buffer 属性', () => {
  const buf = Buffer.alloc(20);
  const slice1 = buf.slice(5, 15);
  const slice2 = slice1.slice(2, 7);
  return slice2.buffer === buf.buffer;
});

// ========== 属性描述符 ==========

test('buffer 属性存在于原型链', () => {
  const buf = Buffer.alloc(5);
  // buffer 属性应该存在于原型链中
  return 'buffer' in buf;
});

test('buffer 属性不在实例上', () => {
  const buf = Buffer.alloc(5);
  // buffer 应该是继承的属性，不是实例自有属性
  return !buf.hasOwnProperty('buffer');
});

test('buffer 属性不可枚举', () => {
  const buf = Buffer.alloc(5);
  const keys = Object.keys(buf);
  // buffer 不应该出现在 Object.keys 中
  return !keys.includes('buffer');
});

// ========== 特殊编码和数据 ==========

test('base64 编码 Buffer 的 buffer 属性', () => {
  const buf = Buffer.from('SGVsbG8gV29ybGQ=', 'base64');
  return buf.buffer instanceof ArrayBuffer;
});

test('hex 编码 Buffer 的 buffer 属性', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.buffer instanceof ArrayBuffer && buf.toString() === 'Hello';
});

test('包含 null 字节的 Buffer', () => {
  const buf = Buffer.from([0, 1, 0, 2, 0, 3]);
  return buf.buffer instanceof ArrayBuffer && buf.length === 6;
});

// ========== 复制 vs 共享 ==========

test('Buffer.from(Buffer) 复制数据但不共享 ArrayBuffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  buf2[0] = 99;
  // buf1 不应该被修改，因为是复制
  return buf1[0] === 1 && buf2[0] === 99;
});

test('slice 和原 Buffer 共享 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(1, 4);
  slice[0] = 99;
  // 原始 Buffer 应该被修改
  return buf[1] === 99 && buf.buffer === slice.buffer;
});

// ========== DataView 互操作 ==========

test('DataView 和 Buffer 共享 ArrayBuffer', () => {
  const buf = Buffer.alloc(8);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  dv.setInt32(0, 12345);
  return buf.readInt32BE(0) === 12345 || buf.readInt32LE(0) === 12345;
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

