// Buffer.byteLength() - Advanced Edge Cases (Round 3)
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

// 更多 TypedArray 边界测试
test('Int16Array 作为输入', () => {
  const arr = new Int16Array([1, 2, 3]);
  const len = Buffer.byteLength(arr);
  return len === 6;
});

test('Int32Array 作为输入', () => {
  const arr = new Int32Array([1, 2]);
  const len = Buffer.byteLength(arr);
  return len === 8;
});

test('BigInt64Array 作为输入', () => {
  const arr = new BigInt64Array([1n, 2n]);
  const len = Buffer.byteLength(arr);
  return len === 16;
});

test('BigUint64Array 作为输入', () => {
  const arr = new BigUint64Array([1n, 2n]);
  const len = Buffer.byteLength(arr);
  return len === 16;
});

test('Uint8ClampedArray 作为输入', () => {
  const arr = new Uint8ClampedArray([1, 2, 3, 4]);
  const len = Buffer.byteLength(arr);
  return len === 4;
});

// Buffer 子类和视图测试
test('Buffer.from 创建的 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const len = Buffer.byteLength(buf);
  return len === 5;
});

test('Buffer.alloc 创建的 Buffer', () => {
  const buf = Buffer.alloc(10);
  const len = Buffer.byteLength(buf);
  return len === 10;
});

test('Buffer.allocUnsafe 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafe(10);
  const len = Buffer.byteLength(buf);
  return len === 10;
});

test('Buffer.slice 创建的视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(1, 4);
  const len = Buffer.byteLength(slice);
  return len === 3;
});

// 编码组合测试
test('utf8 编码 - 4 字节字符（罕见汉字）', () => {
  const len = Buffer.byteLength('𠀀', 'utf8');
  // CJK Extension B 字符，4 字节
  return len === 4;
});

test('utf8 编码 - 音乐符号（4 字节）', () => {
  const len = Buffer.byteLength('𝄞', 'utf8');
  return len === 4;
});

test('utf8 编码 - 数学符号', () => {
  const len = Buffer.byteLength('∑∏∫', 'utf8');
  // 每个符号 3 字节
  return len === 9;
});

test('utf8 编码 - 箭头符号', () => {
  const len = Buffer.byteLength('→←↑↓', 'utf8');
  // 每个箭头 3 字节
  return len === 12;
});

test('utf8 编码 - 货币符号', () => {
  const len = Buffer.byteLength('$€¥£', 'utf8');
  // $ = 1, € = 3, ¥ = 2, £ = 2
  return len === 8;
});

// base64 边界情况
test('base64 单个字符', () => {
  const len = Buffer.byteLength('Y', 'base64');
  return len === 0;
});

test('base64 两个字符', () => {
  const len = Buffer.byteLength('YQ', 'base64');
  return len === 1;
});

test('base64 三个字符', () => {
  const len = Buffer.byteLength('YWI', 'base64');
  return len === 2;
});

test('base64 仅包含填充', () => {
  const len = Buffer.byteLength('====', 'base64');
  // '=' 被当作 base64 字符部分处理
  return len === 1;
});

test('base64url vs base64 差异', () => {
  const len1 = Buffer.byteLength('YWJj-_==', 'base64url');
  const len2 = Buffer.byteLength('YWJj+/==', 'base64');
  return len1 === len2 && len1 === 4;
});

// hex 边界情况
test('hex 全大写', () => {
  const len = Buffer.byteLength('ABCDEF', 'hex');
  return len === 3;
});

test('hex 大小写混合', () => {
  const len = Buffer.byteLength('AbCdEf', 'hex');
  return len === 3;
});

test('hex 最小值 00', () => {
  const len = Buffer.byteLength('00', 'hex');
  return len === 1;
});

test('hex 最大值 FF', () => {
  const len = Buffer.byteLength('FF', 'hex');
  return len === 1;
});

test('hex 长序列', () => {
  const hex = '0123456789abcdef'.repeat(10);
  const len = Buffer.byteLength(hex, 'hex');
  return len === 80;
});

