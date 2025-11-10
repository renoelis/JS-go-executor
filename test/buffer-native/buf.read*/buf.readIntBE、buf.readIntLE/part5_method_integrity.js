// 方法完整性测试
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

// 方法存在性
test('readIntBE 是函数', () => {
  const buf = Buffer.alloc(4);
  return typeof buf.readIntBE === 'function';
});

test('readIntLE 是函数', () => {
  const buf = Buffer.alloc(4);
  return typeof buf.readIntLE === 'function';
});

// this 绑定测试
test('readIntBE this 绑定: 直接调用', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('readIntLE this 绑定: 直接调用', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('readIntBE this 绑定: call', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readIntBE.call(buf, 0, 4);
  return result === 0x12345678;
});

test('readIntLE this 绑定: call', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const result = buf.readIntLE.call(buf, 0, 4);
  return result === 0x12345678;
});

test('readIntBE this 绑定: apply', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readIntBE.apply(buf, [0, 4]);
  return result === 0x12345678;
});

test('readIntLE this 绑定: apply', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const result = buf.readIntLE.apply(buf, [0, 4]);
  return result === 0x12345678;
});

test('readIntBE this 绑定: bind', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const bound = buf.readIntBE.bind(buf);
  return bound(0, 4) === 0x12345678;
});

test('readIntLE this 绑定: bind', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const bound = buf.readIntLE.bind(buf);
  return bound(0, 4) === 0x12345678;
});

// 错误 this 测试
test('readIntBE 错误 this: null 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE.call(null, 0, 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('readIntLE 错误 this: null 应失败', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE.call(null, 0, 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('readIntBE 错误 this: 普通对象 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE.call({}, 0, 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('readIntLE 错误 this: 普通对象 应失败', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE.call({}, 0, 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('readIntBE 错误 this: Uint8Array 应失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const arr = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE.call(arr, 0, 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('readIntLE 错误 this: Uint8Array 应失败', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    const arr = new Uint8Array([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE.call(arr, 0, 4);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 参数数量测试
test('readIntBE 缺少参数: 只传 offset', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE(0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntLE 缺少参数: 只传 offset', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE(0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntBE 缺少参数: 无参数', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    buf.readIntBE();
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntLE 缺少参数: 无参数', () => {
  try {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    buf.readIntLE();
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readIntBE 额外参数: 应忽略', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readIntBE(0, 4, 'extra', 'params');
  return result === 0x12345678;
});

test('readIntLE 额外参数: 应忽略', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const result = buf.readIntLE(0, 4, 'extra', 'params');
  return result === 0x12345678;
});

// 链式调用验证
test('链式调用: 读取后 buffer 不变', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result1 = buf.readIntBE(0, 4);
  const result2 = buf.readIntBE(0, 4);
  return result1 === result2 && result1 === 0x12345678;
});

test('多次读取: 不同位置', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB]);
  const r1 = buf.readIntBE(0, 2);
  const r2 = buf.readIntBE(2, 2);
  const r3 = buf.readIntBE(4, 2);
  return r1 === 0x1234 && r2 === 0x5678 && r3 === -0x6f55;
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
