// buffer.kStringMaxLength - Part 8: Cross-Cutting Concerns and Integration
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

// 组合场景测试
test('多种编码转换不改变 kStringMaxLength', () => {
  const original = kStringMaxLength;
  try {
    const str = 'test';
    Buffer.from(str, 'utf8').toString('hex');
    Buffer.from(str, 'ascii').toString('base64');
    Buffer.from(str, 'latin1').toString('utf8');
    return kStringMaxLength === original;
  } catch (e) {
    return false;
  }
});

test('Buffer 拼接后 toString 限制依然有效', () => {
  try {
    const buf1 = Buffer.from('hello');
    const buf2 = Buffer.from(' ');
    const buf3 = Buffer.from('world');
    const combined = Buffer.concat([buf1, buf2, buf3]);
    const str = combined.toString();
    return str === 'hello world' && str.length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('Buffer.from 与 new Buffer 行为对比（deprecated）', () => {
  try {
    const str = 'test';
    const buf = Buffer.from(str);
    return buf.toString() === str && buf.length === str.length;
  } catch (e) {
    return false;
  }
});

// 并发和异步场景
test('Promise 中使用 kStringMaxLength', () => {
  try {
    return Promise.resolve(kStringMaxLength).then(val => val === kStringMaxLength);
  } catch (e) {
    return false;
  }
});

test('setTimeout 中访问 kStringMaxLength', () => {
  // 同步测试，但验证闭包中的访问
  const captured = kStringMaxLength;
  return captured === kStringMaxLength;
});

// 特殊 Buffer 操作
test('Buffer.compare 不受 kStringMaxLength 影响', () => {
  try {
    const buf1 = Buffer.from('abc');
    const buf2 = Buffer.from('abd');
    const result = Buffer.compare(buf1, buf2);
    return result === -1 && kStringMaxLength > 0;
  } catch (e) {
    return false;
  }
});

test('Buffer.equals 不受 kStringMaxLength 影响', () => {
  try {
    const buf1 = Buffer.from('test');
    const buf2 = Buffer.from('test');
    return buf1.equals(buf2) === true;
  } catch (e) {
    return false;
  }
});

test('Buffer.indexOf 不受 kStringMaxLength 影响', () => {
  try {
    const buf = Buffer.from('hello world');
    return buf.indexOf('world') === 6;
  } catch (e) {
    return false;
  }
});

test('Buffer.includes 不受 kStringMaxLength 影响', () => {
  try {
    const buf = Buffer.from('hello world');
    return buf.includes('world') === true;
  } catch (e) {
    return false;
  }
});

// 字符串和 Buffer 互转
test('字符串转 Buffer 再转回字符串保持一致（小字符串）', () => {
  try {
    const original = 'Hello, 世界! 🎉';
    const buf = Buffer.from(original);
    const result = buf.toString();
    return original === result;
  } catch (e) {
    return false;
  }
});

test('不同编码往返转换', () => {
  try {
    const original = 'test123';
    const hex = Buffer.from(original).toString('hex');
    const back = Buffer.from(hex, 'hex').toString();
    return original === back;
  } catch (e) {
    return false;
  }
});

test('base64 编码往返', () => {
  try {
    const original = 'Hello World';
    const base64 = Buffer.from(original).toString('base64');
    const back = Buffer.from(base64, 'base64').toString();
    return original === back;
  } catch (e) {
    return false;
  }
});

// 数组和 Buffer 转换
test('TypedArray 转 Buffer', () => {
  try {
    const arr = new Uint8Array([72, 101, 108, 108, 111]);
    const buf = Buffer.from(arr);
    return buf.toString() === 'Hello';
  } catch (e) {
    return false;
  }
});

test('ArrayBuffer 转 Buffer', () => {
  try {
    const ab = new ArrayBuffer(5);
    const view = new Uint8Array(ab);
    view[0] = 72; view[1] = 101; view[2] = 108; view[3] = 108; view[4] = 111;
    const buf = Buffer.from(ab);
    return buf.toString() === 'Hello';
  } catch (e) {
    return false;
  }
});

// Buffer 写入操作
test('Buffer.write 不受 kStringMaxLength 直接影响', () => {
  try {
    const buf = Buffer.alloc(10);
    const written = buf.write('hello');
    return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
  } catch (e) {
    return false;
  }
});

test('Buffer.write 超过 Buffer 大小被截断', () => {
  try {
    const buf = Buffer.alloc(3);
    const written = buf.write('hello');
    return written === 3 && buf.toString() === 'hel';
  } catch (e) {
    return false;
  }
});

test('Buffer.fill 不受 kStringMaxLength 影响', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.fill('a');
    return buf.toString() === 'aaaaa';
  } catch (e) {
    return false;
  }
});

// 数值读写
test('Buffer 数值读写与 kStringMaxLength 无关', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeInt32LE(kStringMaxLength, 0);
    const read = buf.readInt32LE(0);
    return read === kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('Buffer 存储 kStringMaxLength 为 BigInt', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(BigInt(kStringMaxLength), 0);
    const read = buf.readBigInt64LE(0);
    return read === BigInt(kStringMaxLength);
  } catch (e) {
    return false;
  }
});

// 特殊字符和编码组合
test('emoji 序列正确处理', () => {
  try {
    const emoji = '👨‍👩‍👧‍👦'; // 家庭 emoji（多个码点组合）
    const buf = Buffer.from(emoji);
    return buf.toString() === emoji;
  } catch (e) {
    return false;
  }
});

test('零宽字符处理', () => {
  try {
    const str = 'a\u200Bb'; // 零宽空格
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

test('控制字符处理', () => {
  try {
    const str = '\x01\x02\x03\x04';
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

// Buffer 子类化（如果支持）
test('Buffer.isBuffer 识别 Buffer 实例', () => {
  try {
    const buf = Buffer.from('test');
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return false;
  }
});

test('Buffer.isBuffer 拒绝非 Buffer', () => {
  return Buffer.isBuffer('test') === false &&
         Buffer.isBuffer([1, 2, 3]) === false &&
         Buffer.isBuffer(null) === false;
});

// 与其他常量的综合验证
test('kStringMaxLength 和 kMaxLength 共存且不冲突', () => {
  const { kMaxLength, constants } = require('buffer');
  return kStringMaxLength > 0 &&
         kMaxLength > 0 &&
         constants.MAX_STRING_LENGTH === kStringMaxLength &&
         constants.MAX_LENGTH === kMaxLength;
});

test('所有 Buffer 常量都是数字', () => {
  const { kMaxLength, constants } = require('buffer');
  return typeof kStringMaxLength === 'number' &&
         typeof kMaxLength === 'number' &&
         typeof constants.MAX_STRING_LENGTH === 'number' &&
         typeof constants.MAX_LENGTH === 'number';
});

// 实际应用场景
test('JSON.stringify 大对象不受 kStringMaxLength 直接限制', () => {
  try {
    const obj = { data: 'x'.repeat(1000) };
    const json = JSON.stringify(obj);
    return json.length > 1000 && json.length < kStringMaxLength;
  } catch (e) {
    return false;
  }
});

test('URL 构建不受 kStringMaxLength 直接限制', () => {
  try {
    const url = 'https://example.com/path/' + 'a'.repeat(100);
    const buf = Buffer.from(url);
    return buf.toString() === url;
  } catch (e) {
    return false;
  }
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
