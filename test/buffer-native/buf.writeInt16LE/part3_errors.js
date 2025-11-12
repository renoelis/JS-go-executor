// buf.writeInt16LE() - 错误处理测试
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

// offset 越界错误
test('offset 超出 buffer 长度抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(100, 10);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond');
  }
});

test('offset 为负数抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(100, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('negative');
  }
});

test('offset + 2 超出 buffer 长度抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(100, 3); // 需要写入到 offset 3 和 4，但 buffer 只有 4 字节
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond');
  }
});

test('在长度为 2 的 buffer 的 offset 1 写入抛出错误', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.writeInt16LE(100, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond');
  }
});

test('在长度为 1 的 buffer 写入抛出错误', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.writeInt16LE(100, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond') || e.message.includes('outside buffer bounds');
  }
});

test('在空 buffer 写入抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.writeInt16LE(100, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond') || e.message.includes('outside buffer bounds');
  }
});

// 特殊值测试
test('值为 NaN 会写入 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(NaN, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('值为 Infinity 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(Infinity, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('值为 -Infinity 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(-Infinity, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('offset 为 NaN 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(100, NaN);
    return false;
  } catch (e) {
    return e.message.includes('must be an integer') || e.message.includes('out of range');
  }
});

test('offset 为 Infinity 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(100, Infinity);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('out of range');
  }
});

test('offset 为 -Infinity 抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(100, -Infinity);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('out of range') || e.message.includes('negative');
  }
});

// null/undefined 测试
test('值为 null 会转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(null, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('值为 undefined 会转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(undefined, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('offset 为 null 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16LE(100, null);
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('offset 为 undefined 会转为 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt16LE(100, undefined);
  return result === 2 && buf[0] === 0x64 && buf[1] === 0x00;
});

// 对象和数组
test('值为空对象转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE({}, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('值为空数组转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE([], 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('值为单元素数组使用第一个元素', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE([100], 0);
  const expected = Buffer.alloc(4);
  expected.writeInt16LE(100, 0);
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('值为字符串非数字转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE('abc', 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
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
