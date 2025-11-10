// buf.lastIndexOf() - 高级类型转换和边界测试
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

// TypedArray 类型错误测试（更全面）
test('value: Float32Array 抛出错误', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F, 0x00, 0x00, 0x80, 0x3F]);
  const search = new Float32Array([1.0]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: Float64Array 抛出错误', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F]);
  const search = new Float64Array([1.0]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: Uint32Array 抛出错误', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
  const search = new Uint32Array([1]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: Int32Array 抛出错误', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const search = new Int32Array([-1]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: BigInt64Array 抛出错误', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const search = new BigInt64Array([1n]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('value: BigUint64Array 抛出错误', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const search = new BigUint64Array([18446744073709551615n]);
  try {
    buf.lastIndexOf(search);
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// 编码参数的边界测试
test('encoding: 无效编码名称抛出错误', () => {
  const buf = Buffer.from('test test');
  try {
    buf.lastIndexOf('test', undefined, 'invalid-encoding');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('encoding: 空字符串编码抛出错误', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf('test', undefined, '');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('encoding: 数字作为编码抛出错误', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf('test', undefined, 123);
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('encoding: 对象作为编码抛出错误', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf('test', undefined, {});
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('encoding: null 作为编码抛出错误', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf('test', undefined, null);
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

// 数字值的极端转换
test('value: Number.MAX_SAFE_INTEGER 转换', () => {
  const buf = Buffer.from([255, 1, 2, 255]);
  // Number.MAX_SAFE_INTEGER = 9007199254740991
  // 9007199254740991 & 0xFF = 255
  return buf.lastIndexOf(Number.MAX_SAFE_INTEGER) === 3;
});

test('value: Number.MIN_SAFE_INTEGER 转换', () => {
  const buf = Buffer.from([1, 2, 3, 1]);
  // Number.MIN_SAFE_INTEGER = -9007199254740991
  // -9007199254740991 & 0xFF = 1
  return buf.lastIndexOf(Number.MIN_SAFE_INTEGER) === 3;
});

test('value: Number.MAX_VALUE 转换', () => {
  const buf = Buffer.from([0, 1, 2, 0]);
  // Number.MAX_VALUE 是一个巨大的浮点数，转换后为 0
  return buf.lastIndexOf(Number.MAX_VALUE) === 3;
});

test('value: Number.MIN_VALUE 转换', () => {
  const buf = Buffer.from([0, 1, 0, 2]);
  // Number.MIN_VALUE 是一个非常小的正数，转换后为 0
  return buf.lastIndexOf(Number.MIN_VALUE) === 2;
});

test('value: Number.EPSILON 转换', () => {
  const buf = Buffer.from([0, 1, 2, 0]);
  // Number.EPSILON 是一个非常小的数，转换后为 0
  return buf.lastIndexOf(Number.EPSILON) === 3;
});

// byteOffset 的极端转换
test('byteOffset: Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from('test test');
  // 超大 offset 会被限制为 buf.length - 1
  return buf.lastIndexOf('test', Number.MAX_SAFE_INTEGER) === 5;
});

test('byteOffset: Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.from('test');
  // 超小负数 offset 会导致返回 -1
  return buf.lastIndexOf('test', Number.MIN_SAFE_INTEGER) === -1;
});

test('byteOffset: Number.MAX_VALUE', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', Number.MAX_VALUE) === 5;
});

test('byteOffset: Number.MIN_VALUE', () => {
  const buf = Buffer.from('test');
  // Number.MIN_VALUE 转换为 0
  return buf.lastIndexOf('test', Number.MIN_VALUE) === 0;
});

// 特殊字符串值
test('value: 包含 null 字节的字符串', () => {
  const buf = Buffer.from('hello\x00world\x00hello');
  return buf.lastIndexOf('hello') === 12;
});

test('value: 只有 null 字节的字符串', () => {
  const buf = Buffer.from([0, 1, 2, 0, 3]);
  return buf.lastIndexOf('\x00') === 3;
});

test('value: 包含所有 ASCII 控制字符', () => {
  const buf = Buffer.from('\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F');
  return buf.lastIndexOf('\x0F') === 15;
});

// 极端长度的搜索
test('搜索值: 长度为 1 的重复模式', () => {
  const buf = Buffer.alloc(100, 65); // 全是 'A'
  return buf.lastIndexOf('A') === 99;
});

test('搜索值: 长度接近 Buffer 长度', () => {
  const buf = Buffer.from('abcdefghij');
  return buf.lastIndexOf('abcdefghi') === 0;
});

test('搜索值: 长度等于 Buffer 长度', () => {
  const buf = Buffer.from('exact');
  return buf.lastIndexOf('exact') === 0;
});

test('搜索值: 长度大于 Buffer 长度', () => {
  const buf = Buffer.from('short');
  return buf.lastIndexOf('short string') === -1;
});

// 混合参数类型
test('混合: Buffer value + 数字 byteOffset + 字符串 encoding', () => {
  const buf = Buffer.from('hello hello', 'utf8');
  return buf.lastIndexOf(Buffer.from('hello'), 10, 'utf8') === 6;
});

test('混合: 数字 value + 负数 byteOffset', () => {
  const buf = Buffer.from([1, 2, 3, 1, 2, 3]);
  return buf.lastIndexOf(1, -3) === 3;
});

test('混合: Uint8Array value + NaN byteOffset', () => {
  const buf = Buffer.from([1, 2, 3, 1, 2, 3]);
  const search = new Uint8Array([1, 2, 3]);
  return buf.lastIndexOf(search, NaN) === 3;
});

// 编码转换的边界情况
test('编码: latin1 处理高位字节', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFD, 0xFF, 0xFE]);
  return buf.lastIndexOf('\xFF\xFE', undefined, 'latin1') === 3;
});

test('编码: ascii 截断高位', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // 'Hello'
  // ASCII 只取低 7 位，但这里都是标准 ASCII
  return buf.lastIndexOf('Hello', undefined, 'ascii') === 0;
});

test('编码: hex 奇数长度字符串', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  // 奇数长度的 hex 字符串，最后一位会被忽略或补 0
  return buf.lastIndexOf('010', 'hex') === 0;
});

test('编码: base64 不完整填充', () => {
  const buf = Buffer.from('hello world hello');
  const search = Buffer.from('hello').toString('base64').replace(/=/g, '');
  return buf.lastIndexOf(search, undefined, 'base64') === 12;
});

// 性能相关的极端场景
test('性能: 超大 Buffer (10KB)', () => {
  const size = 10240;
  const buf = Buffer.alloc(size);
  buf.write('needle', size - 10);
  const start = Date.now();
  const result = buf.lastIndexOf('needle');
  const duration = Date.now() - start;
  return result === size - 10 && duration < 100;
});

test('性能: 搜索不存在的值（最坏情况）', () => {
  const buf = Buffer.alloc(1000, 65); // 全是 'A'
  const start = Date.now();
  const result = buf.lastIndexOf('B');
  const duration = Date.now() - start;
  return result === -1 && duration < 50;
});

test('性能: 重复模式的最后一个', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i += 10) {
    buf.write('test', i);
  }
  const start = Date.now();
  const result = buf.lastIndexOf('test');
  const duration = Date.now() - start;
  return result === 990 && duration < 50;
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
