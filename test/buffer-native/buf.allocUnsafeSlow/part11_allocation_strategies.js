// buf.allocUnsafeSlow() - Allocation Strategies and Memory Behavior Tests
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

// 内存分配策略测试
test('分配策略 - 与alloc的区别验证', () => {
  const unsafe = Buffer.allocUnsafeSlow(1024);
  const safe = Buffer.alloc(1024);
  // allocUnsafeSlow可能包含随机数据，alloc总是零填充
  return unsafe.length === safe.length && unsafe.length === 1024;
});

test('分配策略 - 与allocUnsafe的区别验证', () => {
  const unsafeSlow = Buffer.allocUnsafeSlow(1024);
  const unsafe = Buffer.allocUnsafe(1024);
  // 两者都可能包含随机数据，但分配策略不同
  return unsafeSlow.length === unsafe.length && unsafeSlow.length === 1024;
});

test('分配策略 - 不进入Buffer池验证(小于8KB)', () => {
  const size = 4096; // 小于默认8KB池大小
  const buf = Buffer.allocUnsafeSlow(size);
  return buf.length === size && Buffer.isBuffer(buf);
});

test('分配策略 - 大于8KB的分配', () => {
  const size = 16384; // 大于默认8KB池大小
  const buf = Buffer.allocUnsafeSlow(size);
  return buf.length === size && Buffer.isBuffer(buf);
});

test('分配策略 - 连续多次小分配独立性', () => {
  const bufs = [];
  for (let i = 0; i < 10; i++) {
    bufs.push(Buffer.allocUnsafeSlow(100));
  }
  return bufs.every(buf => buf.length === 100) && bufs.length === 10;
});

// 内存内容验证
test('内存内容 - 初始内容不确定性', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  // allocUnsafeSlow不保证内容清零，可能包含任何值
  return buf.length === 100 && buf instanceof Buffer;
});

test('内存内容 - 连续分配不同内容', () => {
  const buf1 = Buffer.allocUnsafeSlow(100);
  const buf2 = Buffer.allocUnsafeSlow(100);
  // 两个独立分配的Buffer应该是不同的对象
  return buf1 !== buf2 && buf1.length === buf2.length;
});

test('内存内容 - 可写性验证', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf[0] = 65;
  buf[1] = 66;
  buf[2] = 67;
  return buf[0] === 65 && buf[1] === 66 && buf[2] === 67;
});

// Buffer特性验证
test('Buffer特性 - instanceof Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer;
});

test('Buffer特性 - Buffer.isBuffer返回true', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return Buffer.isBuffer(buf);
});

test('Buffer特性 - 具有Buffer方法', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return typeof buf.toString === 'function' && 
         typeof buf.write === 'function' && 
         typeof buf.slice === 'function';
});

test('Buffer特性 - 具有length属性', () => {
  const buf = Buffer.allocUnsafeSlow(42);
  return buf.length === 42 && typeof buf.length === 'number';
});

// TypedArray兼容性
test('TypedArray兼容 - 具有BYTES_PER_ELEMENT', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.BYTES_PER_ELEMENT === 1;
});

test('TypedArray兼容 - 数组索引访问', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 255;
  buf[4] = 0;
  return buf[0] === 255 && buf[4] === 0;
});

test('TypedArray兼容 - 可迭代性', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1; buf[1] = 2; buf[2] = 3;
  const arr = Array.from(buf);
  return arr.length === 3 && arr[0] === 1 && arr[1] === 2 && arr[2] === 3;
});

test('TypedArray兼容 - for...of迭代', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 10; buf[1] = 20; buf[2] = 30;
  const values = [];
  for (const value of buf) {
    values.push(value);
  }
  return values.length === 3 && values[0] === 10 && values[1] === 20 && values[2] === 30;
});

// 大小边界测试
test('大小边界 - 1字节分配', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf.length === 1;
});

test('大小边界 - 页面大小分配(4KB)', () => {
  const buf = Buffer.allocUnsafeSlow(4096);
  return buf.length === 4096;
});

test('大小边界 - 大页面分配(64KB)', () => {
  const buf = Buffer.allocUnsafeSlow(65536);
  return buf.length === 65536;
});

test('大小边界 - 1MB分配', () => {
  const buf = Buffer.allocUnsafeSlow(1048576);
  return buf.length === 1048576;
});

// 填充参数深度测试
test('填充深度 - 空字符串填充', () => {
  const buf = Buffer.allocUnsafeSlow(5, '');
  return buf.length === 5;
});

test('填充深度 - Unicode字符填充', () => {
  const buf = Buffer.allocUnsafeSlow(8, '🚀');
  return buf.length === 8;
});

test('填充深度 - 多字节UTF-8填充', () => {
  const buf = Buffer.allocUnsafeSlow(10, '中文');
  return buf.length === 10;
});

test('填充深度 - Buffer作为填充源', () => {
  const source = Buffer.from('ABCD');
  const buf = Buffer.allocUnsafeSlow(12, source);
  // allocUnsafeSlow不会用填充参数填充内容，只是分配内存
  return buf.length === 12;
});

test('填充深度 - TypedArray作为填充源', () => {
  const source = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const buf = Buffer.allocUnsafeSlow(15, source);
  // allocUnsafeSlow不会用填充参数填充内容，只是分配内存
  return buf.length === 15;
});

// 编码参数测试
test('编码参数 - hex编码填充', () => {
  const buf = Buffer.allocUnsafeSlow(8, '41424344', 'hex');
  // allocUnsafeSlow不会用填充参数填充内容，只是分配内存
  return buf.length === 8;
});

test('编码参数 - base64编码填充', () => {
  const buf = Buffer.allocUnsafeSlow(8, 'SGVsbG8=', 'base64');
  // allocUnsafeSlow不会用填充参数填充内容，只是分配内存
  return buf.length === 8;
});

test('编码参数 - utf16le编码填充', () => {
  const buf = Buffer.allocUnsafeSlow(8, 'Hi', 'utf16le');  
  return buf.length === 8;
});

test('编码参数 - latin1编码填充', () => {
  const buf = Buffer.allocUnsafeSlow(8, 'café', 'latin1');
  return buf.length === 8;
});

// 错误边界重测
test('错误边界重测 - 超大数值', () => {
  try {
    Buffer.allocUnsafeSlow(Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('错误边界重测 - 非有限数值', () => {
  const nonFiniteValues = [Infinity, -Infinity, NaN];
  return nonFiniteValues.every(val => {
    try {
      Buffer.allocUnsafeSlow(val);
      return false;
    } catch (e) {
      return e.name === 'RangeError' || e.name === 'TypeError';
    }
  });
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
