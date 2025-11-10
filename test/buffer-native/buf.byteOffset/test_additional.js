// buf.byteOffset - 额外测试（内存池和其他特殊场景）
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

// ========== Part 1: Buffer.poolSize 相关测试 ==========

test('小于 Buffer.poolSize 的 Buffer.allocUnsafe - byteOffset 可能非零', () => {
  // Node.js 默认 Buffer.poolSize = 8192
  // 小于这个大小的 allocUnsafe 会从内存池分配，可能有非零 offset
  const buf = Buffer.allocUnsafe(100);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('大于 Buffer.poolSize 的 Buffer.allocUnsafe - byteOffset 通常为 0', () => {
  // 大于 poolSize 的 buffer 会单独分配，byteOffset 通常是 0
  const buf = Buffer.allocUnsafe(10000);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('Buffer.allocUnsafeSlow - 始终单独分配，byteOffset 为 0', () => {
  // allocUnsafeSlow 总是单独分配，不使用内存池
  const buf = Buffer.allocUnsafeSlow(100);
  return buf.byteOffset === 0;
});

test('连续的小 Buffer.allocUnsafe - byteOffset 可能递增', () => {
  // 连续分配小 buffer 时，它们来自同一个内存池，offset 可能递增
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  const buf3 = Buffer.allocUnsafe(10);
  // 验证它们都有有效的 byteOffset
  return typeof buf1.byteOffset === 'number' && buf1.byteOffset >= 0 &&
         typeof buf2.byteOffset === 'number' && buf2.byteOffset >= 0 &&
         typeof buf3.byteOffset === 'number' && buf3.byteOffset >= 0;
});

test('Buffer.alloc - 小 buffer 也可能从内存池分配', () => {
  const buf = Buffer.alloc(100);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('Buffer.alloc - 大 buffer byteOffset 通常为 0', () => {
  const buf = Buffer.alloc(10000);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

// ========== Part 2: 与 TypedArray 共享内存的完整测试 ==========

test('从 Buffer.buffer 创建 TypedArray - 使用正确的 byteOffset', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  // 验证 TypedArray 的 byteOffset 与 Buffer 一致
  return u8.byteOffset === buf.byteOffset && u8.byteLength === buf.length;
});

test('从 Buffer.buffer 创建 TypedArray - 共享修改', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  buf[0] = 42;
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  return u8[0] === 42;
});

test('从 Buffer slice 的 buffer 创建 TypedArray - offset 正确', () => {
  const buf = Buffer.alloc(20);
  const slice = buf.slice(5, 15);
  const u8 = new Uint8Array(slice.buffer, slice.byteOffset, slice.length);
  slice[0] = 99;
  return u8[0] === 99 && u8.byteOffset === slice.byteOffset;
});

test('从有 offset 的 Buffer slice 创建 TypedArray - offset 累积', () => {
  const ab = new ArrayBuffer(30);
  const buf = Buffer.from(ab, 5);
  const slice = buf.slice(10);
  const u8 = new Uint8Array(slice.buffer, slice.byteOffset, slice.length);
  return u8.byteOffset === 15; // 5 + 10
});

test('多个 TypedArray 和 Buffer 共享同一 ArrayBuffer - offset 正确', () => {
  const ab = new ArrayBuffer(40);
  const buf1 = Buffer.from(ab, 0, 10);
  const buf2 = Buffer.from(ab, 10, 10);
  const buf3 = Buffer.from(ab, 20, 10);
  const u8_1 = new Uint8Array(ab, 0, 10);
  const u8_2 = new Uint8Array(ab, 10, 10);
  const u8_3 = new Uint8Array(ab, 20, 10);
  return buf1.byteOffset === 0 && u8_1.byteOffset === 0 &&
         buf2.byteOffset === 10 && u8_2.byteOffset === 10 &&
         buf3.byteOffset === 20 && u8_3.byteOffset === 20;
});

// ========== Part 3: Buffer 方法返回值的 byteOffset 验证 ==========

test('Buffer.fill 后 byteOffset 不变', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3);
  const originalOffset = buf.byteOffset;
  buf.fill(0);
  return buf.byteOffset === originalOffset;
});

test('Buffer.write 后 byteOffset 不变', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5);
  const originalOffset = buf.byteOffset;
  buf.write('hello');
  return buf.byteOffset === originalOffset;
});

test('Buffer.copy 到有 offset 的 Buffer - offset 不变', () => {
  const ab = new ArrayBuffer(20);
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(ab, 5);
  const originalOffset = buf2.byteOffset;
  buf1.copy(buf2);
  return buf2.byteOffset === originalOffset;
});

test('Buffer.swap16 后 byteOffset 不变', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2, 4);
  buf[0] = 0x12;
  buf[1] = 0x34;
  buf[2] = 0x56;
  buf[3] = 0x78;
  const originalOffset = buf.byteOffset;
  buf.swap16();
  return buf.byteOffset === originalOffset;
});

