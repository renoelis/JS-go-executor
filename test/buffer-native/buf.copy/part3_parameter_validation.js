// buf.copy() - Parameter Validation and Type Tests
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

// TypedArray 作为目标
test('复制到 Uint8Array', () => {
  const buf = Buffer.from('hello');
  const target = new Uint8Array(10);
  const bytes = buf.copy(target, 0);
  // Buffer 应该能复制到 TypedArray
  return bytes === 5 && Buffer.from(target.slice(0, 5)).toString() === 'hello';
});

test('复制到 Uint16Array', () => {
  const buf = Buffer.from('ab');
  const target = new Uint16Array(5);
  const bytes = buf.copy(target, 0);
  // 应该按字节复制
  return bytes === 2;
});

test('复制到 Int8Array', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const target = new Int8Array(10);
  const bytes = buf.copy(target, 0);
  return bytes === 5 && target[0] === 1 && target[4] === 5;
});

// undefined 参数测试
test('targetStart 为 undefined', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, undefined);
  // undefined 应被视为 0
  return bytes === 5 && buf2.slice(0, 5).toString() === 'hello';
});

test('sourceStart 为 undefined', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, undefined);
  // undefined 应被视为 0
  return bytes === 5;
});

test('sourceEnd 为 undefined', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 0, undefined);
  // undefined 应复制到末尾
  return bytes === 5;
});

test('所有参数为 undefined', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, undefined, undefined, undefined);
  return bytes === 5 && buf2.slice(0, 5).toString() === 'hello';
});

// NaN 参数测试
test('targetStart 为 NaN', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, NaN);
  // NaN 应被视为 0
  return bytes === 5;
});

test('sourceStart 为 NaN', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, NaN);
  // NaN 应被视为 0
  return bytes === 5;
});

test('sourceEnd 为 NaN', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 0, NaN);
  // NaN 应被视为 0，复制 0 字节
  return bytes === 0;
});

// Infinity 参数测试
test('targetStart 为 Infinity', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10, 0x61);
  const bytes = buf1.copy(buf2, Infinity);
  // Infinity 通过位运算转换为 0
  return bytes === 5 && buf2.slice(0, 5).toString() === 'hello';
});

test('sourceEnd 为 Infinity', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 0, Infinity);
  // Infinity 通过位运算转换为 0, sourceStart=0, sourceEnd=0, 复制 0 字节
  return bytes === 0;
});

test('targetStart 为 -Infinity', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, -Infinity);
  // -Infinity 应被视为 0
  return bytes === 5;
});

// 字符串参数测试
test('targetStart 为数字字符串', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10, 0);
  const bytes = buf1.copy(buf2, '2');
  // 字符串应被转换为数字
  return buf2.slice(2, 7).toString() === 'hello';
});

test('targetStart 为非数字字符串', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 'abc');
  // 非数字字符串应被视为 NaN -> 0
  return bytes === 5;
});

// null 参数测试
test('targetStart 为 null', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, null);
  // null 应被视为 0
  return bytes === 5;
});

test('sourceStart 为 null', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, null);
  // null 应被视为 0
  return bytes === 5;
});

// boolean 参数测试
test('targetStart 为 true', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.alloc(10, 0);
  const bytes = buf1.copy(buf2, true);
  // true 应被转换为 1
  return buf2.slice(1, 3).toString() === 'hi';
});

test('targetStart 为 false', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, false);
  // false 应被转换为 0
  return bytes === 2;
});

// 对象参数测试
test('targetStart 为空对象', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, {});
  // {} 应被转换为 NaN -> 0
  return bytes === 5;
});

test('targetStart 为有 valueOf 的对象', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.alloc(10, 0);
  const bytes = buf1.copy(buf2, { valueOf: () => 3 });
  // 应调用 valueOf
  return buf2.slice(3, 5).toString() === 'hi';
});

// 数组参数测试
test('targetStart 为空数组', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, []);
  // [] 应被转换为 0
  return bytes === 5;
});

test('targetStart 为单元素数组', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.alloc(10, 0);
  const bytes = buf1.copy(buf2, [2]);
  // [2] 应被转换为 2
  return buf2.slice(2, 4).toString() === 'hi';
});

// 特殊数值测试
test('targetStart 为 -0', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, -0);
  // -0 应等同于 0
  return bytes === 5;
});

test('非常小的正浮点数', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0.0001);
  // 应向下取整为 0
  return bytes === 5;
});

test('非常接近整数的浮点数', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.alloc(10, 0);
  const bytes = buf1.copy(buf2, 2.9999999);
  // 应向下取整为 2
  return buf2.slice(2, 4).toString() === 'hi';
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

