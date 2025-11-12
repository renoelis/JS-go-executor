// Buffer.allocUnsafe() - Basic Tests
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
test('创建长度为0的Buffer', () => {
  const buf = Buffer.allocUnsafe(0);
  if (buf.length !== 0) throw new Error(`Expected length 0, got ${buf.length}`);
  if (!(buf instanceof Buffer)) throw new Error('Expected Buffer instance');
  console.log('✅ 创建长度为0的Buffer');
  return true;
});

test('创建长度为1的Buffer', () => {
  const buf = Buffer.allocUnsafe(1);
  if (buf.length !== 1) throw new Error(`Expected length 1, got ${buf.length}`);
  if (!(buf instanceof Buffer)) throw new Error('Expected Buffer instance');
  console.log('✅ 创建长度为1的Buffer');
  return true;
});

test('创建长度为10的Buffer', () => {
  const buf = Buffer.allocUnsafe(10);
  if (buf.length !== 10) throw new Error(`Expected length 10, got ${buf.length}`);
  if (!(buf instanceof Buffer)) throw new Error('Expected Buffer instance');
  console.log('✅ 创建长度为10的Buffer');
  return true;
});

test('创建大Buffer (1000)', () => {
  const buf = Buffer.allocUnsafe(1000);
  if (buf.length !== 1000) throw new Error(`Expected length 1000, got ${buf.length}`);
  if (!(buf instanceof Buffer)) throw new Error('Expected Buffer instance');
  console.log('✅ 创建大Buffer (1000)');
  return true;
});

test('allocUnsafe返回的Buffer包含未初始化数据', () => {
  const buf = Buffer.allocUnsafe(10);
  // allocUnsafe 返回的Buffer可能包含任意数据，我们只需要验证它是Buffer且长度正确
  if (buf.length !== 10) throw new Error(`Expected length 10, got ${buf.length}`);
  if (!(buf instanceof Buffer)) throw new Error('Expected Buffer instance');
  console.log('✅ allocUnsafe返回的Buffer包含未初始化数据');
  return true;
});

test('多次调用allocUnsafe创建不同Buffer', () => {
  const buf1 = Buffer.allocUnsafe(5);
  const buf2 = Buffer.allocUnsafe(5);
  if (buf1.length !== 5) throw new Error(`Expected buf1 length 5, got ${buf1.length}`);
  if (buf2.length !== 5) throw new Error(`Expected buf2 length 5, got ${buf2.length}`);
  if (buf1 === buf2) throw new Error('Expected different Buffer instances');
  console.log('✅ 多次调用allocUnsafe创建不同Buffer');
  return true;
});

test('创建的Buffer可以正常读写', () => {
  const buf = Buffer.allocUnsafe(5);
  buf[0] = 65; // 'A'
  buf[1] = 66; // 'B'
  buf[2] = 67; // 'C'
  if (buf[0] !== 65) throw new Error(`Expected buf[0] = 65, got ${buf[0]}`);
  if (buf[1] !== 66) throw new Error(`Expected buf[1] = 66, got ${buf[1]}`);
  if (buf[2] !== 67) throw new Error(`Expected buf[2] = 67, got ${buf[2]}`);
  console.log('✅ 创建的Buffer可以正常读写');
  return true;
});

test('Buffer内容可以转换为字符串', () => {
  const buf = Buffer.allocUnsafe(3);
  buf[0] = 72; // 'H'
  buf[1] = 105; // 'i'
  buf[2] = 33; // '!'
  const str = buf.toString('utf8');
  if (str !== 'Hi!') throw new Error(`Expected 'Hi!', got '${str}'`);
  console.log('✅ Buffer内容可以转换为字符串');
  return true;
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