test('Buffer.swap32 后 byteOffset 不变', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2, 4);
  buf[0] = 0x12;
  buf[1] = 0x34;
  buf[2] = 0x56;
  buf[3] = 0x78;
  const originalOffset = buf.byteOffset;
  buf.swap32();
  return buf.byteOffset === originalOffset;
});

test('Buffer.swap64 后 byteOffset 不变', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab, 4, 8);
  for (let i = 0; i < 8; i++) {
    buf[i] = i;
  }
  const originalOffset = buf.byteOffset;
  buf.swap64();
  return buf.byteOffset === originalOffset;
});

test('Buffer.reverse 后 byteOffset 不变', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3);
  const originalOffset = buf.byteOffset;
  buf.reverse();
  return buf.byteOffset === originalOffset;
});

// ========== Part 4: 不同 offset 对齐的 TypedArray ==========

test('从 Buffer 创建 Uint16Array - offset 必须对齐到 2', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 4, 10); // offset=4, 对齐到 2
  const u16 = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);
  return u16.byteOffset === buf.byteOffset;
});

test('从 Buffer 创建 Uint32Array - offset 必须对齐到 4', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 4, 12); // offset=4, 对齐到 4
  const u32 = new Uint32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  return u32.byteOffset === buf.byteOffset;
});

test('从 Buffer 创建 Float64Array - offset 必须对齐到 8', () => {
  const ab = new ArrayBuffer(32);
  const buf = Buffer.from(ab, 8, 16); // offset=8, 对齐到 8
  const f64 = new Float64Array(buf.buffer, buf.byteOffset, buf.length / 8);
  return f64.byteOffset === buf.byteOffset;
});

test('从未对齐 offset 的 Buffer 创建 Uint16Array - 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(20);
    const buf = Buffer.from(ab, 5, 10); // offset=5, 未对齐到 2
    new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('aligned') || e.message.includes('multiple');
  }
});

test('从未对齐 offset 的 Buffer 创建 Uint32Array - 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(20);
    const buf = Buffer.from(ab, 5, 12); // offset=5, 未对齐到 4
    new Uint32Array(buf.buffer, buf.byteOffset, buf.length / 4);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('aligned') || e.message.includes('multiple');
  }
});

// ========== Part 5: Buffer.compare 和 byteOffset ==========

test('Buffer.compare 比较有不同 offset 的 Buffer', () => {
  const ab = new ArrayBuffer(20);
  const buf1 = Buffer.from(ab, 0, 5);
  const buf2 = Buffer.from(ab, 5, 5);
  buf1.fill(1);
  buf2.fill(2);
  // 比较内容，不受 byteOffset 影响
  return Buffer.compare(buf1, buf2) !== 0;
});

test('Buffer.equals 比较有不同 offset 的相同内容', () => {
  const ab1 = new ArrayBuffer(10);
  const ab2 = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab1, 0, 5);
  const buf2 = Buffer.from(ab2, 5, 5);
  buf1.fill(42);
  buf2.fill(42);
  // 内容相同，byteOffset 不影响比较
  return buf1.equals(buf2);
});

