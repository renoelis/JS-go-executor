// buffer.compare() - 严格类型检查与TypedArray限制测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅', name);
    } else {
      console.log('❌', name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌', name, '-', e.message);
  }
}

test('Uint8Array参数应该接受', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);
  const result = buf.compare(uint8);
  return result === 0;
});

test('Int8Array参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const int8 = new Int8Array([1, 2, 3]);
    buf.compare(int8);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('Uint8ClampedArray参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const clamped = new Uint8ClampedArray([1, 2, 3]);
    buf.compare(clamped);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('Int16Array参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    const int16 = new Int16Array([1, 2]);
    buf.compare(int16);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('Uint16Array参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    const uint16 = new Uint16Array([1, 2]);
    buf.compare(uint16);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('Int32Array参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    const int32 = new Int32Array([1]);
    buf.compare(int32);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('Uint32Array参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    const uint32 = new Uint32Array([1]);
    buf.compare(uint32);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('Float32Array参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    const float32 = new Float32Array([1.5]);
    buf.compare(float32);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('Float64Array参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const float64 = new Float64Array([1.5]);
    buf.compare(float64);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('BigInt64Array参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const bigint64 = new BigInt64Array([1n]);
    buf.compare(bigint64);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('BigUint64Array参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const biguint64 = new BigUint64Array([1n]);
    buf.compare(biguint64);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('类数组对象应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arrayLike = { 0: 1, 1: 2, 2: 3, length: 3 };
    buf.compare(arrayLike);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('普通数组应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.compare([1, 2, 3]);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('Arguments对象应该拒绝', () => {
  function testFunc() {
    try {
      const buf = Buffer.from([1, 2, 3]);
      buf.compare(arguments);
      return false;
    } catch (e) {
      return e.message.includes('Uint8Array') || e.message.includes('Buffer');
    }
  }
  return testFunc(1, 2, 3);
});

test('DataView参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const ab = new ArrayBuffer(3);
    const dv = new DataView(ab);
    buf.compare(dv);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('ArrayBuffer参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const ab = new ArrayBuffer(3);
    buf.compare(ab);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('SharedArrayBuffer参数应该拒绝', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const sab = new SharedArrayBuffer(3);
    buf.compare(sab);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('静态方法也只接受Buffer和Uint8Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const int8 = new Int8Array([1, 2, 3]);
    Buffer.compare(buf, int8);
    return false;
  } catch (e) {
    return e.message.includes('Uint8Array') || e.message.includes('Buffer');
  }
});

test('静态方法两个参数都可以是Uint8Array', () => {
  const uint8a = new Uint8Array([1, 2, 3]);
  const uint8b = new Uint8Array([1, 2, 3]);
  const result = Buffer.compare(uint8a, uint8b);
  return result === 0;
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
