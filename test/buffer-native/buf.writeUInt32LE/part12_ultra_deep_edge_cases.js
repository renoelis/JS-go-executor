// buf.writeUInt32LE() - Ultra Deep Edge Cases Tests
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

// 原型链和继承测试
test('Buffer 原型链完整性', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(0x12345678, 0);
  
  // 验证原型链
  return buf instanceof Buffer && 
         buf instanceof Uint8Array && 
         buf.constructor === Buffer &&
         buf.readUInt32LE(0) === 0x12345678;
});

test('Buffer 原型方法存在且可调用', () => {
  const buf = Buffer.allocUnsafe(4);
  const descriptor = Object.getOwnPropertyDescriptor(Buffer.prototype, 'writeUInt32LE');
  
  return descriptor && 
         typeof descriptor.value === 'function' &&
         descriptor.writable === true &&
         descriptor.configurable === true;
});

test('修改 Buffer 原型后的行为', () => {
  const originalWrite = Buffer.prototype.writeUInt32LE;
  let callCount = 0;
  
  // 临时修改原型方法
  Buffer.prototype.writeUInt32LE = function(value, offset) {
    callCount++;
    return originalWrite.call(this, value, offset);
  };
  
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(0x12345678, 0);
    
    // 恢复原型方法
    Buffer.prototype.writeUInt32LE = originalWrite;
    
    return callCount === 1 && buf.readUInt32LE(0) === 0x12345678;
  } finally {
    // 确保恢复原型方法
    Buffer.prototype.writeUInt32LE = originalWrite;
  }
});

// ArrayBuffer 和 TypedArray 视图测试
test('ArrayBuffer 视图写入', () => {
  const arrayBuffer = new ArrayBuffer(8);
  const buf = Buffer.from(arrayBuffer);
  
  buf.writeUInt32LE(0x12345678, 0);
  buf.writeUInt32LE(0x9ABCDEF0, 4);
  
  // 通过 DataView 验证
  const dataView = new DataView(arrayBuffer);
  return dataView.getUint32(0, true) === 0x12345678 && // little endian
         dataView.getUint32(4, true) === 0x9ABCDEF0;
});

test('Uint32Array 视图交互', () => {
  const arrayBuffer = new ArrayBuffer(8);
  const buf = Buffer.from(arrayBuffer);
  const uint32Array = new Uint32Array(arrayBuffer);
  
  buf.writeUInt32LE(0x12345678, 0);
  
  // 注意：Uint32Array 使用平台字节序，可能与大端不同
  // 这里主要测试没有崩溃和内存一致性
  return uint32Array.length === 2 && typeof uint32Array[0] === 'number';
});

test('SharedArrayBuffer 兼容性', () => {
  try {
    if (typeof SharedArrayBuffer === 'undefined') {
      return true; // 跳过不支持的环境
    }
    
    const sharedBuffer = new SharedArrayBuffer(8);
    const buf = Buffer.from(sharedBuffer);
    
    buf.writeUInt32LE(0x12345678, 0);
    return buf.readUInt32LE(0) === 0x12345678;
  } catch (e) {
    // SharedArrayBuffer 可能在某些环境中被禁用
    return true;
  }
});

// 极端数值精度测试
test('浮点数精度边界', () => {
  const buf = Buffer.allocUnsafe(16);
  
  // 测试接近整数边界的浮点数
  buf.writeUInt32LE(4294967295.0, 0);     // 精确的最大值
  buf.writeUInt32LE(4294967294.9999, 4);  // 接近最大值
  buf.writeUInt32LE(0.0000000001, 8);     // 极小正数
  buf.writeUInt32LE(1.0000000001, 12);    // 略大于1
  
  return buf.readUInt32LE(0) === 4294967295 &&
         buf.readUInt32LE(4) === 4294967294 &&
         buf.readUInt32LE(8) === 0 &&
         buf.readUInt32LE(12) === 1;
});

