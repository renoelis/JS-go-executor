// Buffer.byteLength() - Additional Coverage (Round 6 continued)
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

// Buffer 各种创建方式
test('Buffer.from([]) 空数组', () => {
  const buf = Buffer.from([]);
  return Buffer.byteLength(buf) === 0;
});

test('Buffer.from([1,2,3]) 数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  return Buffer.byteLength(buf) === 3;
});

test('Buffer.allocUnsafeSlow 创建', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  return Buffer.byteLength(buf) === 5;
});

test('Buffer.concat 结果', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const buf = Buffer.concat([buf1, buf2]);
  return Buffer.byteLength(buf) === 10;
});

test('Buffer.concat 空数组', () => {
  const buf = Buffer.concat([]);
  return Buffer.byteLength(buf) === 0;
});

// 零长度 TypedArray 默认构造
test('new Uint8Array() 无参数', () => {
  const arr = new Uint8Array();
  return Buffer.byteLength(arr) === 0;
});

test('new Uint16Array() 无参数', () => {
  const arr = new Uint16Array();
  return Buffer.byteLength(arr) === 0;
});

test('new Float32Array() 无参数', () => {
  const arr = new Float32Array();
  return Buffer.byteLength(arr) === 0;
});

test('new BigInt64Array() 无参数', () => {
  const arr = new BigInt64Array();
  return Buffer.byteLength(arr) === 0;
});

// 特殊字符前缀
test('BOM + 字符串', () => {
  const len = Buffer.byteLength('\uFEFF' + 'hello');
  // BOM(3) + hello(5) = 8
  return len === 8;
});

test('LRM + 字符串', () => {
  const len = Buffer.byteLength('\u200E' + 'hello');
  // LRM(3) + hello(5) = 8
  return len === 8;
});

test('RLM + 字符串', () => {
  const len = Buffer.byteLength('\u200F' + 'hello');
  // RLM(3) + hello(5) = 8
  return len === 8;
});

test('BOM + BOM', () => {
  const len = Buffer.byteLength('\uFEFF\uFEFF');
  return len === 6;
});

// 数字字符串在不同编码
test('数字字符串 012345 在 utf8', () => {
  const len = Buffer.byteLength('012345', 'utf8');
  return len === 6;
});

test('数字字符串 012345 在 hex', () => {
  const len = Buffer.byteLength('012345', 'hex');
  // 01 23 45 = 3 字节
  return len === 3;
});

test('数字字符串 012345 在 base64', () => {
  const len = Buffer.byteLength('012345', 'base64');
  return len === 4;
});

test('数字字符串 0123456789 在 hex', () => {
  const len = Buffer.byteLength('0123456789', 'hex');
  return len === 5;
});

test('数字字符串 ABCDEF 在 hex', () => {
  const len = Buffer.byteLength('ABCDEF', 'hex');
  return len === 3;
});

test('数字字符串 0-9 在 hex', () => {
  const len = Buffer.byteLength('0123456789', 'hex');
  return len === 5;
});

// 所有 ASCII 控制字符（0-31）逐个测试
test('ASCII 控制字符 \\x00 (NUL)', () => {
  return Buffer.byteLength('\x00') === 1;
});

test('ASCII 控制字符 \\x01 (SOH)', () => {
  return Buffer.byteLength('\x01') === 1;
});

test('ASCII 控制字符 \\x07 (BEL)', () => {
  return Buffer.byteLength('\x07') === 1;
});

test('ASCII 控制字符 \\x08 (BS)', () => {
  return Buffer.byteLength('\x08') === 1;
});

test('ASCII 控制字符 \\x09 (TAB)', () => {
  return Buffer.byteLength('\x09') === 1;
});

test('ASCII 控制字符 \\x0A (LF)', () => {
  return Buffer.byteLength('\x0A') === 1;
});

test('ASCII 控制字符 \\x0D (CR)', () => {
  return Buffer.byteLength('\x0D') === 1;
});

test('ASCII 控制字符 \\x1B (ESC)', () => {
  return Buffer.byteLength('\x1B') === 1;
});

test('ASCII 控制字符 \\x1F (US)', () => {
  return Buffer.byteLength('\x1F') === 1;
});

// 扩展 ASCII (128-255)
test('扩展 ASCII \\x80', () => {
  return Buffer.byteLength('\x80') === 2;
});

test('扩展 ASCII \\xA0 (NBSP)', () => {
  return Buffer.byteLength('\xA0') === 2;
});

test('扩展 ASCII \\xBF', () => {
  return Buffer.byteLength('\xBF') === 2;
});

test('扩展 ASCII \\xC0', () => {
  return Buffer.byteLength('\xC0') === 2;
});

test('扩展 ASCII \\xFF', () => {
  return Buffer.byteLength('\xFF') === 2;
});

