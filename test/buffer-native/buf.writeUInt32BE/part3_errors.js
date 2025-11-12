// buf.writeUInt32BE() - Error Handling and Boundary Tests
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

// 边界错误测试
test('写入超出缓冲区边界', () => {
  try {
    const buf = Buffer.allocUnsafe(3);
    buf.writeUInt32BE(0x12345678, 0);
    return false;
  } catch (e) {
    return e.message.includes('Attempt to access memory outside buffer bounds');
  }
});

test('偏移量超出缓冲区长度', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(0x12345678, 4);
    return false;
  } catch (e) {
    return e.message.includes('"offset" is out of range');
  }
});

test('偏移量为负数', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(0x12345678, -1);
    return false;
  } catch (e) {
    return e.message.includes('"offset" is out of range');
  }
});

test('偏移量过大', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(0x12345678, 100);
    return false;
  } catch (e) {
    return e.message.includes('"offset" is out of range');
  }
});

// 类型错误测试
test('this 不是 Buffer 实例', () => {
  try {
    const notBuffer = {};
    Buffer.prototype.writeUInt32BE.call(notBuffer, 123, 0);
    return false;
  } catch (e) {
    return e.message.includes('"offset" is out of range');
  }
});

test('NaN 作为数值', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(NaN, 0);
    return buf.readUInt32BE(0) === 0; // NaN 转换为 0
  } catch (e) {
    return false;
  }
});

test('Infinity 作为数值', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(Infinity, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('"value" is out of range');
  }
});

test('-Infinity 作为数值', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(-Infinity, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('"value" is out of range');
  }
});

// 极端边界测试
test('缓冲区长度为 0', () => {
  try {
    const buf = Buffer.allocUnsafe(0);
    buf.writeUInt32BE(0x12345678, 0);
    return false;
  } catch (e) {
    return e.message.includes('Attempt to access memory outside buffer bounds');
  }
});

test('缓冲区长度为 1', () => {
  try {
    const buf = Buffer.allocUnsafe(1);
    buf.writeUInt32BE(0x12345678, 0);
    return false;
  } catch (e) {
    return e.message.includes('Attempt to access memory outside buffer bounds');
  }
});

test('缓冲区长度为 2', () => {
  try {
    const buf = Buffer.allocUnsafe(2);
    buf.writeUInt32BE(0x12345678, 0);
    return false;
  } catch (e) {
    return e.message.includes('Attempt to access memory outside buffer bounds');
  }
});

test('缓冲区长度为 3', () => {
  try {
    const buf = Buffer.allocUnsafe(3);
    buf.writeUInt32BE(0x12345678, 0);
    return false;
  } catch (e) {
    return e.message.includes('Attempt to access memory outside buffer bounds');
  }
});

test('缓冲区长度为 4', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(0x12345678, 0);
    return true;
  } catch (e) {
    return false;
  }
});

// 部分越界测试
test('写入位置导致部分越界', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.writeUInt32BE(0x12345678, 2);
    return false;
  } catch (e) {
    return e.message.includes('"offset" is out of range');
  }
});

test('写入位置刚好在边界', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeUInt32BE(0x12345678, 4);
    return true;
  } catch (e) {
    return false;
  }
});

// 超大数值测试
test('超出 32 位范围的数值应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(0x1FFFFFFFF, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('"value" is out of range');
  }
});

test('负数应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(-1, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('"value" is out of range');
  }
});

test('大负数应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(-1000, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('"value" is out of range');
  }
});

// 特殊偏移量测试
test('偏移量为小数应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeUInt32BE(0x12345678, 2.9);
    return false;
  } catch (e) {
    return e.message.includes('must be an integer');
  }
});

test('偏移量为字符串应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeUInt32BE(0x12345678, '2');
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
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