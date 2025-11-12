// Buffer.copyBytesFrom() - Part 5: Offset and Length Boundary Tests
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

// offset 边界测试
test('offset=0 应该复制全部', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0);
  return buf.length === 3 && buf[0] === 10 && buf[2] === 30;
});

test('offset 等于 length 应返回空 Buffer', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 3);
  return buf.length === 0;
});

test('offset 超出 length 应返回空 Buffer', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 10);
  return buf.length === 0;
});

test('offset 为 MAX_SAFE_INTEGER 应返回空 Buffer', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, Number.MAX_SAFE_INTEGER);
  return buf.length === 0;
});

test('offset 为 length-1 应返回最后一个元素', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 4);
  return buf.length === 1 && buf[0] === 50;
});

test('offset 为 1 应跳过第一个元素', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 2 && buf[0] === 20 && buf[1] === 30;
});

// length 边界测试
test('length=0 应返回空 Buffer', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, 0);
  return buf.length === 0;
});

test('length=1 应只复制一个元素', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1, 1);
  return buf.length === 1 && buf[0] === 20;
});

test('length 等于剩余长度', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 2, 3);
  return buf.length === 3 && buf[0] === 30 && buf[2] === 50;
});

test('length 超过剩余长度应截断', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1, 100);
  return buf.length === 2 && buf[0] === 20 && buf[1] === 30;
});

test('length 为 MAX_SAFE_INTEGER 应复制全部剩余', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1, Number.MAX_SAFE_INTEGER);
  return buf.length === 2 && buf[0] === 20;
});

// offset + length 组合测试
test('offset=0, length=全长', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 0, 4);
  return buf.length === 4 && buf[0] === 10 && buf[3] === 40;
});

test('offset=1, length=全长-1', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf.length === 3 && buf[0] === 20 && buf[2] === 40;
});

test('offset=中间, length=1', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 2, 1);
  return buf.length === 1 && buf[0] === 30;
});

test('offset=最后, length=1', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 2, 1);
  return buf.length === 1 && buf[0] === 30;
});

test('offset=最后, length=2 应截断为1', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 2, 2);
  return buf.length === 1 && buf[0] === 30;
});

test('offset=超出, length=任意值 应返回空', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 10, 5);
  return buf.length === 0;
});

// 不同 TypedArray 的 offset/length 计算(元素单位)
test('Uint16Array offset 按元素计算', () => {
  const view = new Uint16Array([0x1234, 0x5678, 0xABCD]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 4;
});

test('Uint16Array offset+length 按元素计算', () => {
  const view = new Uint16Array([0x1111, 0x2222, 0x3333, 0x4444]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 4;
});

test('Uint32Array offset 按元素计算', () => {
  const view = new Uint32Array([0x12345678, 0xABCDEF00, 0x11111111]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 8;
});

test('Float64Array offset 按元素计算', () => {
  const view = new Float64Array([1.1, 2.2, 3.3]);
  const buf = Buffer.copyBytesFrom(view, 2);
  return buf.length === 8;
});

test('BigInt64Array offset+length 按元素计算', () => {
  const view = new BigInt64Array([100n, 200n, 300n, 400n]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 16;
});

// 空 TypedArray
test('空 Uint8Array offset=0', () => {
  const view = new Uint8Array([]);
  const buf = Buffer.copyBytesFrom(view, 0);
  return buf.length === 0;
});

test('空 Uint8Array offset=0 length=0', () => {
  const view = new Uint8Array([]);
  const buf = Buffer.copyBytesFrom(view, 0, 0);
  return buf.length === 0;
});

test('空 Uint8Array offset=任意值', () => {
  const view = new Uint8Array([]);
  const buf = Buffer.copyBytesFrom(view, 100);
  return buf.length === 0;
});

// 长度为 1 的 TypedArray
test('长度为1 offset=0', () => {
  const view = new Uint8Array([99]);
  const buf = Buffer.copyBytesFrom(view, 0);
  return buf.length === 1 && buf[0] === 99;
});

test('长度为1 offset=1', () => {
  const view = new Uint8Array([99]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 0;
});

test('长度为1 offset=0 length=1', () => {
  const view = new Uint8Array([99]);
  const buf = Buffer.copyBytesFrom(view, 0, 1);
  return buf.length === 1 && buf[0] === 99;
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
