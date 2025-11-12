// buffer.compare() - Extreme Scenarios and Compatibility Tests
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

test('极大边界值offset=0', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 1, 0, 1);
  return result === 0;
});

test('极大边界值offset=length-1', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 2, 3, 2, 3);
  return result === 0;
});

test('超零长度空buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.allocUnsafe(0);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('单个字节边界比较', () => {
  const buf1 = Buffer.from([0x00]);
  const buf2 = Buffer.from([0xFF]);
  const result1 = buf1.compare(buf2);
  const result2 = buf2.compare(buf1);
  return result1 < 0 && result2 > 0;
});

test('内存对齐边界8字节', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 9]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('内存对齐边界16字节', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('相同引用不同slice比较', () => {
  const original = Buffer.from([1, 2, 3, 4]);
  const slice1 = original.slice(0, 2);
  const slice2 = original.slice(2, 4);
  const result = slice1.compare(slice2);
  return result < 0;
});

test('NaN值在FloatArray中比较', () => {
  const float32 = new Float32Array([NaN, 1.0]);
  const uint8 = new Uint8Array(float32.buffer);
  const buf1 = Buffer.from(uint8.buffer.slice(0, 4));
  const buf2 = Buffer.from(uint8.buffer.slice(4, 8));

  const result = buf1.compare(buf2);
  return result !== 0;
});

test('Infinity值在FloatArray中比较', () => {
  const float32 = new Float32Array([Infinity, 1.0]);
  const uint8 = new Uint8Array(float32.buffer);
  const buf1 = Buffer.from(uint8.buffer.slice(0, 4));
  const buf2 = Buffer.from(uint8.buffer.slice(4, 8));

  const result = buf1.compare(buf2);
  return result !== 0;
});

test('边界参数等于长度', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result1 = buf1.compare(buf2, 3, 3, 0, 3);
  const result2 = buf2.compare(buf1, 3, 3, 3, 3);
  return result1 > 0 && result2 === 0;
});

test('深层嵌套arraybuffer比较', () => {
  const ab1 = new ArrayBuffer(4);
  const ab2 = new ArrayBuffer(4);
  const view1 = new Uint8Array(ab1);
  const view2 = new Uint8Array(ab2);

  view1.set([1, 2, 3, 4]);
  view2.set([1, 2, 3, 4]);

  const buf1 = Buffer.from(ab1);
  const buf2 = Buffer.from(ab2);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('零内容不同类型比较', () => {
  const buf1 = Buffer.alloc(10, 0);
  const uint8 = new Uint8Array(10);
  const result = buf1.compare(uint8);
  return result === 0;
});

test('Buffer.subarray比较', () => {
  const original = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const sub1 = original.subarray(2, 5);
  const sub2 = original.subarray(2, 5);
  const result = sub1.compare(sub2);
  return result === 0;
});

test('不同编码字符串比较', () => {
  const buf1 = Buffer.from('abc', 'utf8');
  const buf2 = Buffer.from('abc', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('历史行为 - 边界值处理', () => {
  const buf1 = Buffer.from([0x80]);
  const buf2 = Buffer.from([0x7F]);
  const result = buf1.compare(buf2);
  return result > 0;
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