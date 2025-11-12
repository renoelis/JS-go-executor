// buffer.compare() - Different Input Types Tests
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

test('Buffer与Uint8Array比较', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);
  const result = buf.compare(uint8);
  return result === 0;
});

test('Buffer与Uint8Array不同内容比较', () => {
  const buf = Buffer.from([1, 2, 4]);
  const uint8 = new Uint8Array([1, 2, 3]);
  const result = buf.compare(uint8);
  return result > 0;
});

test('Buffer与Int8Array比较', () => {
  const buf = Buffer.from([1, 2, 3]);
  const int8 = new Int8Array([1, 2, 3]);
  const uint8 = new Uint8Array(int8.buffer);
  const result = buf.compare(uint8);
  return result === 0;
});

test('Buffer与Int16Array比较', () => {
  const buf = Buffer.from([1, 0, 2, 0, 3, 0]);
  const int16 = new Int16Array([1, 2, 3]);
  const uint8 = new Uint8Array(int16.buffer);
  const result = buf.compare(uint8);
  return result === 0;
});

test('Buffer与ArrayBuffer比较', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arrayBuffer = new ArrayBuffer(3);
  const uint8View = new Uint8Array(arrayBuffer);
  uint8View[0] = 1;
  uint8View[1] = 2;
  uint8View[2] = 3;
  const result = buf.compare(uint8View);
  return result === 0;
});

test('Buffer与DataView比较', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arrayBuffer = new ArrayBuffer(3);
  const dataView = new DataView(arrayBuffer);
  dataView.setUint8(0, 1);
  dataView.setUint8(1, 2);
  dataView.setUint8(2, 3);
  const result = buf.compare(new Uint8Array(dataView.buffer));
  return result === 0;
});

test('Buffer与不同大小的TypedArray比较', () => {
  const buf = Buffer.from([255, 255]);
  const uint16 = new Uint16Array([65535]);
  const uint8 = new Uint8Array(uint16.buffer);
  const result = buf.compare(uint8);
  return result === 0;
});

test('Buffer与部分视图的TypedArray比较', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const uint8Array = new Uint8Array([0, 1, 2, 3, 4, 5, 6]);
  const subArray = uint8Array.subarray(1, 6);
  const result = buf.compare(subArray);
  return result === 0;
});

test('不同字节序的TypedArray比较', () => {
  const buf = Buffer.from([1, 0, 2, 0]);
  const uint16 = new Uint16Array([1, 2]);
  const uint8 = new Uint8Array(uint16.buffer);
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