// ========== Part 6: Buffer 与 JSON 序列化 ==========

test('Buffer.toJSON 不包含 byteOffset 信息', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5, 3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const json = buf.toJSON();
  // JSON 只包含 type 和 data，不包含 byteOffset
  return json.type === 'Buffer' && json.data.length === 3 && !json.hasOwnProperty('byteOffset');
});

test('从 JSON 恢复的 Buffer - byteOffset 为 0 或非负', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab, 5, 3);
  buf1[0] = 1;
  buf1[1] = 2;
  buf1[2] = 3;
  const json = buf1.toJSON();
  const buf2 = Buffer.from(json.data);
  return typeof buf2.byteOffset === 'number' && buf2.byteOffset >= 0;
});

// ========== Part 7: Buffer.isBuffer 和 byteOffset ==========

test('Buffer.isBuffer 对有 offset 的 Buffer 返回 true', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5);
  return Buffer.isBuffer(buf) && buf.byteOffset === 5;
});

test('Buffer.isBuffer 对 slice 返回 true', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5);
  return Buffer.isBuffer(slice) && typeof slice.byteOffset === 'number';
});

test('Buffer.isBuffer 对 TypedArray 返回 false', () => {
  const ab = new ArrayBuffer(10);
  const u8 = new Uint8Array(ab, 5);
  return !Buffer.isBuffer(u8) && u8.byteOffset === 5;
});

// ========== Part 8: 特殊字符和编码对 byteOffset 的影响 ==========

test('包含 emoji 的 Buffer - byteOffset 正确', () => {
  const buf = Buffer.from('🚀🎉', 'utf8');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('包含多字节字符的 Buffer slice - offset 累积正确', () => {
  const buf = Buffer.from('你好世界', 'utf8'); // 中文，每个字符 3 字节
  const slice = buf.slice(3); // 跳过第一个字符
  return slice.byteOffset === buf.byteOffset + 3;
});

test('utf16le 编码的 Buffer - byteOffset 正确', () => {
  const buf = Buffer.from('hello', 'utf16le');
  const slice = buf.slice(2); // 跳过 1 个字符（2 字节）
  return slice.byteOffset === buf.byteOffset + 2;
});

// ========== Part 9: Buffer.prototype 和 byteOffset ==========

test('Buffer.prototype 上访问 byteOffset 会抛出错误', () => {
  try {
    // 访问 Buffer.prototype.byteOffset 会抛出错误，因为它是 getter
    const val = Buffer.prototype.byteOffset;
    return false; // 不应该到达这里
  } catch (e) {
    return e.message.includes('incompatible') || e.message.includes('receiver');
  }
});

test('Buffer 实例的 byteOffset 不是继承的', () => {
  const buf = Buffer.alloc(5);
  return buf.hasOwnProperty('byteOffset') === false && typeof buf.byteOffset === 'number';
});

// ========== Part 10: 极端情况 ==========

test('Buffer.from(ArrayBuffer, 0, ArrayBuffer.byteLength) - byteOffset 为 0', () => {
  const ab = new ArrayBuffer(100);
  const buf = Buffer.from(ab, 0, ab.byteLength);
  return buf.byteOffset === 0 && buf.length === 100;
});

test('多次 slice 到最小 - byteOffset 累积到最大', () => {
  const buf = Buffer.alloc(100);
  let current = buf;
  for (let i = 0; i < 99; i++) {
    current = current.slice(1);
  }
  return current.byteOffset === buf.byteOffset + 99 && current.length === 1;
});

test('slice(0, length) - byteOffset 不变', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5);
  const slice = buf.slice(0, buf.length);
  return slice.byteOffset === buf.byteOffset && slice.length === buf.length;
});

test('subarray(0, length) - byteOffset 不变', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5);
  const sub = buf.subarray(0, buf.length);
  return sub.byteOffset === buf.byteOffset && sub.length === buf.length;
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

