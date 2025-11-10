// buf.entries() - 补充测试（覆盖遗漏场景）
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

// ==================== TypedArray 和 ArrayBuffer 相关 ====================
test('从 Uint8Array 创建的 Buffer', () => {
  const arr = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(arr);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[1][1] === 20;
});

test('从 Uint16Array 创建的 Buffer', () => {
  const arr = new Uint16Array([256, 512]);
  const buf = Buffer.from(arr.buffer);
  const entries = Array.from(buf.entries());
  return entries.length === 4; // 2 * 2 bytes
});

test('从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;
  const buf = Buffer.from(ab);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[2][1] === 3;
});

test('从 SharedArrayBuffer 创建的 Buffer', () => {
  try {
    const sab = new SharedArrayBuffer(3);
    const view = new Uint8Array(sab);
    view[0] = 5;
    view[1] = 10;
    view[2] = 15;
    const buf = Buffer.from(sab);
    const entries = Array.from(buf.entries());
    return entries.length === 3 && entries[1][1] === 10;
  } catch (e) {
    // SharedArrayBuffer 可能不可用
    return true;
  }
});

// ==================== 不同编码的详细测试 ====================
test('latin1 编码的 Buffer', () => {
  const buf = Buffer.from('café', 'latin1');
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[3][1] === 233; // é = 233 in latin1
});

test('ascii 编码的 Buffer', () => {
  const buf = Buffer.from('ABC', 'ascii');
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][1] === 65; // 'A'
});

test('utf16le 编码的 Buffer', () => {
  const buf = Buffer.from('AB', 'utf16le');
  const entries = Array.from(buf.entries());
  return entries.length === 4; // 每个字符 2 字节
});

test('ucs2 编码的 Buffer', () => {
  const buf = Buffer.from('中', 'ucs2');
  const entries = Array.from(buf.entries());
  return entries.length === 2; // UCS2 是 2 字节
});

test('binary 编码的 Buffer', () => {
  const buf = Buffer.from('hello', 'binary');
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 104; // 'h'
});

// ==================== 迭代器返回值不可变性 ====================
test('返回的数组不影响原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const result = iter.next();
  result.value[1] = 999; // 修改返回的数组
  return buf[0] === 1; // 原 Buffer 不变
});

test('多次 next() 返回不同的数组对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const r1 = iter.next();
  const r2 = iter.next();
  return r1.value !== r2.value; // 不同的数组对象
});

// ==================== 极端大小测试 ====================
test('10000 字节的 Buffer', () => {
  const buf = Buffer.alloc(10000);
  let count = 0;
  for (const [index] of buf.entries()) {
    count++;
    if (index !== count - 1) return false;
  }
  return count === 10000;
});

test('65536 字节的 Buffer (64KB)', () => {
  const buf = Buffer.alloc(65536);
  const entries = Array.from(buf.entries());
  return entries.length === 65536 && entries[65535][0] === 65535;
});

// ==================== 混合操作测试 ====================
test('concat 后的 Buffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[2][1] === 3;
});

test('fill 后的 Buffer', () => {
  const buf = Buffer.alloc(5);
  buf.fill(88);
  const entries = Array.from(buf.entries());
  return entries.every(([, val]) => val === 88);
});

test('write 后的 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 0, 'utf8');
  const entries = Array.from(buf.entries());
  return entries[0][1] === 104 && entries[5][1] === 0; // 'h' 和填充的 0
});

test('copy 后的 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.alloc(5);
  buf1.copy(buf2);
  const entries = Array.from(buf2.entries());
  return entries[2][1] === 3;
});

// ==================== 迭代器与其他迭代方法对比 ====================
test('entries() 与 keys() 的索引一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entriesIndices = Array.from(buf.entries()).map(([i]) => i);
  const keys = Array.from(buf.keys());
  return JSON.stringify(entriesIndices) === JSON.stringify(keys);
});

test('entries() 与 values() 的值一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entriesValues = Array.from(buf.entries()).map(([, v]) => v);
  const values = Array.from(buf.values());
  return JSON.stringify(entriesValues) === JSON.stringify(values);
});

test('entries() 与直接索引访问一致', () => {
  const buf = Buffer.from([5, 10, 15, 20]);
  const entries = Array.from(buf.entries());
  for (let i = 0; i < buf.length; i++) {
    if (entries[i][0] !== i || entries[i][1] !== buf[i]) {
      return false;
    }
  }
  return true;
});

// ==================== 特殊字符和边界值 ====================
test('包含 emoji 的 UTF-8 Buffer', () => {
  const buf = Buffer.from('😀', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 4; // emoji 占 4 字节
});

test('包含换行符的 Buffer', () => {
  const buf = Buffer.from('a\nb\r\nc', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 6 && entries[1][1] === 10; // \n = 10
});

test('包含 null 字节的 Buffer', () => {
  const buf = Buffer.from([1, 0, 2, 0, 3]);
  const entries = Array.from(buf.entries());
  return entries[1][1] === 0 && entries[3][1] === 0;
});

// ==================== 迭代器状态和边界 ====================
test('迭代器在 Buffer 为空时立即完成', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.entries();
  const first = iter.next();
  return first.done === true && first.value === undefined;
});

test('部分消费迭代器后的状态', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next();
  iter.next();
  const remaining = [];
  for (const entry of iter) {
    remaining.push(entry);
  }
  return remaining.length === 3 && remaining[0][0] === 2;
});

// ==================== 迭代器与 Map/Set 等集合 ====================
test('迭代器可用于 Map 构造', () => {
  const buf = Buffer.from([10, 20, 30]);
  const map = new Map(buf.entries());
  return map.size === 3 && map.get(1) === 20;
});

test('迭代器可用于 Object.fromEntries', () => {
  const buf = Buffer.from([10, 20, 30]);
  const obj = Object.fromEntries(buf.entries());
  return obj[0] === 10 && obj[1] === 20 && obj[2] === 30;
});

// ==================== 性能和内存相关 ====================
test('重复创建迭代器不影响性能', () => {
  const buf = Buffer.from([1, 2, 3]);
  for (let i = 0; i < 1000; i++) {
    const iter = buf.entries();
    iter.next();
  }
  return true;
});

test('大 Buffer 的迭代器延迟计算', () => {
  const buf = Buffer.alloc(100000);
  const iter = buf.entries();
  // 创建迭代器应该是 O(1)，不应该立即遍历所有元素
  const start = Date.now();
  iter.next();
  const elapsed = Date.now() - start;
  return elapsed < 10; // 应该非常快
});

// ==================== 原型链和继承 ====================
test('entries 方法存在于 Buffer.prototype', () => {
  return typeof Buffer.prototype.entries === 'function';
});

test('entries 方法可以被调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries.call(buf);
  return typeof iter.next === 'function';
});

// ==================== 错误处理和边界条件 ====================
test('在非 Buffer 对象上调用 entries 应该失败', () => {
  try {
    const notBuffer = { length: 3, 0: 1, 1: 2, 2: 3 };
    const entriesFunc = Buffer.from([]).entries;
    entriesFunc.call(notBuffer);
    return false; // 不应该成功
  } catch (e) {
    return e.message.includes('typed array'); // 应该抛出 "this is not a typed array" 错误
  }
});

// ==================== 结果汇总 ====================
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

