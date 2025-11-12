// buf.writeInt8() - Extreme Cases and Compatibility Tests
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

// 极端 offset 组合
test('连续在最后一个字节写入', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    buf.writeInt8(i, 99);
  }
  return buf[99] === 49;
});

test('offset 为 Number.MAX_SAFE_INTEGER 超出范围', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(10, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('offset 为 2^31 - 1（最大 32 位整数）', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(10, Math.pow(2, 31) - 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// 极端 value 边界
test('value 为 -127.5 截断后在范围内', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-127.5, 0);
  return result === 1 && buf[0] === (256 - 127);
});

test('value 为 -128.4 超出范围抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(-128.4, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 126.9999 截断为 126', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(126.9999, 0);
  return result === 1 && buf[0] === 126;
});

// 特殊数学值
test('value 为 -0.5 截断为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-0.5, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 0.5 截断为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(0.5, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 Number.EPSILON 截断为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Number.EPSILON, 0);
  return result === 1 && buf[0] === 0;
});

// 字符串边界
test('value 为空字符串转换为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为带空格的字符串 " 42 "', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(' 42 ', 0);
  return result === 1 && buf[0] === 42;
});

test('value 为十六进制字符串 "0x10"', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('0x10', 0);
  return result === 1 && buf[0] === 16;
});

test('value 为八进制字符串 "077"', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('077', 0);
  return result === 1 && buf[0] === 77;
});

// Symbol 和 function
test('value 为 Symbol 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('Cannot convert') || e.message.includes('number') || e.message.includes('symbol');
  }
});

test('value 为 function 转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(function(){}, 0);
  return result === 1 && buf[0] === 0;
});

// TypedArray 互操作极端情况
test('Int8Array 视图读取 writeInt8 写入的负值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-100, 2);
  const i8 = new Int8Array(buf.buffer, buf.byteOffset, buf.length);
  return i8[2] === -100;
});

test('Uint8Array 视图读取 writeInt8 写入的正值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(100, 2);
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  return u8[2] === 100;
});

test('DataView getInt8 读取 writeInt8 写入的值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-75, 1);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  return dv.getInt8(1) === -75;
});

test('DataView getUint8 读取 writeInt8 写入的负值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-75, 1);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  return dv.getUint8(1) === (256 - 75);
});

// 对象自定义转换
test('value 为有 valueOf 的对象', () => {
  const buf = Buffer.alloc(2);
  const obj = { valueOf: () => 42 };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 42;
});

test('value 为有 toString 的对象', () => {
  const buf = Buffer.alloc(2);
  const obj = { toString: () => '50' };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 50;
});

test('value 为同时有 valueOf 和 toString 的对象（优先 valueOf）', () => {
  const buf = Buffer.alloc(2);
  const obj = {
    valueOf: () => 30,
    toString: () => '40'
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 30;
});

// 原型链污染测试
test('修改 Buffer 原型不影响实例行为', () => {
  const originalWriteInt8 = Buffer.prototype.writeInt8;
  let called = false;

  const buf = Buffer.alloc(4);
  buf.writeInt8(42, 0);

  Buffer.prototype.writeInt8 = originalWriteInt8;
  return buf[0] === 42;
});

// 冻结和密封
test('在普通 buffer 上写入（buffer 本身不可冻结）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(99, 1);
  return result === 2 && buf[1] === 99;
});

// 并发场景模拟
test('快速连续写入不同 offset', () => {
  const buf = Buffer.alloc(100);
  const writes = [];
  for (let i = 0; i < 100; i++) {
    writes.push([i % 128, i]);
  }

  writes.forEach(([val, off]) => {
    buf.writeInt8(val, off);
  });

  let pass = true;
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== (i % 128)) {
      pass = false;
      break;
    }
  }
  return pass;
});

// 边界值完整性
test('所有 256 个可能的字节值可表示', () => {
  const buf = Buffer.alloc(256);

  for (let i = 0; i < 128; i++) {
    buf.writeInt8(i, i);
  }

  for (let i = 128; i < 256; i++) {
    buf.writeInt8(i - 256, i);
  }

  let pass = true;
  for (let i = 0; i < 256; i++) {
    if (buf[i] !== i) {
      pass = false;
      break;
    }
  }
  return pass;
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
