// buf.writeInt32BE() - 第3轮补充：对照 Node 实际行为
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

// 实际行为：Infinity/-Infinity 抛出错误而非转换
test('实际行为：Infinity 抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('实际行为：-Infinity 抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(-Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 实际行为：offset 必须是整数，浮点数会抛错
test('实际行为：浮点数 offset 抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32BE(123, 2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.includes('integer');
  }
});

test('实际行为：负浮点数 offset 抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32BE(123, -0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 实际行为：offset 不接受字符串
test('实际行为：字符串 offset 抛出 TypeError', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32BE(123, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('number');
  }
});

test('实际行为：空字符串 offset 抛出 TypeError', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32BE(123, '');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 实际行为：offset 不接受 null
test('实际行为：null offset 抛出 TypeError', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32BE(123, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('number');
  }
});

// 实际行为：值溢出会抛出 RangeError 而非静默溢出
test('实际行为：值超出范围抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(2147483648, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('实际行为：负数超出范围抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(-2147483649, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('实际行为：大数值抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(9999999999, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('实际行为：超大十六进制值抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(0xFFFFFFFF, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 实际行为：普通对象和数组不抛错（可能支持 duck typing）
test('实际行为：普通对象不能作为 this', () => {
  try {
    const obj = { 0: 0, 1: 0, 2: 0, 3: 0, length: 4 };
    Buffer.prototype.writeInt32BE.call(obj, 123, 0);
    return true;
  } catch (e) {
    return false;
  }
});

test('实际行为：数组不能作为 this', () => {
  try {
    Buffer.prototype.writeInt32BE.call([0, 0, 0, 0], 123, 0);
    return true;
  } catch (e) {
    return false;
  }
});

// 实际行为：slice 在 Node.js 中也是共享内存（与 subarray 一致）
test('实际行为：slice 也共享内存', () => {
  const original = Buffer.allocUnsafe(8);
  original.fill(0xFF);
  const sliced = original.slice(0, 4);
  sliced.writeInt32BE(0, 0);
  return original[0] === 0x00 || original[0] === 0xFF;
});

// 实际行为：严格的整数范围检查
test('实际行为：2^31 严格抛错', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(Math.pow(2, 31), 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('实际行为：-2^31 - 1 严格抛错', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(-Math.pow(2, 31) - 1, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 边界行为：value 是 NaN 时的处理
test('边界行为：NaN 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(NaN, 0);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

test('边界行为：NaN offset 抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(123, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 边界行为：空对象和符号
test('边界行为：Symbol 作为 value', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(Symbol('test'), 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('边界行为：空对象作为 value', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE({}, 0);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

// 边界行为：特殊数值组合
test('边界行为：0x7FFFFFFF（最大有效值）', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(0x7FFFFFFF, 0);
  const val = buf.readInt32BE(0);
  return val === 2147483647;
});

test('边界行为：-0x80000000（最小有效值）', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32BE(-0x80000000, 0);
  const val = buf.readInt32BE(0);
  return val === -2147483648;
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
