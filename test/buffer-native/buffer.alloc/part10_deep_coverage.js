// Buffer.alloc() - Part 10: Deep Coverage - Missing Scenarios
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

// === 1. 编码组合的深度测试 ===

// base64 的边界情况
test('base64 - 包含 padding 的完整编码', () => {
  const buf = Buffer.alloc(20, 'SGVsbG8=', 'base64');
  return buf.length === 20;
});

test('base64 - 双等号 padding', () => {
  const buf = Buffer.alloc(20, 'QQ==', 'base64');
  return buf.length === 20;
});

test('base64 - 无效 base64 字符的处理', () => {
  try {
    const buf = Buffer.alloc(10, '@#$%', 'base64');
    return buf.length === 10;
  } catch (e) {
    return true;
  }
});

// hex 编码的特殊情况
test('hex - 混合大小写', () => {
  const buf = Buffer.alloc(8, 'AaBbCc', 'hex');
  return buf.length === 8;
});

test('hex - 连续的 00', () => {
  const buf = Buffer.alloc(10, '0000', 'hex');
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('hex - 连续的 FF', () => {
  const buf = Buffer.alloc(10, 'FFFF', 'hex');
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF;
});

// utf16le 的深度测试
test('utf16le - ASCII 字符编码', () => {
  const buf = Buffer.alloc(10, 'A', 'utf16le');
  return buf[0] === 0x41 && buf[1] === 0x00;
});

test('utf16le - 多个 ASCII 字符', () => {
  const buf = Buffer.alloc(10, 'ABC', 'utf16le');
  return buf.length === 10;
});

test('utf16le - 空字符串填充', () => {
  const buf = Buffer.alloc(10, '', 'utf16le');
  return buf.every(b => b === 0);
});

// latin1/binary 的 0x80-0xFF 范围完整测试
test('latin1 - 字节值 128', () => {
  const buf = Buffer.alloc(5, '\x80', 'latin1');
  return buf.every(b => b === 0x80);
});

test('latin1 - 字节值 255', () => {
  const buf = Buffer.alloc(5, '\xFF', 'latin1');
  return buf.every(b => b === 0xFF);
});

test('latin1 - 混合高位字符', () => {
  const buf = Buffer.alloc(12, '\x80\x90\xA0', 'latin1');
  return buf[0] === 0x80 && buf[1] === 0x90 && buf[2] === 0xA0;
});

test('binary 编码与 latin1 行为一致', () => {
  const buf1 = Buffer.alloc(10, '\xAB', 'latin1');
  const buf2 = Buffer.alloc(10, '\xAB', 'binary');
  return buf1.equals(buf2);
});

// === 2. fill 参数的边界组合 ===

// 字符串 + 编码的所有合法组合
test('空字符串 + ascii', () => {
  const buf = Buffer.alloc(5, '', 'ascii');
  return buf.every(b => b === 0);
});

test('空字符串 + ucs2', () => {
  const buf = Buffer.alloc(5, '', 'ucs2');
  return buf.every(b => b === 0);
});

test('空字符串 + binary', () => {
  const buf = Buffer.alloc(5, '', 'binary');
  return buf.every(b => b === 0);
});

// 数字的边界值
test('fill 为 0.0（显式浮点零）', () => {
  const buf = Buffer.alloc(5, 0.0);
  return buf.every(b => b === 0);
});

test('fill 为 -0（负零）', () => {
  const buf = Buffer.alloc(5, -0);
  return buf.every(b => b === 0);
});

test('fill 为 0.4（向下取整）', () => {
  const buf = Buffer.alloc(5, 0.4);
  return buf.every(b => b === 0);
});

test('fill 为 0.6（向下取整）', () => {
  const buf = Buffer.alloc(5, 0.6);
  return buf.every(b => b === 0);
});

test('fill 为 254.4（向下取整为 254）', () => {
  const buf = Buffer.alloc(5, 254.4);
  return buf.every(b => b === 254);
});

test('fill 为 254.9（向下取整为 254）', () => {
  const buf = Buffer.alloc(5, 254.9);
  return buf.every(b => b === 254);
});

test('fill 为 255.1（取模后为 255）', () => {
  const buf = Buffer.alloc(5, 255.1);
  return buf.every(b => b === 255);
});

test('fill 为 255.9（取模后为 255）', () => {
  const buf = Buffer.alloc(5, 255.9);
  return buf.every(b => b === 255);
});

// 负数的完整取模范围
test('fill 为 -1（转 255）', () => {
  const buf = Buffer.alloc(3, -1);
  return buf.every(b => b === 255);
});

test('fill 为 -127（转 129）', () => {
  const buf = Buffer.alloc(3, -127);
  return buf.every(b => b === 129);
});

test('fill 为 -128（转 128）', () => {
  const buf = Buffer.alloc(3, -128);
  return buf.every(b => b === 128);
});

test('fill 为 -129（转 127）', () => {
  const buf = Buffer.alloc(3, -129);
  return buf.every(b => b === 127);
});

test('fill 为 -255（转 1）', () => {
  const buf = Buffer.alloc(3, -255);
  return buf.every(b => b === 1);
});

test('fill 为 -257（转 255）', () => {
  const buf = Buffer.alloc(3, -257);
  return buf.every(b => b === 255);
});

test('fill 为 -512（转 0）', () => {
  const buf = Buffer.alloc(3, -512);
  return buf.every(b => b === 0);
});

// 大于 255 的正数取模
test('fill 为 256（转 0）', () => {
  const buf = Buffer.alloc(3, 256);
  return buf.every(b => b === 0);
});

test('fill 为 257（转 1）', () => {
  const buf = Buffer.alloc(3, 257);
  return buf.every(b => b === 1);
});

test('fill 为 383（转 127）', () => {
  const buf = Buffer.alloc(3, 383);
  return buf.every(b => b === 127);
});

test('fill 为 384（转 128）', () => {
  const buf = Buffer.alloc(3, 384);
  return buf.every(b => b === 128);
});

test('fill 为 510（转 254）', () => {
  const buf = Buffer.alloc(3, 510);
  return buf.every(b => b === 254);
});

test('fill 为 511（转 255）', () => {
  const buf = Buffer.alloc(3, 511);
  return buf.every(b => b === 255);
});

test('fill 为 767（转 255）', () => {
  const buf = Buffer.alloc(3, 767);
  return buf.every(b => b === 255);
});

test('fill 为 768（转 0）', () => {
  const buf = Buffer.alloc(3, 768);
  return buf.every(b => b === 0);
});

test('fill 为 1024（转 0）', () => {
  const buf = Buffer.alloc(3, 1024);
  return buf.every(b => b === 0);
});

test('fill 为 1025（转 1）', () => {
  const buf = Buffer.alloc(3, 1025);
  return buf.every(b => b === 1);
});

// === 3. size 参数的深度边界 ===

test('size 为 0.0001（向下取整为 0）', () => {
  const buf = Buffer.alloc(0.0001);
  return buf.length === 0;
});

test('size 为 0.9999（向下取整为 0）', () => {
  const buf = Buffer.alloc(0.9999);
  return buf.length === 0;
});

test('size 为 1.0001（向下取整为 1）', () => {
  const buf = Buffer.alloc(1.0001);
  return buf.length === 1;
});

test('size 为 1.9999（向下取整为 1）', () => {
  const buf = Buffer.alloc(1.9999);
  return buf.length === 1;
});

test('size 为 4096.5（向下取整）', () => {
  const buf = Buffer.alloc(4096.5);
  return buf.length === 4096;
});

test('size 为 8192.5（向下取整）', () => {
  const buf = Buffer.alloc(8192.5);
  return buf.length === 8192;
});

// === 4. Buffer/Uint8Array fill 的精确边界 ===

test('fill 为 Buffer - 长度 1 填充到 length 1', () => {
  const fillBuf = Buffer.from([99]);
  const buf = Buffer.alloc(1, fillBuf);
  return buf[0] === 99;
});

test('fill 为 Buffer - 长度 1 填充到 length 2', () => {
  const fillBuf = Buffer.from([99]);
  const buf = Buffer.alloc(2, fillBuf);
  return buf[0] === 99 && buf[1] === 99;
});

test('fill 为 Buffer - 长度 2 填充到 length 3（不完整）', () => {
  const fillBuf = Buffer.from([10, 20]);
  const buf = Buffer.alloc(3, fillBuf);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 10;
});

test('fill 为 Buffer - 长度 3 填充到 length 10（余 1）', () => {
  const fillBuf = Buffer.from([1, 2, 3]);
  const buf = Buffer.alloc(10, fillBuf);
  return buf[9] === 1;
});

test('fill 为 Buffer - 长度 3 填充到 length 11（余 2）', () => {
  const fillBuf = Buffer.from([1, 2, 3]);
  const buf = Buffer.alloc(11, fillBuf);
  return buf[9] === 1 && buf[10] === 2;
});

test('fill 为 Buffer - 长度 3 填充到 length 12（完整）', () => {
  const fillBuf = Buffer.from([1, 2, 3]);
  const buf = Buffer.alloc(12, fillBuf);
  return buf[9] === 1 && buf[10] === 2 && buf[11] === 3;
});

test('fill 为 Buffer - 长度 5 填充到 length 13', () => {
  const fillBuf = Buffer.from([10, 20, 30, 40, 50]);
  const buf = Buffer.alloc(13, fillBuf);
  return buf[10] === 10 && buf[11] === 20 && buf[12] === 30;
});

test('fill 为 Uint8Array - 长度 1 重复填充', () => {
  const fillArr = new Uint8Array([77]);
  const buf = Buffer.alloc(10, fillArr);
  return buf.every(b => b === 77);
});

test('fill 为 Uint8Array - 长度 4 部分重复', () => {
  const fillArr = new Uint8Array([1, 2, 3, 4]);
  const buf = Buffer.alloc(10, fillArr);
  return buf[8] === 1 && buf[9] === 2;
});

test('fill 为 Uint8Array - 包含 0 值', () => {
  const fillArr = new Uint8Array([0, 1, 0, 2]);
  const buf = Buffer.alloc(12, fillArr);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 0 && buf[3] === 2;
});

// === 5. 字符串 fill 的多字节边界 ===

test('utf8 - 2字节字符（é）重复', () => {
  const buf = Buffer.alloc(10, 'é', 'utf8');
  const pattern = Buffer.from('é', 'utf8');
  return buf[0] === pattern[0] && buf[1] === pattern[1];
});

test('utf8 - 3字节字符（中）重复到不完整', () => {
  const buf = Buffer.alloc(10, '中', 'utf8');
  const pattern = Buffer.from('中', 'utf8');
  return buf[9] === pattern[0];
});

test('utf8 - 4字节字符（😀）重复', () => {
  const buf = Buffer.alloc(12, '😀', 'utf8');
  const pattern = Buffer.from('😀', 'utf8');
  return buf[0] === pattern[0] && buf[4] === pattern[0] && buf[8] === pattern[0];
});

test('utf8 - 混合字节长度字符', () => {
  const buf = Buffer.alloc(20, 'A中😀', 'utf8');
  return buf.length === 20;
});

test('utf8 - 2字节字符填充奇数长度', () => {
  const buf = Buffer.alloc(5, 'é', 'utf8');
  const pattern = Buffer.from('é', 'utf8');
  return buf[4] === pattern[0];
});

test('utf8 - 3字节字符填充到长度7（2余1）', () => {
  const buf = Buffer.alloc(7, '中', 'utf8');
  const pattern = Buffer.from('中', 'utf8');
  return buf[6] === pattern[0];
});

test('utf8 - 3字节字符填充到长度8（2余2）', () => {
  const buf = Buffer.alloc(8, '中', 'utf8');
  const pattern = Buffer.from('中', 'utf8');
  return buf[6] === pattern[0] && buf[7] === pattern[1];
});

test('utf8 - 4字节字符填充到长度 5（1余1）', () => {
  const buf = Buffer.alloc(5, '😀', 'utf8');
  const pattern = Buffer.from('😀', 'utf8');
  return buf[4] === pattern[0];
});

test('utf8 - 4字节字符填充到长度 6（1余2）', () => {
  const buf = Buffer.alloc(6, '😀', 'utf8');
  const pattern = Buffer.from('😀', 'utf8');
  return buf[4] === pattern[0] && buf[5] === pattern[1];
});

test('utf8 - 4字节字符填充到长度 7（1余3）', () => {
  const buf = Buffer.alloc(7, '😀', 'utf8');
  const pattern = Buffer.from('😀', 'utf8');
  return buf[4] === pattern[0] && buf[5] === pattern[1] && buf[6] === pattern[2];
});

// === 6. 特殊 ASCII 控制字符的完整覆盖 ===

test('fill 为 \\x01（SOH）', () => {
  const buf = Buffer.alloc(5, '\x01');
  return buf.every(b => b === 0x01);
});

test('fill 为 \\x02（STX）', () => {
  const buf = Buffer.alloc(5, '\x02');
  return buf.every(b => b === 0x02);
});

test('fill 为 \\x03（ETX）', () => {
  const buf = Buffer.alloc(5, '\x03');
  return buf.every(b => b === 0x03);
});

test('fill 为 \\x07（BEL）', () => {
  const buf = Buffer.alloc(5, '\x07');
  return buf.every(b => b === 0x07);
});

test('fill 为 \\x1B（ESC）', () => {
  const buf = Buffer.alloc(5, '\x1B');
  return buf.every(b => b === 0x1B);
});

test('fill 为 \\x7F（DEL）', () => {
  const buf = Buffer.alloc(5, '\x7F');
  return buf.every(b => b === 0x7F);
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
