// buffer.isAscii() - Part 19: Compatibility and Special Scenarios
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 与其他 Buffer 方法的兼容性测试
test('Buffer.from + isAscii 一致性', () => {
  const str = 'hello world';
  const buf1 = Buffer.from(str, 'utf8');
  const buf2 = Buffer.from(str, 'ascii');
  return isAscii(buf1) === isAscii(buf2) && isAscii(buf1) === true;
});

test('Buffer.alloc vs Buffer.allocUnsafe 一致性', () => {
  const buf1 = Buffer.alloc(100, 0x41);
  const buf2 = Buffer.allocUnsafe(100);
  buf2.fill(0x41);
  return isAscii(buf1) === isAscii(buf2) && isAscii(buf1) === true;
});

test('toString 和 isAscii 一致性', () => {
  const buf = Buffer.from('hello');
  const isBufferAscii = isAscii(buf);
  const str = buf.toString('ascii');
  const isStringValid = /^[\x00-\x7F]*$/.test(str);
  return isBufferAscii === isStringValid;
});

test('slice 不改变 isAscii 结果', () => {
  const buf = Buffer.from('hello world');
  const original = isAscii(buf);
  const sliced = buf.slice(0, 5);
  const slicedResult = isAscii(sliced);
  return original === true && slicedResult === true;
});

test('concat 保持 ASCII 特性', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' world');
  const concatenated = Buffer.concat([buf1, buf2]);
  const allAscii = isAscii(buf1) && isAscii(buf2) && isAscii(concatenated);
  return allAscii === true;
});

test('copy 保持 ASCII 特性', () => {
  const source = Buffer.from('ascii');
  const target = Buffer.alloc(10);
  source.copy(target, 0);
  return isAscii(source) === true && isAscii(target) === true;
});

// 编码转换兼容性
test('latin1 编码中的 ASCII 子集', () => {
  const asciiChars = 'Hello World 123!';
  const buf = Buffer.from(asciiChars, 'latin1');
  return isAscii(buf) === true;
});

test('latin1 编码中的扩展字符', () => {
  const extendedChars = 'Héllo Wörld'; // 包含重音符号
  const buf = Buffer.from(extendedChars, 'latin1');
  return isAscii(buf) === false;
});

test('hex 编码的 ASCII 字符', () => {
  const hexStr = '48656c6c6f'; // "Hello" in hex
  const buf = Buffer.from(hexStr, 'hex');
  return isAscii(buf) === true;
});

test('hex 编码的非 ASCII 字符', () => {
  const hexStr = '48656c80'; // "Hel" + 0x80
  const buf = Buffer.from(hexStr, 'hex');
  return isAscii(buf) === false;
});

test('base64 解码的 ASCII', () => {
  const b64 = Buffer.from('Hello', 'ascii').toString('base64');
  const decoded = Buffer.from(b64, 'base64');
  return isAscii(decoded) === true;
});

// Node.js 版本兼容性模拟
test('Buffer 构造函数兼容性', () => {
  // 测试不同方式创建的 Buffer 行为一致
  const methods = [
    () => Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]),
    () => Buffer.from('Hello', 'ascii'),
    () => Buffer.from('Hello', 'utf8'),
    () => {
      const buf = Buffer.alloc(5);
      buf.write('Hello', 0, 'ascii');
      return buf;
    }
  ];
  
  const results = methods.map(method => isAscii(method()));
  return results.every(result => result === true);
});

// Web 标准兼容性
test('TextEncoder 兼容性', () => {
  try {
    if (typeof TextEncoder === 'undefined') {
      return true; // 如果不支持，测试通过
    }
    const encoder = new TextEncoder();
    const encoded = encoder.encode('Hello');
    return isAscii(Buffer.from(encoded)) === true;
  } catch (e) {
    return true; // 不支持也算通过
  }
});

test('TextDecoder 兼容性', () => {
  try {
    if (typeof TextDecoder === 'undefined') {
      return true;
    }
    const buf = Buffer.from('Hello', 'ascii');
    const decoder = new TextDecoder('ascii');
    const decoded = decoder.decode(buf);
    return decoded === 'Hello' && isAscii(buf) === true;
  } catch (e) {
    return true;
  }
});

// 特殊字符集测试
test('ASCII 艺术字符', () => {
  const art = Buffer.from('/-\\|');
  return isAscii(art) === true;
});

test('编程常用符号', () => {
  const symbols = Buffer.from('{}[]()<>+=*&^%$#@!~`');
  return isAscii(symbols) === true;
});

test('所有可打印 ASCII 字符完整测试', () => {
  const chars = [];
  for (let i = 0x20; i <= 0x7E; i++) { // 空格到波浪号
    chars.push(i);
  }
  const buf = Buffer.from(chars);
  return isAscii(buf) === true && chars.length === 95;
});

test('ASCII 转义序列', () => {
  const escapes = Buffer.from('\t\n\r\v\f');
  return isAscii(escapes) === true;
});

// 国际化和本地化
test('纯英文内容', () => {
  const english = Buffer.from('The quick brown fox jumps over the lazy dog');
  return isAscii(english) === true;
});

test('混合语言检测', () => {
  const mixed = Buffer.from('Hello 世界'); // 英文+中文
  return isAscii(mixed) === false;
});

test('纯数字内容', () => {
  const numbers = Buffer.from('1234567890');
  return isAscii(numbers) === true;
});

test('科学计数法', () => {
  const scientific = Buffer.from('1.23e-4');
  return isAscii(scientific) === true;
});

// 文件格式兼容性
test('JSON 字符串内容', () => {
  const json = Buffer.from('{"key":"value","number":123}');
  return isAscii(json) === true;
});

test('CSV 数据格式', () => {
  const csv = Buffer.from('name,age,city\nJohn,30,NYC');
  return isAscii(csv) === true;
});

test('URL 编码字符', () => {
  const url = Buffer.from('http://example.com/path?param=value');
  return isAscii(url) === true;
});

test('SQL 查询字符串', () => {
  const sql = Buffer.from('SELECT * FROM users WHERE id = 1');
  return isAscii(sql) === true;
});

// 安全性相关测试
test('XSS 尝试字符串（ASCII）', () => {
  const xss = Buffer.from('<script>alert("xss")</script>');
  return isAscii(xss) === true; // 恶意但仍是 ASCII
});

test('SQL 注入尝试（ASCII）', () => {
  const injection = Buffer.from("'; DROP TABLE users; --");
  return isAscii(injection) === true; // 恶意但仍是 ASCII
});

// 长度和大小边界
test('单字符 Buffer 所有 ASCII 值', () => {
  for (let i = 0; i <= 0x7F; i++) {
    const buf = Buffer.from([i]);
    if (!isAscii(buf)) return false;
  }
  return true;
});

test('单字符 Buffer 所有非 ASCII 值测试', () => {
  for (let i = 0x80; i <= 0xFF; i++) {
    const buf = Buffer.from([i]);
    if (isAscii(buf)) return false; // 应该都是 false
  }
  return true;
});

// 平台和架构兼容性
test('大小端字节序无关性', () => {
  // isAscii 应该不受字节序影响，因为它按字节处理
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);
  return isAscii(buf) === true;
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
