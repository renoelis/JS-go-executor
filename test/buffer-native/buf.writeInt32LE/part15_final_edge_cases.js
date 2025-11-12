// buf.writeInt32LE() - 最终补充边界测试
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

// ==================== 函数属性测试 ====================

test('writeInt32LE.length 应该是 1', () => {
  return Buffer.prototype.writeInt32LE.length === 1;
});

test('writeInt32LE.name 应该是 "writeInt32LE"', () => {
  return Buffer.prototype.writeInt32LE.name === 'writeInt32LE';
});

test('writeInt32LE 是一个函数', () => {
  return typeof Buffer.prototype.writeInt32LE === 'function';
});

// ==================== 错误类型精确测试 ====================

test('offset 类型错误应返回 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(100, "invalid");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('type');
  }
});

test('offset 越界应返回 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(100, 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('value 超出范围应返回 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(999999999999, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('value 为 Infinity 应返回 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

// ==================== 特殊对象作为 this ====================

test('普通对象作为 this 可以写入', () => {
  const obj = { 0: 0, 1: 0, 2: 0, 3: 0, length: 4 };
  Buffer.prototype.writeInt32LE.call(obj, 100, 0);
  return obj[0] === 100 && obj[1] === 0 && obj[2] === 0 && obj[3] === 0;
});

test('带额外属性的对象作为 this', () => {
  const obj = { 0: 0, 1: 0, 2: 0, 3: 0, length: 4, extra: 'data' };
  Buffer.prototype.writeInt32LE.call(obj, 200, 0);
  return obj[0] === 200 && obj[1] === 0 && obj[2] === 0 && obj[3] === 0 && obj.extra === 'data';
});

// ==================== 多次调用一致性 ====================

test('多次调用相同参数结果一致', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  const buf3 = Buffer.alloc(8);
  
  buf1.writeInt32LE(12345678, 0);
  buf2.writeInt32LE(12345678, 0);
  buf3.writeInt32LE(12345678, 0);
  
  return buf1[0] === buf2[0] && buf2[0] === buf3[0] &&
         buf1[1] === buf2[1] && buf2[1] === buf3[1] &&
         buf1[2] === buf2[2] && buf2[2] === buf3[2] &&
         buf1[3] === buf2[3] && buf2[3] === buf3[3];
});

test('连续100次调用结果稳定', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 100; i++) {
    buf.writeInt32LE(12345678, 0);
  }
  return buf.readInt32LE(0) === 12345678;
});

test('不同 Buffer 实例写入结果一致', () => {
  const buffers = [];
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(987654321, 0);
    buffers.push(buf);
  }
  
  const first = buffers[0];
  return buffers.every(buf => 
    buf[0] === first[0] && 
    buf[1] === first[1] && 
    buf[2] === first[2] && 
    buf[3] === first[3]
  );
});

// ==================== Symbol 和特殊值 ====================

test('Symbol 作为 value 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('BigInt 作为 value 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(123n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

// ==================== 边界条件组合测试 ====================

test('最大值写入最后位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(2147483647, 4);
  return buf.readInt32LE(4) === 2147483647;
});

test('最小值写入最后位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(-2147483648, 4);
  return buf.readInt32LE(4) === -2147483648;
});

test('零写入所有有效位置', () => {
  const buf = Buffer.alloc(12);
  buf.writeInt32LE(0, 0);
  buf.writeInt32LE(0, 4);
  buf.writeInt32LE(0, 8);
  return buf.every(byte => byte === 0);
});

// ==================== 原型链修改测试 ====================

test('修改原型方法不影响已有实例', () => {
  const buf = Buffer.alloc(8);
  const original = Buffer.prototype.writeInt32LE;
  
  buf.writeInt32LE(123, 0);
  const val1 = buf.readInt32LE(0);
  
  Buffer.prototype.writeInt32LE = function() {};
  Buffer.prototype.writeInt32LE = original;
  
  buf.writeInt32LE(456, 0);
  const val2 = buf.readInt32LE(0);
  
  return val1 === 123 && val2 === 456;
});

// ==================== this 绑定测试 ====================

test('使用 bind 绑定 this', () => {
  const buf = Buffer.alloc(8);
  const boundWrite = buf.writeInt32LE.bind(buf);
  boundWrite(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('使用 call 指定 this', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeInt32LE.call(buf, 456, 0);
  return buf.readInt32LE(0) === 456;
});

test('使用 apply 指定 this', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeInt32LE.apply(buf, [789, 0]);
  return buf.readInt32LE(0) === 789;
});

// ==================== 边界值精确测试 ====================

test('写入 2^31 - 2', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(2147483646, 0);
  return buf.readInt32LE(0) === 2147483646;
});

test('写入 -2^31 + 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(-2147483647, 0);
  return buf.readInt32LE(0) === -2147483647;
});

test('写入 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(1, 0);
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

test('写入 -1', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(-1, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('写入 256', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(256, 0);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 0 && buf[3] === 0;
});

test('写入 65536', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(65536, 0);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0;
});

test('写入 16777216', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(16777216, 0);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 1;
});

// ==================== 特殊 offset 测试 ====================

test('offset 为字符串 "0" 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(123, "0");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('type');
  }
});

test('offset 为字符串 "2" 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(123, "2");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('type');
  }
});

test('offset 为布尔值 false 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(123, false);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('type');
  }
});

test('offset 为布尔值 true 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(123, true);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('type');
  }
});

test('offset 为 null 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(123, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('type');
  }
});

// ==================== 混合类型 Buffer ====================

test('从 TypedArray.buffer 创建的 Buffer', () => {
  const arr = new Uint32Array(2);
  const buf = Buffer.from(arr.buffer);
  buf.writeInt32LE(123, 0);
  return buf.readInt32LE(0) === 123;
});

test('从 slice 创建的 Buffer', () => {
  const parent = Buffer.alloc(16);
  const child = parent.slice(4, 12);
  child.writeInt32LE(123, 0);
  return parent.readInt32LE(4) === 123;
});

test('从 subarray 创建的 Buffer', () => {
  const parent = Buffer.alloc(16);
  const child = parent.subarray(4, 12);
  child.writeInt32LE(123, 0);
  return parent.readInt32LE(4) === 123;
});

// ==================== 性能相关测试 ====================

test('大量写入不会导致错误', () => {
  const buf = Buffer.alloc(4000);
  for (let i = 0; i < 1000; i++) {
    buf.writeInt32LE(i, (i % 999) * 4);
  }
  return true;
});

test('交替正负数写入', () => {
  const buf = Buffer.alloc(400);
  for (let i = 0; i < 100; i++) {
    const value = i % 2 === 0 ? i : -i;
    buf.writeInt32LE(value, i * 4);
  }
  return buf.readInt32LE(0) === 0 && buf.readInt32LE(4) === -1 && buf.readInt32LE(8) === 2;
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
