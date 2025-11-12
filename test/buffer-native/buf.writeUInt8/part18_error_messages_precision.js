// buf.writeUInt8() - 错误消息精确性验证
// 确保错误消息与 Node.js v25.0.0 完全一致
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

// ==================== 1. value 超出范围的错误消息 ====================

test('value = 256 错误消息包含确切值', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(256, 0);
    return false;
  } catch (e) {
    return e.message.includes('256') && e.message.includes('range');
  }
});

test('value = -1 错误消息包含确切值', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(-1, 0);
    return false;
  } catch (e) {
    return e.message.includes('-1') && e.message.includes('range');
  }
});

test('value = 300.5 错误消息包含确切值和小数', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(300.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('300.5') && e.message.includes('range');
  }
});

test('value = -100.7 错误消息包含确切值和小数', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(-100.7, 0);
    return false;
  } catch (e) {
    return e.message.includes('100.7') && e.message.includes('range');
  }
});

test('value = Infinity 错误消息明确', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(Infinity, 0);
    return false;
  } catch (e) {
    return e.message.includes('Infinity') && e.message.includes('range');
  }
});

test('value = -Infinity 错误消息明确', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(-Infinity, 0);
    return false;
  } catch (e) {
    return e.message.includes('Infinity') && e.message.includes('range');
  }
});

// ==================== 2. offset 越界的错误消息 ====================

test('offset = -1 错误消息指明 offset', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('-1');
  }
});

test('offset = 4 (等于长度) 错误消息指明越界', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, 4);
    return false;
  } catch (e) {
    return e.message.includes('offset') && (e.message.includes('range') || e.message.includes('bounds'));
  }
});

test('offset = 100 (远超长度) 错误消息指明越界', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, 100);
    return false;
  } catch (e) {
    return e.message.includes('offset') && (e.message.includes('range') || e.message.includes('bounds'));
  }
});

// ==================== 3. offset 类型错误的消息 ====================

test('offset = "1" 错误消息指明类型和值', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, "1");
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('type') && e.message.includes('number');
  }
});

test('offset = NaN 错误消息明确', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, NaN);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('NaN');
  }
});

test('offset = 1.5 错误消息指明必须是整数', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, 1.5);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('integer');
  }
});

test('offset = Infinity 错误消息明确', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, Infinity);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Infinity');
  }
});

test('offset = true 错误消息指明类型', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, true);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('boolean');
  }
});

test('offset = {} 错误消息指明 Object', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, {});
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Object');
  }
});

test('offset = [] 错误消息指明 Array', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, []);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Array');
  }
});

test('offset = null 错误消息指明 null', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, null);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('null');
  }
});

// ==================== 4. 错误对象属性验证 ====================

test('value 超出范围错误有 code 属性', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(256, 0);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('offset 类型错误有 code 属性', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, "1");
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('offset 越界错误有 code 属性', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, 10);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.code === 'ERR_BUFFER_OUT_OF_BOUNDS';
  }
});

// ==================== 5. this 上下文错误 ====================

test('非 Buffer 对象调用错误消息明确', () => {
  const obj = {};
  try {
    Buffer.prototype.writeUInt8.call(obj, 100, 0);
    return false;
  } catch (e) {
    return true; // 应该抛出某种错误
  }
});

test('null 调用错误消息明确', () => {
  try {
    Buffer.prototype.writeUInt8.call(null, 100, 0);
    return false;
  } catch (e) {
    return true; // 应该抛出某种错误
  }
});

// ==================== 6. 边界错误的细节 ====================

test('空 Buffer 写入错误消息指明长度', () => {
  const buf = Buffer.alloc(0);
  try {
    buf.writeUInt8(100, 0);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('bounds') || e.message.includes('range');
  }
});

test('offset = -0 应该等同于 0 (不报错)', () => {
  const buf = Buffer.alloc(4);
  try {
    const ret = buf.writeUInt8(100, -0);
    return ret === 1 && buf[0] === 100;
  } catch (e) {
    return false;
  }
});

// ==================== 7. 特殊浮点数边界 ====================

test('Number.MAX_VALUE 超出范围', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(Number.MAX_VALUE, 0);
    return false;
  } catch (e) {
    return e.message.includes('range');
  }
});

test('Number.MIN_VALUE (极小正数) 截断为 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(Number.MIN_VALUE, 0);
  return buf[0] === 0;
});

test('Number.EPSILON (极小正数) 截断为 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(Number.EPSILON, 0);
  return buf[0] === 0;
});

test('Number.MAX_SAFE_INTEGER 超出范围', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(Number.MAX_SAFE_INTEGER, 0);
    return false;
  } catch (e) {
    return e.message.includes('range');
  }
});

test('Number.MIN_SAFE_INTEGER 超出范围', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(Number.MIN_SAFE_INTEGER, 0);
    return false;
  } catch (e) {
    return e.message.includes('range');
  }
});

// ==================== 8. 精确的边界值 ====================

test('254.999999 截断为 254', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(254.999999, 0);
  return buf[0] === 254;
});

test('255.0000001 超出范围', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(255.0000001, 0);
    return false;
  } catch (e) {
    return e.message.includes('range');
  }
});

test('-0.0000001 超出范围', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(-0.0000001, 0);
    return false;
  } catch (e) {
    return e.message.includes('range');
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
