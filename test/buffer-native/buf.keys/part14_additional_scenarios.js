// buf.keys() - Part 14: 额外场景补充测试
// 补充 ArrayBuffer、SharedArrayBuffer、极端场景等
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

// ArrayBuffer 相关测试
test('从 ArrayBuffer 创建的 Buffer keys() 正确', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  view[0] = 10;
  view[1] = 20;
  view[2] = 30;
  
  const buf = Buffer.from(ab);
  const keys = Array.from(buf.keys());
  return keys.length === 8 && keys[0] === 0 && keys[7] === 7;
});

test('从 ArrayBuffer 部分创建的 Buffer keys() 正确', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2, 5);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('Buffer 与 ArrayBuffer 共享内存时 keys() 正确', () => {
  const ab = new ArrayBuffer(5);
  const uint8 = new Uint8Array(ab);
  uint8[0] = 1;
  uint8[1] = 2;
  uint8[2] = 3;
  
  const buf = Buffer.from(ab);
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[2] === 2;
});

// Buffer.allocUnsafeSlow 测试
test('Buffer.allocUnsafeSlow 创建的 Buffer keys() 正确', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const keys = Array.from(buf.keys());
  return keys.length === 10 && keys[0] === 0 && keys[9] === 9;
});

test('Buffer.allocUnsafeSlow(0) 返回空迭代器', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  const keys = Array.from(buf.keys());
  return keys.length === 0;
});

// 不同 TypedArray 视图
test('Int8Array 视图的 Buffer keys() 正确', () => {
  const ab = new ArrayBuffer(4);
  const int8 = new Int8Array(ab);
  int8[0] = -1;
  int8[1] = -2;
  
  const buf = Buffer.from(ab);
  const keys = Array.from(buf.keys());
  return keys.length === 4 && keys[0] === 0;
});

test('Uint16Array 视图的 Buffer keys() 正确', () => {
  const ab = new ArrayBuffer(8);
  const uint16 = new Uint16Array(ab);
  uint16[0] = 256;
  
  const buf = Buffer.from(ab);
  const keys = Array.from(buf.keys());
  return keys.length === 8 && keys[7] === 7;
});

test('Float32Array 视图的 Buffer keys() 正确', () => {
  const ab = new ArrayBuffer(12);
  const float32 = new Float32Array(ab);
  float32[0] = 3.14;
  
  const buf = Buffer.from(ab);
  const keys = Array.from(buf.keys());
  return keys.length === 12 && keys[0] === 0 && keys[11] === 11;
});

// 极端大小测试
test('Buffer 大小为 1 字节', () => {
  const buf = Buffer.alloc(1);
  const keys = Array.from(buf.keys());
  return keys.length === 1 && keys[0] === 0;
});

test('Buffer 大小为 2 字节', () => {
  const buf = Buffer.alloc(2);
  const keys = Array.from(buf.keys());
  return keys.length === 2 && keys[0] === 0 && keys[1] === 1;
});

test('Buffer 大小为 65536 字节', () => {
  const buf = Buffer.alloc(65536);
  const keys = Array.from(buf.keys());
  return keys.length === 65536 && keys[0] === 0 && keys[65535] === 65535;
});

// 迭代器与 WeakMap/WeakSet（迭代器是对象，可以作为键）
test('迭代器可以作为 WeakMap 的键', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const wm = new WeakMap();
  wm.set(iter, 'test');
  return wm.get(iter) === 'test';
});

test('迭代器可以添加到 WeakSet', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  const ws = new WeakSet();
  ws.add(iter);
  return ws.has(iter);
});

// 特殊编码和内容
test('包含 UTF-8 多字节字符的 Buffer keys() 正确', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  const keys = Array.from(buf.keys());
  // '你好世界' 在 UTF-8 中是 12 字节
  return keys.length === 12 && keys[0] === 0 && keys[11] === 11;
});

test('包含 emoji 的 Buffer keys() 正确', () => {
  const buf = Buffer.from('😀', 'utf8');
  const keys = Array.from(buf.keys());
  // emoji 在 UTF-8 中是 4 字节
  return keys.length === 4 && keys[0] === 0 && keys[3] === 3;
});

test('Latin1 编码的 Buffer keys() 正确', () => {
  const buf = Buffer.from('hello', 'latin1');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0;
});

test('ASCII 编码的 Buffer keys() 正确', () => {
  const buf = Buffer.from('test', 'ascii');
  const keys = Array.from(buf.keys());
  return keys.length === 4 && keys[3] === 3;
});

// Buffer 方法链式调用
test('Buffer.concat 后立即调用 keys()', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const keys = Array.from(Buffer.concat([buf1, buf2]).keys());
  return keys.length === 4 && keys[0] === 0 && keys[3] === 3;
});

test('Buffer.slice 后立即调用 keys()', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.slice(1, 4).keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

// 迭代器与数组方法
test('使用 reduce 处理迭代器结果', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  const sum = keys.reduce((acc, key) => acc + key, 0);
  return sum === 3; // 0 + 1 + 2
});

test('使用 filter 过滤迭代器结果', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const keys = Array.from(buf.keys());
  const evenKeys = keys.filter(k => k % 2 === 0);
  return evenKeys.length === 3 && evenKeys[0] === 0 && evenKeys[2] === 4;
});

test('使用 map 转换迭代器结果', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  const squared = keys.map(k => k * k);
  return squared[0] === 0 && squared[1] === 1 && squared[2] === 4;
});

// 迭代器状态边界
test('空迭代器多次调用 next()', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.keys();
  const r1 = iter.next();
  const r2 = iter.next();
  const r3 = iter.next();
  return r1.done && r2.done && r3.done &&
         r1.value === undefined && r2.value === undefined && r3.value === undefined;
});

test('单元素迭代器状态转换', () => {
  const buf = Buffer.from([100]);
  const iter = buf.keys();
  const r1 = iter.next();
  const r2 = iter.next();
  return r1.done === false && r1.value === 0 &&
         r2.done === true && r2.value === undefined;
});

// 输出结果
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
