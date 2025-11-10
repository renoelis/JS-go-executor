// buf.toJSON() - Complete Tests
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


test('返回对象格式', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  return json.type === 'Buffer' && Array.isArray(json.data);
});

test('data 包含所有字节', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const json = buf.toJSON();
  return json.data.length === 5 && json.data[0] === 1;
});

test('空 buffer', () => {
  const buf = Buffer.alloc(0);
  const json = buf.toJSON();
  return json.type === 'Buffer' && json.data.length === 0;
});

test('JSON.stringify 集成', () => {
  const buf = Buffer.from([1, 2, 3]);
  const str = JSON.stringify(buf);
  const obj = JSON.parse(str);
  return obj.type === 'Buffer' && obj.data[0] === 1;
});

test('往返转换', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const json = buf1.toJSON();
  const buf2 = Buffer.from(json.data);
  return buf1.equals(buf2);
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
