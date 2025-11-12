// buffer.kMaxLength - Part 7: toString and toJSON Methods
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// toString 方法测试
test('buffer.toString() 默认使用 utf8', () => {
  const buf = Buffer.from('hello');
  return buf.toString() === 'hello';
});

test('buffer.toString("utf8") 显式指定编码', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8') === 'hello';
});

test('buffer.toString("hex") 返回十六进制', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  return buf.toString('hex') === '010203';
});

test('buffer.toString("base64") 返回 base64', () => {
  const buf = Buffer.from('hello');
  const result = buf.toString('base64');
  return result === 'aGVsbG8=';
});

test('buffer.toString 使用超大 start', () => {
  const buf = Buffer.from('hello world');
  const result = buf.toString('utf8', kMaxLength);
  return result === '';
});

test('buffer.toString 使用超大 end', () => {
  const buf = Buffer.from('hello world');
  const result = buf.toString('utf8', 0, kMaxLength);
  return result === 'hello world';
});

test('buffer.toString 负数索引会被当作 0 处理', () => {
  const buf = Buffer.from('hello');
  const result = buf.toString('utf8', -3);
  return result === 'hello';
});

// toJSON 方法测试
test('buffer.toJSON() 返回正确格式', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  return json.type === 'Buffer' && json.data.length === 3;
});

test('buffer.toJSON() data 字段包含字节值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  return json.data[0] === 1 && json.data[1] === 2 && json.data[2] === 3;
});

test('JSON.stringify(buffer) 使用 toJSON', () => {
  const buf = Buffer.from([1, 2, 3]);
  const str = JSON.stringify(buf);
  const parsed = JSON.parse(str);
  return parsed.type === 'Buffer' && parsed.data[0] === 1;
});

// length 属性测试
test('buffer.length 返回字节长度', () => {
  const buf = Buffer.from('hello');
  return buf.length === 5;
});

test('buffer.length 对于多字节字符', () => {
  const buf = Buffer.from('你好');
  return buf.length === 6;
});

test('buffer.length 小于 kMaxLength', () => {
  const buf = Buffer.alloc(1024);
  return buf.length < kMaxLength && buf.length === 1024;
});

test('buffer.length 是只读属性', () => {
  const buf = Buffer.alloc(10);
  const original = buf.length;
  try {
    buf.length = 100;
  } catch (e) {
    // 严格模式可能抛出错误
  }
  return buf.length === original;
});

// entries / keys / values 迭代器测试
test('buffer.entries() 返回迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][0] === 0 && entries[0][1] === 1;
});

test('buffer.keys() 返回索引迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('buffer.values() 返回值迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = Array.from(buf.values());
  return values.length === 3 && values[0] === 1 && values[2] === 3;
});

test('buffer[Symbol.iterator] 可用于 for...of', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  return result.length === 3 && result[0] === 1;
});

// Buffer.isBuffer 测试
test('Buffer.isBuffer(buffer) 返回 true', () => {
  const buf = Buffer.from('test');
  return Buffer.isBuffer(buf);
});

test('Buffer.isBuffer(非 buffer) 返回 false', () => {
  return !Buffer.isBuffer('not a buffer') && !Buffer.isBuffer(null) && !Buffer.isBuffer(undefined);
});

test('Buffer.isBuffer(Uint8Array) 返回 false', () => {
  const u8 = new Uint8Array([1, 2, 3]);
  return !Buffer.isBuffer(u8);
});

// Buffer.isEncoding 测试
test('Buffer.isEncoding("utf8") 返回 true', () => {
  return Buffer.isEncoding('utf8');
});

test('Buffer.isEncoding("hex") 返回 true', () => {
  return Buffer.isEncoding('hex');
});

test('Buffer.isEncoding("base64") 返回 true', () => {
  return Buffer.isEncoding('base64');
});

test('Buffer.isEncoding("invalid") 返回 false', () => {
  return !Buffer.isEncoding('invalid');
});

test('Buffer.isEncoding(undefined) 返回 false', () => {
  return !Buffer.isEncoding(undefined);
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
