// buffer.isUtf8() - Part 8: Unicode Ranges Tests
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 1 字节范围：U+0000 到 U+007F
test('1 字节 - U+0000 (NULL)', () => {
  const buf = Buffer.from([0x00]);
  return isUtf8(buf) === true;
});

test('1 字节 - U+0001', () => {
  const buf = Buffer.from([0x01]);
  return isUtf8(buf) === true;
});

test('1 字节 - U+0020 (空格)', () => {
  const buf = Buffer.from([0x20]);
  return isUtf8(buf) === true;
});

test('1 字节 - U+007E (~)', () => {
  const buf = Buffer.from([0x7E]);
  return isUtf8(buf) === true;
});

test('1 字节 - U+007F (DEL)', () => {
  const buf = Buffer.from([0x7F]);
  return isUtf8(buf) === true;
});

// 2 字节范围：U+0080 到 U+07FF
test('2 字节 - U+0080 (最小)', () => {
  const buf = Buffer.from([0xC2, 0x80]);
  return isUtf8(buf) === true;
});

test('2 字节 - U+0081', () => {
  const buf = Buffer.from([0xC2, 0x81]);
  return isUtf8(buf) === true;
});

test('2 字节 - U+00A0 (不间断空格)', () => {
  const buf = Buffer.from([0xC2, 0xA0]);
  return isUtf8(buf) === true;
});

test('2 字节 - U+00FF (ÿ)', () => {
  const buf = Buffer.from([0xC3, 0xBF]);
  return isUtf8(buf) === true;
});

test('2 字节 - U+0100', () => {
  const buf = Buffer.from([0xC4, 0x80]);
  return isUtf8(buf) === true;
});

test('2 字节 - U+03FF (希腊字母)', () => {
  const buf = Buffer.from([0xCF, 0xBF]);
  return isUtf8(buf) === true;
});

test('2 字节 - U+07FE', () => {
  const buf = Buffer.from([0xDF, 0xBE]);
  return isUtf8(buf) === true;
});

test('2 字节 - U+07FF (最大)', () => {
  const buf = Buffer.from([0xDF, 0xBF]);
  return isUtf8(buf) === true;
});

// 3 字节范围：U+0800 到 U+FFFF（排除代理对 U+D800-U+DFFF）
test('3 字节 - U+0800 (最小)', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x80]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+0801', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x81]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+1000', () => {
  const buf = Buffer.from([0xE1, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+2000 (通用标点)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+3000 (CJK 符号)', () => {
  const buf = Buffer.from([0xE3, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+4E00 (CJK 统一表意文字起始)', () => {
  const buf = Buffer.from([0xE4, 0xB8, 0x80]); // "一"
  return isUtf8(buf) === true;
});

test('3 字节 - U+9FFF (CJK 统一表意文字)', () => {
  const buf = Buffer.from([0xE9, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+D7FF (代理对前)', () => {
  const buf = Buffer.from([0xED, 0x9F, 0xBF]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+E000 (私用区起始)', () => {
  const buf = Buffer.from([0xEE, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+F8FF (私用区)', () => {
  const buf = Buffer.from([0xEF, 0xA3, 0xBF]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+FFFE', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBE]);
  return isUtf8(buf) === true;
});

test('3 字节 - U+FFFF (最大)', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

// 代理对范围：U+D800 到 U+DFFF（无效）
test('代理对 - U+D800 (无效)', () => {
  const buf = Buffer.from([0xED, 0xA0, 0x80]);
  return isUtf8(buf) === false;
});

test('代理对 - U+D801 (无效)', () => {
  const buf = Buffer.from([0xED, 0xA0, 0x81]);
  return isUtf8(buf) === false;
});

test('代理对 - U+DAAA (无效)', () => {
  const buf = Buffer.from([0xED, 0xAA, 0xAA]);
  return isUtf8(buf) === false;
});

test('代理对 - U+DBFF (无效)', () => {
  const buf = Buffer.from([0xED, 0xAF, 0xBF]);
  return isUtf8(buf) === false;
});

test('代理对 - U+DC00 (无效)', () => {
  const buf = Buffer.from([0xED, 0xB0, 0x80]);
  return isUtf8(buf) === false;
});

test('代理对 - U+DFFF (无效)', () => {
  const buf = Buffer.from([0xED, 0xBF, 0xBF]);
  return isUtf8(buf) === false;
});

// 4 字节范围：U+10000 到 U+10FFFF
test('4 字节 - U+10000 (最小)', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+10001', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x81]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+1D400 (数学字母数字符号)', () => {
  const buf = Buffer.from([0xF0, 0x9D, 0x90, 0x80]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+1F600 (Emoji)', () => {
  const buf = Buffer.from([0xF0, 0x9F, 0x98, 0x80]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+1FFFF', () => {
  const buf = Buffer.from([0xF0, 0x9F, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+2FFFF', () => {
  const buf = Buffer.from([0xF0, 0xAF, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+3FFFF', () => {
  const buf = Buffer.from([0xF0, 0xBF, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+4FFFF', () => {
  const buf = Buffer.from([0xF1, 0x8F, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+5FFFF', () => {
  const buf = Buffer.from([0xF1, 0x9F, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+FFFFF', () => {
  const buf = Buffer.from([0xF3, 0xBF, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+10FFFE', () => {
  const buf = Buffer.from([0xF4, 0x8F, 0xBF, 0xBE]);
  return isUtf8(buf) === true;
});

test('4 字节 - U+10FFFF (最大)', () => {
  const buf = Buffer.from([0xF4, 0x8F, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

// 超出 Unicode 范围（无效）
test('超出范围 - U+110000', () => {
  const buf = Buffer.from([0xF4, 0x90, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('超出范围 - U+110001', () => {
  const buf = Buffer.from([0xF4, 0x90, 0x80, 0x81]);
  return isUtf8(buf) === false;
});

test('超出范围 - 0xF5', () => {
  const buf = Buffer.from([0xF5, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('超出范围 - 0xF6', () => {
  const buf = Buffer.from([0xF6, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

test('超出范围 - 0xF7', () => {
  const buf = Buffer.from([0xF7, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === false;
});

// 特殊 Unicode 区域
test('基本多文种平面 (BMP) - 开始', () => {
  const buf = Buffer.from([0x00]); // U+0000
  return isUtf8(buf) === true;
});

test('基本多文种平面 (BMP) - 结束', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBF]); // U+FFFF
  return isUtf8(buf) === true;
});

test('辅助平面 - 开始', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x80]); // U+10000
  return isUtf8(buf) === true;
});

test('辅助平面 - 结束', () => {
  const buf = Buffer.from([0xF4, 0x8F, 0xBF, 0xBF]); // U+10FFFF
  return isUtf8(buf) === true;
});

// 各个编码长度的边界
test('1-2 字节边界 - U+007F (1 字节最大)', () => {
  const buf = Buffer.from([0x7F]);
  return isUtf8(buf) === true;
});

test('1-2 字节边界 - U+0080 (2 字节最小)', () => {
  const buf = Buffer.from([0xC2, 0x80]);
  return isUtf8(buf) === true;
});

test('2-3 字节边界 - U+07FF (2 字节最大)', () => {
  const buf = Buffer.from([0xDF, 0xBF]);
  return isUtf8(buf) === true;
});

test('2-3 字节边界 - U+0800 (3 字节最小)', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x80]);
  return isUtf8(buf) === true;
});

test('3-4 字节边界 - U+FFFF (3 字节最大)', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('3-4 字节边界 - U+10000 (4 字节最小)', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x80]);
  return isUtf8(buf) === true;
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
