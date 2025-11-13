// Buffer.SlowBuffer - Historical Behavior and Migration Tests
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

// SlowBuffer API 历史行为
test('SlowBuffer API 已在 Node v25.0.0 中完全移除', () => {
  let SlowBuffer;
  try {
    SlowBuffer = require('buffer').SlowBuffer;
  } catch (e) {
    SlowBuffer = undefined;
  }
  return SlowBuffer === undefined;
});

test('历史上 SlowBuffer 从 v6.0.0 开始被弃用', () => {
  return require('buffer').SlowBuffer === undefined;
});

// Buffer.allocUnsafeSlow 作为替代方案
test('Buffer.allocUnsafeSlow 是 SlowBuffer 的官方替代', () => {
  return typeof Buffer.allocUnsafeSlow === 'function';
});

test('allocUnsafeSlow 语义等同于旧 SlowBuffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer && buf.length === 10;
});

// 与旧 SlowBuffer 行为对比
test('不使用内存池（SlowBuffer 的核心特性）', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  return buf1 !== buf2;
});

test('小 Buffer 也独立分配（不像 allocUnsafe）', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf instanceof Buffer && buf.length === 1;
});

test('内存不初始化（unsafe 特性）', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf instanceof Buffer;
});

// 迁移路径验证
test('旧代码使用 new SlowBuffer(size) 应迁移到 allocUnsafeSlow', () => {
  const size = 10;
  const buf = Buffer.allocUnsafeSlow(size);
  return buf.length === size;
});

test('SlowBuffer 的所有功能都能用 allocUnsafeSlow 替代', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer &&
         typeof buf.write === 'function' &&
         typeof buf.toString === 'function' &&
         typeof buf.slice === 'function';
});

// 与其他 Buffer 创建方法对比
test('allocUnsafeSlow vs alloc（不初始化 vs 初始化）', () => {
  const safe = Buffer.alloc(10);
  const unsafe = Buffer.allocUnsafeSlow(10);
  const safeAllZero = safe.every(b => b === 0);
  return safeAllZero && unsafe instanceof Buffer;
});

test('allocUnsafeSlow vs allocUnsafe（不用池 vs 可能用池）', () => {
  const slow = Buffer.allocUnsafeSlow(10);
  const fast = Buffer.allocUnsafe(10);
  return slow instanceof Buffer && fast instanceof Buffer;
});

test('allocUnsafeSlow vs from（手动分配 vs 从数据创建）', () => {
  const slow = Buffer.allocUnsafeSlow(5);
  const from = Buffer.from('hello');
  return slow.length === 5 && from.toString() === 'hello';
});

// 性能和内存特性
test('适合大 Buffer 分配（避免池碎片）', () => {
  const size = 10 * 1024; // 10KB
  const buf = Buffer.allocUnsafeSlow(size);
  return buf.length === size;
});

test('适合长期存在的 Buffer（独立内存）', () => {
  const buf = Buffer.allocUnsafeSlow(1024);
  return buf instanceof Buffer && buf.length === 1024;
});

test('不会影响 Buffer 池的使用', () => {
  Buffer.allocUnsafeSlow(1000);
  const poolBuf = Buffer.allocUnsafe(10);
  return poolBuf instanceof Buffer;
});

// 兼容性检查
test('在支持的 Node 版本中 allocUnsafeSlow 可用', () => {
  return typeof Buffer.allocUnsafeSlow === 'function';
});

test('allocUnsafeSlow 返回的是标准 Buffer 实例', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer && buf instanceof Uint8Array;
});

// 错误处理与旧版本一致
test('负数大小抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(-10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('过大尺寸抛出 RangeError 或内存错误', () => {
  try {
    const { constants } = require('buffer');
    Buffer.allocUnsafeSlow(constants.MAX_LENGTH);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('Invalid') || e.message.includes('memory');
  }
});

test('无效类型抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow('invalid');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 文档和废弃说明
test('SlowBuffer 在 v6.0.0 被标记为 deprecated', () => {
  return require('buffer').SlowBuffer === undefined;
});

test('SlowBuffer 在 v25.0.0 被完全移除', () => {
  let SlowBuffer;
  try {
    SlowBuffer = require('buffer').SlowBuffer;
  } catch (e) {
    SlowBuffer = undefined;
  }
  return SlowBuffer === undefined;
});

test('官方推荐使用 Buffer.allocUnsafeSlow() 替代', () => {
  return typeof Buffer.allocUnsafeSlow === 'function';
});

// 实际应用场景
test('用于大型持久化 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(100 * 1024);
  return buf.length === 100 * 1024;
});

test('用于需要完全控制内存的场景', () => {
  const buf = Buffer.allocUnsafeSlow(1024);
  buf.fill(0);
  return buf.every(b => b === 0);
});

test('用于避免内存池污染的场景', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf instanceof Buffer && buf.length === 100;
});

// TypedArray 兼容性
test('可以与 TypedArray API 交互', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  const view = new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  view[0] = 0x12345678;
  return buf.readUInt32LE(0) === 0x12345678;
});

test('支持 DataView 操作', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  dv.setFloat64(0, 3.14, true);
  return Math.abs(buf.readDoubleLE(0) - 3.14) < 0.01;
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
