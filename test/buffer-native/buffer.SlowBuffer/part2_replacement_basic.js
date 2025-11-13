// Buffer.allocUnsafeSlow - Basic Functionality Tests
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

// 基本创建功能
test('创建长度为 0 的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf instanceof Buffer && buf.length === 0;
});

test('创建长度为 1 的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf instanceof Buffer && buf.length === 1;
});

test('创建长度为 10 的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer && buf.length === 10;
});

test('创建长度为 1024 的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(1024);
  return buf instanceof Buffer && buf.length === 1024;
});

test('创建长度为 4096 的 Buffer（常见页大小）', () => {
  const buf = Buffer.allocUnsafeSlow(4096);
  return buf instanceof Buffer && buf.length === 4096;
});

test('创建较大 Buffer（8KB）', () => {
  const buf = Buffer.allocUnsafeSlow(8192);
  return buf instanceof Buffer && buf.length === 8192;
});

test('创建较大 Buffer（1MB）', () => {
  const buf = Buffer.allocUnsafeSlow(1024 * 1024);
  return buf instanceof Buffer && buf.length === 1024 * 1024;
});

// Buffer 实例验证
test('返回的对象是 Buffer 实例', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer;
});

test('返回的对象是 Uint8Array 实例', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Uint8Array;
});

test('返回的对象具有 Buffer 的方法', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return typeof buf.write === 'function' &&
         typeof buf.toString === 'function' &&
         typeof buf.slice === 'function';
});

// 基本读写操作
test('可以写入单个字节', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 65;
  return buf[0] === 65;
});

test('可以写入多个字节', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 65;
  buf[1] = 66;
  buf[2] = 67;
  return buf[0] === 65 && buf[1] === 66 && buf[2] === 67;
});

test('可以使用 write 方法写入字符串', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const written = buf.write('hello');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('可以使用 fill 方法填充', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(0);
  return buf[0] === 0 && buf[1] === 0 && buf[4] === 0;
});

test('可以使用 toString 读取内容', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.write('test');
  return typeof buf.toString() === 'string';
});

// 边界值
test('创建长度为极大值的 Buffer 应该抛出错误或内存错误', () => {
  try {
    const { constants } = require('buffer');
    const buf = Buffer.allocUnsafeSlow(constants.MAX_LENGTH);
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('创建接近最大长度的 Buffer', () => {
  const size = 100 * 1024 * 1024; // 100MB
  try {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  } catch (e) {
    return true;
  }
});

// 返回值特性
test('每次调用返回新的 Buffer 实例', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  return buf1 !== buf2;
});

test('length 属性准确反映分配的大小', () => {
  const sizes = [0, 1, 10, 100, 1000];
  return sizes.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  });
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
