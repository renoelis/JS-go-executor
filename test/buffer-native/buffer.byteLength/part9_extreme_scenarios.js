// Buffer.byteLength() - Extreme Scenarios (Round 5)
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

// 极端长度字符串
test('1MB ASCII 字符串', () => {
  const str = 'a'.repeat(1024 * 1024);
  const len = Buffer.byteLength(str);
  return len === 1024 * 1024;
});

test('1MB 中文字符串', () => {
  const str = '中'.repeat(1024 * 1024);
  const len = Buffer.byteLength(str);
  return len === 3 * 1024 * 1024;
});

// 极端 TypedArray
test('最大 Uint8Array（100MB）', () => {
  const size = 100 * 1024 * 1024;
  const arr = new Uint8Array(size);
  const len = Buffer.byteLength(arr);
  return len === size;
});

test('最大 ArrayBuffer（100MB）', () => {
  const size = 100 * 1024 * 1024;
  const ab = new ArrayBuffer(size);
  const len = Buffer.byteLength(ab);
  return len === size;
});

// 边界值组合
test('Buffer.byteLength 与 String.length 差异 - ASCII', () => {
  const str = 'hello';
  return Buffer.byteLength(str) === str.length;
});

test('Buffer.byteLength 与 String.length 差异 - 中文', () => {
  const str = '你好';
  const byteLen = Buffer.byteLength(str);
  const strLen = str.length;
  // byteLength: 6, String.length: 2
  return byteLen === 6 && strLen === 2;
});

test('Buffer.byteLength 与 String.length 差异 - emoji', () => {
  const str = '😀';
  const byteLen = Buffer.byteLength(str);
  const strLen = str.length;
  // byteLength: 4, String.length: 2 (代理对)
  return byteLen === 4 && strLen === 2;
});

// 特殊空白和控制字符
test('所有 ASCII 控制字符（0-31）', () => {
  let str = '';
  for (let i = 0; i < 32; i++) {
    str += String.fromCharCode(i);
  }
  return Buffer.byteLength(str) === 32;
});

test('DEL 字符（127）', () => {
  const str = String.fromCharCode(127);
  return Buffer.byteLength(str) === 1;
});

test('C1 控制字符（128-159）', () => {
  let str = '';
  for (let i = 128; i < 160; i++) {
    str += String.fromCharCode(i);
  }
  const len = Buffer.byteLength(str);
  // 这些字符在 UTF-8 中是 2 字节
  return len === 64;
});

// 特殊 Unicode 区块
test('私有使用区 U+E000-U+F8FF', () => {
  const str = '\uE000\uE001\uE002';
  return Buffer.byteLength(str) === 9;
});

test('兼容区字符', () => {
  const str = '\uF900\uF901\uF902';
  return Buffer.byteLength(str) === 9;
});

test('半宽和全宽字符混合', () => {
  const half = 'ABC';
  const full = 'ＡＢＣ';
  return Buffer.byteLength(half) === 3 
      && Buffer.byteLength(full) === 9;
});

// 格式字符和不可见字符
test('左到右标记（LRM）', () => {
  const len = Buffer.byteLength('\u200E');
  return len === 3;
});

test('右到左标记（RLM）', () => {
  const len = Buffer.byteLength('\u200F');
  return len === 3;
});

test('字节顺序标记（BOM）', () => {
  const len = Buffer.byteLength('\uFEFF');
  return len === 3;
});

test('替换字符', () => {
  const len = Buffer.byteLength('\uFFFD');
  return len === 3;
});

// 组合字符序列
test('多个组合变音符', () => {
  const str = 'a\u0300\u0301\u0302\u0303\u0304';
  // a + 5 个组合符
  return Buffer.byteLength(str) === 11;
});

test('组合表情序列', () => {
  // 👨‍👩‍👧‍👦 (家庭表情)
  const str = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}';
  // 4 + 3 + 4 + 3 + 4 + 3 + 4 = 25
  return Buffer.byteLength(str) === 25;
});

test('肤色修饰符', () => {
  // 👋🏻 (挥手 + 浅肤色)
  const str = '\u{1F44B}\u{1F3FB}';
  // 4 + 4 = 8
  return Buffer.byteLength(str) === 8;
});

