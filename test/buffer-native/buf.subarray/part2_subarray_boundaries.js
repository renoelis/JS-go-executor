// buf.subarray() - Boundary Cases
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, passed: pass, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, status: '❌', error: e.message, stack: e.stack });
  }
}

// 边界值测试
test('start = 0, end = length - 等同于无参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, 5);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1 || sub[4] !== 5) return false;
  console.log('✅ start=0, end=length 正确处理');
  return true;
});

test('start 超出 buffer 长度 - 返回空视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(10);
  if (sub.length !== 0) return false;
  console.log('✅ start 超出长度返回空视图');
  return true;
});

test('end 超出 buffer 长度 - 截取到末尾', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 100);
  if (sub.length !== 3) return false;
  if (sub[0] !== 3 || sub[2] !== 5) return false;
  console.log('✅ end 超出长度截取到末尾');
  return true;
});

test('start 为极大负数 - 视为从 0 开始', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-1000);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1 || sub[4] !== 5) return false;
  console.log('✅ 极大负数 start 从 0 开始');
  return true;
});

test('end 为极大负数 - 返回空视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, -1000);
  if (sub.length !== 0) return false;
  console.log('✅ 极大负数 end 返回空视图');
  return true;
});

test('start = -1 - 获取最后一个元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-1);
  if (sub.length !== 1) return false;
  if (sub[0] !== 5) return false;
  console.log('✅ start=-1 获取最后一个元素');
  return true;
});

test('end = -1 - 截取到倒数第二个', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, -1);
  if (sub.length !== 4) return false;
  if (sub[3] !== 4) return false;
  console.log('✅ end=-1 截取到倒数第二个');
  return true;
});

test('start = length - 返回空视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(5);
  if (sub.length !== 0) return false;
  console.log('✅ start=length 返回空视图');
  return true;
});

test('start = length + 1 - 返回空视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(6);
  if (sub.length !== 0) return false;
  console.log('✅ start>length 返回空视图');
  return true;
});

test('start 和 end 都为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, 0);
  if (sub.length !== 0) return false;
  console.log('✅ start=end=0 返回空视图');
  return true;
});

test('start 和 end 都等于 length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(5, 5);
  if (sub.length !== 0) return false;
  console.log('✅ start=end=length 返回空视图');
  return true;
});

test('start = 1, end = length - 1', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  if (sub.length !== 3) return false;
  if (sub[0] !== 2 || sub[2] !== 4) return false;
  console.log('✅ 中间部分截取正确');
  return true;
});

test('负数索引边界 - start=-length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-5);
  if (sub.length !== 5) return false;
  if (sub[0] !== 1 || sub[4] !== 5) return false;
  console.log('✅ start=-length 获取完整视图');
  return true;
});

test('负数索引边界 - end=-length', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, -5);
  if (sub.length !== 0) return false;
  console.log('✅ end=-length 返回空视图');
  return true;
});

test('大 buffer 边界测试', () => {
  const buf = Buffer.alloc(10000);
  buf[0] = 1;
  buf[9999] = 255;
  const sub = buf.subarray(0, 10000);
  if (sub.length !== 10000) return false;
  if (sub[0] !== 1 || sub[9999] !== 255) return false;
  console.log('✅ 大 buffer 边界正确');
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
