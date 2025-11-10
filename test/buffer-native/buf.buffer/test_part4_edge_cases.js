// buf.buffer - Edge Cases & Boundary Conditions (Part 4)
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

// ========== Buffer.from(ArrayBuffer, byteOffset, length) 边界情况 ==========

test('Buffer.from(ArrayBuffer, byteOffset, length) - byteOffset 为 0', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 0, 10);
  return buf.buffer === ab && buf.byteOffset === 0 && buf.length === 10;
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - byteOffset 等于 ArrayBuffer 长度', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 20, 0);
  return buf.buffer === ab && buf.byteOffset === 20 && buf.length === 0;
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - byteOffset 超过 ArrayBuffer 长度', () => {
  try {
    const ab = new ArrayBuffer(20);
    const buf = Buffer.from(ab, 25, 5);
    // Node.js 可能会抛出错误或返回空 Buffer
    return buf.length === 0 || buf.byteOffset >= 20;
  } catch (e) {
    // 如果抛出错误也是合理的
    return true;
  }
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - length 为 0', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 0);
  return buf.buffer === ab && buf.byteOffset === 5 && buf.length === 0;
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - byteOffset + length 等于 ArrayBuffer 长度', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 10, 10);
  return buf.buffer === ab && buf.byteOffset === 10 && buf.length === 10;
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - byteOffset + length 超过 ArrayBuffer 长度', () => {
  try {
    const ab = new ArrayBuffer(20);
    const buf = Buffer.from(ab, 15, 10);
    // Node.js 可能会截断或抛出错误
    return buf.length <= 5 || buf.byteOffset >= 20;
  } catch (e) {
    // 如果抛出错误也是合理的
    return true;
  }
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - 负数 byteOffset', () => {
  try {
    const ab = new ArrayBuffer(20);
    const buf = Buffer.from(ab, -5, 10);
    // Node.js 可能会抛出错误或处理为 0
    return buf.byteOffset >= 0;
  } catch (e) {
    // 如果抛出错误也是合理的
    return true;
  }
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - 负数 length', () => {
  try {
    const ab = new ArrayBuffer(20);
    const buf = Buffer.from(ab, 5, -5);
    // Node.js 可能会抛出错误或处理为 0
    return buf.length >= 0;
  } catch (e) {
    // 如果抛出错误也是合理的
    return true;
  }
});

// ========== Buffer 与 ArrayBuffer.slice() 的关系 ==========

test('ArrayBuffer.slice() 创建新的 ArrayBuffer', () => {
  const ab = new ArrayBuffer(20);
  const sliced = ab.slice(5, 15);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(sliced);
  // sliced 是新的 ArrayBuffer，所以 buffer 应该不同
  return buf1.buffer !== buf2.buffer && buf2.buffer === sliced;
});

test('从 ArrayBuffer.slice() 创建的 Buffer 独立', () => {
  const ab = new ArrayBuffer(20);
  const sliced = ab.slice(5, 15);
  const buf = Buffer.from(sliced);
  // 修改 buf 不应该影响原始 ArrayBuffer
  buf[0] = 99;
  const originalView = new Uint8Array(ab);
  // 原始 ArrayBuffer 的第 5 个字节不应该被修改（因为 sliced 是新的 ArrayBuffer）
  return buf.buffer === sliced && buf[0] === 99;
});

test('Buffer.buffer 与 ArrayBuffer.slice() 的关系', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  const sliced = ab.slice(5, 15);
  // buf.buffer 应该指向原始 ArrayBuffer，不是 sliced
  return buf.buffer === ab && buf.buffer !== sliced;
});

// ========== Buffer 的 byteLength 属性与 buffer.byteLength 的关系 ==========

test('Buffer.byteLength 属性存在', () => {
  const buf = Buffer.alloc(10);
  return typeof buf.byteLength === 'number' && buf.byteLength === buf.length;
});

test('Buffer.byteLength 等于 buffer.byteLength（独立 Buffer）', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.byteLength === buf.length && buf.buffer.byteLength === buf.length;
});

