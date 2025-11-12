// Buffer.concat() - Basic Functionality Tests
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

// 基本功能测试
test('基本连接两个Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString() === 'helloworld' && result.length === 10;
});

test('连接空数组返回空Buffer', () => {
  const result = Buffer.concat([]);
  return result.length === 0 && Buffer.isBuffer(result);
});

test('连接单个Buffer', () => {
  const buf = Buffer.from('test');
  const result = Buffer.concat([buf]);
  return result.toString() === 'test' && result.length === 4;
});

test('连接多个Buffer（3个以上）', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.from('b');
  const buf3 = Buffer.from('c');
  const buf4 = Buffer.from('d');
  const result = Buffer.concat([buf1, buf2, buf3, buf4]);
  return result.toString() === 'abcd' && result.length === 4;
});

test('连接空Buffer', () => {
  const buf1 = Buffer.from('start');
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.from('end');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.toString() === 'startend' && result.length === 8;
});

test('连接所有空Buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 0;
});

test('连接包含数字数据的Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 6 &&
         result[0] === 1 && result[2] === 3 &&
         result[3] === 4 && result[5] === 6;
});

test('验证返回新Buffer而非原Buffer', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('data');
  const result = Buffer.concat([buf1, buf2]);
  return result !== buf1 && result !== buf2;
});

test('修改原Buffer不影响concat结果', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2]);
  buf1[0] = 72; // 修改为 'H'
  return result.toString() === 'helloworld';
});

test('修改concat结果不影响原Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2]);
  result[0] = 72; // 修改为 'H'
  return buf1.toString() === 'hello';
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
