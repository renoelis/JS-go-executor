// buf.byteOffset - 函数属性和极端类型测试
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

// ========== Part 1: byteOffset 属性特性验证 ==========

test('byteOffset 是 getter 属性', () => {
  const buf = Buffer.alloc(10);
  // byteOffset 是继承的 getter，不是实例自有属性
  return !buf.hasOwnProperty('byteOffset');
});

test('byteOffset 属性描述符验证', () => {
  const buf = Buffer.alloc(10);
  // 通过检查 byteOffset 的行为来验证它是 getter
  const offset1 = buf.byteOffset;
  const slice = buf.slice(5);
  const offset2 = slice.byteOffset;
  return typeof offset1 === 'number' && typeof offset2 === 'number' && offset2 !== offset1;
});

test('byteOffset 不可枚举', () => {
  const buf = Buffer.alloc(10);
  const keys = [];
  for (let key in buf) {
    keys.push(key);
  }
  return !keys.includes('byteOffset');
});

test('byteOffset 在 for...in 中不可枚举', () => {
  const buf = Buffer.alloc(10);
  const keys = [];
  for (let key in buf) {
    keys.push(key);
  }
  return !keys.includes('byteOffset');
});

test('byteOffset 属性稳定性', () => {
  const buf = Buffer.alloc(10);
  const offset1 = buf.byteOffset;
  const offset2 = buf.byteOffset;
  return offset1 === offset2 && typeof offset1 === 'number';
});

// ========== Part 2: 极端参数类型测试 ==========

test('Symbol 类型不能作为 ArrayBuffer offset', () => {
  try {
    const ab = new ArrayBuffer(10);
    const sym = Symbol('test');
    Buffer.from(ab, sym);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Cannot convert') || e.message.includes('number');
  }
});

test('BigInt 类型不能作为 ArrayBuffer offset', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, 5n);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Cannot convert') || e.message.includes('number');
  }
});

test('函数类型作为 ArrayBuffer offset - 转换为 NaN 然后 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, function() {});
  return buf.byteOffset === 0; // 函数转换为 NaN，然后转换为 0
});

test('对象类型作为 ArrayBuffer offset - valueOf 转换', () => {
  const ab = new ArrayBuffer(10);
  const obj = { valueOf: () => 3 };
  const buf = Buffer.from(ab, obj);
  return buf.byteOffset === 3;
});

test('对象类型作为 ArrayBuffer offset - toString 转换', () => {
  const ab = new ArrayBuffer(10);
  const obj = { toString: () => '5' };
  const buf = Buffer.from(ab, obj);
  return buf.byteOffset === 5;
});

test('null 作为 ArrayBuffer offset - 转换为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, null);
  return buf.byteOffset === 0;
});

test('undefined 作为 ArrayBuffer offset - 转换为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, undefined);
  return buf.byteOffset === 0;
});

test('布尔值 true 作为 ArrayBuffer offset - 转换为 1', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, true);
  return buf.byteOffset === 1;
});

test('布尔值 false 作为 ArrayBuffer offset - 转换为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, false);
  return buf.byteOffset === 0;
});

test('字符串数字作为 ArrayBuffer offset', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, '3');
  return buf.byteOffset === 3;
});

test('字符串非数字作为 ArrayBuffer offset - 转换为 NaN 然后 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 'hello');
  return buf.byteOffset === 0;
});

// ========== Part 3: 数值边界测试 ==========

test('Infinity 作为 ArrayBuffer offset - 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, Infinity);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('-Infinity 作为 ArrayBuffer offset - 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, -Infinity);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('NaN 作为 ArrayBuffer offset - 转换为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, NaN);
  return buf.byteOffset === 0;
});

test('小数作为 ArrayBuffer offset - 向下取整', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3.7);
  return buf.byteOffset === 3;
});

test('负小数作为 ArrayBuffer offset - 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, -3.7);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('bounds') || e.message.includes('range');
  }
});

test('科学计数法作为 ArrayBuffer offset - 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, 2e1); // 20，但 ArrayBuffer 只有 10 字节，应该抛出错误
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// ========== Part 4: slice/subarray 参数类型测试 ==========

test('slice 参数为 Symbol - 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.slice(Symbol('test'));
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Cannot convert') || e.message.includes('number');
  }
});

test('subarray 参数为 Symbol - 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.subarray(Symbol('test'));
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Cannot convert') || e.message.includes('number');
  }
});

test('slice 参数为 BigInt - 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.slice(3n);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Cannot convert') || e.message.includes('number');
  }
});

test('subarray 参数为 BigInt - 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.subarray(3n);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Cannot convert') || e.message.includes('number');
  }
});

test('slice 参数为对象 - valueOf 转换', () => {
  const buf = Buffer.alloc(10);
  const obj = { valueOf: () => 3 };
  const slice = buf.slice(obj);
  return slice.byteOffset === buf.byteOffset + 3;
});

test('subarray 参数为对象 - valueOf 转换', () => {
  const buf = Buffer.alloc(10);
  const obj = { valueOf: () => 3 };
  const sub = buf.subarray(obj);
  return sub.byteOffset === buf.byteOffset + 3;
});

// ========== Part 5: 特殊数值处理 ==========

test('slice 参数为 Infinity - 处理为超出边界', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(Infinity);
  return slice.byteOffset === buf.byteOffset + 10 && slice.length === 0;
});

test('subarray 参数为 Infinity - 处理为超出边界', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(Infinity);
  return sub.byteOffset === buf.byteOffset + 10 && sub.length === 0;
});

test('slice 参数为 -Infinity - 处理为 0', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(-Infinity);
  return slice.byteOffset === buf.byteOffset + 0 && slice.length === 10;
});

test('subarray 参数为 -Infinity - 处理为 0', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(-Infinity);
  return sub.byteOffset === buf.byteOffset + 0 && sub.length === 10;
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
