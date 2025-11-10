// buf.readFloatLE() - Node.js v25 错误码完整验证
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

// ERR_OUT_OF_RANGE 错误码测试
test('ERR_OUT_OF_RANGE: offset 越界（正数）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && 
           (e.code === 'ERR_OUT_OF_RANGE' || e.message.includes('out of range'));
  }
});

test('ERR_OUT_OF_RANGE: offset 为负数', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' &&
           (e.code === 'ERR_OUT_OF_RANGE' || e.message.includes('out of range'));
  }
});

test('ERR_OUT_OF_RANGE: offset 为小数', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError' &&
           (e.code === 'ERR_OUT_OF_RANGE' || e.message.includes('out of range'));
  }
});

test('ERR_OUT_OF_RANGE: offset 为 NaN', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' &&
           (e.code === 'ERR_OUT_OF_RANGE' || e.message.includes('out of range'));
  }
});

test('ERR_OUT_OF_RANGE: offset 为 Infinity', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' &&
           (e.code === 'ERR_OUT_OF_RANGE' || e.message.includes('out of range'));
  }
});

test('ERR_OUT_OF_RANGE: offset 为 -Infinity', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' &&
           (e.code === 'ERR_OUT_OF_RANGE' || e.message.includes('out of range'));
  }
});

// ERR_INVALID_ARG_TYPE 错误码测试
test('ERR_INVALID_ARG_TYPE: offset 为字符串', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError' &&
           (e.code === 'ERR_INVALID_ARG_TYPE' || e.message.includes('type'));
  }
});

test('ERR_INVALID_ARG_TYPE: offset 为布尔值', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError' &&
           (e.code === 'ERR_INVALID_ARG_TYPE' || e.message.includes('type'));
  }
});

test('ERR_INVALID_ARG_TYPE: offset 为 null', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(null);
    return false;
  } catch (e) {
    return (e.name === 'TypeError' || e.name === 'RangeError') &&
           (e.code === 'ERR_INVALID_ARG_TYPE' || 
            e.code === 'ERR_OUT_OF_RANGE' || 
            e.message.includes('type') || 
            e.message.includes('range'));
  }
});

// ERR_BUFFER_OUT_OF_BOUNDS 或 RangeError 测试
test('Buffer 长度不足（1 字节）', () => {
  try {
    const buf = Buffer.alloc(1);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' &&
           (e.code === 'ERR_BUFFER_OUT_OF_BOUNDS' || 
            e.code === 'ERR_OUT_OF_RANGE' || 
            e.message.includes('out of') || 
            e.message.includes('bound'));
  }
});

test('Buffer 长度不足（2 字节）', () => {
  try {
    const buf = Buffer.alloc(2);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' &&
           (e.code === 'ERR_BUFFER_OUT_OF_BOUNDS' || 
            e.code === 'ERR_OUT_OF_RANGE' || 
            e.message.includes('out of') || 
            e.message.includes('bound'));
  }
});

test('Buffer 长度不足（3 字节）', () => {
  try {
    const buf = Buffer.alloc(3);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' &&
           (e.code === 'ERR_BUFFER_OUT_OF_BOUNDS' || 
            e.code === 'ERR_OUT_OF_RANGE' || 
            e.message.includes('out of') || 
            e.message.includes('bound'));
  }
});

test('空 Buffer 读取', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' &&
           (e.code === 'ERR_BUFFER_OUT_OF_BOUNDS' || 
            e.code === 'ERR_OUT_OF_RANGE' || 
            e.message.includes('out of') || 
            e.message.includes('bound'));
  }
});

// 错误码区分验证
test('offset 越界 vs Buffer 长度不足（区分测试）', () => {
  let error1, error2;
  
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(10);
  } catch (e) {
    error1 = e;
  }
  
  try {
    const buf = Buffer.alloc(2);
    buf.readFloatLE(0);
  } catch (e) {
    error2 = e;
  }
  
  return error1 && error2 && 
         error1.name === 'RangeError' && 
         error2.name === 'RangeError';
});

// 错误消息格式验证
test('RangeError 错误消息包含有用信息', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(100);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && 
           e.message.length > 0 &&
           (e.message.includes('offset') || 
            e.message.includes('out of') ||
            e.message.includes('range'));
  }
});

test('TypeError 错误消息包含参数信息', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE('invalid');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.length > 0 &&
           (e.message.includes('offset') || 
            e.message.includes('type') ||
            e.message.includes('string'));
  }
});

test('错误对象包含 name 属性', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
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
