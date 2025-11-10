// buf.readFloatLE() - 极端边界情况深度测试
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

// valueOf getter 测试
test('offset 对象有 valueOf getter 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    const objWithGetter = {
      get valueOf() { return 0; }
    };
    buf.readFloatLE(objWithGetter);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// valueOf 抛出错误
test('offset 对象 valueOf 方法抛出错误应传播为 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    const objThrows = {
      valueOf() { throw new Error('valueOf error'); }
    };
    buf.readFloatLE(objThrows);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('valueOf error');
  }
});

// 超大 Buffer 测试
test('超大 Buffer (1MB) 最后 4 字节读取', () => {
  const buf = Buffer.alloc(1024 * 1024);
  buf.writeFloatLE(3.33, 1024 * 1024 - 4);
  return Math.abs(buf.readFloatLE(1024 * 1024 - 4) - 3.33) < 0.01;
});

test('超大 Buffer (1MB) 中间偏移量读取', () => {
  const buf = Buffer.alloc(1024 * 1024);
  buf.writeFloatLE(2.22, 512 * 1024);
  return Math.abs(buf.readFloatLE(512 * 1024) - 2.22) < 0.01;
});

// 2^n 边界对齐测试
test('offset 为 2^8 (256) 边界读取', () => {
  const buf = Buffer.alloc(1024);
  buf.writeFloatLE(5.5, 256);
  return buf.readFloatLE(256) === 5.5;
});

test('offset 为 2^9 (512) 边界读取', () => {
  const buf = Buffer.alloc(1024);
  buf.writeFloatLE(6.6, 512);
  return Math.abs(buf.readFloatLE(512) - 6.6) < 0.01;
});

test('offset 为 2^10 (1024) 边界读取', () => {
  const buf = Buffer.alloc(2048);
  buf.writeFloatLE(10.24, 1024);
  return Math.abs(buf.readFloatLE(1024) - 10.24) < 0.01;
});

// 质数长度 Buffer
test('Buffer 长度为质数 7', () => {
  const buf = Buffer.alloc(7);
  buf.writeFloatLE(7.7, 3);
  return Math.abs(buf.readFloatLE(3) - 7.7) < 0.1;
});

test('Buffer 长度为质数 11', () => {
  const buf = Buffer.alloc(11);
  buf.writeFloatLE(11.11, 7);
  return Math.abs(buf.readFloatLE(7) - 11.11) < 0.01;
});

test('Buffer 长度为质数 13', () => {
  const buf = Buffer.alloc(13);
  buf.writeFloatLE(13.13, 9);
  return Math.abs(buf.readFloatLE(9) - 13.13) < 0.01;
});

// 负小数 offset
test('offset 为 -0.1 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 -0.5 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 -0.9 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-0.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 -0.999 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-0.999);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 极小正浮点数 offset
test('offset 为 1e-10 (极小正数) 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(1e-10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 1e-100 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(1e-100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 1e-300 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(1e-300);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 修改 Buffer 字节后立即读取
test('修改 Buffer 字节后立即读取应返回新值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(10.5, 0);
  buf[0] = 0xFF;
  const val = buf.readFloatLE(0);
  return typeof val === 'number' && val !== 10.5;
});

test('连续修改多个字节后读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(5.5, 0);
  buf[0] = 0x00;
  buf[1] = 0x00;
  buf[2] = 0x00;
  buf[3] = 0x00;
  return buf.readFloatLE(0) === 0;
});

// 正浮点数 offset（各种小数）
test('offset 为 0.1 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(0.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 0.5 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(0.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 0.9 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(0.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 1.1 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(1.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 1.5 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 1.9 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(1.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 2.5 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 3.5 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(3.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Buffer 二级 slice 测试
test('Buffer 二级 slice 正确读取', () => {
  const parent = Buffer.alloc(20);
  parent.writeFloatLE(12.34, 10);
  const slice1 = parent.slice(5, 15);
  const slice2 = slice1.slice(5, 9);
  return Math.abs(slice2.readFloatLE(0) - 12.34) < 0.01;
});

test('Buffer 三级 slice 正确读取', () => {
  const parent = Buffer.alloc(30);
  parent.writeFloatLE(3.14, 15);
  const slice1 = parent.slice(10, 25);
  const slice2 = slice1.slice(3, 12);
  const slice3 = slice2.slice(2, 6);
  return Math.abs(slice3.readFloatLE(0) - 3.14) < 0.01;
});

// ArrayBuffer 共享内存测试
test('Buffer 与 ArrayBuffer 共享内存（修改互相影响）', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  buf.writeFloatLE(11.11, 0);
  const u8 = new Uint8Array(ab);
  return u8[0] !== 0;
});

test('修改 ArrayBuffer 影响 Buffer 读取', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  buf.writeFloatLE(5.5, 0);
  const u8 = new Uint8Array(ab);
  u8[0] = 0x00;
  u8[1] = 0x00;
  u8[2] = 0x00;
  u8[3] = 0x00;
  return buf.readFloatLE(0) === 0;
});

// Buffer.from 多种源
test('Buffer.from 数组创建后读取', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F]);
  return buf.readFloatLE(0) === 1.0;
});

test('Buffer.from 另一个 Buffer 创建后读取', () => {
  const buf1 = Buffer.from([0x00, 0x00, 0x80, 0x3F]);
  const buf2 = Buffer.from(buf1);
  return buf2.readFloatLE(0) === 1.0;
});

// 空格和特殊字符串作为 offset
test('offset 为空格字符串应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE('  ');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为制表符应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE('\t');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为换行符应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE('\n');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为带空格的数字字符串应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE('   0   ');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为字符串 "null" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE('null');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为字符串 "undefined" 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE('undefined');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
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
