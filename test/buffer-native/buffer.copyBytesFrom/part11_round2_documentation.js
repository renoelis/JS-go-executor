// Buffer.copyBytesFrom() - Part 11: Round 2 - Documentation Compliance Tests
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

// 验证官方文档示例
test('官方文档示例: Uint16Array 部分复制', () => {
  const u16 = new Uint16Array([0, 0xffff]);
  const buf = Buffer.copyBytesFrom(u16, 1, 1);
  u16[1] = 0;
  return buf.length === 2 && buf[0] === 255 && buf[1] === 255;
});

test('官方文档: 验证是复制不是引用', () => {
  const u16 = new Uint16Array([0, 0xffff]);
  const buf = Buffer.copyBytesFrom(u16, 1, 1);
  u16[1] = 0;
  return buf[0] === 255 && u16[1] === 0;
});

// 测试返回值是 Buffer 实例
test('返回值是 Buffer 实例', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view);
  return Buffer.isBuffer(buf) && buf instanceof Buffer;
});

test('返回值是 Uint8Array 实例', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view);
  return buf instanceof Uint8Array;
});

// 验证参数顺序和含义
test('第一个参数: view 必需', () => {
  try {
    Buffer.copyBytesFrom();
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('第二个参数: offset 可选', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3;
});

test('第三个参数: length 可选', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 2;
});

test('offset 默认值为 0', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.copyBytesFrom(view);
  const buf2 = Buffer.copyBytesFrom(view, 0);
  return buf1.length === buf2.length && buf1[0] === buf2[0];
});

test('length 默认值为剩余长度', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf1 = Buffer.copyBytesFrom(view, 1);
  const buf2 = Buffer.copyBytesFrom(view, 1, 3);
  return buf1.length === buf2.length && buf1[0] === buf2[0];
});

// 测试静态方法调用
test('作为静态方法调用', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3;
});

test('不能作为实例方法调用', () => {
  try {
    const buf = Buffer.alloc(10);
    const view = new Uint8Array([1, 2, 3]);
    buf.copyBytesFrom(view);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// TypedArray 定义验证
test('Int8Array 是 TypedArray', () => {
  const view = new Int8Array([1]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 1;
});

test('Uint8ClampedArray 是 TypedArray', () => {
  const view = new Uint8ClampedArray([1]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 1;
});

test('DataView 不是 TypedArray', () => {
  try {
    const dv = new DataView(new ArrayBuffer(4));
    Buffer.copyBytesFrom(dv);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// offset 和 length 以元素为单位
test('Uint8Array offset 以字节为单位', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 2);
  return buf.length === 2;
});

test('Uint16Array offset 以元素为单位(每元素2字节)', () => {
  const view = new Uint16Array([0x1111, 0x2222, 0x3333]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 4;
});

test('Uint32Array offset 以元素为单位(每元素4字节)', () => {
  const view = new Uint32Array([0x11111111, 0x22222222]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 4;
});

test('Float64Array offset 以元素为单位(每元素8字节)', () => {
  const view = new Float64Array([1.1, 2.2, 3.3]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 16;
});

test('length 参数也以元素为单位', () => {
  const view = new Uint16Array([0x1111, 0x2222, 0x3333, 0x4444]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 4;
});

// 复制的是底层字节
test('复制 TypedArray 的底层字节表示', () => {
  const view = new Uint16Array([0x1234]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 2 && (buf[0] === 0x34 || buf[0] === 0x12);
});

test('字节序与平台一致', () => {
  const view = new Uint32Array([0x12345678]);
  const buf = Buffer.copyBytesFrom(view);
  const checkView = new Uint32Array(buf.buffer, buf.byteOffset, 1);
  return checkView[0] === 0x12345678;
});

// 空 Buffer 情况
test('复制空 TypedArray 返回空 Buffer', () => {
  const view = new Uint8Array([]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 0 && Buffer.isBuffer(buf);
});

test('offset 等于 length 返回空 Buffer', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view, 3);
  return buf.length === 0 && Buffer.isBuffer(buf);
});

test('length 为 0 返回空 Buffer', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view, 0, 0);
  return buf.length === 0 && Buffer.isBuffer(buf);
});

// 参数类型验证
test('offset 必须是数字', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 'invalid');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('length 必须是数字', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, 'invalid');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 必须是安全整数', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, Number.MAX_SAFE_INTEGER + 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('length 必须是安全整数', () => {
  try {
    const view = new Uint8Array([1, 2, 3]);
    Buffer.copyBytesFrom(view, 0, Number.MAX_SAFE_INTEGER + 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// BigInt TypedArray
test('BigInt64Array 支持', () => {
  const view = new BigInt64Array([123n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('BigUint64Array 支持', () => {
  const view = new BigUint64Array([123n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

// 与 Buffer.from 的区别
test('Buffer.from 不接受 TypedArray + offset', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.from(view);
  return buf1.length === 3;
});

test('copyBytesFrom 支持 offset 参数', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 2 && buf[0] === 20;
});

test('copyBytesFrom 支持 length 参数', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 2 && buf[0] === 20 && buf[1] === 30;
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
