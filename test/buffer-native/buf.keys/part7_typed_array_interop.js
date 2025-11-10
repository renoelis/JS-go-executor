// buf.keys() - Part 7: TypedArray 互操作性测试
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

// Uint8Array 互操作
test('Buffer 和 Uint8Array keys() 长度一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  
  const bufKeys = Array.from(buf.keys());
  const uint8Keys = Array.from(uint8.keys());
  
  return bufKeys.length === uint8Keys.length;
});

test('Buffer 和 Uint8Array keys() 值一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  
  const bufKeys = Array.from(buf.keys());
  const uint8Keys = Array.from(uint8.keys());
  
  return JSON.stringify(bufKeys) === JSON.stringify(uint8Keys);
});

test('共享底层 ArrayBuffer 的 keys() 一致', () => {
  const arrayBuffer = new ArrayBuffer(5);
  const buf = Buffer.from(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);
  
  const bufKeys = Array.from(buf.keys());
  const uint8Keys = Array.from(uint8.keys());
  
  return bufKeys.length === uint8Keys.length && bufKeys[0] === 0;
});

// 不同 TypedArray 类型
test('Uint16Array 视图长度不同', () => {
  const arrayBuffer = new ArrayBuffer(8);
  const buf = Buffer.from(arrayBuffer);
  const uint16 = new Uint16Array(arrayBuffer);
  
  const bufKeys = Array.from(buf.keys());
  const uint16Keys = Array.from(uint16.keys());
  
  return bufKeys.length === 8 && uint16Keys.length === 4;
});

test('Uint32Array 视图长度不同', () => {
  const arrayBuffer = new ArrayBuffer(8);
  const buf = Buffer.from(arrayBuffer);
  const uint32 = new Uint32Array(arrayBuffer);
  
  const bufKeys = Array.from(buf.keys());
  const uint32Keys = Array.from(uint32.keys());
  
  return bufKeys.length === 8 && uint32Keys.length === 2;
});

test('Int8Array 和 Buffer keys() 一致', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const int8 = new Int8Array(buf.buffer, buf.byteOffset, buf.length);
  
  const bufKeys = Array.from(buf.keys());
  const int8Keys = Array.from(int8.keys());
  
  return JSON.stringify(bufKeys) === JSON.stringify(int8Keys);
});

// Buffer.from(TypedArray)
test('从 Uint8Array 创建的 Buffer', () => {
  const uint8 = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.from(uint8);
  
  const keys = Array.from(buf.keys());
  return keys.length === 4 && keys[0] === 0 && keys[3] === 3;
});

test('从 Uint16Array 创建的 Buffer', () => {
  const uint16 = new Uint16Array([256, 512]);
  const buf = Buffer.from(uint16.buffer);
  
  const keys = Array.from(buf.keys());
  return keys.length === 4;
});

test('从 Int32Array 创建的 Buffer', () => {
  const int32 = new Int32Array([100, 200]);
  const buf = Buffer.from(int32.buffer);
  
  const keys = Array.from(buf.keys());
  return keys.length === 8;
});

// ArrayBuffer 偏移
test('带偏移的 Buffer keys() 从 0 开始', () => {
  const arrayBuffer = new ArrayBuffer(10);
  const buf = Buffer.from(arrayBuffer, 2, 5);
  
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0 && keys[4] === 4;
});

test('Uint8Array 偏移视图 keys() 从 0 开始', () => {
  const arrayBuffer = new ArrayBuffer(10);
  const uint8 = new Uint8Array(arrayBuffer, 3, 4);
  
  const keys = Array.from(uint8.keys());
  return keys.length === 4 && keys[0] === 0;
});

// DataView 比较
test('DataView 没有 keys() 方法', () => {
  const arrayBuffer = new ArrayBuffer(8);
  const dataView = new DataView(arrayBuffer);
  
  return typeof dataView.keys !== 'function';
});

test('Buffer 有 keys() 方法', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.keys === 'function';
});

// 修改底层数据
test('修改 ArrayBuffer 不影响已创建的迭代器', () => {
  const arrayBuffer = new ArrayBuffer(5);
  const buf = Buffer.from(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);
  
  const iter = buf.keys();
  iter.next();
  
  uint8[0] = 100;
  uint8[1] = 200;
  
  const remaining = Array.from(iter);
  return remaining.length === 4;
});

test('TypedArray 和 Buffer 共享数据但迭代器独立', () => {
  const arrayBuffer = new ArrayBuffer(5);
  const buf = Buffer.from(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);
  
  const bufIter = buf.keys();
  const uint8Iter = uint8.keys();
  
  bufIter.next();
  bufIter.next();
  
  const uint8First = uint8Iter.next().value;
  return uint8First === 0;
});

// 空 TypedArray
test('空 Uint8Array 和空 Buffer keys() 一致', () => {
  const buf = Buffer.alloc(0);
  const uint8 = new Uint8Array(0);
  
  const bufKeys = Array.from(buf.keys());
  const uint8Keys = Array.from(uint8.keys());
  
  return bufKeys.length === 0 && uint8Keys.length === 0;
});

// 大 TypedArray
test('大 Uint8Array 和大 Buffer keys() 一致', () => {
  const size = 1000;
  const buf = Buffer.alloc(size);
  const uint8 = new Uint8Array(size);
  
  const bufKeys = Array.from(buf.keys());
  const uint8Keys = Array.from(uint8.keys());
  
  return bufKeys.length === size && 
         uint8Keys.length === size && 
         bufKeys[999] === 999;
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
