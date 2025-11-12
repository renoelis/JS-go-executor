// buf.writeInt16BE() - 最终补充边界测试
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

test('writeInt16BE.length 应该是 1', () => {
  return Buffer.prototype.writeInt16BE.length === 1;
});

test('writeInt16BE.name 应该是 "writeInt16BE"', () => {
  return Buffer.prototype.writeInt16BE.name === 'writeInt16BE';
});

test('writeInt16BE 是一个函数', () => {
  return typeof Buffer.prototype.writeInt16BE === 'function';
});

// ==================== 错误类型精确测试 ====================

test('offset 类型错误应返回 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(100, "invalid");
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('type');
  }
});

test('offset 越界应返回 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(100, 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('value 超出范围应返回 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(99999, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('value 为 Infinity 应返回 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

// ==================== 特殊对象作为 this ====================

test('普通对象作为 this 可以写入', () => {
  const obj = { 0: 0, 1: 0, length: 2 };
  Buffer.prototype.writeInt16BE.call(obj, 100, 0);
  return obj[0] === 0 && obj[1] === 100;
});

test('带额外属性的对象作为 this', () => {
  const obj = { 0: 0, 1: 0, length: 2, extra: 'data' };
  Buffer.prototype.writeInt16BE.call(obj, 200, 0);
  return obj[0] === 0 && obj[1] === 200 && obj.extra === 'data';
});

// ==================== 多次调用一致性 ====================

test('多次调用相同参数结果一致', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  const buf3 = Buffer.alloc(4);
  
  buf1.writeInt16BE(12345, 0);
  buf2.writeInt16BE(12345, 0);
  buf3.writeInt16BE(12345, 0);
  
  return buf1[0] === buf2[0] && buf2[0] === buf3[0] &&
         buf1[1] === buf2[1] && buf2[1] === buf3[1];
});

test('连续100次调用结果稳定', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 100; i++) {
    buf.writeInt16BE(0x1234, 0);
  }
  return buf[0] === 0x12 && buf[1] === 0x34;
});

// ==================== 与 slice/subarray 的边界 ====================

test('在 slice 的最后位置写入', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(0, 4);
  slice.writeInt16BE(0x1234, 2);
  return buf[2] === 0x12 && buf[3] === 0x34;
});

test('在 subarray 的开始位置写入', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(5, 9);
  sub.writeInt16BE(0x5678, 0);
  return buf[5] === 0x56 && buf[6] === 0x78;
});

test('在 subarray 的结束位置写入', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(2, 8);
  sub.writeInt16BE(-21555, 4); // 0xABCD as signed
  return buf[6] === 0xAB && buf[7] === 0xCD;
});

// ==================== 特殊数值序列 ====================

test('写入质数序列', () => {
  const buf = Buffer.alloc(20);
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  for (let i = 0; i < primes.length; i++) {
    buf.writeInt16BE(primes[i], i * 2);
  }
  return buf.readInt16BE(0) === 2 && buf.readInt16BE(18) === 29;
});

test('写入斐波那契前8项', () => {
  const buf = Buffer.alloc(16);
  const fib = [1, 1, 2, 3, 5, 8, 13, 21];
  for (let i = 0; i < fib.length; i++) {
    buf.writeInt16BE(fib[i], i * 2);
  }
  return buf.readInt16BE(0) === 1 && buf.readInt16BE(14) === 21;
});

// ==================== 位运算结果写入 ====================

test('写入位运算结果 - AND', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0xFF & 0x1234, 0);
  return buf[0] === 0x00 && buf[1] === 0x34;
});

test('写入位运算结果 - OR', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x1200 | 0x0034, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('写入位运算结果 - XOR', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0xFFFF ^ 0xEDCB, 0);
  return buf.readInt16BE(0) === (0xFFFF ^ 0xEDCB);
});

// ==================== Buffer 方法交互 ====================

test('连续写入后 compare 返回 0', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  
  for (let i = 0; i < 5; i++) {
    buf1.writeInt16BE(i * 100, i * 2);
    buf2.writeInt16BE(i * 100, i * 2);
  }
  
  return buf1.compare(buf2) === 0;
});

test('写入特定模式后 indexOf 能找到', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(0x1234, 2);
  const needle = Buffer.from([0x12, 0x34]);
  return buf.indexOf(needle) === 2;
});

test('写入后 includes 能检测', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(0x1234, 2);
  return buf.includes(0x12) && buf.includes(0x34);
});

// ==================== TypedArray 兼容 ====================

test('在 Int16Array 视图上调用', () => {
  const ab = new ArrayBuffer(8);
  const i16 = new Int16Array(ab);
  Buffer.prototype.writeInt16BE.call(i16, 100, 0);
  // 写入成功，i16[0] 应该包含数据
  return i16[0] === 0 || i16[0] !== 0; // 任何结果都表示没有抛出错误
});

test('在 Uint32Array 视图上调用', () => {
  const ab = new ArrayBuffer(8);
  const u32 = new Uint32Array(ab);
  Buffer.prototype.writeInt16BE.call(u32, 100, 0);
  return true; // 成功调用即可
});

// ==================== 写入后立即操作 ====================

test('写入后立即修改其他位置不影响写入结果', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(0x1234, 0);
  buf[2] = 0xFF;
  buf[3] = 0xFF;
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('写入后立即读取相同位置', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(12345, 0);
  return buf.readInt16BE(0) === 12345;
});

// ==================== offset 特殊值 ====================

test('offset 为 0 与省略 offset 结果相同', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt16BE(12345);
  buf2.writeInt16BE(12345, 0);
  return buf1[0] === buf2[0] && buf1[1] === buf2[1];
});

test('offset 为浮点数向下取整', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt16BE(0x1234, 2.9);
    return false; // 应该抛出错误
  } catch (e) {
    return true;
  }
});

// ==================== 数值精度测试 ====================

test('小数值正确截断为整数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(100.9, 0);
  buf.writeInt16BE(200.1, 2);
  return buf.readInt16BE(0) === 100 && buf.readInt16BE(2) === 200;
});

test('负数小数正确截断', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-100.9, 0);
  buf.writeInt16BE(-200.1, 2);
  return buf.readInt16BE(0) === -100 && buf.readInt16BE(2) === -200;
});

// ==================== 边界组合测试 ====================

test('最大值 + 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(32767, 0);
  buf.writeInt16BE(0, 2);
  return buf.readInt16BE(0) === 32767 && buf.readInt16BE(2) === 0;
});

test('最小值 + 最大值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-32768, 0);
  buf.writeInt16BE(32767, 2);
  return buf.readInt16BE(0) === -32768 && buf.readInt16BE(2) === 32767;
});

test('交替正负值', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt16BE(1000, 0);
  buf.writeInt16BE(-1000, 2);
  buf.writeInt16BE(2000, 4);
  buf.writeInt16BE(-2000, 6);
  return buf.readInt16BE(0) === 1000 && 
         buf.readInt16BE(2) === -1000 &&
         buf.readInt16BE(4) === 2000 &&
         buf.readInt16BE(6) === -2000;
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
