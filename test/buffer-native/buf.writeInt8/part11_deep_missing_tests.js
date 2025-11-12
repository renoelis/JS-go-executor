// buf.writeInt8() - Deep Missing Coverage Tests
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

// Symbol 类型测试
test('value 为 Symbol 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('convert');
  }
});

test('offset 为 Symbol 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, Symbol('test'));
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('symbol');
  }
});

test('value 为 Symbol.for 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(Symbol.for('test'), 0);
    return false;
  } catch (e) {
    return e.message.includes('Symbol') || e.message.includes('convert');
  }
});

// Function 类型测试
test('value 为函数写入 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(function(){}, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为箭头函数写入 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(() => {}, 0);
  return result === 1 && buf[0] === 0;
});

test('value 为命名函数写入 0', () => {
  const buf = Buffer.alloc(4);
  function testFunc() {}
  const result = buf.writeInt8(testFunc, 0);
  return result === 1 && buf[0] === 0;
});

test('offset 为函数抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, function(){});
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('function');
  }
});

// 带有特殊方法的对象
test('offset 为带 valueOf 的对象抛出错误', () => {
  const buf = Buffer.alloc(10);
  const obj = { valueOf: () => 2 };
  try {
    buf.writeInt8(99, obj);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('type');
  }
});

test('offset 为带 toString 的对象抛出错误', () => {
  const buf = Buffer.alloc(10);
  const obj = { toString: () => '2' };
  try {
    buf.writeInt8(99, obj);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('type');
  }
});

test('value 为带 Symbol.toPrimitive 的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = { 
    [Symbol.toPrimitive]: (hint) => {
      return 100;
    }
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 100;
});

test('value 为带 Symbol.toPrimitive 返回超范围值抛出错误', () => {
  const buf = Buffer.alloc(4);
  const obj = { 
    [Symbol.toPrimitive]: () => 200
  };
  try {
    buf.writeInt8(obj, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') && e.message.includes('range');
  }
});

// 精确边界值测试
test('value 为 -128.0（精确边界）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(-128.0, 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 127.0（精确边界）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(127.0, 0);
  return result === 1 && buf[0] === 0x7F;
});

// 极大/极小数值
test('value 为 1e10 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(1e10, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') && e.message.includes('range');
  }
});

test('value 为 -1e10 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(-1e10, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') && e.message.includes('range');
  }
});

test('value 为 1e100 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(1e100, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') && e.message.includes('range');
  }
});

// 负浮点数 offset
test('offset 为 -0.5 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, -0.5);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('integer');
  }
});

test('offset 为 -1.5 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, -1.5);
    return false;
  } catch (e) {
    return e.message.includes('offset') && (e.message.includes('integer') || e.message.includes('range'));
  }
});

test('offset 为 -2.0 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, -2.0);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('range');
  }
});

// 特殊字符串值
test('value 为空格字符串转换为 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(' ', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为制表符字符串转换为 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8('\t', 0);
  return result === 1 && buf[0] === 0;
});

test('value 为换行符字符串转换为 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8('\n', 0);
  return result === 1 && buf[0] === 0;
});

// 特殊对象值
test('value 为 Set 对象转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(new Set([1, 2]), 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 Map 对象转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(new Map([[1, 2]]), 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 WeakSet 对象转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(new WeakSet(), 0);
  return result === 1 && buf[0] === 0;
});

test('value 为 WeakMap 对象转换为 NaN 写入 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(new WeakMap(), 0);
  return result === 1 && buf[0] === 0;
});

// 冻结和密封的 Buffer
test('尝试冻结 Buffer 会抛出错误', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(42, 0);
  try {
    Object.freeze(buf);
    return false; // 应该抛出错误
  } catch (e) {
    // Node.js 不允许冻结 Buffer
    return e.message.includes('freeze') || e.message.includes('array buffer');
  }
});

test('尝试密封 Buffer 会抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    Object.seal(buf);
    return false; // 应该抛出错误
  } catch (e) {
    // Node.js 不允许密封 Buffer
    return e.message.includes('seal') || e.message.includes('array buffer');
  }
});

// 原型链修改测试
test('修改 Buffer.prototype 不影响 writeInt8', () => {
  const buf = Buffer.alloc(4);
  const originalWrite = Buffer.prototype.writeInt8;
  Buffer.prototype.customProp = 'test';
  buf.writeInt8(55, 0);
  delete Buffer.prototype.customProp;
  return buf[0] === 55;
});

// 多次连续写入同一位置
test('连续 100 次写入同一位置', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 100; i++) {
    buf.writeInt8(i % 256 - 128, 0);
  }
  return buf[0] === ((99 % 256 - 128) & 0xFF);
});

// 写入后读取验证
test('写入 -1 后 readInt8 读取验证', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-1, 0);
  return buf.readInt8(0) === -1;
});

test('写入 127 后 readInt8 读取验证', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(127, 0);
  return buf.readInt8(0) === 127;
});

test('写入 -128 后 readInt8 读取验证', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-128, 0);
  return buf.readInt8(0) === -128;
});

// Proxy 对象测试（如果 Proxy 不在禁用列表）
// 注：根据规则，Proxy 是禁用关键词，所以这个测试被注释掉
// test('value 为 Proxy 对象', () => { ... });

// 特殊数学运算结果
test('value 为 Math.pow(2, 7) - 1（127）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(Math.pow(2, 7) - 1, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 -Math.pow(2, 7)（-128）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(-Math.pow(2, 7), 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 Math.pow(2, 7) 抛出错误（128）', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(Math.pow(2, 7), 0);
    return false;
  } catch (e) {
    return e.message.includes('value') && e.message.includes('range');
  }
});

// 位运算结果
test('value 为 0xFF & 0x7F（127）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(0xFF & 0x7F, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 ~127（-128）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(~127, 0);
  return result === 1 && buf[0] === 0x80;
});

// 特殊 ArrayBuffer 和 TypedArray 组合
test('共享 ArrayBuffer 的多个 Buffer 写入互不影响', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab, 0, 5);
  const buf2 = Buffer.from(ab, 5, 5);
  buf1.writeInt8(100, 0);
  buf2.writeInt8(-50, 0);
  return buf1[0] === 100 && buf2[0] === 206;
});

// 超长 offset（接近 Number.MAX_SAFE_INTEGER）
test('offset 为 2^53 - 1 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(10, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('range');
  }
});

test('offset 为 2^53 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeInt8(10, Math.pow(2, 53));
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('range');
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
