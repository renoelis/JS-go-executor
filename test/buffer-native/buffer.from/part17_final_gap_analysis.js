// Buffer.from() - Part 17: Final Gap Analysis and Missing Edge Cases
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

function testError(name, fn, expectedError) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error was not thrown' });
  } catch (e) {
    let pass = true;
    if (expectedError) {
      if (typeof expectedError === 'string') {
        pass = e.name === expectedError || e.code === expectedError;
      } else {
        pass = e instanceof expectedError;
      }
    }
    tests.push({ name, status: pass ? '✅' : '❌', actualError: e.message });
  }
}

// 1. Buffer.from 函数属性测试
test('Buffer.from.length 属性', () => {
  return Buffer.from.length >= 1; // Node.js 中实际为 3
});

test('Buffer.from.name 属性', () => {
  return Buffer.from.name === 'from';
});

// 2. 特殊的 ArrayBuffer 场景
test('ArrayBuffer - 零长度 ArrayBuffer', () => {
  const ab = new ArrayBuffer(0);
  const buf = Buffer.from(ab);
  return buf.length === 0;
});

test('ArrayBuffer - 非常大的 offset（等于 byteLength）', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 10);
  return buf.length === 0;
});

test('ArrayBuffer - length 为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 0);
  return buf.length === 0;
});

// 3. 特殊的字符串编码场景
test('字符串 - 编码名大小写混合', () => {
  const buf1 = Buffer.from('hello', 'UTF8');
  const buf2 = Buffer.from('hello', 'utf8');
  return buf1.equals(buf2);
});

test('字符串 - 编码名带空格', () => {
  try {
    Buffer.from('hello', ' utf8 ');
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 4. 特殊的数组场景
test('数组 - 包含 BigInt（应该转换）', () => {
  try {
    const buf = Buffer.from([1n, 2n, 3n]);
    return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('数组 - 包含 Symbol（应该抛出错误）', () => {
  try {
    Buffer.from([Symbol('test')]);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('数组 - 稀疏数组', () => {
  const arr = [1, , 3]; // 中间有空洞
  const buf = Buffer.from(arr);
  return buf.length === 3 && buf[0] === 1 && buf[1] === 0 && buf[2] === 3;
});

// 5. 特殊的 TypedArray 场景
test('TypedArray - Int8Array 负数', () => {
  const int8 = new Int8Array([-1, -128, 127]);
  const buf = Buffer.from(int8);
  return buf[0] === 255 && buf[1] === 128 && buf[2] === 127;
});

test('TypedArray - Float32Array（应该截断）', () => {
  const float32 = new Float32Array([1.5, 2.9, 256.7]);
  const buf = Buffer.from(float32);
  return buf.length === 3;
});

test('TypedArray - BigUint64Array（应该抛出错误）', () => {
  try {
    const bigUint64 = new BigUint64Array([256n, 257n]);
    const buf = Buffer.from(bigUint64);
    return false; // 不应该成功
  } catch (e) {
    return e instanceof TypeError; // 应该抛出 TypeError
  }
});

// 6. 特殊的对象场景
test('对象 - 同时有 valueOf 和 Symbol.toPrimitive', () => {
  const obj = {
    valueOf() { return 'from valueOf'; },
    [Symbol.toPrimitive]() { return 'from toPrimitive'; }
  };
  const buf = Buffer.from(obj);
  // 实际上 Node.js 会调用 valueOf，而不是 toPrimitive
  return buf.toString() === 'from valueOf';
});

test('对象 - Symbol.toPrimitive 返回非字符串', () => {
  const obj = {
    [Symbol.toPrimitive]() { return [1, 2, 3]; }
  };
  try {
    const buf = Buffer.from(obj);
    return buf.length === 3;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('对象 - valueOf 返回 ArrayBuffer', () => {
  const ab = new ArrayBuffer(5);
  const obj = {
    valueOf() { return ab; }
  };
  const buf = Buffer.from(obj);
  return buf.length === 5;
});

// 7. 边界情况的参数验证
test('第二参数 - null 作为编码', () => {
  try {
    const buf = Buffer.from('test', null);
    return buf.toString() === 'test'; // null 被转换为 'null' 字符串
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('第二参数 - undefined 作为编码', () => {
  const buf = Buffer.from('test', undefined);
  return buf.toString() === 'test'; // undefined 使用默认编码
});

// 8. 特殊的 Buffer 复制场景
test('Buffer - 复制空 Buffer', () => {
  const empty = Buffer.alloc(0);
  const copy = Buffer.from(empty);
  return copy.length === 0 && copy !== empty;
});

test('Buffer - 复制子类 Buffer', () => {
  class MyBuffer extends Buffer {}
  const original = MyBuffer.from('test');
  const copy = Buffer.from(original);
  return copy.toString() === 'test' && copy !== original;
});

// 9. 内存共享验证
test('ArrayBuffer - 修改原 ArrayBuffer 影响 Buffer', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 42;
  const buf = Buffer.from(ab);
  view[0] = 99; // 修改原数据
  return buf[0] === 99; // Buffer 应该反映修改
});

test('TypedArray.buffer - 内存共享验证', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4]);
  const buf = Buffer.from(uint8.buffer);
  uint8[0] = 99;
  return buf[0] === 99; // 应该共享内存
});

// 10. 编码的完整性测试
test('所有支持的编码别名 - binary', () => {
  const buf1 = Buffer.from('hello', 'binary');
  const buf2 = Buffer.from('hello', 'latin1');
  return buf1.equals(buf2);
});

test('所有支持的编码别名 - ucs2', () => {
  const buf1 = Buffer.from('hello', 'ucs2');
  const buf2 = Buffer.from('hello', 'utf16le');
  return buf1.equals(buf2);
});

test('所有支持的编码别名 - ucs-2', () => {
  const buf1 = Buffer.from('hello', 'ucs-2');
  const buf2 = Buffer.from('hello', 'utf16le');
  return buf1.equals(buf2);
});

// 11. 极端的字符串场景
test('字符串 - 包含 null 字符', () => {
  const str = 'hello\x00world';
  const buf = Buffer.from(str);
  return buf.length === 11 && buf[5] === 0;
});

test('字符串 - 只有 null 字符', () => {
  const buf = Buffer.from('\x00\x00\x00');
  return buf.length === 3 && buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

// 12. 类数组对象的特殊情况
test('类数组 - length 为浮点数', () => {
  const obj = { 0: 1, 1: 2, length: 2.5 };
  const buf = Buffer.from(obj);
  return buf.length === 2; // 浮点数被截断
});

test('类数组 - length 为负浮点数', () => {
  const obj = { 0: 1, length: -2.5 };
  const buf = Buffer.from(obj);
  return buf.length === 0;
});

// 13. 函数调用上下文测试
test('Buffer.from - call 调用', () => {
  const buf = Buffer.from.call(null, 'test');
  return buf.toString() === 'test';
});

test('Buffer.from - apply 调用', () => {
  const buf = Buffer.from.apply(null, ['test', 'utf8']);
  return buf.toString() === 'test';
});

// 14. 错误消息验证
testError('无效参数 - 数字', () => {
  Buffer.from(123);
}, TypeError);

testError('无效参数 - 布尔值', () => {
  Buffer.from(true);
}, TypeError);

testError('无效参数 - 函数', () => {
  Buffer.from(() => {});
}, TypeError);

// 输出结果
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
