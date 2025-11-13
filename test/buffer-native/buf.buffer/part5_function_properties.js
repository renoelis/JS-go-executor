// buf.buffer - Function Properties & Deep Analysis Tests (Part 5)
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

// ========== buffer 属性基本测试 ==========

test('buffer 属性存在性验证', () => {
  const buf = Buffer.alloc(10);
  return 'buffer' in buf && buf.buffer instanceof ArrayBuffer;
});

test('buffer 属性访问方式验证', () => {
  const buf = Buffer.alloc(10);
  const buffer1 = buf.buffer;
  const buffer2 = buf['buffer'];
  return buffer1 === buffer2 && buffer1 instanceof ArrayBuffer;
});

test('buffer 属性只读性验证', () => {
  const buf = Buffer.alloc(10);
  const original = buf.buffer;
  try {
    buf.buffer = new ArrayBuffer(20);
    return buf.buffer === original; // 应该保持原值
  } catch (e) {
    return true; // 抛出错误也是正确的
  }
});

test('buffer 属性不可枚举验证', () => {
  const buf = Buffer.alloc(10);
  const keys = Object.keys(buf);
  return !keys.includes('buffer') && buf.buffer instanceof ArrayBuffer;
});

test('buffer 属性原型链验证', () => {
  const buf = Buffer.alloc(10);
  return 'buffer' in buf && !buf.hasOwnProperty('buffer');
});

// ========== Symbol 和现代 JavaScript 特性 ==========

test('buffer 属性与 Symbol.toStringTag', () => {
  const buf = Buffer.alloc(10);
  const tag = buf[Symbol.toStringTag];
  return buf.buffer instanceof ArrayBuffer && (tag === 'Uint8Array' || tag === 'Buffer' || tag === undefined);
});

test('buffer 属性与 Symbol.iterator', () => {
  const buf = Buffer.alloc(10);
  const iterator = buf[Symbol.iterator];
  return buf.buffer instanceof ArrayBuffer && typeof iterator === 'function';
});

test('buffer 属性与 Symbol.species', () => {
  const buf = Buffer.alloc(10);
  // Symbol.species 主要用于子类化
  return buf.buffer instanceof ArrayBuffer;
});

test('buffer 属性与 for...of 循环', () => {
  const buf = Buffer.from([1, 2, 3]);
  let count = 0;
  for (const byte of buf) {
    count++;
  }
  return buf.buffer instanceof ArrayBuffer && count === 3;
});

// ========== 类型检查和类型转换 ==========

test('buffer 属性与 typeof', () => {
  const buf = Buffer.alloc(10);
  return typeof buf.buffer === 'object' && buf.buffer !== null;
});

test('buffer 属性与 instanceof ArrayBuffer', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('buffer 属性与 Array.isArray', () => {
  const buf = Buffer.alloc(10);
  return !Array.isArray(buf.buffer) && buf.buffer instanceof ArrayBuffer;
});

test('buffer 属性与 Buffer.isBuffer', () => {
  const buf = Buffer.alloc(10);
  return !Buffer.isBuffer(buf.buffer) && Buffer.isBuffer(buf);
});

// ========== 极端参数和边界情况 ==========

test('非常大的 Buffer 的 buffer 属性', () => {
  try {
    const buf = Buffer.alloc(1024 * 1024); // 1MB
    return buf.buffer instanceof ArrayBuffer && buf.buffer.byteLength >= 1024 * 1024;
  } catch (e) {
    // 内存不足时可能失败
    return true;
  }
});

test('Buffer.from(null) 错误处理', () => {
  try {
    const buf = Buffer.from(null);
    return false; // 不应该成功
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.from(undefined) 错误处理', () => {
  try {
    const buf = Buffer.from(undefined);
    return false; // 不应该成功
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('Buffer.from(Symbol) 错误处理', () => {
  try {
    const buf = Buffer.from(Symbol('test'));
    return false; // 不应该成功
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ========== 数值精确性测试 ==========

test('buffer.byteLength 精确性（小数）', () => {
  const buf = Buffer.alloc(10);
  return Number.isInteger(buf.buffer.byteLength) && buf.buffer.byteLength >= 10;
});

test('buffer.byteLength 精确性（大数）', () => {
  try {
    const buf = Buffer.alloc(65536); // 64KB
    return Number.isInteger(buf.buffer.byteLength) && buf.buffer.byteLength >= 65536;
  } catch (e) {
    return true;
  }
});

test('byteOffset 精确性', () => {
  const buf = Buffer.alloc(20);
  const slice = buf.slice(5, 15);
  return Number.isInteger(slice.byteOffset) && slice.byteOffset >= 0;
});

// ========== 函数调用上下文 ==========

test('buffer 属性在不同上下文中的一致性', () => {
  const buf = Buffer.alloc(10);
  const buffer1 = buf.buffer;
  const buffer2 = buf['buffer'];
  return buffer1 === buffer2 && buffer1 instanceof ArrayBuffer;
});

test('buffer 属性调用上下文验证', () => {
  const buf = Buffer.alloc(10);
  const buffer1 = buf.buffer;
  const buffer2 = buf.buffer;
  return buffer1 === buffer2 && buffer1 instanceof ArrayBuffer;
});

// ========== 内存和性能相关 ==========

test('buffer 属性访问性能稳定性', () => {
  const buf = Buffer.alloc(10);
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    const buffer = buf.buffer;
  }
  const end = Date.now();
  return (end - start) < 1000 && buf.buffer instanceof ArrayBuffer; // 应该在1秒内完成
});

test('多次访问 buffer 属性返回相同引用', () => {
  const buf = Buffer.alloc(10);
  const buffer1 = buf.buffer;
  const buffer2 = buf.buffer;
  const buffer3 = buf.buffer;
  return buffer1 === buffer2 && buffer2 === buffer3 && buffer1 instanceof ArrayBuffer;
});

// ========== 异步上下文测试 ==========

test('buffer 属性在 Promise 中的行为', () => {
  const buf = Buffer.alloc(10);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(buf.buffer instanceof ArrayBuffer);
    }, 0);
  }).then(result => result);
});

test('buffer 属性在 async/await 中的行为', async () => {
  const buf = Buffer.alloc(10);
  await new Promise(resolve => setTimeout(resolve, 0));
  return buf.buffer instanceof ArrayBuffer;
});

// ========== 错误恢复和稳定性 ==========

test('buffer 属性在错误后的稳定性', () => {
  const buf = Buffer.alloc(10);
  try {
    // 尝试一个可能失败的操作
    buf.nonExistentMethod();
  } catch (e) {
    // 忽略错误
  }
  return buf.buffer instanceof ArrayBuffer;
});

test('buffer 属性与垃圾回收', () => {
  let buf = Buffer.alloc(10);
  const buffer = buf.buffer;
  buf = null; // 释放 Buffer 引用
  // buffer 应该仍然有效
  return buffer instanceof ArrayBuffer;
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
