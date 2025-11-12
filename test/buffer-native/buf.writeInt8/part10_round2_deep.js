// buf.writeInt8() - Round 2 Deep Analysis Tests
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

// 更精细的浮点数边界
test('value 为 127 - Number.EPSILON 可以写入', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(127 - Number.EPSILON, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 127 + Number.EPSILON 仍为 127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(127 + Number.EPSILON, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 127.000001 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(127.000001, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 126.999999 写入 126', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(126.999999, 0);
  return result === 1 && buf[0] === 126;
});

test('value 为 -128 + Number.EPSILON 仍为 -128', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-128 + Number.EPSILON, 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 -128 - Number.EPSILON 仍为 -128', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-128 - Number.EPSILON, 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 -128.000001 抛出错误', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8(-128.000001, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 -127.999999 写入 -127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-127.999999, 0);
  return result === 1 && buf[0] === (256 - 127);
});

// offset 的 2^n 和 2^n-1 边界
test('offset 为 0（2^0 - 1）', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeInt8(42, 0);
  return result === 1 && buf[0] === 42;
});

test('offset 为 1（2^0）', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeInt8(42, 1);
  return result === 2 && buf[1] === 42;
});

test('offset 为 3（2^2 - 1）', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeInt8(42, 3);
  return result === 4 && buf[3] === 42;
});

test('offset 为 7（2^3 - 1）', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeInt8(42, 7);
  return result === 8 && buf[7] === 42;
});

test('offset 为 15（2^4 - 1）', () => {
  const buf = Buffer.alloc(20);
  const result = buf.writeInt8(42, 15);
  return result === 16 && buf[15] === 42;
});

test('offset 为 31（2^5 - 1）', () => {
  const buf = Buffer.alloc(40);
  const result = buf.writeInt8(42, 31);
  return result === 32 && buf[31] === 42;
});

