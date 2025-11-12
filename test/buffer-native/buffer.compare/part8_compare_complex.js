// buffer.compare() - Complex Type Combinations Tests
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

test('Buffer与Uint8Array范围参数组合', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const uint8 = new Uint8Array([0, 1, 2, 3, 4, 5, 6]);
  const result = buf.compare(uint8, 1, 6, 0, 5);
  return result === 0;
});

test('跨类型比较 - Buffer vs DataView范围', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arrayBuffer = new ArrayBuffer(5);
  const dataView = new DataView(arrayBuffer);
  dataView.setUint8(0, 0);
  dataView.setUint8(1, 1);
  dataView.setUint8(2, 2);
  dataView.setUint8(3, 3);
  dataView.setUint8(4, 4);
  const uint8 = new Uint8Array(dataView.buffer);
  const result = buf.compare(uint8, 1, 4);
  return result === 0;
});

test('负值字节序组合比较', () => {
  const buf = Buffer.from([255, 254, 253]);
  const int8 = new Int8Array([-1, -2, -3]);
  const uint8 = new Uint8Array(int8.buffer);
  const result = buf.compare(uint8);
  return result === 0;
});

test('混合长度范围比较', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6]);
  const uint8 = new Uint8Array([10, 1, 2, 3, 20, 4, 5, 6, 30]);
  const result = buf1.compare(uint8, 1, 7, 0, 6);
  return result < 0;
});

test('共享内存不同类型视图比较', () => {
  const arrayBuffer = new ArrayBuffer(10);
  const uint8 = new Uint8Array(arrayBuffer);
  uint8.set([1, 2, 3, 4, 1, 2, 3, 4, 0, 0]);
  const buf1 = Buffer.from(uint8.buffer.slice(0, 4));
  const buf2 = Buffer.from(uint8.buffer.slice(4, 8));

  const result = buf1.compare(buf2);
  return result === 0;
});

test('子数组与子buffer比较', () => {
  const originalUint8 = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const subUint8 = originalUint8.subarray(2, 7);
  const buf = Buffer.from([2, 3, 4, 5, 6]);
  const result = buf.compare(subUint8);
  return result === 0;
});

test('跨类型与空buffer组合', () => {
  const buf1 = Buffer.alloc(0);
  const uint8 = new Uint8Array(0);
  const result1 = buf1.compare(uint8);
  const result2 = uint8.length === 0 ? 0 : -1;
  return result1 === 0 && result2 === 0;
});

test('大小端混合比较', () => {
  const buf = Buffer.from([1, 0, 2, 0, 3, 0]);
  const uint16 = new Uint16Array([1, 2, 3]);
  const uint8 = new Uint8Array(uint16.buffer);

  if (new Uint16Array([1])[0] === 1) {
    const result = buf.compare(uint8);
    return result === 0;
  }
  return true;
});

test('不同字节长度类型比较', () => {
  const buf8 = Buffer.from([1, 2, 3, 4]);
  const uint32 = new Uint32Array([0x01020304]);
  const uint8 = new Uint8Array(uint32.buffer);

  const littleEndian = (new Uint8Array(new Uint32Array([1]).buffer))[0] === 1;
  if (littleEndian) {
    buf8[0] = 4; buf8[1] = 3; buf8[2] = 2; buf8[3] = 1;
  }

  const result = buf8.compare(uint8);
  return result === 0;
});

test('Buffer与Float32Array组合', () => {
  const buf = Buffer.alloc(4);
  const float32 = new Float32Array([1.5]);
  const uint8 = new Uint8Array(float32.buffer);

  buf[0] = uint8[0];
  buf[1] = uint8[1];
  buf[2] = uint8[2];
  buf[3] = uint8[3];

  const result = buf.compare(uint8);
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