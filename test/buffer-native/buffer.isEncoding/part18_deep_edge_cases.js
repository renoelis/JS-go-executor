// Buffer.isEncoding - part18: 深度边界情况与极端测试
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

// 内存和性能相关边界测试
test('超长字符串 (10MB) 非编码名', () => {
  const longStr = 'a'.repeat(10 * 1024 * 1024);
  const start = Date.now();
  const result = Buffer.isEncoding(longStr);
  const end = Date.now();
  // 应该快速返回 false，且在合理时间内完成 (< 1s)
  return result === false && (end - start) < 1000;
});

test('重复编码名的超长字符串', () => {
  const longStr = 'utf8'.repeat(1000000);
  return Buffer.isEncoding(longStr) === false;
});

test('高频调用稳定性 (10000次)', () => {
  let stable = true;
  for (let i = 0; i < 10000; i++) {
    if (Buffer.isEncoding('utf8') !== true) {
      stable = false;
      break;
    }
    if (i % 2 === 0 && Buffer.isEncoding('invalid') !== false) {
      stable = false;
      break;
    }
  }
  return stable;
});

// Unicode 和编码边界
test('BOM (Byte Order Mark) UTF8', () => {
  return Buffer.isEncoding('\uFEFFutf8') === false;
});

test('BOM (Byte Order Mark) UTF16', () => {
  return Buffer.isEncoding('\uFEFFutf16le') === false;
});

test('零宽字符混合编码名', () => {
  return Buffer.isEncoding('u\u200Btf8') === false;
});

test('零宽非连接符混合编码名', () => {
  return Buffer.isEncoding('utf\uFEFF8') === false;
});

test('右到左标记混合编码名', () => {
  return Buffer.isEncoding('u\u202Etf8') === false;
});

test('组合字符干扰编码名', () => {
  return Buffer.isEncoding('utf8\u0300') === false;
});

// 数字和特殊字符边界
test('科学计数法字符串', () => {
  return Buffer.isEncoding('1e10') === false;
});

test('十六进制字符串', () => {
  return Buffer.isEncoding('0xFF') === false;
});

test('八进制字符串', () => {
  return Buffer.isEncoding('0o777') === false;
});

test('二进制字符串', () => {
  return Buffer.isEncoding('0b1010') === false;
});

// 类型转换边界情况
test('包含数字的 BigInt', () => {
  return Buffer.isEncoding(BigInt('123')) === false;
});

test('极大的 BigInt', () => {
  return Buffer.isEncoding(BigInt('12345678901234567890')) === false;
});

test('负数 BigInt', () => {
  return Buffer.isEncoding(BigInt('-123')) === false;
});

// 代理对和高位字符
test('高位代理对字符', () => {
  return Buffer.isEncoding('\uD800\uDC00utf8') === false;
});

test('低位代理对字符', () => {
  return Buffer.isEncoding('utf8\uDC00\uD800') === false;
});

test('不完整的代理对', () => {
  return Buffer.isEncoding('\uD800utf8') === false;
});

test('表情符号混合编码名', () => {
  return Buffer.isEncoding('utf8👍') === false;
});

// 特殊空白字符
test('非断行空格', () => {
  return Buffer.isEncoding('\u00A0utf8') === false;
});

test('窄非断行空格', () => {
  return Buffer.isEncoding('utf8\u202F') === false;
});

test('数学空格', () => {
  return Buffer.isEncoding('\u2009utf8\u2009') === false;
});

test('蒙古文元音分隔符', () => {
  return Buffer.isEncoding('utf8\u180E') === false;
});

// 控制字符干扰
test('删除字符', () => {
  return Buffer.isEncoding('utf8\u007F') === false;
});

test('替换字符', () => {
  return Buffer.isEncoding('utf8\uFFFD') === false;
});

test('行分隔符', () => {
  return Buffer.isEncoding('utf8\u2028') === false;
});

test('段落分隔符', () => {
  return Buffer.isEncoding('utf8\u2029') === false;
});

// 类型包装对象
test('Boolean 对象 true', () => {
  return Buffer.isEncoding(new Boolean(true)) === false;
});

test('Boolean 对象 false', () => {
  return Buffer.isEncoding(new Boolean(false)) === false;
});

test('Number 对象', () => {
  return Buffer.isEncoding(new Number(123)) === false;
});

test('Number 对象 NaN', () => {
  return Buffer.isEncoding(new Number(NaN)) === false;
});

// 特殊构造对象
test('空 Set 对象', () => {
  return Buffer.isEncoding(new Set()) === false;
});

test('含字符串的 Set 对象', () => {
  const set = new Set(['utf8']);
  return Buffer.isEncoding(set) === false;
});

test('空 Map 对象', () => {
  return Buffer.isEncoding(new Map()) === false;
});

test('含编码名的 Map 对象', () => {
  const map = new Map([['encoding', 'utf8']]);
  return Buffer.isEncoding(map) === false;
});

test('WeakSet 对象', () => {
  return Buffer.isEncoding(new WeakSet()) === false;
});

test('WeakMap 对象', () => {
  return Buffer.isEncoding(new WeakMap()) === false;
});

// ArrayBuffer 和 TypedArray 边界
test('空 ArrayBuffer', () => {
  return Buffer.isEncoding(new ArrayBuffer(0)) === false;
});

test('含数据的 ArrayBuffer', () => {
  return Buffer.isEncoding(new ArrayBuffer(10)) === false;
});

test('Int8Array', () => {
  return Buffer.isEncoding(new Int8Array([117, 116, 102, 56])) === false; // 'utf8' in ASCII
});

test('Float32Array', () => {
  return Buffer.isEncoding(new Float32Array([1.0, 2.0])) === false;
});

test('DataView', () => {
  return Buffer.isEncoding(new DataView(new ArrayBuffer(10))) === false;
});

// Promise 和异步对象
test('resolved Promise', () => {
  const promise = Promise.resolve('utf8');
  // 避免unhandled rejection
  promise.catch(() => {});
  return Buffer.isEncoding(promise) === false;
});

test('rejected Promise', () => {
  const promise = Promise.reject('utf8');
  // 避免unhandled rejection
  promise.catch(() => {});
  return Buffer.isEncoding(promise) === false;
});

// 生成器和迭代器
test('生成器函数', () => {
  function* gen() { yield 'utf8'; }
  return Buffer.isEncoding(gen) === false;
});

test('生成器对象', () => {
  function* gen() { yield 'utf8'; }
  return Buffer.isEncoding(gen()) === false;
});

// 对象不会进行隐式toString转换
test('简单对象转字符串结果是编码名', () => {
  const obj = { toString: () => 'utf8' };
  return Buffer.isEncoding(obj) === false;
});

test('复杂嵌套对象转字符串', () => {
  const obj = {
    nested: {
      value: 'utf8'
    },
    toString: () => 'hex'
  };
  return Buffer.isEncoding(obj) === false;
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