// 特殊数值边界
test('NaN 转字符串', () => {
  const str = String(NaN);
  return Buffer.byteLength(str) === 3;
});

test('Infinity 转字符串', () => {
  const str = String(Infinity);
  return Buffer.byteLength(str) === 8;
});

test('-Infinity 转字符串', () => {
  const str = String(-Infinity);
  return Buffer.byteLength(str) === 9;
});

// hex 编码极端情况
test('hex 单字节所有可能值', () => {
  let hex = '';
  for (let i = 0; i < 256; i++) {
    hex += i.toString(16).padStart(2, '0');
  }
  const len = Buffer.byteLength(hex, 'hex');
  return len === 256;
});

test('hex 超长字符串', () => {
  const hex = '00'.repeat(10000);
  const len = Buffer.byteLength(hex, 'hex');
  return len === 10000;
});

// base64 编码极端情况
test('base64 最小有效编码', () => {
  // 'AA==' 解码为 1 字节
  const len = Buffer.byteLength('AA==', 'base64');
  return len === 1;
});

test('base64 超长字符串', () => {
  const b64 = 'AAAA'.repeat(10000);
  const len = Buffer.byteLength(b64, 'base64');
  return len === 30000;
});

test('base64 混合空白字符', () => {
  const str = 'YWJj\n\r\t ZGVm';
  const len = Buffer.byteLength(str, 'base64');
  // 空白不会被完全忽略，实际返回 9
  return len === 9;
});

// utf16le 极端情况
test('utf16le 单字节ASCII', () => {
  const len = Buffer.byteLength('a', 'utf16le');
  return len === 2;
});

test('utf16le 最大 BMP 字符', () => {
  const len = Buffer.byteLength('\uFFFF', 'utf16le');
  return len === 2;
});

test('utf16le 辅助平面字符', () => {
  const len = Buffer.byteLength('\u{10000}', 'utf16le');
  // 代理对，4 字节
  return len === 4;
});

test('utf16le 最大码点', () => {
  const len = Buffer.byteLength('\u{10FFFF}', 'utf16le');
  return len === 4;
});

// latin1 极端情况
test('latin1 所有可能字符', () => {
  let str = '';
  for (let i = 0; i < 256; i++) {
    str += String.fromCharCode(i);
  }
  const len = Buffer.byteLength(str, 'latin1');
  return len === 256;
});

test('latin1 超出范围字符被截断', () => {
  // U+0100 超出 latin1 范围
  const len = Buffer.byteLength('\u0100', 'latin1');
  return len === 1;
});

// 零拷贝和视图测试
test('Buffer 子数组与原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  return Buffer.byteLength(buf) === 5 
      && Buffer.byteLength(sub) === 3;
});

test('TypedArray 子数组', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const sub = arr.subarray(1, 4);
  return Buffer.byteLength(sub) === 3;
});

// 特殊字符串构造
test('重复字符串连接', () => {
  let str = '';
  for (let i = 0; i < 1000; i++) {
    str += 'a';
  }
  return Buffer.byteLength(str) === 1000;
});

test('模板字符串', () => {
  const name = 'World';
  const str = `Hello ${name}!`;
  return Buffer.byteLength(str) === 12;
});

test('转义字符序列', () => {
  const str = '\\n\\t\\r';
  // 反斜杠会被保留
  return Buffer.byteLength(str) === 6;
});

test('Unicode 转义', () => {
  const str = '\u0041\u0042\u0043';
  return Buffer.byteLength(str) === 3;
});

// 边界条件组合
test('空 Buffer + 空字符串组合验证', () => {
  const buf = Buffer.alloc(0);
  const str = '';
  return Buffer.byteLength(buf) === 0 
      && Buffer.byteLength(str) === 0
      && Buffer.byteLength(str, 'hex') === 0
      && Buffer.byteLength(str, 'base64') === 0;
});

test('最小非空与最大 BMP 字符', () => {
  const min = '\u0000';
  const max = '\uFFFF';
  return Buffer.byteLength(min) === 1 
      && Buffer.byteLength(max) === 3;
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