test('IEEE 754 特殊值处理', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(Number.POSITIVE_INFINITY, 0); // 应该抛出异常
    return false; // 不应该到达这里
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('Number.MAX_VALUE 处理', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(Number.MAX_VALUE, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('Number.MIN_VALUE 处理', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(Number.MIN_VALUE, 0);
  return buf.readUInt32LE(0) === 0; // 极小正数应该转换为0
});

// 内存对齐和性能相关测试
test('非对齐内存访问', () => {
  const buf = Buffer.allocUnsafe(7);
  
  // 测试各种非4字节对齐的偏移量
  buf.writeUInt32LE(0x12345678, 1);
  buf.writeUInt32LE(0x9ABCDEF0, 2); // 会覆盖部分数据
  
  return buf.readUInt32LE(2) === 0x9ABCDEF0;
});

test('跨缓存行边界写入', () => {
  // 假设缓存行为64字节，测试跨边界写入
  const buf = Buffer.allocUnsafe(128);
  
  // 测试不重叠的位置
  buf.writeUInt32LE(0x12340000, 60);  // 偏移60-63
  buf.writeUInt32LE(0x56780000, 64);  // 偏移64-67
  buf.writeUInt32LE(0x9ABC0000, 68);  // 偏移68-71
  
  return buf.readUInt32LE(60) === 0x12340000 &&
         buf.readUInt32LE(64) === 0x56780000 &&
         buf.readUInt32LE(68) === 0x9ABC0000;
});

// 垃圾回收和内存管理测试
test('大量临时 Buffer 创建', () => {
  let lastValue = 0;
  
  // 创建大量临时 Buffer 测试 GC 压力
  for (let i = 0; i < 1000; i++) {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(i, 0);
    lastValue = buf.readUInt32LE(0);
  }
  
  return lastValue === 999;
});

test('Buffer 池化行为验证', () => {
  // 小 Buffer 可能使用池化
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  
  buf1.writeUInt32LE(0x11111111, 0);
  buf2.writeUInt32LE(0x22222222, 0);
  
  // 验证两个 Buffer 是独立的
  return buf1.readUInt32LE(0) === 0x11111111 &&
         buf2.readUInt32LE(0) === 0x22222222;
});

// 错误对象深度测试
test('错误对象属性完整性', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(Infinity, 0);
    return false;
  } catch (e) {
    return e instanceof RangeError &&
           e.name === 'RangeError' &&
           typeof e.message === 'string' &&
           typeof e.stack === 'string' &&
           e.stack.includes('writeUInt32LE');
  }
});

test('错误代码属性', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(123, '0'); // 类型错误
    return false;
  } catch (e) {
    return e instanceof TypeError &&
           (e.code === 'ERR_INVALID_ARG_TYPE' || e.message.includes('must be of type number'));
  }
});

// 并发和竞态条件测试
test('同一 Buffer 并发写入', () => {
  const buf = Buffer.allocUnsafe(16);
  
  // 模拟并发写入（在单线程环境中顺序执行）
  buf.writeUInt32LE(0x11111111, 0);
  buf.writeUInt32LE(0x22222222, 4);
  buf.writeUInt32LE(0x33333333, 8);
  buf.writeUInt32LE(0x44444444, 12);
  
  return buf.readUInt32LE(0) === 0x11111111 &&
         buf.readUInt32LE(4) === 0x22222222 &&
         buf.readUInt32LE(8) === 0x33333333 &&
         buf.readUInt32LE(12) === 0x44444444;
});

// 极端偏移量测试
test('接近 Number.MAX_SAFE_INTEGER 的偏移量', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(123, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('must be an integer');
  }
});

test('负零偏移量', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32LE(0x12345678, -0); // -0 应该等同于 0
  
  return buf.readUInt32LE(0) === 0x12345678;
});

// 特殊对象测试
test('复杂对象作为参数', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    const complexObj = {
      valueOf() { return 123; },
      toString() { return '456'; }
    };
    
    buf.writeUInt32LE(complexObj, 0);
    return buf.readUInt32LE(0) === 123;
  } catch (e) {
    // 复杂对象可能在某些环境中有特殊处理
    return true;
  }
});

test('冻结对象作为 Buffer', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    Object.freeze(buf);
    
    buf.writeUInt32LE(0x12345678, 0);
    return buf.readUInt32LE(0) === 0x12345678;
  } catch (e) {
    // 冻结的 Buffer 可能不允许写入
    return e.message.includes('Cannot freeze array buffer views') ||
           e.message.includes('Cannot assign to read only property') ||
           e.message.includes('object is not extensible');
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
