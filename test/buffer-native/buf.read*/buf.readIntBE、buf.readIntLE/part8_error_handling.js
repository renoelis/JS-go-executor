// 错误处理和错误消息验证
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

// byteLength 错误
test('byteLength=0: 抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength=7: 超过最大值', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readIntBE(0, 7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength=-1: 负数', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength=NaN: 非数字', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength=Infinity: 无穷大', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('byteLength=2.5: 浮点数', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, 2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('byteLength="2": 字符串', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('byteLength=null: null', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('byteLength=undefined: undefined', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('byteLength={}: 对象', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, {});
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('byteLength=[]: 数组', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0, []);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 错误
test('offset=-1: 负数', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(-1, 2);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset=buf.length: 等于长度', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(6, 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset=buf.length+1: 超出长度', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(7, 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset=NaN: 非数字', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(NaN, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset=Infinity: 无穷大', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(Infinity, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

test('offset="1": 字符串', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE('1', 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset=null: null', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(null, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset=undefined: undefined', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(undefined, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset + byteLength 越界
test('offset + byteLength > buf.length', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(4, 3);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset + byteLength = buf.length + 1', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(5, 2);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// 缺少参数
test('缺少 byteLength 参数', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE(0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('缺少所有参数', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE();
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 空 buffer 错误
test('空 buffer: readIntBE(0, 1)', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readIntBE(0, 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('空 buffer: readIntLE(0, 1)', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readIntLE(0, 1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// this 错误
test('错误的 this: null', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE.call(null, 0, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('错误的 this: undefined', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE.call(undefined, 0, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('错误的 this: 普通对象', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE.call({}, 0, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('错误的 this: 数组', () => {
  try {
    const buf = Buffer.alloc(6);
    buf.readIntBE.call([], 0, 2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('错误的 this: Uint8Array', () => {
  try {
    const buf = Buffer.alloc(6);
    const arr = new Uint8Array(6);
    buf.readIntBE.call(arr, 0, 2);
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