test('扩展 ASCII 范围 \\x80-\\xFF（采样）', () => {
  const str = '\x80\xA0\xBF\xC0\xFF';
  return Buffer.byteLength(str) === 10;
});

// 特殊组合字符
test('回车换行 CRLF', () => {
  return Buffer.byteLength('\r\n') === 2;
});

test('多个 CRLF', () => {
  return Buffer.byteLength('\r\n\r\n\r\n') === 6;
});

test('LF + CR（反向）', () => {
  return Buffer.byteLength('\n\r') === 2;
});

test('混合换行符', () => {
  return Buffer.byteLength('\r\n\n\r') === 4;
});

// TypedArray 与 Buffer 互操作
test('TypedArray.from(Buffer)', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = new Uint8Array(buf);
  return Buffer.byteLength(arr) === 5;
});

test('Buffer.from(TypedArray)', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(arr);
  return Buffer.byteLength(buf) === 5;
});

test('Buffer.from(TypedArray.buffer)', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(arr.buffer);
  return Buffer.byteLength(buf) === 5;
});

// SharedArrayBuffer 在 goja 环境中不支持，跳过相关测试
// test('SharedArrayBuffer 0 字节', () => {
//   const sab = new SharedArrayBuffer(0);
//   return Buffer.byteLength(sab) === 0;
// });

// test('SharedArrayBuffer 1 字节', () => {
//   const sab = new SharedArrayBuffer(1);
//   return Buffer.byteLength(sab) === 1;
// });

// test('SharedArrayBuffer 1024 字节', () => {
//   const sab = new SharedArrayBuffer(1024);
//   return Buffer.byteLength(sab) === 1024;
// });

// DataView 边界详细测试
test('DataView 0 字节', () => {
  const ab = new ArrayBuffer(0);
  const dv = new DataView(ab);
  return Buffer.byteLength(dv) === 0;
});

test('DataView offset=0 length=0', () => {
  const ab = new ArrayBuffer(10);
  const dv = new DataView(ab, 0, 0);
  return Buffer.byteLength(dv) === 0;
});

test('DataView offset=5 length=0', () => {
  const ab = new ArrayBuffer(10);
  const dv = new DataView(ab, 5, 0);
  return Buffer.byteLength(dv) === 0;
});

test('DataView offset=0 到末尾', () => {
  const ab = new ArrayBuffer(10);
  const dv = new DataView(ab, 0);
  return Buffer.byteLength(dv) === 10;
});

test('DataView offset=5 到末尾', () => {
  const ab = new ArrayBuffer(10);
  const dv = new DataView(ab, 5);
  return Buffer.byteLength(dv) === 5;
});

// 编码与内容不匹配
test('中文字符串 + hex 编码', () => {
  const len = Buffer.byteLength('你好', 'hex');
  // 非 hex 字符，部分处理
  return len === 1;
});

test('emoji + hex 编码', () => {
  const len = Buffer.byteLength('😀', 'hex');
  return len === 1;
});

test('中文字符串 + base64 编码', () => {
  const len = Buffer.byteLength('你好', 'base64');
  return len === 1;
});

test('emoji + base64 编码', () => {
  const len = Buffer.byteLength('😀', 'base64');
  return len === 1;
});

// 特殊编码字符串
test('URL 编码字符串（原始）', () => {
  const len = Buffer.byteLength('hello%20world');
  return len === 13;
});

test('HTML 实体（原始）', () => {
  const len = Buffer.byteLength('&lt;hello&gt;');
  return len === 13;
});

test('JSON 转义序列（原始）', () => {
  const len = Buffer.byteLength('\\n\\t\\r');
  return len === 6;
});

// 编码别名完整性
test('binary 编码（latin1 别名）', () => {
  const len1 = Buffer.byteLength('test', 'binary');
  const len2 = Buffer.byteLength('test', 'latin1');
  return len1 === len2 && len1 === 4;
});

test('ucs2 编码（utf16le 别名）', () => {
  const len1 = Buffer.byteLength('test', 'ucs2');
  const len2 = Buffer.byteLength('test', 'utf16le');
  return len1 === len2 && len1 === 8;
});

test('ucs-2 编码（带连字符）', () => {
  const len1 = Buffer.byteLength('test', 'ucs-2');
  const len2 = Buffer.byteLength('test', 'ucs2');
  return len1 === len2 && len1 === 8;
});

// 极端数量重复
test('1000 个 null 字节', () => {
  const str = '\x00'.repeat(1000);
  return Buffer.byteLength(str) === 1000;
});

test('1000 个 \\xFF', () => {
  const str = '\xFF'.repeat(1000);
  return Buffer.byteLength(str) === 2000;
});

test('1000 个代理对', () => {
  const str = '\uD800\uDC00'.repeat(1000);
  return Buffer.byteLength(str) === 4000;
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
