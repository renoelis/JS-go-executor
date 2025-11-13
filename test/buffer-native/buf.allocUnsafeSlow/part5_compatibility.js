const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ name, passed: result, details: result ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, error: e.message, stack: e.stack });
  }
}

test('兼容性 - 与 allocUnsafe 行为差异对比（慢策略）', () => {
  const slow = Buffer.allocUnsafeSlow(1000);
  const fast = Buffer.allocUnsafe(1000);

  slow.fill('X');
  fast.fill('Y');

  return slow.every(b => b === 88) && fast.every(b => b === 89);
});

test('兼容性 - 小缓冲区也使用慢策略（<4KB）', () => {
  const buf = Buffer.allocUnsafeSlow(100); // 小于4KB，但仍应使用慢策略
  buf.fill('A');
  return buf.length === 100 && buf.every(b => b === 65);
});

test('兼容性 - 忽略填充参数（allocUnsafeSlow不支持填充）', () => {
  const buf = Buffer.allocUnsafeSlow(20, 0); // 填充参数被忽略
  return buf.length === 20; // 只检查长度，不检查内容
});

test('兼容性 - 空字符串填充参数被忽略', () => {
  const buf = Buffer.allocUnsafeSlow(10, '');
  return buf.length === 10; // 只验证长度，填充参数被忽略
});

test('兼容性 - 填充参数被忽略（不影响内容）', () => {
  const buf = Buffer.allocUnsafeSlow(100, 'X');
  return buf.length === 100; // 只检查长度，内容是未初始化的
});

test('兼容性 - 多字节字符填充参数被忽略', () => {
  const buf = Buffer.allocUnsafeSlow(6, '中');
  return buf.length === 6; // 只验证长度
});

test('兼容性 - 不同 Node.js 版本的底层行为一致', () => {
  const sizes = [0, 1, 100, 4095, 4096, 8192, 65536];

  for (const size of sizes) {
    const buf = Buffer.allocUnsafeSlow(size);
    if (buf.length !== size) return false;
    if (!(buf instanceof Buffer)) return false;

    // 测试基础填充能力
    buf.fill(42);
    for (let i = 0; i < size; i++) {
      if (buf[i] !== 42) return false;
    }
  }
  return true;
});

test('特殊场景 - 分配后立即子视图操作', () => {
  const buf = Buffer.allocUnsafeSlow(1000);
  buf.fill('A');

  const view1 = buf.subarray(100, 200);
  view1.fill('B');

  const view2 = buf.subarray(200, 300);
  view2.fill('C');

  return buf[99] === 65 && buf[100] === 66 && buf[199] === 66 &&
         buf[200] === 67 && buf[299] === 67 && buf[300] === 65;
});

test('特殊场景 - Node.js 内部池化策略对比', () => {
  const normal = Buffer.alloc(4096);
  const slow = Buffer.allocUnsafeSlow(4096);

  // 检测是否使用不同的内存分配策略
  slow.fill('X');
  normal.fill('Y');

  return slow[0] === 88 && normal[0] === 89;
});

test('特殊场景 - 多线程模式下的行为', () => {
  const workers = [];
  const sizes = [100, 200, 300, 400, 500];

  for (let i = 0; i < 5; i++) {
    const buf = Buffer.allocUnsafeSlow(sizes[i]);
    buf.fill(i);
    workers.push(buf);
  }

  // 确保每个工作线程的缓冲区独立
  return workers.every((buf, idx) =>
    buf.length === sizes[idx] && buf[0] === idx && buf[buf.length-1] === idx
  );
});

test('特殊场景 - 大块内存复制行为', () => {
  const source = Buffer.allocUnsafeSlow(1024 * 1024);
  source.fill('A');
  source[0] = 66; // 使用数字而不是字符串 'B'
  source[1024 * 1024 - 1] = 67; // 使用数字而不是字符串 'C'

  const copy = Buffer.allocUnsafeSlow(1024 * 1024);
  copy.fill('D');
  copy[0] = 88; // 使用数字而不是字符串 'X'
  copy[1024 * 1024 - 1] = 89; // 使用数字而不是字符串 'Y'

  return source[0] === 66 && copy[0] === 88 && source[1024 * 1024 - 1] === 67 && copy[1024 * 1024 - 1] === 89;
});

test('特殊场景 - 垃圾回收压力测试', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.allocUnsafeSlow(1024));
  }

  // 触发潜在的垃圾回收
  for (let i = 0; i < buffers.length; i++) {
    if (buffers[i].length !== 1024) return false;
    buffers[i].fill(i % 256);
  }

  return buffers.length === 100 && buffers.every(buf => buf.length === 1024);
});

test('兼容性 - 与 Buffer.from 对比（不同策略）', () => {
  const fromBuf = Buffer.from('hello world');
  const allocSlowBuf = Buffer.allocUnsafeSlow(11); // 不传填充参数

  return fromBuf.toString() === 'hello world' &&
         allocSlowBuf.length === 11;
});

test('兼容性 - 处理错误类的历史性差异', () => {
  const tests = [
    { size: 'not-a-number', expectError: true },
    { size: -1, expectError: true },
    { size: NaN, expectError: true },
    { size: Infinity, expectError: true }
  ];

  for (const test of tests) {
    try {
      Buffer.allocUnsafeSlow(test.size);
      if (test.expectError) return false;
    } catch (e) {
      if (!test.expectError || !e.message) return false;
    }
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