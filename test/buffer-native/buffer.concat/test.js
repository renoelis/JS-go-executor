// Buffer.concat() - Complete Tests
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

test('连接两个 buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString() === 'helloworld';
});

test('连接多个 buffer', () => {
  const bufs = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];
  const result = Buffer.concat(bufs);
  return result.toString() === 'abc';
});

test('指定总长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 5);
  return result.length === 5 && result.toString() === 'hello';
});

test('总长度大于实际', () => {
  const buf1 = Buffer.from('hi');
  const result = Buffer.concat([buf1], 10);
  return result.length === 10;
});

test('空数组', () => {
  const result = Buffer.concat([]);
  return result.length === 0;
});

test('单个 buffer', () => {
  const buf = Buffer.from('test');
  const result = Buffer.concat([buf]);
  return result.toString() === 'test';
});

test('包含空 buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.toString() === 'helloworld';
});

test('TypeError: 非数组参数', () => {
  try {
    Buffer.concat('not an array');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
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
