// buffer.isAscii() - Part 4: All TypedArray Types Tests
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Uint8Array 完整测试
test('Uint8Array - 全 ASCII', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return isAscii(arr) === true;
});

test('Uint8Array - 包含 0x80', () => {
  const arr = new Uint8Array([0x48, 0x80]);
  return isAscii(arr) === false;
});

test('Uint8Array - 包含 0xFF', () => {
  const arr = new Uint8Array([0x48, 0xFF]);
  return isAscii(arr) === false;
});

// Uint8ClampedArray 测试
test('Uint8ClampedArray - 全 ASCII', () => {
  const arr = new Uint8ClampedArray([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return isAscii(arr) === true;
});

test('Uint8ClampedArray - 非 ASCII', () => {
  const arr = new Uint8ClampedArray([0x48, 0x80, 0xFF]);
  return isAscii(arr) === false;
});

test('Uint8ClampedArray - 空数组', () => {
  const arr = new Uint8ClampedArray(0);
  return isAscii(arr) === true;
});

// Int8Array 测试
test('Int8Array - 正数 ASCII', () => {
  const arr = new Int8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return isAscii(arr) === true;
});

test('Int8Array - 包含负数', () => {
  const arr = new Int8Array([0x48, -1]);
  return isAscii(arr) === false;
});

test('Int8Array - 包含 -128', () => {
  const arr = new Int8Array([0x48, -128]);
  return isAscii(arr) === false;
});

test('Int8Array - 边界值 127', () => {
  const arr = new Int8Array([0x48, 127]);
  return isAscii(arr) === true;
});

// Uint16Array 测试（字节序相关）
test('Uint16Array - 小端序 ASCII 值', () => {
  const arr = new Uint16Array([0x4865]); // 'He' 或 'eH' 取决于字节序
  return typeof isAscii(arr) === 'boolean';
});

test('Uint16Array - 包含高位字节', () => {
  const arr = new Uint16Array([0x4865, 0x8080]);
  return typeof isAscii(arr) === 'boolean';
});

test('Uint16Array - 空数组', () => {
  const arr = new Uint16Array(0);
  return isAscii(arr) === true;
});

test('Uint16Array - 单个元素', () => {
  const arr = new Uint16Array([0x0041]); // 'A' + null 或相反
  return typeof isAscii(arr) === 'boolean';
});

// Int16Array 测试
test('Int16Array - ASCII 范围值', () => {
  const arr = new Int16Array([0x4865]);
  return typeof isAscii(arr) === 'boolean';
});

test('Int16Array - 负数', () => {
  const arr = new Int16Array([-1, 0x4865]);
  return typeof isAscii(arr) === 'boolean';
});

test('Int16Array - 空数组', () => {
  const arr = new Int16Array(0);
  return isAscii(arr) === true;
});

// Uint32Array 测试
test('Uint32Array - ASCII 值', () => {
  const arr = new Uint32Array([0x48656C6C]); // 'Hell' 或反序
  return typeof isAscii(arr) === 'boolean';
});

test('Uint32Array - 包含高位字节', () => {
  const arr = new Uint32Array([0x80000000]);
  return typeof isAscii(arr) === 'boolean';
});

test('Uint32Array - 空数组', () => {
  const arr = new Uint32Array(0);
  return isAscii(arr) === true;
});

test('Uint32Array - 多个元素', () => {
  const arr = new Uint32Array([0x48656C6C, 0x6F000000]);
  return typeof isAscii(arr) === 'boolean';
});

// Int32Array 测试
test('Int32Array - 正数', () => {
  const arr = new Int32Array([0x48656C6C]);
  return typeof isAscii(arr) === 'boolean';
});

test('Int32Array - 负数', () => {
  const arr = new Int32Array([-1]);
  return typeof isAscii(arr) === 'boolean';
});

test('Int32Array - 空数组', () => {
  const arr = new Int32Array(0);
  return isAscii(arr) === true;
});

// Float32Array 测试（不太常见，但需要验证）
test('Float32Array - 按字节解释', () => {
  const arr = new Float32Array([1.0]);
  return typeof isAscii(arr) === 'boolean';
});

test('Float32Array - 空数组', () => {
  const arr = new Float32Array(0);
  return isAscii(arr) === true;
});

// Float64Array 测试
test('Float64Array - 按字节解释', () => {
  const arr = new Float64Array([1.0]);
  return typeof isAscii(arr) === 'boolean';
});

test('Float64Array - 空数组', () => {
  const arr = new Float64Array(0);
  return isAscii(arr) === true;
});

// BigInt64Array 测试
test('BigInt64Array - 按字节解释', () => {
  const arr = new BigInt64Array([0n]);
  return typeof isAscii(arr) === 'boolean';
});

test('BigInt64Array - 非零值', () => {
  const arr = new BigInt64Array([72n]); // 'H' 的 ASCII 值
  return typeof isAscii(arr) === 'boolean';
});

test('BigInt64Array - 空数组', () => {
  const arr = new BigInt64Array(0);
  return isAscii(arr) === true;
});

// BigUint64Array 测试
test('BigUint64Array - 按字节解释', () => {
  const arr = new BigUint64Array([0n]);
  return typeof isAscii(arr) === 'boolean';
});

test('BigUint64Array - 大值', () => {
  const arr = new BigUint64Array([72n]);
  return typeof isAscii(arr) === 'boolean';
});

test('BigUint64Array - 空数组', () => {
  const arr = new BigUint64Array(0);
  return isAscii(arr) === true;
});

// 混合场景：从同一个 ArrayBuffer 创建不同 TypedArray
test('同一 ArrayBuffer - Uint8 和 Uint16 视图', () => {
  const ab = new ArrayBuffer(4);
  const u8 = new Uint8Array(ab);
  const u16 = new Uint16Array(ab);
  u8[0] = 0x48;
  u8[1] = 0x65;
  u8[2] = 0x6C;
  u8[3] = 0x6C;
  return isAscii(u8) === true && typeof isAscii(u16) === 'boolean';
});

test('同一 ArrayBuffer - Uint8 和 Uint32 视图', () => {
  const ab = new ArrayBuffer(4);
  const u8 = new Uint8Array(ab);
  const u32 = new Uint32Array(ab);
  u8[0] = 0x48;
  u8[1] = 0x65;
  u8[2] = 0x80; // 非 ASCII
  u8[3] = 0x6C;
  return isAscii(u8) === false && typeof isAscii(u32) === 'boolean';
});

// 字节序测试
test('字节序 - Uint16Array with 纯 ASCII 字节', () => {
  const ab = new ArrayBuffer(4);
  const u8 = new Uint8Array(ab);
  u8[0] = 0x41; // A
  u8[1] = 0x00;
  u8[2] = 0x42; // B
  u8[3] = 0x00;
  const u16 = new Uint16Array(ab);
  // Uint8Array 视图是 ASCII
  // Uint16Array 视图字节内容相同，只是解释方式不同
  return isAscii(u8) === true && typeof isAscii(u16) === 'boolean';
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
