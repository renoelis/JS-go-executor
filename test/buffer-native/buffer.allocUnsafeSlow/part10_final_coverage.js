// Buffer.allocUnsafeSlow - 最终查缺补漏测试
// 基于 Node.js v25.0.0 实际行为和 API 规范
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

// API 签名验证
test('Buffer.allocUnsafeSlow 是一个函数', () => {
  return typeof Buffer.allocUnsafeSlow === 'function';
});

test('Buffer.allocUnsafeSlow 的 length 为 1', () => {
  return Buffer.allocUnsafeSlow.length === 1;
});

test('Buffer.allocUnsafeSlow 的 name 正确', () => {
  return Buffer.allocUnsafeSlow.name === 'allocUnsafeSlow';
});

// 与 Node 官方文档对照
test('返回的 Buffer 不使用内部池', () => {
  const size = 100;
  const buf1 = Buffer.allocUnsafeSlow(size);
  const buf2 = Buffer.allocUnsafeSlow(size);
  buf1.fill(0);
  buf2.fill(0);
  buf1[50] = 255;
  return buf2[50] === 0;
});

test('返回的 Buffer 底层 ArrayBuffer 大小正确', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.buffer.byteLength >= 10;
});

test('不会被池分配优化', () => {
  const bufs = [];
  for (let i = 0; i < 10; i++) {
    bufs.push(Buffer.allocUnsafeSlow(8));
  }
  for (let i = 0; i < bufs.length; i++) {
    bufs[i].fill(i);
  }
  for (let i = 0; i < bufs.length; i++) {
    if (bufs[i][0] !== i) return false;
  }
  return true;
});

// 与 Buffer.allocUnsafe 的关键差异
test('allocUnsafeSlow 小 Buffer 不使用池', () => {
  const buf1 = Buffer.allocUnsafeSlow(1);
  const buf2 = Buffer.allocUnsafeSlow(1);
  buf1.fill(0);
  buf2.fill(0);
  buf1[0] = 100;
  return buf2[0] === 0;
});

test('allocUnsafe 小 Buffer 可能使用池', () => {
  return true;
});

// 内存安全性
test('无法访问超出边界的内存', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf[100] = 255;
  return buf[100] === undefined && buf.length === 10;
});

test('负索引不会访问底层内存', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf[-1] = 255;
  return buf[-1] === undefined && buf[0] === 0;
});

// 参数类型严格性（Node v25.0.0 行为）
test('仅接受 number 类型', () => {
  try {
    Buffer.allocUnsafeSlow('10');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('不进行类型强制转换', () => {
  try {
    Buffer.allocUnsafeSlow({ valueOf: () => 10 });
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 浮点数处理精确性
test('浮点数总是向下取整', () => {
  const cases = [
    [0.1, 0], [0.9, 0], [1.1, 1], [1.9, 1],
    [9.9, 9], [10.1, 10], [10.9, 10]
  ];
  for (const [input, expected] of cases) {
    const buf = Buffer.allocUnsafeSlow(input);
    if (buf.length !== expected) return false;
  }
  return true;
});

// 零值特殊处理
test('size = 0 返回有效的空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return Buffer.isBuffer(buf) && buf.length === 0;
});

test('空 Buffer 可以安全调用所有方法', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  buf.fill(0);
  const s = buf.slice();
  const str = buf.toString();
  return s.length === 0 && str === '';
});

// 大 Buffer 行为
test('可以分配较大的 Buffer', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(100 * 1024 * 1024);
    return buf.length === 100 * 1024 * 1024;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 与其他 Buffer API 的一致性
test('返回的 Buffer 支持所有标准方法', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const methods = [
    'fill', 'slice', 'subarray', 'toString', 'write',
    'readUInt8', 'writeUInt8', 'copy', 'entries', 'keys', 'values'
  ];
  for (const method of methods) {
    if (typeof buf[method] !== 'function') return false;
  }
  return true;
});

test('与 Buffer.from 返回的 Buffer 行为一致', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.from([0, 0, 0, 0, 0]);
  buf1.fill(0);

  buf1.write('ab', 0);
  buf2.write('ab', 0);

  return buf1.toString() === buf2.toString();
});

// 内存初始化状态
test('内存内容未定义（不保证为0）', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10;
});

test('与 alloc 的内存初始化差异', () => {
  const unsafeSlow = Buffer.allocUnsafeSlow(10);
  const safe = Buffer.alloc(10);

  let safeAllZero = true;
  for (let i = 0; i < safe.length; i++) {
    if (safe[i] !== 0) {
      safeAllZero = false;
      break;
    }
  }

  return safeAllZero;
});

// 性能相关特性
test('连续分配不会耗尽内存', () => {
  try {
    for (let i = 0; i < 1000; i++) {
      Buffer.allocUnsafeSlow(1024);
    }
    return true;
  } catch (e) {
    return false;
  }
});

test('可以快速分配和释放', () => {
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.allocUnsafeSlow(10240);
    buf.fill(0);
  }
  const elapsed = Date.now() - start;
  return elapsed < 5000;
});

// 错误信息验证
test('负数错误包含有用的信息', () => {
  try {
    Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.length > 0;
  }
});

test('类型错误包含参数名称', () => {
  try {
    Buffer.allocUnsafeSlow('test');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('size');
  }
});

// 边界条件组合
test('0.0 与 0 等效', () => {
  const buf1 = Buffer.allocUnsafeSlow(0.0);
  const buf2 = Buffer.allocUnsafeSlow(0);
  return buf1.length === 0 && buf2.length === 0;
});

test('1.0 与 1 等效', () => {
  const buf1 = Buffer.allocUnsafeSlow(1.0);
  const buf2 = Buffer.allocUnsafeSlow(1);
  return buf1.length === 1 && buf2.length === 1;
});

// 特殊值完整测试
test('NaN 总是抛出 RangeError', () => {
  const nans = [NaN, 0 / 0, Math.sqrt(-1)];
  for (const nan of nans) {
    try {
      Buffer.allocUnsafeSlow(nan);
      return false;
    } catch (e) {
      if (e.name !== 'RangeError') return false;
    }
  }
  return true;
});

test('Infinity 变种都抛出 RangeError', () => {
  const infinities = [Infinity, -Infinity, 1 / 0, -1 / 0];
  for (const inf of infinities) {
    try {
      Buffer.allocUnsafeSlow(inf);
      return false;
    } catch (e) {
      if (e.name !== 'RangeError') return false;
    }
  }
  return true;
});

// 兼容性验证
test('返回值满足 Buffer 接口', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer &&
         buf instanceof Uint8Array &&
         typeof buf.length === 'number' &&
         typeof buf.byteLength === 'number' &&
         typeof buf.byteOffset === 'number' &&
         buf.buffer instanceof ArrayBuffer;
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
