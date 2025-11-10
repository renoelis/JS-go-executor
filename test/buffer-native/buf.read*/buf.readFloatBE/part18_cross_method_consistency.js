// buf.readFloatBE() - 跨方法一致性测试
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

// 与 writeFloatBE/readFloatBE 往返一致性
test('writeFloatBE + readFloatBE 往返一致性', () => {
  const buf = Buffer.alloc(4);
  const value = 1234.567;
  buf.writeFloatBE(value, 0);
  return Math.abs(buf.readFloatBE(0) - value) < 0.001;
});

// 与 writeFloatLE/readFloatBE 字节序差异
test('writeFloatLE + readFloatBE 字节序不同', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.0, 0);
  const result = buf.readFloatBE(0);
  return result !== 1.0; // 字节序不同应该读出不同的值
});

// 同一 Buffer 混合使用多个 read 方法
test('同一 Buffer 上使用不同 read 方法', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(123.456, 0);
  buf.writeInt32BE(42, 4);
  const float = buf.readFloatBE(0);
  const int = buf.readInt32BE(4);
  return Math.abs(float - 123.456) < 0.001 && int === 42;
});

// 与 DataView 的一致性
test('与 DataView.getFloat32 一致性', () => {
  const arr = new Uint8Array([0x40, 0x49, 0x0F, 0xDB]);
  const buf = Buffer.from(arr);
  const dv = new DataView(arr.buffer);
  const bufResult = buf.readFloatBE(0);
  const dvResult = dv.getFloat32(0, false); // false = big-endian
  return bufResult === dvResult;
});

// 跨多个 offset 连续读取
test('连续读取不覆盖', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 4; i++) {
    buf.writeFloatBE(i * 10.5, i * 4);
  }
  const values = [];
  for (let i = 0; i < 4; i++) {
    values.push(buf.readFloatBE(i * 4));
  }
  return values.every((v, i) => Math.abs(v - i * 10.5) < 0.01);
});

// 在 subarray 上读取
test('在 subarray 上 readFloatBE', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatBE(999.999, 4);
  const sub = buf.subarray(4, 8);
  return Math.abs(sub.readFloatBE(0) - 999.999) < 0.001;
});

// 在 slice 上读取
test('在 slice 上 readFloatBE', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatBE(888.888, 4);
  const sliced = buf.slice(4, 8);
  return Math.abs(sliced.readFloatBE(0) - 888.888) < 0.001;
});

// 修改原 Buffer 后 subarray 的读取
test('修改原 Buffer 影响 subarray', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(111.111, 0);
  const sub = buf.subarray(0, 4);
  const before = sub.readFloatBE(0);
  buf.writeFloatBE(222.222, 0);
  const after = sub.readFloatBE(0);
  return Math.abs(before - 111.111) < 0.001 && Math.abs(after - 222.222) < 0.001;
});

// 在 Uint8Array 视图上读取
test('Buffer 和 Uint8Array 视图共享数据', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 0);
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const buf2 = Buffer.from(uint8);
  return Math.abs(buf2.readFloatBE(0) - 3.14) < 0.01;
});

// 大 offset 但在有效范围内
test('大 offset 但有效（1000000字节Buffer）', () => {
  const buf = Buffer.alloc(1000004);
  buf.writeFloatBE(123.456, 1000000);
  return Math.abs(buf.readFloatBE(1000000) - 123.456) < 0.001;
});

// 与其他类型 TypedArray 互操作
test('从 Float32Array 创建 Buffer', () => {
  const f32arr = new Float32Array([2.718]);
  const buf = Buffer.from(f32arr.buffer);
  // 注意：Float32Array 默认是平台字节序，通常是 LE
  // 我们只测试能够读取，不验证具体值
  const result = buf.readFloatBE(0);
  return typeof result === 'number' && !Number.isNaN(result);
});

// offset 为非常接近边界的值
test('offset 为 buf.length - 4（精确边界）', () => {
  const buf = Buffer.alloc(100);
  buf.writeFloatBE(777.777, 96);
  return Math.abs(buf.readFloatBE(96) - 777.777) < 0.001;
});

// 同一位置重复读取
test('同一位置重复读取 100 次结果一致', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14159, 0);
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(buf.readFloatBE(0));
  }
  return results.every(r => r === results[0]);
});

// 在已有数据的 Buffer 上覆盖写入后读取
test('覆盖写入后读取正确', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(111.111, 0);
  buf.writeFloatBE(222.222, 0);
  buf.writeFloatBE(333.333, 0);
  return Math.abs(buf.readFloatBE(0) - 333.333) < 0.001;
});

// Buffer.concat 后读取
test('Buffer.concat 后读取', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeFloatBE(111.111, 0);
  buf2.writeFloatBE(222.222, 0);
  const concatenated = Buffer.concat([buf1, buf2]);
  return Math.abs(concatenated.readFloatBE(0) - 111.111) < 0.001 &&
         Math.abs(concatenated.readFloatBE(4) - 222.222) < 0.001;
});

// 从不同编码的字符串创建 Buffer 后读取
test('从 base64 创建 Buffer 后读取', () => {
  const buf1 = Buffer.alloc(4);
  buf1.writeFloatBE(987.654, 0);
  const base64 = buf1.toString('base64');
  const buf2 = Buffer.from(base64, 'base64');
  return Math.abs(buf2.readFloatBE(0) - 987.654) < 0.001;
});

// 从 hex 创建 Buffer 后读取
test('从 hex 创建 Buffer 后读取 PI', () => {
  // PI (3.14159...) 的 IEEE 754 float32 big-endian hex: 40490fdb
  const buf = Buffer.from('40490fdb', 'hex');
  return Math.abs(buf.readFloatBE(0) - Math.PI) < 0.00001;
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
