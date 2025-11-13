// buf.byteOffset - 深度边界条件和高级场景测试
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

// ========== Part 1: 内存对齐和性能相关 ==========

test('2的幂次方 offset 对齐测试', () => {
  const ab = new ArrayBuffer(64);
  const offsets = [0, 1, 2, 4, 8, 16, 32];
  return offsets.every(offset => {
    const buf = Buffer.from(ab, offset, 8);
    return buf.byteOffset === offset;
  });
});

test('非对齐 offset 的性能一致性', () => {
  const ab = new ArrayBuffer(100);
  const buf1 = Buffer.from(ab, 0, 50); // 对齐
  const buf2 = Buffer.from(ab, 1, 50); // 非对齐
  const buf3 = Buffer.from(ab, 3, 50); // 非对齐
  return buf1.byteOffset === 0 && buf2.byteOffset === 1 && buf3.byteOffset === 3;
});

test('大 ArrayBuffer 的 offset 边界', () => {
  const size = 1024 * 1024; // 1MB
  const ab = new ArrayBuffer(size);
  const buf = Buffer.from(ab, size - 1, 1);
  return buf.byteOffset === size - 1 && buf.length === 1;
});

test('极小 slice 的 offset 累积', () => {
  const buf = Buffer.alloc(1000);
  let current = buf;
  for (let i = 0; i < 500; i++) {
    current = current.slice(1);
  }
  return current.byteOffset === buf.byteOffset + 500 && current.length === 500;
});

// ========== Part 2: 复杂的 TypedArray 交互 ==========

test('多种 TypedArray 混合创建 Buffer', () => {
  const ab = new ArrayBuffer(64);
  const u8 = new Uint8Array(ab, 0, 16);
  const u16 = new Uint16Array(ab, 16, 8);
  const u32 = new Uint32Array(ab, 32, 8);
  const f32 = new Float32Array(ab, 48, 4);
  
  const buf1 = Buffer.from(u8);
  const buf2 = Buffer.from(u16);
  const buf3 = Buffer.from(u32);
  const buf4 = Buffer.from(f32);
  
  return typeof buf1.byteOffset === 'number' && buf1.byteOffset >= 0 &&
         typeof buf2.byteOffset === 'number' && buf2.byteOffset >= 0 &&
         typeof buf3.byteOffset === 'number' && buf3.byteOffset >= 0 &&
         typeof buf4.byteOffset === 'number' && buf4.byteOffset >= 0;
});

test('TypedArray 的 byteOffset 不影响 Buffer.from', () => {
  const ab = new ArrayBuffer(20);
  const u8_offset = new Uint8Array(ab, 5, 10);
  const buf = Buffer.from(u8_offset);
  // Buffer.from(TypedArray) 创建新 Buffer，不继承 TypedArray 的 byteOffset
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0 && buf.byteOffset !== u8_offset.byteOffset;
});

test('从 TypedArray 创建 Buffer 后 slice', () => {
  const ab = new ArrayBuffer(20);
  const u8 = new Uint8Array(ab, 4, 12);
  const buf = Buffer.from(u8);
  const slice = buf.slice(3, 9);
  return slice.byteOffset === buf.byteOffset + 3 && slice.length === 6;
});

test('复杂的 TypedArray 链式操作', () => {
  const ab = new ArrayBuffer(40);
  const u8 = new Uint8Array(ab, 8, 24);
  const buf1 = Buffer.from(u8);
  const slice1 = buf1.slice(4, 16);
  const buf2 = Buffer.from(slice1);
  const slice2 = buf2.slice(2, 10);
  return typeof slice2.byteOffset === 'number' && slice2.byteOffset >= 0;
});

// ========== Part 3: 并发和异步场景 ==========

test('异步环境中的 byteOffset 一致性', async () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5);
  const originalOffset = buf.byteOffset;
  
  await new Promise(resolve => setTimeout(resolve, 1));
  
  return buf.byteOffset === originalOffset;
});

test('Promise 中的 byteOffset 操作', () => {
  return new Promise((resolve) => {
    const ab = new ArrayBuffer(20);
    const buf = Buffer.from(ab, 3);
    const slice = buf.slice(2);
    resolve(slice.byteOffset === 5);
  });
});

