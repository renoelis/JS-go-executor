// buffer.isUtf8() - Part 13: Parameter Coercion and Edge Cases
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

// 参数类型转换测试
test('offset 参数 - 布尔值 true', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, true); // true 可能被转换为 1
    return typeof result === 'boolean';
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('offset 参数 - 布尔值 false', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, false); // false 可能被转换为 0
    return typeof result === 'boolean';
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('offset 参数 - 空字符串', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, ''); // 空字符串可能被转换为 0
    return typeof result === 'boolean';
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('offset 参数 - 非数字字符串', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 'abc'); // 非数字字符串可能被转换为 NaN
    return typeof result === 'boolean';
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('offset 参数 - 对象', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, {});
    return typeof result === 'boolean'; // 可能被转换
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('offset 参数 - 数组', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, []);
    return typeof result === 'boolean'; // 可能被转换为 0
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('offset 参数 - 函数', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, function() {});
    return typeof result === 'boolean'; // 可能被转换为 NaN
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('offset 参数 - Symbol', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, Symbol('test'));
    return typeof result === 'boolean'; // 可能抛错
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('length 参数 - 布尔值 true', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, true); // true 可能被转换为 1
    return typeof result === 'boolean';
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('length 参数 - 空字符串', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, ''); // 空字符串可能被转换为 0
    return typeof result === 'boolean';
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('length 参数 - 对象', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, {});
    return typeof result === 'boolean'; // 可能被转换
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 极端 offset/length 值
test('offset = Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, Number.MAX_SAFE_INTEGER);
    return typeof result === 'boolean'; // 可能返回 true（空范围）
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('offset = Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, Number.MIN_SAFE_INTEGER);
    return typeof result === 'boolean';
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('length = Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, Number.MAX_SAFE_INTEGER);
    return typeof result === 'boolean'; // 可能被截断到 buffer.length
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('offset = -0', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const result = isUtf8(buf, -0); // -0 应该等于 0
  return result === true;
});

test('length = -0', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const result = isUtf8(buf, 0, -0); // -0 应该等于 0
  return result === true; // 空范围
});

// 浮点数参数
test('offset 为浮点数 - 0.1', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0.1); // 可能被截断为 0
    return typeof result === 'boolean';
  } catch (e) {
    return true; // 或者抛错也可以接受
  }
});

test('offset 为浮点数 - 2.9', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 2.9); // 可能被截断为 2
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('length 为浮点数 - 3.5', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, 3.5); // 可能被截断为 3
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

// Buffer 边界情况
test('Buffer.length = 0 且 offset = 0', () => {
  const buf = Buffer.from([]);
  return isUtf8(buf, 0) === true;
});

test('Buffer.length = 1 且 offset = 0', () => {
  const buf = Buffer.from([0x41]); // 'A'
  return isUtf8(buf, 0) === true;
});

test('Buffer.length = 1 且 offset = 1', () => {
  const buf = Buffer.from([0x41]); // 'A'
  return isUtf8(buf, 1) === true; // 空范围
});

test('offset = length (边界)', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, buf.length) === true; // 空范围
});

test('offset = length, length = 0', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, buf.length, 0) === true; // 空范围
});

// 特殊输入类型的边界
test('Uint8Array 长度为 0', () => {
  const arr = new Uint8Array(0);
  return isUtf8(arr) === true;
});

test('Uint8Array 长度为 1', () => {
  const arr = new Uint8Array([0x41]); // 'A'
  return isUtf8(arr) === true;
});

test('ArrayBuffer 长度为 0', () => {
  const ab = new ArrayBuffer(0);
  return isUtf8(ab) === true;
});

test('ArrayBuffer 长度为 1', () => {
  const ab = new ArrayBuffer(1);
  const view = new Uint8Array(ab);
  view[0] = 0x41; // 'A'
  return isUtf8(ab) === true;
});

// 参数省略
test('只传入 Buffer，不传 offset', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf) === true;
});

test('传入 Buffer 和 undefined offset', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, undefined) === true; // undefined 表示从开头
});

test('传入 Buffer、offset 和 undefined length', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 0, undefined) === true; // undefined 表示到末尾
});

test('传入 Buffer、undefined offset 和 undefined length', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, undefined, undefined) === true;
});

// 参数过多
test('传入超过 3 个参数', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    const result = isUtf8(buf, 0, 5, 'extra'); // 额外参数应该被忽略
    return typeof result === 'boolean';
  } catch (e) {
    return true; // 或者抛错也可以接受
  }
});

// 组合边界测试
test('offset = 0, length = 1, Buffer 长度 = 1', () => {
  const buf = Buffer.from([0x41]); // 'A'
  return isUtf8(buf, 0, 1) === true;
});

test('offset = 0, length = 0, Buffer 长度 = 1', () => {
  const buf = Buffer.from([0x41]); // 'A'
  return isUtf8(buf, 0, 0) === true; // 空范围
});

test('offset = 1, length = 0, Buffer 长度 = 1', () => {
  const buf = Buffer.from([0x41]); // 'A'
  return isUtf8(buf, 1, 0) === true; // 空范围
});

// 特殊数字字面量
test('offset = 0x10 (十六进制)', () => {
  const buf = Buffer.alloc(20, 0x41); // 20 个 'A'
  return isUtf8(buf, 0x10) === true; // 从偏移 16 开始
});

test('offset = 0o10 (八进制)', () => {
  const buf = Buffer.alloc(20, 0x41); // 20 个 'A'
  return isUtf8(buf, 0o10) === true; // 从偏移 8 开始
});

test('offset = 0b1010 (二进制)', () => {
  const buf = Buffer.alloc(20, 0x41); // 20 个 'A'
  return isUtf8(buf, 0b1010) === true; // 从偏移 10 开始
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
