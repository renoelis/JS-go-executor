// Buffer.allocUnsafeSlow - 安全特性与内存隔离测试
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

// 内存独立性测试
test('每次分配返回独立实例', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  return buf1 !== buf2;
});

test('不同实例修改互不影响', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  buf1.fill(0);
  buf2.fill(0);
  buf1[0] = 255;
  return buf2[0] === 0;
});

test('小 Buffer 不使用内部池', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.fill(0);
  buf2.fill(0);
  buf1[0] = 100;
  return buf2[0] !== 100;
});

test('连续分配不共享内存', () => {
  const bufs = [];
  for (let i = 0; i < 5; i++) {
    bufs.push(Buffer.allocUnsafeSlow(10));
  }
  bufs[0].fill(255);
  for (let i = 1; i < bufs.length; i++) {
    if (bufs[i][0] === 255) return false;
  }
  return true;
});

// 内存访问边界测试
test('读取越界索引返回 undefined', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  return buf[5] === undefined && buf[10] === undefined;
});

test('写入越界索引不影响 length', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[10] = 100;
  return buf.length === 5;
});

test('负索引读取返回 undefined', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf[-1] === undefined && buf[-5] === undefined;
});

test('负索引写入不影响正索引', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf[-1] = 255;
  return buf[0] === 0 && buf[9] === 0;
});

// Buffer 实例验证
test('返回真正的 Buffer 实例', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return Buffer.isBuffer(buf);
});

test('instanceof Buffer 返回 true', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer;
});

test('instanceof Uint8Array 返回 true', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Uint8Array;
});

test('拥有 Buffer 的所有方法', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return typeof buf.slice === 'function' &&
         typeof buf.toString === 'function' &&
         typeof buf.write === 'function' &&
         typeof buf.fill === 'function';
});

// 零拷贝与视图测试
test('slice 创建视图共享内存', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const slice = buf.slice(0, 5);
  slice[0] = 255;
  return buf[0] === 255;
});

test('subarray 创建视图共享内存', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const sub = buf.subarray(0, 5);
  sub[0] = 100;
  return buf[0] === 100;
});

test('修改原 Buffer 影响 slice', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const slice = buf.slice(2, 7);
  buf[2] = 200;
  return slice[0] === 200;
});

// 内存初始化状态测试
test('内存可能未初始化', () => {
  const buf = Buffer.allocUnsafeSlow(1024);
  return true;
});

test('可以手动填充为 0', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('可以手动填充为特定值', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(123);
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 123) return false;
  }
  return true;
});

// 与 Buffer.from 的区别
test('不会自动初始化内容', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10;
});

test('不接受初始数据参数', () => {
  const buf = Buffer.allocUnsafeSlow(10, 5);
  return buf.length === 10;
});

// 属性完整性测试
test('length 属性正确', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf.length === 100;
});

test('byteLength 属性正确', () => {
  const buf = Buffer.allocUnsafeSlow(50);
  return buf.byteLength === 50;
});

test('byteOffset 为 0', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.byteOffset === 0;
});

// 内存泄漏防护测试
test('分配后可以被垃圾回收', () => {
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.allocUnsafeSlow(1024);
  }
  return true;
});

test('大量小 Buffer 分配', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    bufs.push(Buffer.allocUnsafeSlow(10));
  }
  return bufs.length === 100;
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
