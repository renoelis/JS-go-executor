// buf.readFloatBE() - 错误码验证测试（对齐 Node.js v25.0.0）
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

// === ERR_OUT_OF_RANGE 错误码测试 ===

test('ERR_OUT_OF_RANGE: offset 越界', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(1); // 只有 4 字节，offset=1 会越界
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: 负数 offset', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: offset 为小数', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: offset 为 NaN', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: offset 为 Infinity', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('ERR_OUT_OF_RANGE: offset 为 -Infinity', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE';
  }
});

// === ERR_INVALID_ARG_TYPE 错误码测试 ===

test('ERR_INVALID_ARG_TYPE: offset 为字符串', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE('invalid');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('ERR_INVALID_ARG_TYPE: offset 为布尔值', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('ERR_INVALID_ARG_TYPE: offset 为 null', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

// === ERR_BUFFER_OUT_OF_BOUNDS 错误码测试 ===

test('ERR_BUFFER_OUT_OF_BOUNDS: Buffer 长度不足（3 字节）', () => {
  try {
    const buf = Buffer.from([1, 2, 3]); // 只有 3 字节，需要 4 字节
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_BUFFER_OUT_OF_BOUNDS';
  }
});

test('ERR_BUFFER_OUT_OF_BOUNDS: 空 Buffer', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_BUFFER_OUT_OF_BOUNDS';
  }
});

test('ERR_BUFFER_OUT_OF_BOUNDS: Buffer 长度不足（2 字节）', () => {
  try {
    const buf = Buffer.from([1, 2]);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_BUFFER_OUT_OF_BOUNDS';
  }
});

test('ERR_BUFFER_OUT_OF_BOUNDS: Buffer 长度不足（1 字节）', () => {
  try {
    const buf = Buffer.from([1]);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.code === 'ERR_BUFFER_OUT_OF_BOUNDS';
  }
});

// === 边界场景：正确的错误码区分 ===

test('正确区分：offset 越界 vs Buffer 长度不足（场景1）', () => {
  // 4 字节 Buffer，offset=1 越界 -> ERR_OUT_OF_RANGE
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('正确区分：offset 越界 vs Buffer 长度不足（场景2）', () => {
  // 3 字节 Buffer，offset=0 长度不足 -> ERR_BUFFER_OUT_OF_BOUNDS
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.code === 'ERR_BUFFER_OUT_OF_BOUNDS';
  }
});

test('正确区分：offset 越界 vs Buffer 长度不足（场景3）', () => {
  // 8 字节 Buffer，offset=5 越界 -> ERR_OUT_OF_RANGE
  try {
    const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    buf.readFloatBE(5);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

// === 错误消息格式验证 ===

test('ERR_OUT_OF_RANGE 错误消息包含正确信息', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE(10);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' && 
           e.message.includes('offset') && 
           e.message.includes('out of range');
  }
});

test('ERR_INVALID_ARG_TYPE 错误消息包含正确信息', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    buf.readFloatBE('test');
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE' && 
           e.message.includes('offset') && 
           e.message.includes('type');
  }
});

test('ERR_BUFFER_OUT_OF_BOUNDS 错误消息包含正确信息', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.readFloatBE(0);
    return false;
  } catch (e) {
    return e.code === 'ERR_BUFFER_OUT_OF_BOUNDS' && 
           e.message.includes('buffer');
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
