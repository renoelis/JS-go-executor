// buf.readBigUInt64BE() - SharedArrayBuffer 测试
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

// 检查 SharedArrayBuffer 是否可用
const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

if (hasSharedArrayBuffer) {
  // 从 SharedArrayBuffer 创建 Buffer
  test('从 SharedArrayBuffer 创建 Buffer 并读取', () => {
    const sab = new SharedArrayBuffer(8);
    const buf = Buffer.from(sab);
    buf.writeBigUInt64BE(12345n, 0);
    return buf.readBigUInt64BE(0) === 12345n;
  });

  test('SharedArrayBuffer Buffer 读取零', () => {
    const sab = new SharedArrayBuffer(8);
    const buf = Buffer.from(sab);
    return buf.readBigUInt64BE(0) === 0n;
  });

  test('SharedArrayBuffer Buffer 读取最大值', () => {
    const sab = new SharedArrayBuffer(8);
    const buf = Buffer.from(sab);
    buf.writeBigUInt64BE(18446744073709551615n, 0);
    return buf.readBigUInt64BE(0) === 18446744073709551615n;
  });

  test('SharedArrayBuffer Buffer 带 offset', () => {
    const sab = new SharedArrayBuffer(16);
    const buf = Buffer.from(sab);
    buf.writeBigUInt64BE(999n, 8);
    return buf.readBigUInt64BE(8) === 999n;
  });

  test('SharedArrayBuffer Buffer 与 DataView 一致', () => {
    const sab = new SharedArrayBuffer(8);
    const buf = Buffer.from(sab);
    buf.writeBigUInt64BE(123456789n, 0);
    const dv = new DataView(sab);
    return buf.readBigUInt64BE(0) === dv.getBigUint64(0, false);
  });

  test('SharedArrayBuffer Buffer offset 越界', () => {
    try {
      const sab = new SharedArrayBuffer(8);
      const buf = Buffer.from(sab);
      buf.readBigUInt64BE(1);
      return false;
    } catch (e) {
      return e.name === 'RangeError';
    }
  });

  test('SharedArrayBuffer 多个 Buffer 视图共享数据', () => {
    const sab = new SharedArrayBuffer(8);
    const buf1 = Buffer.from(sab);
    const buf2 = Buffer.from(sab);
    buf1.writeBigUInt64BE(777n, 0);
    return buf2.readBigUInt64BE(0) === 777n;
  });

  test('SharedArrayBuffer Buffer subarray', () => {
    const sab = new SharedArrayBuffer(16);
    const buf = Buffer.from(sab);
    buf.writeBigUInt64BE(555n, 8);
    const sub = buf.subarray(8);
    return sub.readBigUInt64BE(0) === 555n;
  });
} else {
  test('SharedArrayBuffer 不可用（跳过测试）', () => {
    return true;
  });
}

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
