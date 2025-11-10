// buf.subarray() - Basic Functionality Tests
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

// 基本功能测试
test('无参数调用 - 返回整个 buffer 的视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray();
  if (sub.length !== 5) return false;
  if (sub[0] !== 1 || sub[4] !== 5) return false;
  // 验证共享内存
  sub[0] = 99;
  if (buf[0] !== 99) return false;
  console.log('✅ 无参数调用正确返回共享内存视图');
  return true;
});

test('只传 start 参数 - 从 start 到末尾', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2);
  if (sub.length !== 3) return false;
  if (sub[0] !== 3 || sub[2] !== 5) return false;
  // 验证共享内存
  sub[0] = 88;
  if (buf[2] !== 88) return false;
  console.log('✅ start 参数正确截取');
  return true;
});

test('传 start 和 end 参数 - 返回指定范围', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  if (sub.length !== 3) return false;
  if (sub[0] !== 2 || sub[2] !== 4) return false;
  console.log('✅ start 和 end 参数正确截取');
  return true;
});

test('start 为负数 - 从末尾计算', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-3);
  if (sub.length !== 3) return false;
  if (sub[0] !== 3 || sub[2] !== 5) return false;
  console.log('✅ 负数 start 正确从末尾计算');
  return true;
});

test('end 为负数 - 从末尾计算', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, -1);
  if (sub.length !== 3) return false;
  if (sub[0] !== 2 || sub[2] !== 4) return false;
  console.log('✅ 负数 end 正确从末尾计算');
  return true;
});

test('start 和 end 都为负数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-4, -1);
  if (sub.length !== 3) return false;
  if (sub[0] !== 2 || sub[2] !== 4) return false;
  console.log('✅ 双负数参数正确处理');
  return true;
});

test('start === end - 返回空视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 2);
  if (sub.length !== 0) return false;
  console.log('✅ start === end 返回空视图');
  return true;
});

test('start > end - 返回空视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(3, 1);
  if (sub.length !== 0) return false;
  console.log('✅ start > end 返回空视图');
  return true;
});

test('空 buffer 调用 subarray', () => {
  const buf = Buffer.alloc(0);
  const sub = buf.subarray();
  if (sub.length !== 0) return false;
  console.log('✅ 空 buffer 返回空视图');
  return true;
});

test('长度为 1 的 buffer', () => {
  const buf = Buffer.from([42]);
  const sub = buf.subarray();
  if (sub.length !== 1 || sub[0] !== 42) return false;
  console.log('✅ 长度为 1 的 buffer 正确处理');
  return true;
});

test('验证返回的是 Buffer 实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray();
  if (!Buffer.isBuffer(sub)) return false;
  console.log('✅ 返回值是 Buffer 实例');
  return true;
});

test('多次 subarray 共享同一内存', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub1 = buf.subarray(1, 4);
  const sub2 = buf.subarray(1, 4);
  sub1[0] = 99;
  if (sub2[0] !== 99 || buf[1] !== 99) return false;
  console.log('✅ 多次 subarray 共享内存');
  return true;
});

test('嵌套 subarray - 仍然共享原始内存', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub1 = buf.subarray(1, 7);
  const sub2 = sub1.subarray(1, 5);
  if (sub2.length !== 4) return false;
  if (sub2[0] !== 3) return false;
  sub2[0] = 88;
  if (buf[2] !== 88) return false;
  console.log('✅ 嵌套 subarray 共享原始内存');
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