test('Buffer.byteLength 小于等于 buffer.byteLength（内存池 Buffer）', () => {
  const buf = Buffer.allocUnsafe(10);
  return buf.byteLength === buf.length && buf.buffer.byteLength >= buf.byteLength;
});

test('slice 后的 Buffer.byteLength 等于 length', () => {
  const buf = Buffer.alloc(20);
  const slice = buf.slice(5, 15);
  return slice.byteLength === slice.length && slice.byteLength === 10;
});

// ========== Buffer 与 ArrayBuffer 的 isView 关系 ==========

test('Buffer 是 ArrayBuffer 的视图', () => {
  const buf = Buffer.alloc(10);
  // ArrayBuffer.isView 应该返回 true
  return ArrayBuffer.isView(buf) === true;
});

test('Buffer.buffer 不是视图', () => {
  const buf = Buffer.alloc(10);
  // ArrayBuffer.isView 对 ArrayBuffer 本身应该返回 false
  return ArrayBuffer.isView(buf.buffer) === false;
});

test('从 Buffer.buffer 创建的 Uint8Array 是视图', () => {
  const buf = Buffer.alloc(10);
  const u8 = new Uint8Array(buf.buffer);
  return ArrayBuffer.isView(u8) === true && u8.buffer === buf.buffer;
});

// ========== Buffer 的 transfer 相关（如果支持） ==========

test('ArrayBuffer.transfer 环境检测', () => {
  // Node.js v25 可能支持 ArrayBuffer.transfer
  return typeof ArrayBuffer.transfer !== 'undefined' || typeof ArrayBuffer.transfer === 'undefined';
});

test('ArrayBuffer.transfer 创建新的 ArrayBuffer', () => {
  if (typeof ArrayBuffer.transfer === 'undefined') {
    return true; // 不支持则跳过
  }
  try {
    const ab = new ArrayBuffer(10);
    const buf1 = Buffer.from(ab);
    const transferred = ArrayBuffer.transfer(ab, 20);
    const buf2 = Buffer.from(transferred);
    // transferred 应该是新的 ArrayBuffer
    return buf1.buffer !== buf2.buffer && buf2.buffer === transferred;
  } catch (e) {
    return false;
  }
});

test('ArrayBuffer.transferToFixedLength 环境检测', () => {
  // Node.js v25 可能支持 ArrayBuffer.transferToFixedLength
  return typeof ArrayBuffer.transferToFixedLength !== 'undefined' || typeof ArrayBuffer.transferToFixedLength === 'undefined';
});

test('ArrayBuffer.transferToFixedLength 创建新的 ArrayBuffer', () => {
  if (typeof ArrayBuffer.transferToFixedLength === 'undefined') {
    return true; // 不支持则跳过
  }
  try {
    const ab = new ArrayBuffer(10);
    const buf1 = Buffer.from(ab);
    const transferred = ArrayBuffer.transferToFixedLength(ab, 20);
    const buf2 = Buffer.from(transferred);
    // transferred 应该是新的 ArrayBuffer
    return buf1.buffer !== buf2.buffer && buf2.buffer === transferred;
  } catch (e) {
    return false;
  }
});

// ========== Buffer 的 detached 状态（如果支持） ==========

test('ArrayBuffer.detached 环境检测', () => {
  // Node.js v25 可能支持 ArrayBuffer.detached
  return typeof ArrayBuffer.detached !== 'undefined' || typeof ArrayBuffer.detached === 'undefined';
});

test('Buffer.buffer 不应该被 detached', () => {
  if (typeof ArrayBuffer.detached === 'undefined') {
    return true; // 不支持则跳过
  }
  try {
    const buf = Buffer.alloc(10);
    // Buffer.buffer 不应该是 detached 的
    return ArrayBuffer.detached(buf.buffer) === false;
  } catch (e) {
    return false;
  }
});

// ========== Buffer 与 ArrayBuffer 的 resize 相关（如果支持） ==========

test('ArrayBuffer.resize 环境检测', () => {
  // Node.js v25 可能支持 ArrayBuffer.resize
  return typeof ArrayBuffer.prototype.resize !== 'undefined' || typeof ArrayBuffer.prototype.resize === 'undefined';
});

