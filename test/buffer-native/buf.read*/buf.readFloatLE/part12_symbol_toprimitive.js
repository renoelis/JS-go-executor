// buf.readFloatLE() - Symbol.toPrimitive 和对象转换测试
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

// Symbol.toPrimitive 返回数字
test('Symbol.toPrimitive 返回有效 offset', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(2.5, 4);
  
  const offsetObj = {
    [Symbol.toPrimitive]() {
      return 4;
    }
  };
  
  try {
    buf.readFloatLE(offsetObj);
    return false; // 应该抛出错误，因为不接受对象
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Symbol.toPrimitive 返回字符串
test('Symbol.toPrimitive 返回字符串应抛出 TypeError', () => {
  const buf = Buffer.alloc(8);
  
  const offsetObj = {
    [Symbol.toPrimitive]() {
      return '4';
    }
  };
  
  try {
    buf.readFloatLE(offsetObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Symbol.toPrimitive 抛出错误
test('Symbol.toPrimitive 抛出错误应传播', () => {
  const buf = Buffer.alloc(8);
  
  const offsetObj = {
    [Symbol.toPrimitive]() {
      throw new Error('Custom error');
    }
  };
  
  try {
    buf.readFloatLE(offsetObj);
    return false;
  } catch (e) {
    // 可能是 TypeError（对象类型）或自定义错误
    return e.name === 'TypeError' || e.message === 'Custom error';
  }
});

// valueOf 测试
test('valueOf 返回数字（对象仍应抛出 TypeError）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(1.5, 4);
  
  const offsetObj = {
    valueOf() {
      return 4;
    }
  };
  
  try {
    buf.readFloatLE(offsetObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// toString 测试
test('toString 返回数字字符串应抛出 TypeError', () => {
  const buf = Buffer.alloc(8);
  
  const offsetObj = {
    toString() {
      return '4';
    }
  };
  
  try {
    buf.readFloatLE(offsetObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 同时有 Symbol.toPrimitive 和 valueOf
test('Symbol.toPrimitive 优先于 valueOf', () => {
  const buf = Buffer.alloc(8);
  
  const offsetObj = {
    [Symbol.toPrimitive]() {
      return 0;
    },
    valueOf() {
      return 4;
    }
  };
  
  try {
    buf.readFloatLE(offsetObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError'; // 对象类型错误
  }
});

// Symbol.toPrimitive 返回 NaN
test('Symbol.toPrimitive 返回 NaN', () => {
  const buf = Buffer.alloc(8);
  
  const offsetObj = {
    [Symbol.toPrimitive]() {
      return NaN;
    }
  };
  
  try {
    buf.readFloatLE(offsetObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// Symbol.toPrimitive 返回 Infinity
test('Symbol.toPrimitive 返回 Infinity', () => {
  const buf = Buffer.alloc(8);
  
  const offsetObj = {
    [Symbol.toPrimitive]() {
      return Infinity;
    }
  };
  
  try {
    buf.readFloatLE(offsetObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 没有 Symbol.toPrimitive 和 valueOf 的对象
test('普通对象应抛出 TypeError', () => {
  const buf = Buffer.alloc(8);
  
  try {
    buf.readFloatLE({ prop: 4 });
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Symbol.toPrimitive 返回布尔值
test('Symbol.toPrimitive 返回布尔值', () => {
  const buf = Buffer.alloc(8);
  
  const offsetObj = {
    [Symbol.toPrimitive]() {
      return true;
    }
  };
  
  try {
    buf.readFloatLE(offsetObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
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
