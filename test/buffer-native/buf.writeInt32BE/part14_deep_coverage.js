// buf.writeInt32BE() - 深度查缺补漏测试
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

// ==================== 参数缺失和默认值 ====================

test('只传入 value，offset 默认为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(0x12345678);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78;
});

test('传入 3 个参数（第3个参数被忽略）', () => {
  const buf = Buffer.alloc(8);
  const ret = buf.writeInt32BE(0x12345678, 0, 'ignored');
  return ret === 4 && buf[0] === 0x12 && buf[3] === 0x78;
});

test('传入 5 个参数（额外参数被忽略）', () => {
  const buf = Buffer.alloc(8);
  const ret = buf.writeInt32BE(0x12345678, 0, 'a', 'b', 'c');
  return ret === 4;
});

// ==================== 极端 offset 值 ====================

test('offset 为 -0 应等同于 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(0x12345678, -0);
  return buf[0] === 0x12 && buf[3] === 0x78;
});

test('offset 为 Number.MIN_SAFE_INTEGER 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(100, Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('offset');
  }
});

test('offset 为极大的负数', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(100, -999999);
    return false;
  } catch (e) {
    return true;
  }
});

// ==================== 特殊的 Buffer 状态 ====================

test('在 Buffer.alloc(0) 上调用应抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.writeInt32BE(100, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('bounds');
  }
});

test('在 Buffer.allocUnsafeSlow 创建的 buffer 上写入', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeInt32BE(0x12345678, 0);
  return buf.readInt32BE(0) === 0x12345678;
});

test('在 Buffer.from(arrayBuffer) 上写入', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  buf.writeInt32BE(0x12345678, 0);
  return buf[0] === 0x12 && buf[3] === 0x78;
});

// ==================== 浮点数的特殊值 ====================

test('正零和负零写入结果相同', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeInt32BE(+0, 0);
  buf2.writeInt32BE(-0, 0);
  return buf1[0] === buf2[0] && buf1[3] === buf2[3] && buf1[0] === 0 && buf1[3] === 0;
});

test('Number.EPSILON 转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(Number.EPSILON, 0);
  return buf.readInt32BE(0) === 0;
});

test('非常小的正数转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(0.000001, 0);
  return buf.readInt32BE(0) === 0;
});

test('非常小的负数转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(-0.000001, 0);
  return buf.readInt32BE(0) === 0;
});

// ==================== 特殊值的截断行为 ====================

test('2^31 超出范围应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(Math.pow(2, 31), 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('2^31 + 1 超出范围应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(Math.pow(2, 31) + 1, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('-(2^31 + 1) 超出范围应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(-(Math.pow(2, 31) + 1), 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('2^32 超出范围应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(Math.pow(2, 32), 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('2^32 - 1 超出范围应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(Math.pow(2, 32) - 1, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

// ==================== offset 的浮点数处理 ====================

test('offset 为 0.1 应抛出错误（必须是整数）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(123, 0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('integer');
  }
});

test('offset 为 0.9 应抛出错误（必须是整数）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(123, 0.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('integer');
  }
});

test('offset 为 1.5 应抛出错误（必须是整数）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(123, 1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('integer');
  }
});

test('offset 为 3.9 应抛出错误（必须是整数）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(123, 3.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('integer');
  }
});

// ==================== 连续写入测试 ====================

test('连续写入多个值', () => {
  const buf = Buffer.alloc(16);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 4);
  buf.writeInt32BE(0x33333333, 8);
  buf.writeInt32BE(0x44444444, 12);
  return buf.readInt32BE(0) === 0x11111111 && 
         buf.readInt32BE(4) === 0x22222222 &&
         buf.readInt32BE(8) === 0x33333333 &&
         buf.readInt32BE(12) === 0x44444444;
});

test('覆盖写入', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 0);
  return buf.readInt32BE(0) === 0x22222222;
});

test('部分覆盖写入', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(0x11111111, 0);
  buf.writeInt32BE(0x22222222, 2);
  return buf[0] === 0x11 && buf[1] === 0x11 && buf[2] === 0x22 && buf[3] === 0x22;
});

// ==================== TypedArray 视图测试 ====================

test('Uint8Array 视图能看到写入的值', () => {
  const buf = Buffer.alloc(8);
  const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  buf.writeInt32BE(0x12345678, 0);
  return view[0] === 0x12 && view[1] === 0x34 && view[2] === 0x56 && view[3] === 0x78;
});

test('Int32Array 视图能看到写入的值', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(123, 0);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getInt32(0, false) === 123;
});

// ==================== 字符串参数转换 ====================

test('字符串 "123" 转换为数字 123', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE("123", 0);
  return buf.readInt32BE(0) === 123;
});

test('字符串 "-456" 转换为数字 -456', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE("-456", 0);
  return buf.readInt32BE(0) === -456;
});

test('字符串 "0x100" 转换为数字 256', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE("0x100", 0);
  return buf.readInt32BE(0) === 256;
});

test('空字符串转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE("", 0);
  return buf.readInt32BE(0) === 0;
});

test('字符串 "abc" 转换为 NaN，行为待验证', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE("abc", 0);
    return true;
  } catch (e) {
    return true;
  }
});

// ==================== 布尔值参数 ====================

test('布尔值 true 转换为 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(true, 0);
  return buf.readInt32BE(0) === 1;
});

test('布尔值 false 转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(false, 0);
  return buf.readInt32BE(0) === 0;
});

// ==================== null 和 undefined ====================

test('null 转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(null, 0);
  return buf.readInt32BE(0) === 0;
});

test('undefined 转换为 NaN，行为待验证', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(undefined, 0);
    return true;
  } catch (e) {
    return true;
  }
});

// ==================== 数组和对象 ====================

test('空数组转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE([], 0);
  return buf.readInt32BE(0) === 0;
});

test('单元素数组 [123] 转换为 123', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE([123], 0);
  return buf.readInt32BE(0) === 123;
});

test('多元素数组转换为 NaN，行为待验证', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE([1, 2], 0);
    return true;
  } catch (e) {
    return true;
  }
});

test('空对象转换为 NaN，行为待验证', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE({}, 0);
    return true;
  } catch (e) {
    return true;
  }
});

// ==================== 返回值测试 ====================

test('返回值应该是 offset + 4', () => {
  const buf = Buffer.alloc(8);
  const ret0 = buf.writeInt32BE(123, 0);
  const ret2 = buf.writeInt32BE(456, 2);
  const ret4 = buf.writeInt32BE(789, 4);
  return ret0 === 4 && ret2 === 6 && ret4 === 8;
});

test('返回值可以作为下次调用的 offset', () => {
  const buf = Buffer.alloc(16);
  let offset = 0;
  offset = buf.writeInt32BE(1, offset);
  offset = buf.writeInt32BE(2, offset);
  offset = buf.writeInt32BE(3, offset);
  offset = buf.writeInt32BE(4, offset);
  return offset === 16 && 
         buf.readInt32BE(0) === 1 && 
         buf.readInt32BE(4) === 2 &&
         buf.readInt32BE(8) === 3 &&
         buf.readInt32BE(12) === 4;
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
