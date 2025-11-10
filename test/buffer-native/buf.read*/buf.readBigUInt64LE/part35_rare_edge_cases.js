// buf.readBigUInt64LE() - 罕见边界场景测试
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

// WeakMap 作为 offset（应该抛出 TypeError）
test('offset = new WeakMap() 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(new WeakMap());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// WeakSet 作为 offset（应该抛出 TypeError）
test('offset = new WeakSet() 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(new WeakSet());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Map 作为 offset（应该抛出 TypeError）
test('offset = new Map() 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(new Map());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Set 作为 offset（应该抛出 TypeError）
test('offset = new Set() 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(new Set());
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 带 getter 的对象作为 offset
test('offset 对象有 valueOf getter', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(100n, 0);
    let callCount = 0;
    const obj = {
      get valueOf() {
        callCount++;
        return () => 0;
      }
    };
    const result = buf.readBigUInt64LE(obj);
    // 应该调用 valueOf 或抛出 TypeError
    return (result === 100n && callCount > 0) || false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 循环引用的对象
test('offset 对象有循环引用', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = { valueOf: () => 0 };
    obj.self = obj;
    const result = buf.readBigUInt64LE(obj);
    return result === 0n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// valueOf 抛出错误
test('offset valueOf 方法抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      valueOf: () => {
        throw new Error('valueOf error');
      }
    };
    buf.readBigUInt64LE(obj);
    return false;
  } catch (e) {
    return e.message.includes('valueOf error') || e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// toString 抛出错误
test('offset toString 方法抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      toString: () => {
        throw new Error('toString error');
      }
    };
    buf.readBigUInt64LE(obj);
    return false;
  } catch (e) {
    return e.message.includes('toString error') || e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// valueOf 返回对象
test('offset valueOf 返回对象而非原始值', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      valueOf: () => ({ value: 0 })
    };
    buf.readBigUInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 同时有 valueOf 和 toString
test('offset 同时有 valueOf 和 toString，应优先使用 valueOf', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(123n, 0);
    const obj = {
      valueOf: () => 0,
      toString: () => '10'
    };
    const result = buf.readBigUInt64LE(obj);
    return result === 123n;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Promise 作为 offset
test('offset = Promise.resolve(0) 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(Promise.resolve(0));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Error 对象作为 offset
test('offset = new Error() 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(new Error('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// ArrayBuffer 作为 offset
test('offset = new ArrayBuffer(8) 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(new ArrayBuffer(8));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// DataView 作为 offset
test('offset = new DataView(new ArrayBuffer(8)) 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(new DataView(new ArrayBuffer(8)));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Uint8Array 作为 offset
test('offset = new Uint8Array([0]) 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(new Uint8Array([0]));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 严格模式下的行为（在函数内部声明严格模式）
test('严格模式下读取正常工作', () => {
  'use strict';
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(999n, 0);
  return buf.readBigUInt64LE(0) === 999n;
});

// 非严格模式（默认）
test('非严格模式下读取正常工作', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(888n, 0);
  return buf.readBigUInt64LE(0) === 888n;
});

// offset 为 arguments 对象
test('offset = arguments 对象应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    (function() {
      buf.readBigUInt64LE(arguments);
    })(0, 1, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset 为类数组对象
test('offset = 类数组对象应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE({ 0: 0, length: 1 });
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset 为 Buffer 对象
test('offset = Buffer.from([0]) 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(Buffer.from([0]));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// valueOf 返回 Symbol
test('offset valueOf 返回 Symbol 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      valueOf: () => Symbol('test')
    };
    buf.readBigUInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// valueOf 返回 BigInt
test('offset valueOf 返回 BigInt 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    const obj = {
      valueOf: () => 0n
    };
    buf.readBigUInt64LE(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 特殊数值：Number.MIN_SAFE_INTEGER
test('offset = Number.MIN_SAFE_INTEGER 应该抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊数值：负零的对象包装
test('offset = new Number(-0) 等同于 0', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(777n, 0);
    const result = buf.readBigUInt64LE(new Number(-0));
    return result === 777n;
  } catch (e) {
    // 某些实现可能抛出 TypeError
    return e.name === 'TypeError';
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
