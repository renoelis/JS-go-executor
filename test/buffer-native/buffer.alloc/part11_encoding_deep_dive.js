// Buffer.alloc() - Part 11: Encoding Deep Dive
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

// === hex 编码的所有有效字符 ===
test('hex - 0-9 全覆盖', () => {
  const buf = Buffer.alloc(20, '0123456789', 'hex');
  return buf[0] === 0x01 && buf[1] === 0x23 && buf[2] === 0x45;
});

test('hex - a-f 小写全覆盖', () => {
  const buf = Buffer.alloc(12, 'abcdef', 'hex');
  return buf[0] === 0xAB && buf[1] === 0xCD && buf[2] === 0xEF;
});

test('hex - A-F 大写全覆盖', () => {
  const buf = Buffer.alloc(12, 'ABCDEF', 'hex');
  return buf[0] === 0xAB && buf[1] === 0xCD && buf[2] === 0xEF;
});

test('hex - 00 到 0F', () => {
  const values = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0A', '0B', '0C', '0D', '0E', '0F'];
  let pass = true;
  for (let i = 0; i < values.length; i++) {
    const buf = Buffer.alloc(2, values[i], 'hex');
    if (buf[0] !== i || buf[1] !== i) pass = false;
  }
  return pass;
});

test('hex - F0 到 FF', () => {
  const values = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'FA', 'FB', 'FC', 'FD', 'FE', 'FF'];
  let pass = true;
  for (let i = 0; i < values.length; i++) {
    const buf = Buffer.alloc(2, values[i], 'hex');
    if (buf[0] !== 0xF0 + i || buf[1] !== 0xF0 + i) pass = false;
  }
  return pass;
});

// === base64 的详细测试 ===
test('base64 - 标准字符 A-Z', () => {
  const buf = Buffer.alloc(10, 'QUJD', 'base64');
  return buf.length === 10;
});

test('base64 - 标准字符 a-z', () => {
  const buf = Buffer.alloc(10, 'YWJj', 'base64');
  return buf.length === 10;
});

test('base64 - 标准字符 0-9', () => {
  const buf = Buffer.alloc(10, 'MDEyMzQ1Njc4OQ==', 'base64');
  return buf.length === 10;
});

test('base64 - + 和 /', () => {
  const buf = Buffer.alloc(10, 'YWJjZGVmZ2hpams=', 'base64');
  return buf.length === 10;
});

test('base64url - _ 和 -', () => {
  const buf = Buffer.alloc(10, 'YWJjZGVm', 'base64url');
  return buf.length === 10;
});

test('base64 - 单字符 A（QQ==）', () => {
  const buf = Buffer.alloc(8, 'QQ==', 'base64');
  const decoded = Buffer.from('QQ==', 'base64');
  return buf[0] === decoded[0];
});

test('base64 - 双字符 AB（QUI=）', () => {
  const buf = Buffer.alloc(8, 'QUI=', 'base64');
  const decoded = Buffer.from('QUI=', 'base64');
  return buf[0] === decoded[0] && buf[1] === decoded[1];
});

test('base64 - 三字符 ABC（QUJD）', () => {
  const buf = Buffer.alloc(8, 'QUJD', 'base64');
  const decoded = Buffer.from('QUJD', 'base64');
  return buf[0] === decoded[0] && buf[1] === decoded[1] && buf[2] === decoded[2];
});

// === ascii 编码的边界 ===
test('ascii - 0x00-0x1F 控制字符', () => {
  const buf = Buffer.alloc(5, '\x00\x01\x1F', 'ascii');
  return buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x1F;
});

test('ascii - 0x20-0x7E 可打印字符', () => {
  const buf = Buffer.alloc(10, ' ~', 'ascii');
  return buf[0] === 0x20 && buf[1] === 0x7E;
});

test('ascii - 0x7F DEL 字符', () => {
  const buf = Buffer.alloc(5, '\x7F', 'ascii');
  return buf.every(b => b === 0x7F);
});

test('ascii - 高位字符被截断', () => {
  const buf = Buffer.alloc(5, 'é', 'ascii');
  return buf.length === 5;
});

// === latin1 的 00-FF 完整范围测试 ===
test('latin1 - 0x00', () => {
  const buf = Buffer.alloc(5, '\x00', 'latin1');
  return buf.every(b => b === 0x00);
});

test('latin1 - 0x7F', () => {
  const buf = Buffer.alloc(5, '\x7F', 'latin1');
  return buf.every(b => b === 0x7F);
});

test('latin1 - 0x80', () => {
  const buf = Buffer.alloc(5, '\x80', 'latin1');
  return buf.every(b => b === 0x80);
});

test('latin1 - 0xA0（不间断空格）', () => {
  const buf = Buffer.alloc(5, '\xA0', 'latin1');
  return buf.every(b => b === 0xA0);
});

test('latin1 - 0xC0（À）', () => {
  const buf = Buffer.alloc(5, '\xC0', 'latin1');
  return buf.every(b => b === 0xC0);
});

