// Buffer.copyBytesFrom() - Part 15: Deep Edge Cases - Missing Scenarios
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

// Buffer 作为参数(Buffer extends Uint8Array)
test('Buffer 实例作为参数应该成功', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = Buffer.copyBytesFrom(buf);
  return result.length === 5 && result[0] === 1 && result[4] === 5;
});

test('Buffer 实例 + offset', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const result = Buffer.copyBytesFrom(buf, 1);
  return result.length === 3 && result[0] === 20;
});

test('Buffer 实例 + offset + length', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const result = Buffer.copyBytesFrom(buf, 1, 3);
  return result.length === 3 && result[0] === 20 && result[2] === 40;
});

test('Buffer 复制后独立性', () => {
  const buf1 = Buffer.from([100, 200]);
  const buf2 = Buffer.copyBytesFrom(buf1);
  buf1[0] = 1;
  return buf2[0] === 100;
});

// 整数形式的浮点数
test('offset 为整数浮点数 1.0', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1.0);
  return buf.length === 2 && buf[0] === 20;
});

test('offset 为整数浮点数 2.0', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 2.0);
  return buf.length === 2 && buf[0] === 30;
});

test('length 为整数浮点数 1.0', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1, 1.0);
  return buf.length === 1 && buf[0] === 20;
});

test('length 为整数浮点数 3.0', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 0, 3.0);
  return buf.length === 3 && buf[2] === 30;
});

test('offset 和 length 都是整数浮点数', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 1.0, 2.0);
  return buf.length === 2 && buf[0] === 20 && buf[1] === 30;
});

// 非整数浮点数应该报错
test('offset 为 1.0000000001 应该失败', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, 1.0000000001);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 布尔值参数
test('TypeError: offset 为 true', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为 false', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: length 为 true', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, 0, true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: length 为 false', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, 0, false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Symbol 参数
test('TypeError: offset 为 Symbol', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: length 为 Symbol', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, 0, Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// null 参数
test('TypeError: offset 为 null', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: length 为 null', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, 0, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 和 length 都为 null', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, null, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 空字符串和空数组
test('TypeError: offset 为空字符串', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, '');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: offset 为空数组', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, []);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: length 为空字符串', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, 0, '');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: length 为空数组', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, 0, []);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// -0 和 +0
test('offset 为 -0 应该等同于 0', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, -0);
  return buf.length === 3 && buf[0] === 10;
});

test('offset 为 +0 应该等同于 0', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, +0);
  return buf.length === 3 && buf[0] === 10;
});

test('length 为 -0 应该等同于 0', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, -0);
  return buf.length === 0;
});

test('length 为 +0 应该等同于 0', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, +0);
  return buf.length === 0;
});

// 科学计数法
test('offset 为科学计数法 1e0 (等于1)', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1e0);
  return buf.length === 3 && buf[0] === 20;
});

test('offset 为科学计数法 2e0 (等于2)', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 2e0);
  return buf.length === 2 && buf[0] === 30;
});

test('length 为科学计数法 2e0 (等于2)', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 0, 2e0);
  return buf.length === 2 && buf[0] === 10 && buf[1] === 20;
});

test('offset 为科学计数法非整数 1.5e0 应该失败', () => {
  try {
    const view = new Uint8Array([10, 20, 30]);
    Buffer.copyBytesFrom(view, 1.5e0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 额外参数应被忽略
test('额外的第4个参数应被忽略', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 0, 2, 999);
  return buf.length === 2 && buf[0] === 10 && buf[1] === 20;
});

test('额外的多个参数应被忽略', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1, 2, 999, 'extra', {}, []);
  return buf.length === 2 && buf[0] === 20 && buf[1] === 30;
});

// TypedArray 有 byteOffset 的情况
test('TypedArray 带 byteOffset', () => {
  const ab = new ArrayBuffer(20);
  const fullView = new Uint8Array(ab);
  for (let i = 0; i < 20; i++) fullView[i] = i;
  const offsetView = new Uint8Array(ab, 5, 10);
  const buf = Buffer.copyBytesFrom(offsetView);
  return buf.length === 10 && buf[0] === 5 && buf[9] === 14;
});

test('TypedArray 带 byteOffset + offset 参数', () => {
  const ab = new ArrayBuffer(20);
  const fullView = new Uint8Array(ab);
  for (let i = 0; i < 20; i++) fullView[i] = i + 100;
  const offsetView = new Uint8Array(ab, 10, 8);
  const buf = Buffer.copyBytesFrom(offsetView, 2);
  return buf.length === 6 && buf[0] === 112;
});

test('TypedArray 带 byteOffset + offset + length', () => {
  const ab = new ArrayBuffer(30);
  const fullView = new Uint8Array(ab);
  for (let i = 0; i < 30; i++) fullView[i] = i;
  const offsetView = new Uint8Array(ab, 10, 15);
  const buf = Buffer.copyBytesFrom(offsetView, 3, 5);
  return buf.length === 5 && buf[0] === 13 && buf[4] === 17;
});

// 参数复用
test('多次使用相同的参数变量', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const offset = 1;
  const length = 2;
  const buf1 = Buffer.copyBytesFrom(view, offset, length);
  const buf2 = Buffer.copyBytesFrom(view, offset, length);
  return buf1.length === 2 && buf2.length === 2 &&
         buf1[0] === 20 && buf2[0] === 20 &&
         buf1.buffer !== buf2.buffer;
});

// 验证不会修改原参数
test('不会修改 offset 参数', () => {
  const view = new Uint8Array([10, 20, 30]);
  let offset = 1;
  Buffer.copyBytesFrom(view, offset);
  return offset === 1;
});

test('不会修改 length 参数', () => {
  const view = new Uint8Array([10, 20, 30]);
  let length = 2;
  Buffer.copyBytesFrom(view, 0, length);
  return length === 2;
});

// 混合整数和浮点数参数
test('offset 整数 + length 整数浮点', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 1, 2.0);
  return buf.length === 2 && buf[0] === 20;
});

test('offset 整数浮点 + length 整数', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 1.0, 2);
  return buf.length === 2 && buf[0] === 20;
});

// 最大安全整数边界
test('offset 为 MAX_SAFE_INTEGER', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, Number.MAX_SAFE_INTEGER);
  return buf.length === 0;
});

test('length 为 MAX_SAFE_INTEGER', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, Number.MAX_SAFE_INTEGER);
  return buf.length === 3 && buf[0] === 10;
});

test('offset 和 length 都为 MAX_SAFE_INTEGER', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  return buf.length === 0;
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
