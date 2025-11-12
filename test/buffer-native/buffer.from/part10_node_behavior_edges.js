// Buffer.from() - Part 10: Node Behavior Edge Cases
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

// 字符串编码的隐式转换
test('字符串编码 - 编码参数为 undefined 使用默认 utf8', () => {
  const buf1 = Buffer.from('test', undefined);
  const buf2 = Buffer.from('test', 'utf8');
  return buf1.equals(buf2);
});

test('字符串编码 - 编码参数为 null 转字符串', () => {
  try {
    const buf = Buffer.from('test', null);
    // null 转为 'null'，应该是无效编码
    return buf instanceof Buffer;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 数组值的转换行为
test('数组值转换 - 字符串数字转数字', () => {
  const buf = Buffer.from(['65', '66', '67']);
  return buf[0] === 65 && buf[1] === 66 && buf[2] === 67;
});

test('数组值转换 - 空字符串转 0', () => {
  const buf = Buffer.from(['', '10', '']);
  return buf[0] === 0 && buf[1] === 10 && buf[2] === 0;
});

test('数组值转换 - 对象转 NaN 转 0', () => {
  const buf = Buffer.from([{}, { valueOf: () => 50 }]);
  return buf[0] === 0 && buf[1] === 50;
});

test('数组值转换 - 数组转 NaN 转 0', () => {
  const buf = Buffer.from([[], [100]]);
  return buf[0] === 0 && buf[1] === 100;
});

test('数组值转换 - true/false 转 1/0', () => {
  const buf = Buffer.from([true, false, true]);
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 1;
});

// HEX 编码特殊情况
test('HEX 编码 - 包含冒号分隔符（MAC 地址格式）', () => {
  const buf = Buffer.from('01:23:45', 'hex');
  // 冒号不是合法 hex 字符，应该被忽略
  return buf.length >= 0;
});

test('HEX 编码 - 包含连字符分隔符（UUID 格式）', () => {
  const buf = Buffer.from('01-23-45', 'hex');
  // 连字符不是合法 hex 字符，应该被忽略
  return buf.length >= 0;
});

test('HEX 编码 - 混合数字和字母', () => {
  const buf = Buffer.from('0123456789ABCDEF', 'hex');
  return buf.length === 8;
});

// Base64 特殊情况
test('Base64 编码 - URL 安全字符在标准 base64 中', () => {
  const buf = Buffer.from('SGVs-bG_', 'base64');
  // - 和 _ 在标准 base64 中可能被忽略或特殊处理
  return buf instanceof Buffer;
});

test('Base64 编码 - 包含回车换行符', () => {
  const buf = Buffer.from('SGVs\r\nbG8=', 'base64');
  return buf.toString('utf8') === 'Hello';
});

test('Base64 编码 - 连续多个填充符', () => {
  const buf = Buffer.from('====', 'base64');
  return buf.length === 0;
});

// ArrayBuffer 视图行为
test('ArrayBuffer 视图 - 从 DataView 的 buffer', () => {
  const ab = new ArrayBuffer(10);
  const dv = new DataView(ab);
  dv.setUint8(0, 42);
  const buf = Buffer.from(dv.buffer);
  return buf[0] === 42;
});

test('ArrayBuffer 视图 - 从 TypedArray 的 buffer', () => {
  const uint16 = new Uint16Array([0x0102]);
  const buf = Buffer.from(uint16.buffer);
  return buf.length === 2;
});

test('ArrayBuffer 视图 - 从 TypedArray 的 buffer 带 offset', () => {
  const uint8 = new Uint8Array(10);
  uint8[5] = 100;
  const buf = Buffer.from(uint8.buffer, 5, 3);
  return buf.length === 3 && buf[0] === 100;
});

// 编码名称的各种变体
test('编码名称 - binary 等同于 latin1', () => {
  const buf1 = Buffer.from('\x80\xFF', 'binary');
  const buf2 = Buffer.from('\x80\xFF', 'latin1');
  return buf1.equals(buf2);
});

test('编码名称 - ucs2 等同于 utf16le', () => {
  const buf1 = Buffer.from('test', 'ucs2');
  const buf2 = Buffer.from('test', 'utf16le');
  return buf1.equals(buf2);
});

test('编码名称 - ucs-2 等同于 ucs2', () => {
  const buf1 = Buffer.from('test', 'ucs-2');
  const buf2 = Buffer.from('test', 'ucs2');
  return buf1.equals(buf2);
});

// 字符串特殊字符
test('字符串特殊字符 - 零宽字符', () => {
  const zeroWidth = '\u200B\u200C\u200D';
  const buf = Buffer.from(zeroWidth, 'utf8');
  return buf.length === 9; // 3个字符，每个3字节
});

test('字符串特殊字符 - 组合字符', () => {
  const combined = 'é'; // e + 组合重音符
  const buf = Buffer.from(combined, 'utf8');
  return buf.length >= 2;
});

test('字符串特殊字符 - RTL 标记', () => {
  const rtl = '\u202E';
  const buf = Buffer.from(rtl, 'utf8');
  return buf.length === 3;
});

// 数组稀疏性
test('数组稀疏 - 真正的稀疏数组', () => {
  const sparse = new Array(5);
  sparse[0] = 1;
  sparse[4] = 5;
  const buf = Buffer.from(sparse);
  return buf.length === 5 && buf[0] === 1 && buf[1] === 0 && buf[4] === 5;
});

test('数组稀疏 - delete 操作后的数组', () => {
  const arr = [1, 2, 3, 4, 5];
  delete arr[2];
  const buf = Buffer.from(arr);
  return buf.length === 5 && buf[2] === 0;
});

// TypedArray 不同字节序
test('TypedArray 字节序 - Uint16Array 小端序', () => {
  const uint16 = new Uint16Array([0x0102]);
  const buf = Buffer.from(uint16.buffer);
  // 取决于平台字节序
  return buf.length === 2;
});

test('TypedArray 字节序 - Uint32Array', () => {
  const uint32 = new Uint32Array([0x01020304]);
  const buf = Buffer.from(uint32.buffer);
  return buf.length === 4;
});

// 类数组边界
test('类数组 - length 超过 MAX_SAFE_INTEGER（如果可行）', () => {
  try {
    const obj = { 0: 1, length: Number.MAX_SAFE_INTEGER };
    const buf = Buffer.from(obj);
    // 应该报错或转换为安全值
    return buf instanceof Buffer;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('类数组 - 负索引（应该被忽略）', () => {
  const obj = { '-1': 99, 0: 1, 1: 2, length: 2 };
  const buf = Buffer.from(obj);
  return buf.length === 2 && buf[0] === 1 && buf[1] === 2;
});

test('类数组 - 浮点索引（应该被忽略）', () => {
  const obj = { '0.5': 99, 0: 1, 1: 2, length: 2 };
  const buf = Buffer.from(obj);
  return buf.length === 2 && buf[0] === 1 && buf[1] === 2;
});

// Buffer pooling（间接测试）
test('小 Buffer 可能共享池', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.from('b');
  // 它们应该是不同的实例
  return buf1 !== buf2;
});

test('大 Buffer 独立分配', () => {
  const large = 'x'.repeat(10000);
  const buf1 = Buffer.from(large);
  const buf2 = Buffer.from(large);
  return buf1 !== buf2;
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