// 字符串空白字符处理
test('value 为字符串 "  127" 前导空格', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('  127', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为字符串 "127  " 尾随空格', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('127  ', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为字符串 "\\t127" tab前缀', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('\t127', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为字符串 "127\\n" 换行后缀', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('127\n', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为字符串 "\\r127" 回车前缀', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('\r127', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为字符串 " \\t 127 \\n " 混合空白', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(' \t 127 \n ', 0);
  return result === 1 && buf[0] === 127;
});

// 十六进制字符串大小写
test('value 为 "0x7F" 小写x大写F', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('0x7F', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 "0X7F" 大写X大写F', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('0X7F', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 "0x7f" 小写xf', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('0x7f', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 "0xff" 超出范围抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8('0xff', 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 "0xFF" 超出范围抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8('0xFF', 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

test('value 为 "0XFF" 超出范围抛错', () => {
  const buf = Buffer.alloc(2);
  try {
    buf.writeInt8('0XFF', 0);
    return false;
  } catch (e) {
    return e.message.includes('value') || e.message.includes('range');
  }
});

// 特殊运算结果
test('value 为 100 + 27 计算结果', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(100 + 27, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 100 - 228 计算结果', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(100 - 228, 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 0 / -1 结果为 -0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(0 / -1, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 -0 + 0 结果为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-0 + 0, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 Math.sqrt(-1) 结果为 NaN', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Math.sqrt(-1), 0);
  return result === 1 && buf[0] === 0;
});

// 返回值作为下一个 offset
test('使用返回值作为链式 offset', () => {
  const buf = Buffer.alloc(10);
  let offset = 0;
  offset = buf.writeInt8(10, offset);
  offset = buf.writeInt8(20, offset);
  offset = buf.writeInt8(30, offset);
  return offset === 3 && buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

// 对象的 valueOf/toString 优先级
test('对象只有 toString 无 valueOf', () => {
  const buf = Buffer.alloc(2);
  const obj = {
    toString: () => '100',
    valueOf: undefined
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 100;
});

test('对象 valueOf 返回对象时使用 toString', () => {
  const buf = Buffer.alloc(2);
  const obj = {
    valueOf: () => ({ value: 50 }),
    toString: () => '60'
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 60;
});

test('对象 valueOf 返回字符串', () => {
  const buf = Buffer.alloc(2);
  const obj = {
    valueOf: () => '70'
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 70;
});

test('对象 Symbol.toPrimitive 优先级最高', () => {
  const buf = Buffer.alloc(2);
  const obj = {
    [Symbol.toPrimitive]: () => 80,
    valueOf: () => 90,
    toString: () => '100'
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 80;
});

// 负数的十六进制等字符串（不支持）
test('value 为 "-0x1" 转换为 NaN', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('-0x1', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 "-0x10" 转换为 NaN', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('-0x10', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 "-0o10" 转换为 NaN', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('-0o10', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 "-0b1111" 转换为 NaN', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('-0b1111', 0);
  return result === 1 && buf[0] === 0;
});

// 浮点数的特殊表示
test('value 为 .5（无前导零）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(.5, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 -.5（负数无前导零）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-.5, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 127.（无小数部分）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(127., 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 -128.（负数无小数部分）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-128., 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 1.27e2（科学计数法有小数）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(1.27e2, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 -1.28e2（负科学计数法）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-1.28e2, 0);
  return result === 1 && buf[0] === 0x80;
});

// 共享 ArrayBuffer
test('多个 Buffer 共享同一 ArrayBuffer', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab, 0, 5);
  const buf2 = Buffer.from(ab, 5, 5);

  buf1.writeInt8(111, 0);
  buf2.writeInt8(99, 0);

  const view = new Uint8Array(ab);
  return view[0] === 111 && view[5] === 99;
});

// offset 超过 32 位整数范围
test('offset 为 2^32 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(42, Math.pow(2, 32));
    return false;
  } catch (e) {
    return true;
  }
});

test('offset 为 2^33 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(42, Math.pow(2, 33));
    return false;
  } catch (e) {
    return true;
  }
});

// 位运算结果
test('value 为 127 & 0xFF', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(127 & 0xFF, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 255 & 0x7F', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(255 & 0x7F, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 ~0（-1）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(~0, 0);
  return result === 1 && buf[0] === 0xFF;
});

test('value 为 -1 << 7（-128）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-1 << 7, 0);
  return result === 1 && buf[0] === 0x80;
});

// buffer.length 边界
test('写入 buffer.length - 1 位置', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeInt8(42, buf.length - 1);
  return result === 10 && buf[9] === 42;
});

test('写入 buffer.length 位置抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(42, buf.length);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// Math 方法返回值
test('value 为 Math.abs(-127)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Math.abs(-127), 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 Math.ceil(126.1)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Math.ceil(126.1), 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 Math.floor(127.9)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Math.floor(127.9), 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 Math.round(126.5)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Math.round(126.5), 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 Math.trunc(-128.9)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Math.trunc(-128.9), 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 Math.sign(100)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Math.sign(100), 0);
  return result === 1 && buf[0] === 1;
});

test('value 为 Math.sign(-100)', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(Math.sign(-100), 0);
  return result === 1 && buf[0] === 0xFF;
});

// 多引用同步
test('多个引用指向同一 buffer 同步更新', () => {
  const original = Buffer.alloc(4);
  const alias = original;
  const slice = original.subarray(0);

  original.writeInt8(88, 0);
  alias.writeInt8(99, 1);
  slice.writeInt8(77, 2);

  return original[0] === 88 && alias[1] === 99 && slice[2] === 77;
});

// apply 和 bind
test('使用 apply 调用 writeInt8', () => {
  const buf = Buffer.alloc(4);
  Buffer.prototype.writeInt8.apply(buf, [55, 0]);
  return buf[0] === 55;
});

test('使用 bind 绑定 this 后调用', () => {
  const buf = Buffer.alloc(4);
  const boundWrite = Buffer.prototype.writeInt8.bind(buf);
  boundWrite(66, 1);
  return buf[1] === 66;
});

// offset 为负浮点数
test('offset 为 -0.1 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(42, -0.1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('integer');
  }
});

test('offset 为 -1.0 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(42, -1.0);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('offset 为 -1.5 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(42, -1.5);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('integer');
  }
});

// 字符串前导零
test('value 为 "0127" 解析为十进制 127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('0127', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 "00127" 解析为十进制 127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('00127', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 "0000000127" 解析为十进制 127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('0000000127', 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 "-0128" 解析为 -128', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('-0128', 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 "00" 解析为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('00', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 "0x00" 解析为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('0x00', 0);
  return result === 1 && buf[0] === 0;
});

// offset 为对象（应该抛错或转换）
test('offset 为有 valueOf 的对象抛出错误', () => {
  const buf = Buffer.alloc(10);
  const offsetObj = {
    valueOf: () => 3,
    toString: () => '5'
  };
  try {
    buf.writeInt8(42, offsetObj);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('type');
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
