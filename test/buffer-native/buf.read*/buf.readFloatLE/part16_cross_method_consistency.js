// buf.readFloatLE() - 跨方法一致性测试
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

// writeFloatLE + readFloatLE 往返一致性
test('writeFloatLE + readFloatLE 往返完全一致', () => {
  const buf = Buffer.alloc(4);
  const value = 3.14159;
  buf.writeFloatLE(value, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - value) < 0.001;
});

// writeFloatBE + readFloatLE 字节序差异
test('writeFloatBE + readFloatLE 字节序不同', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(1.0, 0);
  const result = buf.readFloatLE(0);
  return result !== 1.0; // 字节序不同，结果应该不同
});

// 同一 Buffer 混合使用多个 read 方法
test('同一 Buffer 混合使用 readFloatLE 和 readFloatBE', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(1.5, 0);
  buf.writeFloatBE(2.5, 4);
  
  return buf.readFloatLE(0) === 1.5 && buf.readFloatBE(4) === 2.5;
});

// 与 DataView.getFloat32 一致性
test('与 DataView.getFloat32(LE) 完全一致', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.718, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufResult = buf.readFloatLE(0);
  const dvResult = dv.getFloat32(0, true); // true = little-endian
  
  return Math.abs(bufResult - dvResult) < 0.00001;
});

// 跨多个 offset 连续读取
test('连续读取多个 offset', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 4; i++) {
    buf.writeFloatLE(i + 0.5, i * 4);
  }
  
  for (let i = 0; i < 4; i++) {
    const result = buf.readFloatLE(i * 4);
    if (Math.abs(result - (i + 0.5)) > 0.01) return false;
  }
  return true;
});

// 在 subarray / slice 上读取
test('在 subarray 上使用 readFloatLE', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatLE(1.1, 0);
  buf.writeFloatLE(2.2, 4);
  buf.writeFloatLE(3.3, 8);
  
  const sub = buf.subarray(4, 12);
  return Math.abs(sub.readFloatLE(0) - 2.2) < 0.01 &&
         Math.abs(sub.readFloatLE(4) - 3.3) < 0.01;
});

// 修改原 Buffer 影响 subarray
test('修改原 Buffer 后 subarray 读取新值', () => {
  const buf = Buffer.alloc(8);
  const sub = buf.subarray(4);
  
  buf.writeFloatLE(1.5, 4);
  const result1 = sub.readFloatLE(0);
  
  buf.writeFloatLE(2.5, 4);
  const result2 = sub.readFloatLE(0);
  
  return result1 === 1.5 && result2 === 2.5;
});

// Buffer 和 Uint8Array 视图共享数据
test('Buffer 和 Uint8Array 视图读取一致', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.0, 0);
  
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  const bytes = Array.from(u8);
  
  return bytes[0] === 0x00 && bytes[1] === 0x00 && 
         bytes[2] === 0x80 && bytes[3] === 0x3F;
});

// 大 offset Buffer
test('大 Buffer 中间位置读取', () => {
  const buf = Buffer.alloc(10000);
  const offset = 5000;
  buf.writeFloatLE(123.456, offset);
  
  return Math.abs(buf.readFloatLE(offset) - 123.456) < 0.001;
});

// 从 Float32Array 创建 Buffer
test('从 Float32Array 创建的 Buffer 读取', () => {
  const f32 = new Float32Array([1.5, 2.5, 3.5]);
  const buf = Buffer.from(f32.buffer);
  
  return buf.readFloatLE(0) === 1.5 &&
         buf.readFloatLE(4) === 2.5 &&
         buf.readFloatLE(8) === 3.5;
});

// offset 精确边界
test('offset = buf.length - 4 精确边界', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(9.99, 4);
  
  return Math.abs(buf.readFloatLE(4) - 9.99) < 0.01;
});

// 同一位置重复读取
test('同一位置重复读取 10 次结果一致', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(7.77, 0);
  
  for (let i = 0; i < 10; i++) {
    const result = buf.readFloatLE(0);
    if (Math.abs(result - 7.77) > 0.01) return false;
  }
  return true;
});

// 覆盖写入后读取
test('覆盖写入后读取新值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.0, 0);
  buf.readFloatLE(0);
  
  buf.writeFloatLE(2.0, 0);
  return buf.readFloatLE(0) === 2.0;
});

// Buffer.concat 后读取
test('Buffer.concat 后正确读取', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  
  buf1.writeFloatLE(1.5, 0);
  buf2.writeFloatLE(2.5, 0);
  
  const combined = Buffer.concat([buf1, buf2]);
  
  return combined.readFloatLE(0) === 1.5 &&
         combined.readFloatLE(4) === 2.5;
});

// 从 base64 创建 Buffer 后读取
test('从 base64 字符串创建 Buffer 后读取', () => {
  const buf1 = Buffer.alloc(4);
  buf1.writeFloatLE(3.14, 0);
  
  const base64 = buf1.toString('base64');
  const buf2 = Buffer.from(base64, 'base64');
  
  return Math.abs(buf2.readFloatLE(0) - 3.14) < 0.01;
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
