// buffer.INSPECT_MAX_BYTES - 兼容性和历史行为测试
const { Buffer } = require('buffer');
const buffer = require('buffer');

const tests = [];
const originalValue = buffer.INSPECT_MAX_BYTES;

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  } finally {
    buffer.INSPECT_MAX_BYTES = originalValue;
  }
}

// Node.js v25.0.0 的默认行为
test('默认值确认为 50（Node.js v25.0.0）', () => {
  return buffer.INSPECT_MAX_BYTES === 50;
});

test('默认值下 50 字节 Buffer 完整显示', () => {
  buffer.INSPECT_MAX_BYTES = 50;
  const buf = Buffer.alloc(50, 0xAA);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('默认值下 51 字节 Buffer 被截断', () => {
  buffer.INSPECT_MAX_BYTES = 50;
  const buf = Buffer.alloc(51, 0xBB);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 与其他 Buffer 方法的兼容性
test('INSPECT_MAX_BYTES 不影响 toString()', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('Hello World');
  const str = buf.toString();
  return str === 'Hello World';
});

test('INSPECT_MAX_BYTES 不影响 toJSON()', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const json = buf.toJSON();
  return json.type === 'Buffer' && json.data.length === 6;
});

test('INSPECT_MAX_BYTES 不影响 length 属性', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(100);
  return buf.length === 100;
});

test('INSPECT_MAX_BYTES 不影响 Buffer 读写操作', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20);
  buf.writeUInt32BE(0x12345678, 0);
  const val = buf.readUInt32BE(0);
  return val === 0x12345678;
});

test('INSPECT_MAX_BYTES 不影响 Buffer 比较', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5, 6]);
  return buf1.equals(buf2);
});

test('INSPECT_MAX_BYTES 不影响 Buffer 复制', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6]);
  const buf2 = Buffer.alloc(6);
  buf1.copy(buf2);
  return buf2.equals(buf1);
});

test('INSPECT_MAX_BYTES 不影响 Buffer.concat', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 6 && result[5] === 6;
});

// 模块级别的独立性
test('INSPECT_MAX_BYTES 修改不影响其他模块', () => {
  const original = buffer.INSPECT_MAX_BYTES;
  buffer.INSPECT_MAX_BYTES = 99;
  const buffer2 = require('buffer');
  const same = buffer2.INSPECT_MAX_BYTES === 99;
  buffer.INSPECT_MAX_BYTES = original;
  return same;
});

// 与 util.inspect 的关系
test('INSPECT_MAX_BYTES 影响 util.inspect(buffer)', () => {
  const util = require('util');
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0xCC);
  const inspected = util.inspect(buf);
  return inspected.includes('...');
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
