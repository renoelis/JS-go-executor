// Buffer.copyBytesFrom() - Part 7: Special Values and Edge Cases
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

// 特殊数值测试
test('复制全 0 的数组', () => {
  const view = new Uint8Array([0, 0, 0, 0]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4 && buf[0] === 0 && buf[3] === 0;
});

test('复制全 255 的数组', () => {
  const view = new Uint8Array([255, 255, 255]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 255 && buf[2] === 255;
});

test('复制混合值的数组', () => {
  const view = new Uint8Array([0, 1, 127, 128, 254, 255]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 6 && buf[0] === 0 && buf[2] === 127 && buf[5] === 255;
});

test('Int8Array 最小值', () => {
  const view = new Int8Array([-128]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 1 && buf[0] === 128;
});

test('Int8Array 最大值', () => {
  const view = new Int8Array([127]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 1 && buf[0] === 127;
});

test('Uint16Array 最小值', () => {
  const view = new Uint16Array([0]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 2 && buf[0] === 0 && buf[1] === 0;
});

test('Uint16Array 最大值', () => {
  const view = new Uint16Array([0xFFFF]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 2 && buf[0] === 255 && buf[1] === 255;
});

test('Int32Array 最小值', () => {
  const view = new Int32Array([-2147483648]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Int32Array 最大值', () => {
  const view = new Int32Array([2147483647]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Uint32Array 最小值', () => {
  const view = new Uint32Array([0]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4 && buf[0] === 0;
});

test('Uint32Array 最大值', () => {
  const view = new Uint32Array([0xFFFFFFFF]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Float32Array 正零', () => {
  const view = new Float32Array([0.0]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Float32Array 负零', () => {
  const view = new Float32Array([-0.0]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Float32Array 正无穷', () => {
  const view = new Float32Array([Infinity]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Float32Array 负无穷', () => {
  const view = new Float32Array([-Infinity]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Float32Array NaN', () => {
  const view = new Float32Array([NaN]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Float64Array 正零', () => {
  const view = new Float64Array([0.0]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('Float64Array 负零', () => {
  const view = new Float64Array([-0.0]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('Float64Array 正无穷', () => {
  const view = new Float64Array([Infinity]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('Float64Array 负无穷', () => {
  const view = new Float64Array([-Infinity]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('Float64Array NaN', () => {
  const view = new Float64Array([NaN]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('Float64Array 最小正数', () => {
  const view = new Float64Array([Number.MIN_VALUE]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('Float64Array 最大数', () => {
  const view = new Float64Array([Number.MAX_VALUE]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('Float64Array 极小负数', () => {
  const view = new Float64Array([-Number.MAX_VALUE]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('BigInt64Array 最小值', () => {
  const view = new BigInt64Array([-9223372036854775808n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('BigInt64Array 最大值', () => {
  const view = new BigInt64Array([9223372036854775807n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('BigInt64Array 零', () => {
  const view = new BigInt64Array([0n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8 && buf[0] === 0;
});

test('BigUint64Array 最小值', () => {
  const view = new BigUint64Array([0n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8 && buf[0] === 0;
});

test('BigUint64Array 最大值', () => {
  const view = new BigUint64Array([18446744073709551615n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

// 特殊长度数组
test('长度为 100 的数组', () => {
  const view = new Uint8Array(100);
  for (let i = 0; i < 100; i++) view[i] = i % 256;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 100 && buf[0] === 0 && buf[99] === 99;
});

test('长度为 1000 的数组', () => {
  const view = new Uint8Array(1000);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 1000;
});

test('长度为 10000 的数组', () => {
  const view = new Uint8Array(10000);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 10000;
});

// 奇数/偶数长度
test('奇数长度数组', () => {
  const view = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 5;
});

test('偶数长度数组', () => {
  const view = new Uint8Array([1, 2, 3, 4]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

// 2的幂次长度
test('长度为 2^4=16', () => {
  const view = new Uint8Array(16);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 16;
});

test('长度为 2^8=256', () => {
  const view = new Uint8Array(256);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 256;
});

test('长度为 2^10=1024', () => {
  const view = new Uint8Array(1024);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 1024;
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
