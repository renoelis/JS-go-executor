// buf.readFloatLE() - 最终查缺补漏测试
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

// 极值 offset 测试（超过 safe integer）
test('offset 为 Number.MAX_SAFE_INTEGER + 1 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(Number.MAX_SAFE_INTEGER + 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 -Number.MAX_SAFE_INTEGER 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊表达式产生的 offset
test('offset 为 0/0 (NaN表达式) 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(0/0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 1/0 (Infinity表达式) 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(1/0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 为 -1/0 (-Infinity表达式) 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(-1/0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Uint8ClampedArray 互操作
test('从 Uint8ClampedArray 创建 Buffer 后读取', () => {
  const clamped = new Uint8ClampedArray([0x00, 0x00, 0x80, 0x3F]);
  const buf = Buffer.from(clamped);
  return buf.readFloatLE(0) === 1.0;
});

// Buffer.allocUnsafe 未初始化内存
test('Buffer.allocUnsafe 未初始化内存读取返回 number 类型', () => {
  const buf = Buffer.allocUnsafe(4);
  const val = buf.readFloatLE(0);
  return typeof val === 'number';
});

// 负数和超范围数组创建 Buffer
test('从负数数组创建 Buffer 后读取（负数被转换为无符号字节）', () => {
  const buf = Buffer.from([-1, -2, -3, -4]);
  const val = buf.readFloatLE(0);
  return typeof val === 'number' && !Number.isNaN(val);
});

test('从超过255的数组创建 Buffer 后读取（被模256）', () => {
  const buf = Buffer.from([256, 257, 258, 259]);
  const val = buf.readFloatLE(0);
  return typeof val === 'number' && !Number.isNaN(val);
});

// Buffer 切片的 byteOffset
test('Buffer 切片后读取（从父 Buffer 中间位置）', () => {
  const parent = Buffer.alloc(100);
  parent.writeFloatLE(9.87, 50);
  const slice = parent.slice(50, 54);
  return Math.abs(slice.readFloatLE(0) - 9.87) < 0.01;
});

test('Buffer 切片后在切片的 offset=0 读取父 Buffer 中间数据', () => {
  const parent = Buffer.alloc(20);
  parent.writeFloatLE(3.14, 8);
  const slice = parent.slice(8, 12);
  return Math.abs(slice.readFloatLE(0) - 3.14) < 0.01;
});

// 多个参数传递
test('传递多个 undefined 参数（应使用默认 offset=0）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.11, 0);
  return Math.abs(buf.readFloatLE(undefined, undefined, undefined) - 1.11) < 0.01;
});

// arguments 对象作为 offset
test('arguments 对象作为 offset 应抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(4);
    const args = (function() { return arguments; })(0, 1, 2);
    buf.readFloatLE(args);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// -0 和 +0 作为 offset
test('-0 作为 offset 等同于 +0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.22, 0);
  return buf.readFloatLE(-0) === buf.readFloatLE(+0);
});

test('-0 offset 正确读取值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.33, 0);
  return Math.abs(buf.readFloatLE(-0) - 3.33) < 0.01;
});

// 空数组创建的 Buffer
test('从空数组创建 Buffer 读取应抛出 RangeError', () => {
  try {
    const buf = Buffer.from([]);
    buf.readFloatLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 十六进制 offset（已测试但补充0x0）
test('offset 为 0x0 (十六进制零)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(7.89, 0);
  return Math.abs(buf.readFloatLE(0x0) - 7.89) < 0.01;
});

test('offset 为 0x04 (十六进制4)', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(4.56, 4);
  return Math.abs(buf.readFloatLE(0x04) - 4.56) < 0.01;
});

// 超大 Buffer 边界测试
test('超大 Buffer (10000 字节) 最后 4 字节读取', () => {
  const buf = Buffer.alloc(10000);
  buf.writeFloatLE(3.14, 9996);
  return Math.abs(buf.readFloatLE(9996) - 3.14) < 0.01;
});

test('超大 Buffer offset=9997 应抛出 RangeError', () => {
  try {
    const buf = Buffer.alloc(10000);
    buf.readFloatLE(9997);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// offset 为无参数 vs undefined
test('无参数调用等同于 offset=0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(5.55, 0);
  return Math.abs(buf.readFloatLE() - 5.55) < 0.01;
});

test('无参数与 undefined 参数结果一致', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(6.66, 0);
  return buf.readFloatLE() === buf.readFloatLE(undefined);
});

// Int8Array 创建的 Buffer
test('从 Int8Array 创建 Buffer 后读取', () => {
  const int8 = new Int8Array([0, 0, -128, 63]); // 使用有符号字节
  const buf = Buffer.from(int8.buffer);
  return Math.abs(buf.readFloatLE(0) - 1.0) < 0.01;
});

// DataView 字节顺序验证
test('与 DataView.getFloat32(offset, true) 完全一致', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  buf.writeFloatLE(2.718, 0);
  
  const dv = new DataView(ab);
  const bufVal = buf.readFloatLE(0);
  const dvVal = dv.getFloat32(0, true); // true = little-endian
  
  return Math.abs(bufVal - dvVal) < 0.0001;
});

// 连续读取相同位置
test('连续读取同一位置 100 次结果完全一致', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.234, 0);
  const first = buf.readFloatLE(0);
  
  for (let i = 0; i < 100; i++) {
    if (buf.readFloatLE(0) !== first) {
      return false;
    }
  }
  return true;
});

// Buffer.concat 多个 Buffer
test('Buffer.concat 拼接 3 个 Buffer 后读取', () => {
  const buf1 = Buffer.from([0x00]);
  const buf2 = Buffer.from([0x00]);
  const buf3 = Buffer.from([0x80]);
  const buf4 = Buffer.from([0x3F]);
  const combined = Buffer.concat([buf1, buf2, buf3, buf4]);
  return combined.readFloatLE(0) === 1.0;
});

// Float32 精度边界值
test('读取 1.0000001 (接近1的值)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.0000001, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - 1.0000001) < 0.0000001;
});

test('读取 0.9999999 (接近1的值)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(0.9999999, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - 0.9999999) < 0.0000001;
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
