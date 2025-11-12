// buffer.compare() - 编码和字符串场景深度测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅', name);
    } else {
      console.log('❌', name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌', name, '-', e.message);
  }
}

test('UTF-8编码字符串比较', () => {
  const buf1 = Buffer.from('Hello', 'utf8');
  const buf2 = Buffer.from('Hello', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('UTF-8多字节字符比较', () => {
  const buf1 = Buffer.from('你好世界', 'utf8');
  const buf2 = Buffer.from('你好世界', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('UTF-8不同多字节字符比较', () => {
  const buf1 = Buffer.from('你好', 'utf8');
  const buf2 = Buffer.from('世界', 'utf8');
  const result = buf1.compare(buf2);
  // "你好" 的第一个字符 "你" (U+4F60) = E4 BD A0
  // "世界" 的第一个字符 "世" (U+4E16) = E4 B8 96
  // 比较第二个字节: BD > B8
  return result > 0;
});

test('UTF-16LE编码比较', () => {
  const buf1 = Buffer.from('Hello', 'utf16le');
  const buf2 = Buffer.from('Hello', 'utf16le');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('Latin1编码比较', () => {
  const buf1 = Buffer.from('Hello', 'latin1');
  const buf2 = Buffer.from('Hello', 'latin1');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('Base64编码比较', () => {
  const buf1 = Buffer.from('SGVsbG8=', 'base64');
  const buf2 = Buffer.from('Hello', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('Base64URL编码比较', () => {
  const buf1 = Buffer.from('SGVsbG8', 'base64url');
  const buf2 = Buffer.from('Hello', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('Hex编码比较', () => {
  const buf1 = Buffer.from('48656c6c6f', 'hex');
  const buf2 = Buffer.from('Hello', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('ASCII编码比较', () => {
  const buf1 = Buffer.from('Hello', 'ascii');
  const buf2 = Buffer.from('Hello', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('空字符串比较', () => {
  const buf1 = Buffer.from('', 'utf8');
  const buf2 = Buffer.from('', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0 && buf1.length === 0;
});

test('包含NULL字节的字符串比较', () => {
  const buf1 = Buffer.from('Hello\x00World');
  const buf2 = Buffer.from('Hello\x00World');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('不同NULL字节位置比较', () => {
  const buf1 = Buffer.from('Hello\x00World');
  const buf2 = Buffer.from('Hello\x00Test');
  const result = buf1.compare(buf2);
  return result > 0; // W > T
});

test('Emoji字符比较', () => {
  const buf1 = Buffer.from('😀😁', 'utf8');
  const buf2 = Buffer.from('😀😁', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('不同Emoji字符比较', () => {
  const buf1 = Buffer.from('😀', 'utf8');
  const buf2 = Buffer.from('😁', 'utf8');
  const result = buf1.compare(buf2);
  return result < 0;
});

test('混合ASCII和多字节字符比较', () => {
  const buf1 = Buffer.from('Hello世界', 'utf8');
  const buf2 = Buffer.from('Hello世界', 'utf8');
  const result = buf1.compare(buf2);
  return result === 0;
});

test('特殊Unicode字符比较 - 零宽字符', () => {
  const buf1 = Buffer.from('Hello\u200BWorld', 'utf8');
  const buf2 = Buffer.from('HelloWorld', 'utf8');
  const result = buf1.compare(buf2);
  return result !== 0; // 零宽字符应该影响比较
});

test('BOM标记的影响', () => {
  const buf1 = Buffer.from('\uFEFFHello', 'utf8');
  const buf2 = Buffer.from('Hello', 'utf8');
  const result = buf1.compare(buf2);
  return result !== 0; // BOM应该影响比较
});

test('大小写敏感性检查', () => {
  const buf1 = Buffer.from('Hello', 'utf8');
  const buf2 = Buffer.from('hello', 'utf8');
  const result = buf1.compare(buf2);
  return result < 0; // 'H' < 'h'
});

test('空白字符比较', () => {
  const buf1 = Buffer.from('   ', 'utf8');
  const buf2 = Buffer.from('\t\t\t', 'utf8');
  const result = buf1.compare(buf2);
  return result > 0; // 空格 > Tab
});

test('换行符比较', () => {
  const buf1 = Buffer.from('\n', 'utf8');
  const buf2 = Buffer.from('\r\n', 'utf8');
  const result = buf1.compare(buf2);
  return result < 0 && buf1.length === 1 && buf2.length === 2;
});

test('Base64填充差异比较', () => {
  const buf1 = Buffer.from('SGVsbG8=', 'base64'); // 有padding
  const buf2 = Buffer.from('SGVsbG8', 'base64');  // 无padding
  const result = buf1.compare(buf2);
  return result === 0; // 解码后内容相同
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
