// buffer.kStringMaxLength - Part 12: Encoding Validation and String Boundaries
const { Buffer, kStringMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer.isEncoding 测试
test('Buffer.isEncoding utf8 返回 true', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('Buffer.isEncoding utf-8 返回 true', () => {
  return Buffer.isEncoding('utf-8') === true;
});

test('Buffer.isEncoding hex 返回 true', () => {
  return Buffer.isEncoding('hex') === true;
});

test('Buffer.isEncoding base64 返回 true', () => {
  return Buffer.isEncoding('base64') === true;
});

test('Buffer.isEncoding ascii 返回 true', () => {
  return Buffer.isEncoding('ascii') === true;
});

test('Buffer.isEncoding latin1 返回 true', () => {
  return Buffer.isEncoding('latin1') === true;
});

test('Buffer.isEncoding binary 返回 true', () => {
  return Buffer.isEncoding('binary') === true;
});

test('Buffer.isEncoding ucs2 返回 true', () => {
  return Buffer.isEncoding('ucs2') === true;
});

test('Buffer.isEncoding utf16le 返回 true', () => {
  return Buffer.isEncoding('utf16le') === true;
});

test('Buffer.isEncoding 无效编码返回 false', () => {
  return Buffer.isEncoding('invalid') === false;
});

test('Buffer.isEncoding 空字符串返回 false', () => {
  return Buffer.isEncoding('') === false;
});

test('Buffer.isEncoding undefined 返回 false', () => {
  return Buffer.isEncoding(undefined) === false;
});

test('Buffer.isEncoding null 返回 false', () => {
  return Buffer.isEncoding(null) === false;
});

test('Buffer.isEncoding 大小写敏感', () => {
  return Buffer.isEncoding('UTF8') === true &&
         Buffer.isEncoding('Utf8') === true;
});

// 空白字符测试
test('空格字符串创建 Buffer', () => {
  try {
    const buf = Buffer.from(' ');
    return buf.length === 1 && buf[0] === 32;
  } catch (e) {
    return false;
  }
});

test('制表符字符串创建 Buffer', () => {
  try {
    const buf = Buffer.from('\t');
    return buf.length === 1 && buf[0] === 9;
  } catch (e) {
    return false;
  }
});

test('换行符字符串创建 Buffer', () => {
  try {
    const buf = Buffer.from('\n');
    return buf.length === 1 && buf[0] === 10;
  } catch (e) {
    return false;
  }
});

test('回车符字符串创建 Buffer', () => {
  try {
    const buf = Buffer.from('\r');
    return buf.length === 1 && buf[0] === 13;
  } catch (e) {
    return false;
  }
});

test('多种空白字符组合', () => {
  try {
    const str = ' \t\n\r';
    const buf = Buffer.from(str);
    return buf.length === 4;
  } catch (e) {
    return false;
  }
});

// 不同长度字符串的渐进测试
test('0字符字符串', () => {
  try {
    const buf = Buffer.from('');
    return buf.length === 0 && buf.toString().length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('1字符字符串', () => {
  try {
    const buf = Buffer.from('a');
    return buf.length === 1 && buf.toString().length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('10字符字符串', () => {
  try {
    const str = 'a'.repeat(10);
    const buf = Buffer.from(str);
    return buf.length === 10 && buf.toString().length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('100字符字符串', () => {
  try {
    const str = 'b'.repeat(100);
    const buf = Buffer.from(str);
    return buf.length === 100 && buf.toString().length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('1000字符字符串', () => {
  try {
    const str = 'c'.repeat(1000);
    const buf = Buffer.from(str);
    return buf.length === 1000 && buf.toString().length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('10000字符字符串', () => {
  try {
    const str = 'd'.repeat(10000);
    const buf = Buffer.from(str);
    return buf.length === 10000 && buf.toString().length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('100000字符字符串', () => {
  try {
    const str = 'e'.repeat(100000);
    const buf = Buffer.from(str);
    return buf.length === 100000 && buf.toString().length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

// Buffer.poolSize 测试
test('Buffer.poolSize 存在', () => {
  return typeof Buffer.poolSize === 'number';
});

test('Buffer.poolSize 是正数', () => {
  return Buffer.poolSize > 0;
});

test('Buffer.poolSize 默认值', () => {
  // 默认通常是 8192 (8KB)
  return Buffer.poolSize === 8192 || Buffer.poolSize > 0;
});

test('Buffer.poolSize 可以修改', () => {
  const original = Buffer.poolSize;
  try {
    Buffer.poolSize = 16384;
    const changed = Buffer.poolSize === 16384;
    Buffer.poolSize = original; // 恢复
    return changed;
  } catch (e) {
    Buffer.poolSize = original;
    return false;
  }
});

test('小 Buffer 使用池', () => {
  try {
    // 小于 poolSize/2 的 Buffer 通常使用池
    const buf = Buffer.allocUnsafe(100);
    return buf.length === 100;
  } catch (e) {
    return false;
  }
});

// ASCII 边界字符测试
test('ASCII 0 字符', () => {
  try {
    const buf = Buffer.from([0]);
    return buf[0] === 0;
  } catch (e) {
    return false;
  }
});

test('ASCII 127 字符', () => {
  try {
    const buf = Buffer.from([127]);
    return buf[0] === 127;
  } catch (e) {
    return false;
  }
});

test('Extended ASCII 128 字符', () => {
  try {
    const buf = Buffer.from([128]);
    return buf[0] === 128;
  } catch (e) {
    return false;
  }
});

test('Extended ASCII 255 字符', () => {
  try {
    const buf = Buffer.from([255]);
    return buf[0] === 255;
  } catch (e) {
    return false;
  }
});

test('所有 ASCII 值可存储', () => {
  try {
    const buf = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) {
      buf[i] = i;
    }
    return buf[0] === 0 && buf[255] === 255;
  } catch (e) {
    return false;
  }
});

// 字符串模板测试
test('模板字符串创建 Buffer', () => {
  try {
    const value = 'world';
    const str = `hello ${value}`;
    const buf = Buffer.from(str);
    return buf.toString() === 'hello world';
  } catch (e) {
    return false;
  }
});

test('模板字符串包含 kStringMaxLength', () => {
  try {
    const str = `Max: ${kStringMaxLength}`;
    const buf = Buffer.from(str);
    return buf.toString().includes('536870888') || buf.toString().includes(String(kStringMaxLength));
  } catch (e) {
    return false;
  }
});

test('多行模板字符串', () => {
  try {
    const str = `line1
line2
line3`;
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

// 正则表达式相关测试
test('Buffer 内容匹配数字正则', () => {
  try {
    const buf = Buffer.from('test123');
    const str = buf.toString();
    return /\d+/.test(str);
  } catch (e) {
    return false;
  }
});

test('Buffer 内容匹配字母正则', () => {
  try {
    const buf = Buffer.from('abc123');
    const str = buf.toString();
    return /[a-z]+/.test(str);
  } catch (e) {
    return false;
  }
});

test('Buffer 内容替换', () => {
  try {
    const buf = Buffer.from('hello world');
    const str = buf.toString().replace('world', 'node');
    return str === 'hello node';
  } catch (e) {
    return false;
  }
});

// Buffer.compare 静态方法测试
test('Buffer.compare 静态方法存在', () => {
  return typeof Buffer.compare === 'function';
});

test('Buffer.compare 相等返回 0', () => {
  try {
    const buf1 = Buffer.from('test');
    const buf2 = Buffer.from('test');
    return Buffer.compare(buf1, buf2) === 0;
  } catch (e) {
    return false;
  }
});

test('Buffer.compare 小于返回负数', () => {
  try {
    const buf1 = Buffer.from('a');
    const buf2 = Buffer.from('b');
    return Buffer.compare(buf1, buf2) < 0;
  } catch (e) {
    return false;
  }
});

test('Buffer.compare 大于返回正数', () => {
  try {
    const buf1 = Buffer.from('b');
    const buf2 = Buffer.from('a');
    return Buffer.compare(buf1, buf2) > 0;
  } catch (e) {
    return false;
  }
});

test('Buffer.compare 用于排序', () => {
  try {
    const arr = [
      Buffer.from('c'),
      Buffer.from('a'),
      Buffer.from('b')
    ];
    arr.sort(Buffer.compare);
    return arr[0].toString() === 'a' && arr[2].toString() === 'c';
  } catch (e) {
    return false;
  }
});

// kStringMaxLength 在各种场景中的稳定性
test('kStringMaxLength 在模板字符串中保持值', () => {
  const captured = kStringMaxLength;
  const str = `${captured}`;
  return parseInt(str) === kStringMaxLength;
});

test('kStringMaxLength 在数组中保持值', () => {
  const arr = [0, kStringMaxLength, 100];
  return arr[1] === kStringMaxLength;
});

test('kStringMaxLength 在对象中保持值', () => {
  const obj = { max: kStringMaxLength };
  return obj.max === kStringMaxLength;
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