// 混合字符串边界
test('所有 ASCII 可打印字符', () => {
  let str = '';
  for (let i = 32; i <= 126; i++) {
    str += String.fromCharCode(i);
  }
  const len = Buffer.byteLength(str);
  return len === 95;
});

test('连续空格', () => {
  const len = Buffer.byteLength('     ', 'utf8');
  return len === 5;
});

test('连续换行符', () => {
  const len = Buffer.byteLength('\n\n\n\n\n', 'utf8');
  return len === 5;
});

test('制表符和换行符混合', () => {
  const len = Buffer.byteLength('\t\n\r\t\n\r');
  return len === 6;
});

test('零宽连字符', () => {
  const len = Buffer.byteLength('\u200D');
  return len === 3;
});

test('零宽非连字符', () => {
  const len = Buffer.byteLength('\u200C');
  return len === 3;
});

test('软连字符', () => {
  const len = Buffer.byteLength('\u00AD', 'utf8');
  return len === 2;
});

// ArrayBuffer 与 TypedArray 视图关系
test('同一 ArrayBuffer 的不同 TypedArray 视图', () => {
  const ab = new ArrayBuffer(16);
  const u8 = new Uint8Array(ab);
  const u16 = new Uint16Array(ab);
  const u32 = new Uint32Array(ab);
  return Buffer.byteLength(u8) === 16 
      && Buffer.byteLength(u16) === 16 
      && Buffer.byteLength(u32) === 16;
});

test('TypedArray 偏移视图', () => {
  const ab = new ArrayBuffer(20);
  const view = new Uint8Array(ab, 5, 10);
  const len = Buffer.byteLength(view);
  return len === 10;
});

test('DataView 完整视图', () => {
  const ab = new ArrayBuffer(16);
  const dv = new DataView(ab);
  const len = Buffer.byteLength(dv);
  return len === 16;
});

test('DataView 偏移视图', () => {
  const ab = new ArrayBuffer(20);
  const dv = new DataView(ab, 8);
  const len = Buffer.byteLength(dv);
  return len === 12;
});

test('DataView 指定长度视图', () => {
  const ab = new ArrayBuffer(20);
  const dv = new DataView(ab, 5, 8);
  const len = Buffer.byteLength(dv);
  return len === 8;
});

// 特殊 Unicode 范围
test('希腊字母', () => {
  const len = Buffer.byteLength('αβγδε');
  return len === 10;
});

test('西里尔字母', () => {
  const len = Buffer.byteLength('абвгд');
  return len === 10;
});

test('阿拉伯字母', () => {
  const len = Buffer.byteLength('العربية');
  return len === 14;
});

test('日文平假名', () => {
  const len = Buffer.byteLength('あいうえお');
  return len === 15;
});

test('日文片假名', () => {
  const len = Buffer.byteLength('アイウエオ');
  return len === 15;
});

test('韩文字母', () => {
  const len = Buffer.byteLength('한글');
  return len === 6;
});

test('泰文字母', () => {
  const len = Buffer.byteLength('ภาษาไทย');
  return len === 21;
});

// 组合字符和变音符号
test('带重音的拉丁字母', () => {
  const len = Buffer.byteLength('café');
  return len === 5;
});

test('预组合 vs 分解形式（NFD vs NFC）', () => {
  const nfc = 'é'; // 预组合形式
  const nfd = 'e\u0301'; // 分解形式
  const len1 = Buffer.byteLength(nfc);
  const len2 = Buffer.byteLength(nfd);
  // NFC: 2 字节, NFD: 3 字节 (e + 组合符)
  return len1 === 2 && len2 === 3;
});

test('多个组合字符', () => {
  const str = 'e\u0301\u0302\u0303'; // e + 3 个组合符
  const len = Buffer.byteLength(str);
  return len === 7;
});

// 特殊空白字符
test('不间断空格', () => {
  const len = Buffer.byteLength('\u00A0');
  return len === 2;
});

test('窄不间断空格', () => {
  const len = Buffer.byteLength('\u202F');
  return len === 3;
});

test('全角空格', () => {
  const len = Buffer.byteLength('\u3000');
  return len === 3;
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