test('多个 Buffer 并发操作 byteOffset', () => {
  const ab = new ArrayBuffer(100);
  const buffers = [];
  for (let i = 0; i < 10; i++) {
    buffers.push(Buffer.from(ab, i * 10, 10));
  }
  return buffers.every((buf, index) => buf.byteOffset === index * 10);
});

// ========== Part 4: 内存压力测试 ==========

test('大量 slice 操作的 byteOffset 稳定性', () => {
  const buf = Buffer.alloc(10000);
  const slices = [];
  for (let i = 0; i < 100; i++) {
    slices.push(buf.slice(i * 100, (i + 1) * 100));
  }
  return slices.every((slice, index) => slice.byteOffset === buf.byteOffset + index * 100);
});

test('深度嵌套 slice 的 byteOffset', () => {
  let buf = Buffer.alloc(1000);
  for (let i = 0; i < 100; i++) {
    buf = buf.slice(1);
  }
  return buf.byteOffset === 100 && buf.length === 900;
});

test('交替 slice 和 subarray 的 byteOffset', () => {
  let buf = Buffer.alloc(100);
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      buf = buf.slice(2);
    } else {
      buf = buf.subarray(2);
    }
  }
  return buf.byteOffset === 20 && buf.length === 80;
});

// ========== Part 5: 特殊编码和字符处理 ==========

test('Unicode 字符 Buffer 的 byteOffset', () => {
  const unicodeStr = '🚀🎉🌟💻🔥'; // 5个emoji，每个4字节
  const buf = Buffer.from(unicodeStr, 'utf8');
  const slice = buf.slice(4); // 跳过第一个emoji
  return slice.byteOffset === buf.byteOffset + 4;
});

test('混合编码 Buffer 的 byteOffset', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('world', 'ascii');
  const buf3 = Buffer.from('test', 'latin1');
  const concat = Buffer.concat([buf1, buf2, buf3]);
  const slice = concat.slice(5); // 跳过 'hello'
  return slice.byteOffset === concat.byteOffset + 5;
});

test('base64 解码后的 Buffer byteOffset', () => {
  const base64 = Buffer.from('aGVsbG8gd29ybGQ=', 'base64'); // 'hello world'
  const slice = base64.slice(6); // 跳过 'hello '
  return slice.byteOffset === base64.byteOffset + 6;
});

test('hex 解码后的 Buffer byteOffset', () => {
  const hex = Buffer.from('48656c6c6f20576f726c64', 'hex'); // 'Hello World'
  const slice = hex.slice(6); // 跳过 'Hello '
  return slice.byteOffset === hex.byteOffset + 6;
});

// ========== Part 6: 错误恢复和边界情况 ==========

test('错误后的 byteOffset 状态恢复', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3);
  try {
    Buffer.from(ab, 15); // 这会抛出错误
  } catch (e) {
    // 忽略错误
  }
  return buf.byteOffset === 3; // 原有 Buffer 不受影响
});

test('异常情况下的 slice byteOffset', () => {
  const buf = Buffer.alloc(10);
  const slice1 = buf.slice(100); // 超出边界
  const slice2 = buf.slice(-100); // 负数超出边界
  return slice1.byteOffset === buf.byteOffset + 10 && slice1.length === 0 &&
         slice2.byteOffset === buf.byteOffset + 0 && slice2.length === 10;
});

test('多重错误边界的 byteOffset', () => {
  const buf = Buffer.alloc(5);
  const slice1 = buf.slice(10, 20); // start 和 end 都超出边界
  const slice2 = buf.slice(-10, -5); // start 和 end 都是负数超出边界
  return slice1.byteOffset === buf.byteOffset + 5 && slice1.length === 0 &&
         slice2.byteOffset === buf.byteOffset + 0 && slice2.length === 0;
});

// ========== Part 7: 数学精确性测试 ==========

test('二进制表示的 offset', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 0b1000); // 8
  return buf.byteOffset === 8;
});

test('八进制表示的 offset', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 0o10); // 8
  return buf.byteOffset === 8;
});

test('十六进制表示的 offset', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 0x8); // 8
  return buf.byteOffset === 8;
});

test('科学计数法的 offset', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5e0); // 5
  return buf.byteOffset === 5;
});

test('负零的 offset', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, -0);
  return buf.byteOffset === 0 && Object.is(buf.byteOffset, 0);
});

test('最大安全整数作为 offset', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, Number.MAX_SAFE_INTEGER);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('最小安全整数作为 offset', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, Number.MIN_SAFE_INTEGER);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
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
