// Buffer.isBuffer() - 性能和压力测试
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

// 大量调用测试
test('大量快速调用不影响结果', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 10000; i++) {
    if (Buffer.isBuffer(buf) !== true) return false;
  }
  return true;
});

test('大量 false 结果调用', () => {
  const notBuffer = 'not a buffer';
  for (let i = 0; i < 10000; i++) {
    if (Buffer.isBuffer(notBuffer) !== false) return false;
  }
  return true;
});

test('交替类型大量调用', () => {
  const buf = Buffer.alloc(10);
  const arr = new Uint8Array(10);
  for (let i = 0; i < 5000; i++) {
    if (i % 2 === 0) {
      if (Buffer.isBuffer(buf) !== true) return false;
    } else {
      if (Buffer.isBuffer(arr) !== false) return false;
    }
  }
  return true;
});

// 大型 Buffer 测试
test('巨大 Buffer 检测 (10MB)', () => {
  try {
    const bigBuf = Buffer.alloc(10 * 1024 * 1024); // 10MB
    return Buffer.isBuffer(bigBuf) === true;
  } catch (e) {
    // 内存不足时跳过
    return true;
  }
});

test('空 Buffer 大量创建检测', () => {
  for (let i = 0; i < 1000; i++) {
    const buf = Buffer.alloc(0);
    if (Buffer.isBuffer(buf) !== true) return false;
  }
  return true;
});

test('小 Buffer 大量创建检测', () => {
  for (let i = 0; i < 1000; i++) {
    const buf = Buffer.alloc(1);
    if (Buffer.isBuffer(buf) !== true) return false;
  }
  return true;
});

// 复杂对象数组测试
test('大量复杂对象检测', () => {
  const objects = [];
  for (let i = 0; i < 1000; i++) {
    objects.push({
      id: i,
      data: new Array(100).fill(i),
      nested: { value: i }
    });
  }
  
  for (const obj of objects) {
    if (Buffer.isBuffer(obj) !== false) return false;
  }
  return true;
});

test('大量 TypedArray 检测', () => {
  const arrays = [
    () => new Uint8Array(100),
    () => new Int8Array(100),
    () => new Uint16Array(50),
    () => new Int16Array(50),
    () => new Uint32Array(25),
    () => new Int32Array(25),
    () => new Float32Array(25),
    () => new Float64Array(12)
  ];
  
  for (let i = 0; i < 500; i++) {
    const createArray = arrays[i % arrays.length];
    const arr = createArray();
    if (Buffer.isBuffer(arr) !== false) return false;
  }
  return true;
});

// 内存压力测试
test('Buffer 和非 Buffer 混合压力测试', () => {
  const buffers = [];
  const nonBuffers = [];
  
  // 创建测试对象
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.alloc(1000));
    nonBuffers.push(new Uint8Array(1000));
  }
  
  // 测试检测正确性
  for (const buf of buffers) {
    if (Buffer.isBuffer(buf) !== true) return false;
  }
  
  for (const arr of nonBuffers) {
    if (Buffer.isBuffer(arr) !== false) return false;
  }
  
  return true;
});

// 递归调用测试
test('间接递归调用测试', () => {
  function checkBuffer(obj, depth = 0) {
    if (depth > 100) return true;
    const result = Buffer.isBuffer(obj);
    if (depth < 100) {
      return checkBuffer(obj, depth + 1) && result === Buffer.isBuffer(obj);
    }
    return result === Buffer.isBuffer(obj);
  }
  
  const buf = Buffer.alloc(10);
  return checkBuffer(buf) === true;
});

// 时间性能测试（简单基准）
test('性能基准：Buffer 检测时间合理', () => {
  const buf = Buffer.alloc(1000);
  const iterations = 10000;
  
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    Buffer.isBuffer(buf);
  }
  const end = Date.now();
  
  const timePerCall = (end - start) / iterations;
  // 每次调用应该在合理时间内（小于1毫秒）
  return timePerCall < 1;
});

test('性能基准：非 Buffer 检测时间合理', () => {
  const arr = new Uint8Array(1000);
  const iterations = 10000;
  
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    Buffer.isBuffer(arr);
  }
  const end = Date.now();
  
  const timePerCall = (end - start) / iterations;
  // 每次调用应该在合理时间内（小于1毫秒）
  return timePerCall < 1;
});

// 内存泄漏防护测试
test('临时对象不影响检测', () => {
  for (let i = 0; i < 1000; i++) {
    const temp = { temporary: Buffer.alloc(100) };
    if (Buffer.isBuffer(temp) !== false) return false;
    if (Buffer.isBuffer(temp.temporary) !== true) return false;
  }
  return true;
});

test('嵌套临时 Buffer 检测', () => {
  for (let i = 0; i < 100; i++) {
    const nested = {
      level1: {
        level2: {
          buffer: Buffer.alloc(10)
        }
      }
    };
    if (Buffer.isBuffer(nested.level1.level2.buffer) !== true) return false;
  }
  return true;
});

// 并发模拟测试
test('模拟并发调用一致性', () => {
  const buf = Buffer.alloc(100);
  const results = [];
  
  // 模拟并发场景
  for (let i = 0; i < 1000; i++) {
    results.push(Buffer.isBuffer(buf));
  }
  
  // 检查所有结果都是 true
  return results.every(r => r === true);
});

// 极限情况恢复测试
test('异常后函数仍然正常工作', () => {
  try {
    // 尝试一些可能导致异常的操作
    Buffer.isBuffer(null);
    Buffer.isBuffer(undefined);
    Buffer.isBuffer({});
    throw new Error('Test error');
  } catch (e) {
    // 异常后函数应该仍然正常
    const buf = Buffer.alloc(10);
    return Buffer.isBuffer(buf) === true;
  }
});

// 垃圾回收友好测试
test('大量临时对象后检测仍正确', () => {
  // 创建大量临时对象
  for (let i = 0; i < 1000; i++) {
    const temp = Buffer.alloc(1000);
    if (i % 100 === 0) {
      // 定期检查
      if (Buffer.isBuffer(temp) !== true) return false;
    }
  }
  
  // 最终检查
  const finalBuf = Buffer.alloc(100);
  return Buffer.isBuffer(finalBuf) === true;
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
