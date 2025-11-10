// buf.toJSON() - Overriding, Error Handling, and Buffer Characteristics Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// 覆盖 toJSON 方法
test('覆盖实例的 toJSON 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.toJSON = function() {
    return { custom: 'override' };
  };

  const result = buf.toJSON();
  if (result.custom !== 'override') return false;

  // JSON.stringify 应该使用覆盖的方法
  const str = JSON.stringify(buf);
  const parsed = JSON.parse(str);
  if (parsed.custom !== 'override') return false;

  return true;
});

test('覆盖 Buffer.prototype.toJSON', () => {
  const originalToJSON = Buffer.prototype.toJSON;

  Buffer.prototype.toJSON = function() {
    return { modified: true };
  };

  const buf = Buffer.from([1, 2, 3]);
  const result = buf.toJSON();

  // 恢复原方法
  Buffer.prototype.toJSON = originalToJSON;

  if (result.modified !== true) return false;

  // 验证恢复后正常
  const buf2 = Buffer.from([4, 5, 6]);
  const result2 = buf2.toJSON();
  if (result2.type !== 'Buffer') return false;

  return true;
});

test('toJSON 返回字符串', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.toJSON = function() {
    return 'string result';
  };

  const str = JSON.stringify(buf);
  const parsed = JSON.parse(str);

  if (parsed !== 'string result') return false;

  return true;
});

test('toJSON 返回数字', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.toJSON = function() {
    return 42;
  };

  const str = JSON.stringify(buf);
  const parsed = JSON.parse(str);

  if (parsed !== 42) return false;

  return true;
});

test('toJSON 返回 null', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.toJSON = function() {
    return null;
  };

  const str = JSON.stringify(buf);

  if (str !== 'null') return false;

  return true;
});

test('toJSON 返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.toJSON = function() {
    return undefined;
  };

  const str = JSON.stringify(buf);

  // undefined 序列化为 undefined
  if (str !== undefined) return false;

  return true;
});

test('toJSON 抛出错误会传播', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.toJSON = function() {
    throw new Error('toJSON error');
  };

  let threw = false;
  try {
    JSON.stringify(buf);
  } catch (e) {
    threw = true;
    if (e.message !== 'toJSON error') return false;
  }

  return threw;
});

test('toJSON 返回的 Promise 不会被等待', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.toJSON = async function() {
    return { type: 'Buffer', data: [1, 2, 3] };
  };

  const str = JSON.stringify(buf);
  const parsed = JSON.parse(str);

  // Promise 被序列化为空对象
  if (Object.keys(parsed).length !== 0) return false;

  return true;
});

// Buffer.byteLength 一致性
test('Buffer.byteLength 与 toJSON data.length 一致 - utf8', () => {
  const str = 'Hello World';
  const byteLen = Buffer.byteLength(str, 'utf8');
  const buf = Buffer.from(str, 'utf8');
  const json = buf.toJSON();

  if (byteLen !== buf.length) return false;
  if (buf.length !== json.data.length) return false;

  return true;
});

test('Buffer.byteLength 与 toJSON data.length 一致 - 中文', () => {
  const str = '你好世界';
  const byteLen = Buffer.byteLength(str, 'utf8');
  const buf = Buffer.from(str, 'utf8');
  const json = buf.toJSON();

  if (byteLen !== buf.length) return false;
  if (buf.length !== json.data.length) return false;
  // 中文字符每个 3 字节
  if (json.data.length !== 12) return false;

  return true;
});

test('Buffer.byteLength 与 toJSON data.length 一致 - hex', () => {
  const str = 'deadbeef';
  const byteLen = Buffer.byteLength(str, 'hex');
  const buf = Buffer.from(str, 'hex');
  const json = buf.toJSON();

  if (byteLen !== buf.length) return false;
  if (buf.length !== json.data.length) return false;

  return true;
});

// Buffer pool 行为
test('allocUnsafe 小 Buffer 可能使用池', () => {
  const buf1 = Buffer.allocUnsafe(10);
  buf1.fill(1);
  const buf2 = Buffer.allocUnsafe(10);
  buf2.fill(2);

  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();

  // 即使使用池,数据应该独立
  if (json1.data[0] === json2.data[0]) return false;
  if (json1.data[0] !== 1) return false;
  if (json2.data[0] !== 2) return false;

  return true;
});

test('allocUnsafe 大 Buffer 不使用池', () => {
  const largeSize = Buffer.poolSize + 1;
  const buf = Buffer.allocUnsafe(largeSize);
  buf.fill(99);

  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== largeSize) return false;
  if (json.data[0] !== 99) return false;

  return true;
});

// Buffer.constants 相关
test('Buffer.constants.MAX_LENGTH 是有效值', () => {
  if (typeof Buffer.constants !== 'object') return true; // 可能不存在

  if (typeof Buffer.constants.MAX_LENGTH !== 'number') return false;
  if (Buffer.constants.MAX_LENGTH <= 0) return false;

  return true;
});

test('接近 MAX_LENGTH 的 Buffer (仅验证逻辑)', () => {
  // 不实际创建超大 Buffer,只验证小 Buffer 的 toJSON
  const buf = Buffer.alloc(100);
  buf.fill(255);

  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 100) return false;
  if (json.data[0] !== 255) return false;

  return true;
});

// Buffer.isBuffer 与 toJSON
test('Buffer.isBuffer 识别池分配的 Buffer', () => {
  const buf = Buffer.allocUnsafe(10);
  if (!Buffer.isBuffer(buf)) return false;

  const json = buf.toJSON();
  if (Buffer.isBuffer(json)) return false;

  return true;
});

test('Buffer.isBuffer 识别非池分配的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  if (!Buffer.isBuffer(buf)) return false;

  const json = buf.toJSON();
  if (Buffer.isBuffer(json)) return false;

  return true;
});

// 原型链检查
test('toJSON 返回对象的原型链', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  // 使用 Object.getPrototypeOf 检查原型
  const proto = Object.getPrototypeOf(json);
  if (proto !== Object.prototype) return false;

  return true;
});

test('toJSON 返回的 data 数组的原型链', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  const proto = Object.getPrototypeOf(json.data);
  if (proto !== Array.prototype) return false;

  return true;
});

// for...in 循环
test('for...in 遍历 toJSON 结果', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  const keys = [];
  for (const key in json) {
    keys.push(key);
  }

  if (keys.length !== 2) return false;
  if (!keys.includes('type')) return false;
  if (!keys.includes('data')) return false;

  return true;
});

test('for...in 遍历 Buffer 本身', () => {
  const buf = Buffer.from([10, 20, 30]);

  const keys = [];
  for (const key in buf) {
    keys.push(key);
  }

  // 应该包含数字索引
  if (!keys.includes('0')) return false;
  if (!keys.includes('1')) return false;
  if (!keys.includes('2')) return false;

  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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
  console.log('\n' + JSON.stringify(result, null, 2));
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
