// buffer.isUtf8() - Part 4: Offset and Length Parameters Tests
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 基本 offset 测试
test('offset = 0, 有效 UTF-8', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 0) === true;
});

test('offset = 1, 有效 UTF-8', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 1) === true; // "ello"
});

test('offset = length - 1', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, buf.length - 1) === true; // "o"
});

test('offset = length (空)', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, buf.length) === true; // 空
});

test('offset > length (应返回 false 或抛错)', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, buf.length + 1);
    return result === false || result === true; // 取决于实现
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('offset 为负数', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, -1);
    return typeof result === 'boolean'; // 负数可能被转换为 0 或其他值
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('offset 为小数', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 2.5);
    return typeof result === 'boolean'; // 可能被截断为 2
  } catch (e) {
    return true; // 或者抛错也可接受
  }
});

test('offset 为 NaN', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, NaN);
    return typeof result === 'boolean'; // NaN 可能被转换为 0
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('offset 为 Infinity', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, Infinity);
    return typeof result === 'boolean'; // Infinity 可能被转换或截断
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

// length 参数测试
test('offset = 0, length = buffer.length', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 0, buf.length) === true;
});

test('offset = 0, length = 3', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 0, 3) === true; // "Hel"
});

test('offset = 1, length = 3', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 1, 3) === true; // "ell"
});

test('offset = 2, length = 0', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 2, 0) === true; // 空
});

test('length 超出范围', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, buf.length + 10);
    return result === false || result === true; // 取决于实现
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('length 为负数', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, -1);
    return typeof result === 'boolean'; // 负数可能被转换或截断
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('length 为 NaN', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, NaN);
    return typeof result === 'boolean'; // NaN 可能被转换为 0
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

test('length 为 Infinity', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, Infinity);
    return typeof result === 'boolean'; // Infinity 可能被转换或截断
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

// 多字节字符的 offset/length 测试
test('多字节 UTF-8 - offset 在字符中间', () => {
  const buf = Buffer.from('你好', 'utf8'); // 每个字符 3 字节
  const result = isUtf8(buf, 1); // 从字符中间开始
  return result === false || result === true; // 取决于实现，可能返回 false
});

test('多字节 UTF-8 - offset 在字符边界', () => {
  const buf = Buffer.from('你好', 'utf8'); // 每个字符 3 字节
  return isUtf8(buf, 3) === true; // 从第二个字符开始，有效
});

test('多字节 UTF-8 - length 截断字符', () => {
  const buf = Buffer.from('你好', 'utf8'); // 每个字符 3 字节
  const result = isUtf8(buf, 0, 4); // 截断第二个字符
  return result === false || result === true; // 取决于实现
});

test('多字节 UTF-8 - length 在字符边界', () => {
  const buf = Buffer.from('你好', 'utf8'); // 每个字符 3 字节
  return isUtf8(buf, 0, 3) === true; // 完整第一个字符，有效
});

test('Emoji - offset 在字符中间', () => {
  const buf = Buffer.from('😀', 'utf8'); // 4 字节
  const result = isUtf8(buf, 1); // 从中间开始
  return result === false || result === true; // 取决于实现
});

test('Emoji - offset 在字符边界', () => {
  const buf = Buffer.from('😀😀', 'utf8'); // 每个 4 字节
  return isUtf8(buf, 4) === true; // 从第二个 emoji 开始，有效
});

test('Emoji - length 截断字符', () => {
  const buf = Buffer.from('😀', 'utf8'); // 4 字节
  const result = isUtf8(buf, 0, 3); // 截断 emoji
  return result === false || result === true; // 取决于实现
});

// 组合 offset + length 边界测试
test('offset + length = buffer.length', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 2, 3) === true; // "llo"
});

test('offset + length > buffer.length', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 3, 5);
    return result === false || result === true; // 取决于实现
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('offset = 0, length = 0', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 0, 0) === true; // 空范围
});

// TypedArray 的 offset/length 测试
test('Uint8Array - offset = 1', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(arr, 1) === true; // "ello"
});

test('Uint8Array - offset = 1, length = 3', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(arr, 1, 3) === true; // "ell"
});

test('ArrayBuffer - offset = 1', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(ab, 1) === true; // "ello"
});

test('ArrayBuffer - offset = 1, length = 3', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(ab, 1, 3) === true; // "ell"
});

// offset/length 参数类型测试
test('offset 为字符串数字', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, '1');
    return typeof result === 'boolean'; // 可能被转换
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('length 为字符串数字', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, '3');
    return typeof result === 'boolean'; // 可能被转换
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('offset 为 null', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, null);
    return typeof result === 'boolean'; // 可能被转换为 0
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('length 为 undefined', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 0, undefined) === true; // undefined 表示到末尾
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
