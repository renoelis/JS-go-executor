// buf.write() - 终极边缘场景测试
// 覆盖最后可能遗漏的极端情况
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

// ========== 1. 对象类型参数的特殊处理 ==========

test('valueOf() 返回数字的对象作为 offset 抛出错误', () => {
  const buf = Buffer.alloc(10);
  const obj = { valueOf: () => 2, toString: () => 'invalid' };
  try {
    buf.write('test', obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('toString() 返回字符串的对象作为第一个参数抛出错误', () => {
  const buf = Buffer.alloc(10);
  const obj = { toString: () => 'test' };
  try {
    buf.write(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('encoding 为对象（会被转换为字符串）', () => {
  const buf = Buffer.alloc(10);
  const obj = { toString: () => 'utf8' };
  const written = buf.write('test', 0, 4, obj);
  return written === 4;
});

// ========== 2. 特殊数值 ==========

test('负零 (-0) 作为 offset', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', -0);
  return written === 4 && buf.toString('utf8', 0, 4) === 'test';
});

test('Number.MAX_SAFE_INTEGER 作为 offset 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Number.MIN_SAFE_INTEGER 作为 offset 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('Number.MAX_VALUE 作为 offset 抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ========== 3. 字符串数字作为参数 ==========

test('字符串 "0" 作为第二个参数被当作 encoding', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', '0');
    return false; // '0' 不是有效编码，应该抛出错误
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('字符串 "2" 作为第二个参数被当作 encoding', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('字符串 "utf8" 作为第二个参数正常工作', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 'utf8');
  return written === 4;
});

// ========== 4. 编码别名大小写不敏感 ==========

test('UTF-16LE (大写带连字符)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('ab', 'UTF-16LE');
  return written === 4;
});

test('BASE64URL (全大写)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('dGVzdA', 'BASE64URL');
  return written === 4;
});

test('LATIN1 (全大写)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 'LATIN1');
  return written === 4;
});

test('BINARY (全大写)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 'BINARY');
  return written === 4;
});

// ========== 5. 连续写入同一位置 ==========

test('连续写入同一位置覆盖数据', () => {
  const buf = Buffer.alloc(10);
  buf.write('aaaa', 0);
  buf.write('bb', 0);
  return buf.toString('utf8', 0, 4) === 'bbaa';
});

test('多次覆盖写入', () => {
  const buf = Buffer.alloc(5);
  buf.write('11111', 0);
  buf.write('22', 0);
  buf.write('3', 1);
  return buf.toString('utf8') === '23111';
});

// ========== 6. offset 和 length 的边界组合 ==========

test('offset=0, length=buf.length (完全覆盖)', () => {
  const buf = Buffer.alloc(5);
  const written = buf.write('hello', 0, 5);
  return written === 5 && buf.toString() === 'hello';
});

test('offset=buf.length-1, length=1 (最后一个字节)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('x', 9, 1);
  return written === 1 && buf[9] === 0x78;
});

test('offset + length < 字符串字节数（精确截断）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 2);
  return written === 2 && buf.toString('utf8', 0, 2) === 'he';
});

// ========== 7. 不同编码的返回值验证 ==========

test('hex 返回值等于解析的字节数', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('48656c6c6f', 'hex');
  return written === 5; // 10个hex字符 = 5字节
});

test('base64 返回值等于解码后的字节数', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('dGVzdA==', 'base64');
  return written === 4; // "test" 解码后是 4 字节
});

test('utf16le 返回值是字节数（不是字符数）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('ab', 'utf16le');
  return written === 4; // 2个字符 * 2字节 = 4字节
});

// ========== 8. 空格和空白字符处理 ==========

test('写入单个空格', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write(' ');
  return written === 1 && buf[0] === 0x20;
});

test('写入制表符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\t');
  return written === 1 && buf[0] === 0x09;
});

test('写入换行符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\n');
  return written === 1 && buf[0] === 0x0A;
});

test('写入回车符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\r');
  return written === 1 && buf[0] === 0x0D;
});

test('写入 CRLF', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\r\n');
  return written === 2 && buf[0] === 0x0D && buf[1] === 0x0A;
});

// ========== 9. Buffer 子类和特殊 this ==========

test('普通对象作为 this 抛出错误', () => {
  try {
    Buffer.prototype.write.call({}, 'test');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('数组作为 this 抛出错误', () => {
  try {
    Buffer.prototype.write.call([], 'test');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Uint8Array 作为 this 抛出错误', () => {
  const arr = new Uint8Array(10);
  try {
    Buffer.prototype.write.call(arr, 'test');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// ========== 10. 参数个数的极端情况 ==========

test('无参数抛出错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write();
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('5个参数（忽略多余参数）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 0, 4, 'utf8', 'extra');
  return written === 4;
});

test('6个参数（忽略多余参数）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 0, 4, 'utf8', 'extra1', 'extra2');
  return written === 4;
});

// ========== 11. 特殊字符串内容 ==========

test('写入只包含 null 字符的字符串', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\0\0\0');
  return written === 3 && buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('写入混合 null 和普通字符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('a\0b\0c');
  return written === 5;
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