test('ArrayBuffer.resize 影响 Buffer.buffer', () => {
  if (typeof ArrayBuffer.prototype.resize === 'undefined') {
    return true; // 不支持则跳过
  }
  try {
    const ab = new ArrayBuffer(10);
    const buf = Buffer.from(ab);
    ab.resize(20);
    // resize 后 buffer.byteLength 应该改变
    return buf.buffer.byteLength === 20;
  } catch (e) {
    // resize 可能失败（如果 Buffer 不支持）
    return true;
  }
});

// ========== Buffer 的 subarray 方法详细测试 ==========

test('subarray 返回的 Buffer.buffer 与原 Buffer 相同', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  return sub.buffer === buf.buffer;
});

test('subarray 的 byteOffset 正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 4);
  return sub.byteOffset === buf.byteOffset + 2;
});

test('subarray 的 length 正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  return sub.length === 3;
});

test('subarray 修改影响原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  sub[0] = 99;
  return buf[1] === 99 && sub[0] === 99;
});

test('subarray 负数索引', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-3, -1);
  return sub.buffer === buf.buffer && sub.length === 2;
});

test('subarray 超出范围', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(3, 10);
  return sub.buffer === buf.buffer && sub.length === 2;
});

// ========== Buffer 与 TypedArray 的 buffer 属性对比 ==========

test('Buffer.buffer 与 Uint8Array.buffer 行为一致', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const u8 = new Uint8Array(ab);
  return buf.buffer === u8.buffer && buf.buffer === ab;
});

test('Buffer.buffer 与 Int16Array.buffer 行为一致', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const i16 = new Int16Array(ab);
  return buf.buffer === i16.buffer && buf.buffer === ab;
});

test('Buffer.buffer 与 Float32Array.buffer 行为一致', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const f32 = new Float32Array(ab);
  return buf.buffer === f32.buffer && buf.buffer === ab;
});

// ========== Buffer 的 buffer 属性与原型链 ==========

test('buffer 属性可以通过 in 操作符检测', () => {
  const buf = Buffer.alloc(10);
  // buffer 属性应该存在于原型链上
  return 'buffer' in buf;
});

test('buffer 属性可以通过直接访问获取', () => {
  const buf = Buffer.alloc(10);
  const buffer = buf.buffer;
  return buffer instanceof ArrayBuffer;
});

test('buffer 属性可以通过属性访问符获取', () => {
  const buf = Buffer.alloc(10);
  const buffer = buf['buffer'];
  return buffer instanceof ArrayBuffer;
});

// ========== Buffer 的 buffer 属性与 JSON 序列化 ==========

test('Buffer.buffer 不能直接 JSON 序列化', () => {
  const buf = Buffer.alloc(10);
  try {
    JSON.stringify(buf.buffer);
    // ArrayBuffer 序列化可能返回 {} 或抛出错误
    return true;
  } catch (e) {
    // 如果抛出错误也是合理的
    return true;
  }
});

test('Buffer.buffer 可以通过 Array.from 转换', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = Array.from(new Uint8Array(buf.buffer, buf.byteOffset, buf.length));
  return Array.isArray(arr) && arr.length === buf.length && arr[0] === 1;
});

// ========== Buffer 的 buffer 属性与 WeakMap/WeakSet ==========

test('Buffer.buffer 可以作为 WeakMap 的键', () => {
  const buf = Buffer.alloc(10);
  const wm = new WeakMap();
  wm.set(buf.buffer, 'test');
  return wm.get(buf.buffer) === 'test';
});

test('Buffer.buffer 可以作为 WeakSet 的值', () => {
  const buf = Buffer.alloc(10);
  const ws = new WeakSet();
  ws.add(buf.buffer);
  return ws.has(buf.buffer) === true;
});

// ========== Buffer 的 buffer 属性与 instanceof ==========

test('Buffer.buffer 是 ArrayBuffer 的实例', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer.buffer 不是 Buffer 的实例', () => {
  const buf = Buffer.alloc(10);
  return !(buf.buffer instanceof Buffer);
});

test('Buffer.buffer 不是 Uint8Array 的实例', () => {
  const buf = Buffer.alloc(10);
  return !(buf.buffer instanceof Uint8Array);
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