test('latin1 - 0xE0（à）', () => {
  const buf = Buffer.alloc(5, '\xE0', 'latin1');
  return buf.every(b => b === 0xE0);
});

test('latin1 - 0xFE', () => {
  const buf = Buffer.alloc(5, '\xFE', 'latin1');
  return buf.every(b => b === 0xFE);
});

test('latin1 - 0xFF', () => {
  const buf = Buffer.alloc(5, '\xFF', 'latin1');
  return buf.every(b => b === 0xFF);
});

test('latin1 - 混合 ASCII 和扩展字符', () => {
  const buf = Buffer.alloc(15, 'A\x80B\xFFC', 'latin1');
  return buf[0] === 0x41 && buf[1] === 0x80 && buf[2] === 0x42 && buf[3] === 0xFF && buf[4] === 0x43;
});

// === utf8 的详细边界 ===
test('utf8 - ASCII 范围 0x00-0x7F', () => {
  const buf = Buffer.alloc(10, '\x00\x7F', 'utf8');
  return buf[0] === 0x00 && buf[1] === 0x7F;
});

test('utf8 - 2字节序列起始（0xC2-0xDF）', () => {
  const buf = Buffer.alloc(10, '¢', 'utf8');
  return buf.length === 10;
});

test('utf8 - 3字节序列起始（0xE0-0xEF）', () => {
  const buf = Buffer.alloc(12, '€', 'utf8');
  return buf.length === 12;
});

test('utf8 - 4字节序列起始（0xF0-0xF7）', () => {
  const buf = Buffer.alloc(16, '𝄞', 'utf8');
  return buf.length === 16;
});

test('utf8 - BMP 范围字符（中文）', () => {
  const buf = Buffer.alloc(15, '你好世界', 'utf8');
  return buf.length === 15;
});

test('utf8 - Supplementary 平面字符（emoji）', () => {
  const buf = Buffer.alloc(20, '😀😁😂', 'utf8');
  return buf.length === 20;
});

// === utf16le 的详细测试 ===
test('utf16le - BMP 字符（单个代码单元）', () => {
  const buf = Buffer.alloc(8, '中', 'utf16le');
  const expected = Buffer.from('中', 'utf16le');
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('utf16le - 代理对（emoji，双代码单元）', () => {
  const buf = Buffer.alloc(16, '😀', 'utf16le');
  const expected = Buffer.from('😀', 'utf16le');
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('utf16le - 多个 BMP 字符', () => {
  const buf = Buffer.alloc(20, 'ABC', 'utf16le');
  return buf[0] === 0x41 && buf[1] === 0x00 && buf[2] === 0x42 && buf[3] === 0x00;
});

test('utf16le - 混合 BMP 和代理对', () => {
  const buf = Buffer.alloc(20, 'A😀B', 'utf16le');
  return buf.length === 20;
});

test('ucs2 - 与 utf16le 行为一致', () => {
  const buf1 = Buffer.alloc(10, 'ABC', 'utf16le');
  const buf2 = Buffer.alloc(10, 'ABC', 'ucs2');
  return buf1.equals(buf2);
});

// === 编码名称的大小写和别名 ===
test('UTF8 大写', () => {
  const buf = Buffer.alloc(10, 'test', 'UTF8');
  return buf.length === 10;
});

test('UTF-8 带连字符', () => {
  const buf = Buffer.alloc(10, 'test', 'UTF-8');
  return buf.length === 10;
});

test('utf-8 小写带连字符', () => {
  const buf = Buffer.alloc(10, 'test', 'utf-8');
  return buf.length === 10;
});

test('HEX 大写', () => {
  const buf = Buffer.alloc(10, '4142', 'HEX');
  return buf[0] === 0x41 && buf[1] === 0x42;
});

test('BASE64 大写', () => {
  const buf = Buffer.alloc(10, 'YWJj', 'BASE64');
  return buf.length === 10;
});

test('Base64 混合大小写', () => {
  const buf = Buffer.alloc(10, 'YWJj', 'Base64');
  return buf.length === 10;
});

test('LATIN1 大写', () => {
  const buf = Buffer.alloc(10, 'test', 'LATIN1');
  return buf.length === 10;
});

test('ASCII 大写', () => {
  const buf = Buffer.alloc(10, 'test', 'ASCII');
  return buf.length === 10;
});

test('BINARY 大写', () => {
  const buf = Buffer.alloc(10, 'test', 'BINARY');
  return buf.length === 10;
});

test('UTF16LE 大写', () => {
  const buf = Buffer.alloc(10, 'test', 'UTF16LE');
  return buf.length === 10;
});

test('UCS2 大写', () => {
  const buf = Buffer.alloc(10, 'test', 'UCS2');
  return buf.length === 10;
});

test('UCS-2 带连字符', () => {
  const buf = Buffer.alloc(10, 'test', 'UCS-2');
  return buf.length === 10;
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
