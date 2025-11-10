// buf.readBigUInt64BE() - Buffer 状态和属性测试
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

// Buffer 属性不变
test('读取后 length 不变', () => {
  const buf = Buffer.alloc(16);
  const lenBefore = buf.length;
  buf.readBigUInt64BE(0);
  return buf.length === lenBefore;
});

test('读取后 byteLength 不变', () => {
  const buf = Buffer.alloc(16);
  const byteLenBefore = buf.byteLength;
  buf.readBigUInt64BE(0);
  return buf.byteLength === byteLenBefore;
});

test('读取后 byteOffset 不变', () => {
  const ab = new ArrayBuffer(24);
  const buf = Buffer.from(ab, 8, 16);
  const offsetBefore = buf.byteOffset;
  buf.readBigUInt64BE(0);
  return buf.byteOffset === offsetBefore;
});

// 多次读取状态一致
test('多次读取 length 保持一致', () => {
  const buf = Buffer.alloc(16);
  buf.readBigUInt64BE(0);
  const len1 = buf.length;
  buf.readBigUInt64BE(0);
  const len2 = buf.length;
  buf.readBigUInt64BE(0);
  const len3 = buf.length;
  return len1 === len2 && len2 === len3 && len1 === 16;
});

// Buffer 内容不变
test('读取后内容不变（全零）', () => {
  const buf = Buffer.alloc(8);
  const before = Array.from(buf);
  buf.readBigUInt64BE(0);
  const after = Array.from(buf);
  return JSON.stringify(before) === JSON.stringify(after);
});

test('读取后内容不变（有值）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const before = Array.from(buf);
  buf.readBigUInt64BE(0);
  const after = Array.from(buf);
  return JSON.stringify(before) === JSON.stringify(after);
});

// Buffer 类型不变
test('读取后仍是 Buffer', () => {
  const buf = Buffer.alloc(8);
  buf.readBigUInt64BE(0);
  return Buffer.isBuffer(buf);
});

test('读取后 instanceof Buffer', () => {
  const buf = Buffer.alloc(8);
  buf.readBigUInt64BE(0);
  return buf instanceof Buffer;
});

// 冻结的 Buffer（Node.js 不允许冻结有元素的 TypedArray）
test('尝试冻结 Buffer 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 密封的 Buffer（Node.js 不允许密封有元素的 TypedArray）
test('尝试密封 Buffer 会抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 不可扩展的 Buffer
test('不可扩展的 Buffer 可以读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(789n, 0);
  Object.preventExtensions(buf);
  return buf.readBigUInt64BE(0) === 789n;
});

// Buffer 池化
test('allocUnsafe 的 Buffer 可以读取', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigUInt64BE(111n, 0);
  return buf.readBigUInt64BE(0) === 111n;
});

test('alloc 的 Buffer 初始值为 0', () => {
  const buf = Buffer.alloc(8);
  return buf.readBigUInt64BE(0) === 0n;
});

// Buffer 来源
test('从数组创建的 Buffer', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 1, 0]);
  return buf.readBigUInt64BE(0) === 256n;
});

test('从十六进制创建的 Buffer', () => {
  const buf = Buffer.from('0000000000000100', 'hex');
  return buf.readBigUInt64BE(0) === 256n;
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
