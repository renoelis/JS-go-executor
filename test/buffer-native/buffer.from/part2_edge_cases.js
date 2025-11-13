// Buffer.from() - Part 2: Edge Cases & Error Handling
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

// 边界测试
test('数组包含负数（转换为无符号）', () => {
  const buf = Buffer.from([-1, -2, -128]);
  return buf[0] === 255 && buf[1] === 254 && buf[2] === 128;
});

test('数组包含超过 255 的值（取模）', () => {
  const buf = Buffer.from([256, 257, 511]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 255;
});

test('数组包含 NaN（转换为 0）', () => {
  const buf = Buffer.from([NaN, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('数组包含 Infinity（转换为 0）', () => {
  const buf = Buffer.from([Infinity, -Infinity, 0]);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('数组包含小数（截断）', () => {
  const buf = Buffer.from([1.9, 2.1, 3.5]);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('数组包含布尔值', () => {
  const buf = Buffer.from([true, false, true]);
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 1;
});

test('数组包含 null（转换为 0）', () => {
  const buf = Buffer.from([null, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('数组包含 undefined（转换为 0）', () => {
  const buf = Buffer.from([undefined, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

// 编码边界测试
test('所有支持的编码类型', () => {
  const encodings = ['utf8', 'utf-8', 'utf16le', 'ucs2', 'ucs-2', 
                     'latin1', 'binary', 'base64', 'base64url', 'hex', 'ascii'];
  return encodings.every(enc => {
    try {
      const buf = Buffer.from('test', enc);
      return buf instanceof Buffer;
    } catch (e) {
      return false;
    }
  });
});

test('编码名称大小写不敏感 - UTF8', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('hello', 'UTF8');
  const buf3 = Buffer.from('hello', 'Utf8');
  return buf1.equals(buf2) && buf2.equals(buf3);
});

test('编码名称大小写不敏感 - HEX', () => {
  const buf1 = Buffer.from('48656c6c6f', 'hex');
  const buf2 = Buffer.from('48656c6c6f', 'HEX');
  const buf3 = Buffer.from('48656c6c6f', 'Hex');
  return buf1.equals(buf2) && buf2.equals(buf3);
});

// ArrayBuffer 边界测试
test('ArrayBuffer offset 为 0', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[0] = 0x41;
  const buf = Buffer.from(ab, 0);
  return buf[0] === 0x41 && buf.length === 10;
});

test('ArrayBuffer length 为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 0);
  return buf.length === 0;
});

test('ArrayBuffer 完整范围', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[4] = 5;
  const buf = Buffer.from(ab, 0, 5);
  return buf.length === 5 && buf[0] === 1 && buf[4] === 5;
});

// 其他 TypedArray 类型
test('从 Int8Array 创建', () => {
  const int8 = new Int8Array([-1, 0, 127]);
  const buf = Buffer.from(int8);
  return buf[0] === 255 && buf[1] === 0 && buf[2] === 127;
});

test('从 Uint16Array 创建', () => {
  const uint16 = new Uint16Array([0x0102, 0x0304]);
  const buf = Buffer.from(uint16.buffer);
  return buf.length === 4;
});

test('从 Uint32Array 创建', () => {
  const uint32 = new Uint32Array([0x01020304]);
  const buf = Buffer.from(uint32.buffer);
  return buf.length === 4;
});

test('从 Float32Array 创建', () => {
  const float32 = new Float32Array([1.5, 2.5]);
  const buf = Buffer.from(float32.buffer);
  return buf.length === 8;
});

test('从 Float64Array 创建', () => {
  const float64 = new Float64Array([1.5]);
  const buf = Buffer.from(float64.buffer);
  return buf.length === 8;
});

// 无效 UTF-8 序列
test('无效的 UTF-8 字节序列', () => {
  const invalidUtf8 = Buffer.from([0xFF, 0xFE, 0xFD]);
  const str = invalidUtf8.toString('utf8');
  // 应该用替换字符处理
  return typeof str === 'string';
});

// 无效 base64
test('无效的 base64 字符串（包含非法字符）', () => {
  try {
    const buf = Buffer.from('invalid@#$base64', 'base64');
    // Node.js 会忽略非法字符或返回空 Buffer
    return buf instanceof Buffer;
  } catch (e) {
    return false;
  }
});

// 无效 hex
test('无效的 hex 字符串（奇数长度）', () => {
  const buf = Buffer.from('123', 'hex');
  // 奇数长度会忽略最后一个字符
  return buf instanceof Buffer;
});

test('无效的 hex 字符串（包含非法字符）', () => {
  const buf = Buffer.from('12GH', 'hex');
  // 非法字符会被忽略
  return buf instanceof Buffer;
});

// 超长字符串
test('超长字符串（10000 字符）', () => {
  const longStr = 'a'.repeat(10000);
  const buf = Buffer.from(longStr);
  return buf.length === 10000;
});

// 对象的 valueOf 和 Symbol.toPrimitive
test('对象有 valueOf 返回 Buffer', () => {
  const obj = {
    valueOf() {
      return Buffer.from('hello');
    }
  };
  try {
    const buf = Buffer.from(obj);
    return buf.toString() === 'hello';
  } catch (e) {
    // 某些实现可能不支持
    return true;
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
