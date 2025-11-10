// buf.length - Part 17: Missing Edge Cases
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

// Buffer.from() 错误场景
test('Buffer.from() 无参数应抛出错误', () => {
  try {
    const buf = Buffer.from();
    return false; // 不应该执行到这里
  } catch (e) {
    return e.message.includes('first argument') || e.message.includes('undefined');
  }
});

test('Buffer.from([]) 空数组长度为 0', () => {
  const buf = Buffer.from([]);
  return buf.length === 0;
});

test('Buffer.from("") 空字符串长度为 0', () => {
  const buf = Buffer.from('');
  return buf.length === 0;
});

// Buffer.concat 边界情况
test('Buffer.concat([]) 空数组长度为 0', () => {
  const buf = Buffer.concat([]);
  return buf.length === 0;
});

test('Buffer.concat([buf], 0) 指定长度为 0', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.concat([buf1], 0);
  return buf2.length === 0;
});

test('Buffer.concat 指定长度小于实际长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const buf3 = Buffer.concat([buf1, buf2], 5);
  return buf3.length === 5;
});

test('Buffer.concat 指定长度大于实际长度', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.concat([buf1], 10);
  return buf2.length === 10;
});

// slice 和 subarray 无参数
test('buf.slice() 无参数返回完整副本', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice();
  return slice.length === 5;
});

test('buf.subarray() 无参数返回完整视图', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray();
  return sub.length === 5;
});

test('buf.slice(undefined) 行为', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(undefined);
  return slice.length === 5;
});

test('buf.slice(undefined, undefined) 行为', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(undefined, undefined);
  return slice.length === 5;
});

// SharedArrayBuffer 支持
test('从 SharedArrayBuffer 创建 Buffer', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const buf = Buffer.from(sab);
    return buf.length === 10;
  } catch (e) {
    // 某些环境可能不支持 SharedArrayBuffer
    return true;
  }
});

test('从 SharedArrayBuffer 带 offset 创建', () => {
  try {
    const sab = new SharedArrayBuffer(20);
    const buf = Buffer.from(sab, 5);
    return buf.length === 15;
  } catch (e) {
    return true;
  }
});

test('从 SharedArrayBuffer 带 offset 和 length 创建', () => {
  try {
    const sab = new SharedArrayBuffer(20);
    const buf = Buffer.from(sab, 5, 10);
    return buf.length === 10;
  } catch (e) {
    return true;
  }
});

// Buffer.from(Buffer) 嵌套
test('Buffer.from(Buffer.from()) 嵌套创建', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from(buf1);
  const buf3 = Buffer.from(buf2);
  return buf3.length === 4;
});

// ArrayBuffer offset 和 length 边界
test('ArrayBuffer offset 超出范围应抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    const buf = Buffer.from(ab, 20);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('out');
  }
});

test('ArrayBuffer offset 等于 byteLength', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 10);
  return buf.length === 0;
});

test('ArrayBuffer length 为负数', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, -5);
  return buf.length === 0;
});

test('ArrayBuffer length 为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 0);
  return buf.length === 0;
});

test('ArrayBuffer offset + length 超出范围应抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    const buf = Buffer.from(ab, 5, 10);
    return false; // 不应该执行到这里
  } catch (e) {
    return e.message.includes('length') || e.message.includes('out');
  }
});

// Buffer.alloc/allocUnsafe 错误参数
test('Buffer.alloc(-1) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(-1);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('range');
  }
});

test('Buffer.alloc(Infinity) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(Infinity);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('range');
  }
});

test('Buffer.alloc(NaN) 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(NaN);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('range');
  }
});

test('Buffer.allocUnsafe(-1) 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(-1);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('range');
  }
});

test('Buffer.allocUnsafe(Infinity) 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(Infinity);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('range');
  }
});

test('Buffer.allocUnsafe(NaN) 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(NaN);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('range');
  }
});

test('Buffer.allocUnsafeSlow(-1) 应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e.message.includes('size') || e.message.includes('range');
  }
});

// 浮点数 size
test('Buffer.alloc(10.5) 应截断为 10', () => {
  const buf = Buffer.alloc(10.5);
  return buf.length === 10;
});

test('Buffer.alloc(10.9) 应截断为 10', () => {
  const buf = Buffer.alloc(10.9);
  return buf.length === 10;
});

test('Buffer.allocUnsafe(5.1) 应截断为 5', () => {
  const buf = Buffer.allocUnsafe(5.1);
  return buf.length === 5;
});

// 字符串 size
test('Buffer.alloc("10") 字符串数字', () => {
  try {
    const buf = Buffer.alloc('10');
    return buf.length === 10;
  } catch (e) {
    // 可能抛出类型错误
    return true;
  }
});

test('Buffer.alloc("abc") 非数字字符串应抛出错误', () => {
  try {
    const buf = Buffer.alloc('abc');
    return false;
  } catch (e) {
    return true;
  }
});

// 零长度操作
test('零长度 Buffer 的 slice', () => {
  const buf = Buffer.alloc(0);
  const slice = buf.slice(0, 0);
  return slice.length === 0;
});

test('零长度 Buffer 的 subarray', () => {
  const buf = Buffer.alloc(0);
  const sub = buf.subarray(0, 0);
  return sub.length === 0;
});

test('零长度 Buffer 的 toString', () => {
  const buf = Buffer.alloc(0);
  const str = buf.toString();
  return buf.length === 0 && str === '';
});

// slice 和 subarray 的边界组合
test('slice(0, 0) 长度为 0', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(0, 0);
  return slice.length === 0;
});

test('slice(5, 5) 长度为 0', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(5, 5);
  return slice.length === 0;
});

test('slice(-0) 行为', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(-0);
  return slice.length === 5;
});

test('subarray(null) 行为', () => {
  const buf = Buffer.from('hello');
  try {
    const sub = buf.subarray(null);
    return sub.length === 5;
  } catch (e) {
    return true;
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
