// Buffer.allocUnsafeSlow - 深度边界条件和现代JavaScript特性测试
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

// 数值边界精确测试
test('最大安全整数边界', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('零值精确测试', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf instanceof Buffer && buf.length === 0;
});

test('小数精确截断测试', () => {
  const sizes = [1.1, 1.5, 1.9, 2.0, 2.1];
  return sizes.every(size => {
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === Math.floor(size);
  });
});

test('科学计数法数值', () => {
  const buf = Buffer.allocUnsafeSlow(1e2);
  return buf instanceof Buffer && buf.length === 100;
});

test('十六进制数值', () => {
  const buf = Buffer.allocUnsafeSlow(0x10);
  return buf instanceof Buffer && buf.length === 16;
});

test('八进制数值', () => {
  const buf = Buffer.allocUnsafeSlow(0o10);
  return buf instanceof Buffer && buf.length === 8;
});

test('二进制数值', () => {
  const buf = Buffer.allocUnsafeSlow(0b1010);
  return buf instanceof Buffer && buf.length === 10;
});

// 现代JavaScript特性兼容性
test('与 WeakMap 兼容性', () => {
  const wm = new WeakMap();
  const buf = Buffer.allocUnsafeSlow(10);
  wm.set(buf, 'test');
  return wm.get(buf) === 'test';
});

test('与 WeakSet 兼容性', () => {
  const ws = new WeakSet();
  const buf = Buffer.allocUnsafeSlow(10);
  ws.add(buf);
  return ws.has(buf);
});

test('与 Map 兼容性', () => {
  const map = new Map();
  const buf = Buffer.allocUnsafeSlow(10);
  map.set(buf, 'value');
  return map.get(buf) === 'value';
});

test('与 Set 兼容性', () => {
  const set = new Set();
  const buf = Buffer.allocUnsafeSlow(10);
  set.add(buf);
  return set.has(buf);
});

// Promise 和异步兼容性
test('在 Promise 中创建和使用', () => {
  return Promise.resolve().then(() => {
    const buf = Buffer.allocUnsafeSlow(10);
    return buf instanceof Buffer && buf.length === 10;
  });
});

test('与 async/await 兼容', async () => {
  const buf = Buffer.allocUnsafeSlow(15);
  await Promise.resolve();
  return buf instanceof Buffer && buf.length === 15;
});

test('在 Promise.all 中并发创建', () => {
  const promises = Array(5).fill(0).map((_, i) => 
    Promise.resolve(Buffer.allocUnsafeSlow(i + 1))
  );
  return Promise.all(promises).then(buffers => 
    buffers.every((buf, i) => buf.length === i + 1)
  );
});

// 生成器兼容性
test('在生成器函数中使用', () => {
  function* bufferGenerator() {
    for (let i = 1; i <= 3; i++) {
      yield Buffer.allocUnsafeSlow(i);
    }
  }
  const gen = bufferGenerator();
  const buf1 = gen.next().value;
  const buf2 = gen.next().value;
  return buf1.length === 1 && buf2.length === 2;
});

// 迭代器兼容性
test('与自定义迭代器兼容', () => {
  const bufferIterable = {
    [Symbol.iterator]() {
      let count = 0;
      return {
        next() {
          if (count < 3) {
            return { value: Buffer.allocUnsafeSlow(++count), done: false };
          }
          return { done: true };
        }
      };
    }
  };
  
  const buffers = [...bufferIterable];
  return buffers.length === 3 && buffers[2].length === 3;
});

// 错误边界精确性
test('负零处理', () => {
  const buf = Buffer.allocUnsafeSlow(-0);
  return buf instanceof Buffer && buf.length === 0;
});

test('非常小的正数', () => {
  const buf = Buffer.allocUnsafeSlow(Number.EPSILON);
  return buf instanceof Buffer && buf.length === 0;
});

test('非常小的负数抛出错误', () => {
  try {
    Buffer.allocUnsafeSlow(-Number.EPSILON);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

// 内存对齐测试
test('2的幂次大小 - 1KB', () => {
  const buf = Buffer.allocUnsafeSlow(1024);
  return buf instanceof Buffer && buf.length === 1024;
});

test('2的幂次大小 - 4KB', () => {
  const buf = Buffer.allocUnsafeSlow(4096);
  return buf instanceof Buffer && buf.length === 4096;
});

test('非对齐大小', () => {
  const buf = Buffer.allocUnsafeSlow(1023);
  return buf instanceof Buffer && buf.length === 1023;
});

// Unicode 和编码相关边界
test('创建后写入Unicode字符', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  const written = buf.write('你好', 0, 'utf8');
  return written === 6 && buf.toString('utf8', 0, 6) === '你好';
});

test('创建后写入Emoji', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  const written = buf.write('🚀', 0, 'utf8');
  return written === 4;
});

// 递归和深度嵌套
test('在递归函数中创建', () => {
  function createBufferRecursively(depth, size) {
    if (depth === 0) return 0;
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length + createBufferRecursively(depth - 1, size);
  }
  
  const totalLength = createBufferRecursively(3, 10);
  return totalLength === 30;
});

test('深度嵌套对象中的Buffer', () => {
  const deep = {
    level1: {
      level2: {
        level3: {
          buffer: Buffer.allocUnsafeSlow(10)
        }
      }
    }
  };
  return deep.level1.level2.level3.buffer.length === 10;
});

// 闭包和作用域
test('在闭包中创建并返回', () => {
  function createBufferClosure(size) {
    return function() {
      return Buffer.allocUnsafeSlow(size);
    };
  }
  
  const factory = createBufferClosure(20);
  const buf = factory();
  return buf instanceof Buffer && buf.length === 20;
});

test('多层闭包中访问', () => {
  function outer(size) {
    return function middle() {
      return function inner() {
        return Buffer.allocUnsafeSlow(size);
      };
    };
  }
  
  const buf = outer(7)()();
  return buf instanceof Buffer && buf.length === 7;
});

// 严格模式边界
test('严格模式下的错误处理', () => {
  "use strict";
  try {
    Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
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
