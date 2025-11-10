// buf.toJSON() - Basic Functionality Tests
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

// 基本功能测试
test('toJSON 返回正确的对象结构', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (!Array.isArray(json.data)) return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 1 || json.data[1] !== 2 || json.data[2] !== 3) return false;
  return true;
});

test('toJSON 返回的 data 字段包含正确的字节值', () => {
  const buf = Buffer.from([0, 127, 128, 255]);
  const json = buf.toJSON();
  if (json.data[0] !== 0) return false;
  if (json.data[1] !== 127) return false;
  if (json.data[2] !== 128) return false;
  if (json.data[3] !== 255) return false;
  return true;
});

test('空 Buffer 的 toJSON 返回空数组', () => {
  const buf = Buffer.from([]);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (!Array.isArray(json.data)) return false;
  if (json.data.length !== 0) return false;
  return true;
});

test('长度为 1 的 Buffer', () => {
  const buf = Buffer.from([42]);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 1) return false;
  if (json.data[0] !== 42) return false;
  return true;
});

test('从字符串创建的 Buffer', () => {
  const buf = Buffer.from('hello');
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  const expected = [104, 101, 108, 108, 111]; // 'hello' 的字节值
  if (json.data.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (json.data[i] !== expected[i]) return false;
  }
  return true;
});

test('从 hex 字符串创建的 Buffer', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  const expected = [72, 101, 108, 108, 111]; // 'Hello' 的字节值
  if (json.data.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (json.data[i] !== expected[i]) return false;
  }
  return true;
});

test('从 base64 字符串创建的 Buffer', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  const expected = [72, 101, 108, 108, 111]; // 'Hello' 的字节值
  if (json.data.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (json.data[i] !== expected[i]) return false;
  }
  return true;
});

test('使用 Buffer.alloc 创建的零填充 Buffer', () => {
  const buf = Buffer.alloc(5);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 5) return false;
  for (let i = 0; i < 5; i++) {
    if (json.data[i] !== 0) return false;
  }
  return true;
});

test('使用 Buffer.allocUnsafe 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafe(3);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 10 || json.data[1] !== 20 || json.data[2] !== 30) return false;
  return true;
});

test('较大 Buffer 的正确性', () => {
  const size = 100;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = i % 256;
  }
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== size) return false;
  for (let i = 0; i < size; i++) {
    if (json.data[i] !== i % 256) return false;
  }
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
