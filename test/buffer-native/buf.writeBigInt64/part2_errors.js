// buf.writeBigInt64BE/LE - Error Handling Tests
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
test('writeBigInt64BE - offset 超出范围（负数）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('writeBigInt64BE - offset 超出范围（超过buffer长度）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigInt64BE - offset 刚好等于buffer长度', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, 8);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigInt64BE - offset 远大于buffer长度', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, 100);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigInt64LE - offset 超出范围（负数）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('writeBigInt64LE - offset 超出范围（超过buffer长度）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigInt64LE - offset 刚好等于buffer长度', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, 8);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

test('writeBigInt64LE - offset 远大于buffer长度', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, 100);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range') || e.message.includes('bounds');
  }
});

// 类型错误 - value 参数
test('writeBigInt64BE - value 不是 BigInt（number）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigInt64BE - value 不是 BigInt（string）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE('123', 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigInt64BE - value 不是 BigInt（undefined）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(undefined, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigInt64BE - value 不是 BigInt（null）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(null, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigInt64BE - value 不是 BigInt（对象）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE({}, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigInt64LE - value 不是 BigInt（number）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigInt64LE - value 不是 BigInt（string）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE('123', 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigInt64LE - value 不是 BigInt（undefined）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(undefined, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigInt64LE - value 不是 BigInt（null）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(null, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

test('writeBigInt64LE - value 不是 BigInt（对象）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE({}, 0);
    return false;
  } catch (e) {
    return e.message.includes('bigint') || e.message.includes('BigInt');
  }
});

// 类型错误 - offset 参数
test('writeBigInt64BE - offset 为 undefined（使用默认值）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigInt64BE(123n, undefined);
  return result === 8 && buf[0] === 0x00 && buf[7] === 0x7B;
});

test('writeBigInt64BE - offset 为 null（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(123n, null);
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('offset');
  }
});

test('writeBigInt64BE - offset 为字符串数字（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64BE(0x1122334455667788n, '0');
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('offset');
  }
});

test('writeBigInt64BE - offset 为小数（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64BE(0x1122334455667788n, 0.9);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('offset');
  }
});

test('writeBigInt64LE - offset 为 undefined（使用默认值）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigInt64LE(123n, undefined);
  return result === 8 && buf[0] === 0x7B && buf[7] === 0x00;
});

test('writeBigInt64LE - offset 为 null（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(123n, null);
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('offset');
  }
});

test('writeBigInt64LE - offset 为字符串数字（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64LE(0x1122334455667788n, '0');
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('offset');
  }
});

test('writeBigInt64LE - offset 为小数（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64LE(0x1122334455667788n, 0.9);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('offset');
  }
});

// this 不是 Buffer
test('writeBigInt64BE - this 不是 Buffer', () => {
  try {
    Buffer.prototype.writeBigInt64BE.call({}, 123n, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('NaN') || e.message.includes('offset');
  }
});

test('writeBigInt64LE - this 不是 Buffer', () => {
  try {
    Buffer.prototype.writeBigInt64LE.call({}, 123n, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('NaN') || e.message.includes('offset');
  }
});

test('writeBigInt64BE - this 为 null', () => {
  try {
    Buffer.prototype.writeBigInt64BE.call(null, 123n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigInt64LE - this 为 null', () => {
  try {
    Buffer.prototype.writeBigInt64LE.call(null, 123n, 0);
    return false;
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
