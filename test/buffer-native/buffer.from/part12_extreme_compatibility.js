// Buffer.from() - Part 12: Extreme and Compatibility Tests
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

// 极端字节值
test('极端值 - 数组全 0', () => {
  const buf = Buffer.from(new Array(100).fill(0));
  return buf.every(b => b === 0);
});

test('极端值 - 数组全 255', () => {
  const buf = Buffer.from(new Array(100).fill(255));
  return buf.every(b => b === 255);
});

test('极端值 - 数组交替 0 和 255', () => {
  const arr = [];
  for (let i = 0; i < 100; i++) {
    arr.push(i % 2 === 0 ? 0 : 255);
  }
  const buf = Buffer.from(arr);
  return buf[0] === 0 && buf[1] === 255 && buf[2] === 0;
});

test('极端值 - 递增序列 0-255 重复', () => {
  const arr = [];
  for (let i = 0; i < 1000; i++) {
    arr.push(i % 256);
  }
  const buf = Buffer.from(arr);
  return buf.length === 1000 && buf[0] === 0 && buf[256] === 0;
});

// 极端长度
test('极端长度 - 恰好 8192 字节（常见池大小）', () => {
  const buf = Buffer.from(new Array(8192).fill(42));
  return buf.length === 8192;
});

test('极端长度 - 8193 字节（超过池）', () => {
  const buf = Buffer.from(new Array(8193).fill(42));
  return buf.length === 8193;
});

test('极端长度 - 16384 字节', () => {
  const buf = Buffer.from(new Array(16384).fill(42));
  return buf.length === 16384;
});

test('极端长度 - 65536 字节（64KB）', () => {
  const buf = Buffer.from(new Array(65536).fill(42));
  return buf.length === 65536;
});

test('极端长度 - 131072 字节（128KB）', () => {
  const buf = Buffer.from(new Array(131072).fill(42));
  return buf.length === 131072;
});

// 极端编码场景
test('极端编码 - Base64 最长合法填充', () => {
  const buf = Buffer.from('YQ==', 'base64');
  return buf.toString('utf8') === 'a';
});

test('极端编码 - HEX 最长有效字符串', () => {
  const hex = '00112233445566778899AABBCCDDEEFF'.repeat(100);
  const buf = Buffer.from(hex, 'hex');
  return buf.length === 1600;
});

test('极端编码 - UTF-8 最长单字符（4字节 Emoji）', () => {
  const emoji = '😀';
  const buf = Buffer.from(emoji, 'utf8');
  return buf.length === 4;
});

test('极端编码 - Latin1 全范围 0-255', () => {
  let str = '';
  for (let i = 0; i < 256; i++) {
    str += String.fromCharCode(i);
  }
  const buf = Buffer.from(str, 'latin1');
  return buf.length === 256;
});

// 极端 ArrayBuffer 场景
test('极端 ArrayBuffer - offset 为 0 length 为 0', () => {
  const ab = new ArrayBuffer(100);
  const buf = Buffer.from(ab, 0, 0);
  return buf.length === 0;
});

test('极端 ArrayBuffer - offset 为最大值', () => {
  const ab = new ArrayBuffer(100);
  const buf = Buffer.from(ab, 99, 1);
  return buf.length === 1;
});

test('极端 ArrayBuffer - length 为最大值', () => {
  const ab = new ArrayBuffer(100);
  const buf = Buffer.from(ab, 0, 100);
  return buf.length === 100;
});

// 兼容性 - 不同 JavaScript 引擎行为
test('兼容性 - toString 重写对象', () => {
  const obj = {
    0: 65,
    1: 66,
    length: 2,
    toString() {
      return 'should not use this';
    }
  };
  const buf = Buffer.from(obj);
  // 应该使用类数组接口，不使用 toString
  return buf.length === 2 && buf[0] === 65;
});

test('兼容性 - toJSON 重写对象', () => {
  const obj = {
    0: 67,
    1: 68,
    length: 2,
    toJSON() {
      return 'should not use this';
    }
  };
  const buf = Buffer.from(obj);
  return buf.length === 2 && buf[0] === 67;
});

test('兼容性 - Symbol.iterator 定义的对象', () => {
  const obj = {
    0: 69,
    1: 70,
    length: 2,
    [Symbol.iterator]: function* () {
      yield 99;
      yield 100;
    }
  };
  const buf = Buffer.from(obj);
  // 应该使用类数组接口，不使用迭代器
  return buf.length === 2 && buf[0] === 69;
});

// 极端类数组对象
test('极端类数组 - 超大 length 但只有少量元素', () => {
  const obj = { 0: 1, length: 10000 };
  const buf = Buffer.from(obj);
  return buf.length === 10000 && buf[0] === 1;
});

test('极端类数组 - length 为 0 但有元素', () => {
  const obj = { 0: 99, 1: 100, length: 0 };
  const buf = Buffer.from(obj);
  return buf.length === 0;
});

test('极端类数组 - 非常大的索引', () => {
  const obj = { 0: 1, 1000000: 2, length: 2 };
  const buf = Buffer.from(obj);
  return buf.length === 2 && buf[0] === 1;
});

// 特殊 Number 值处理
test('特殊数字 - Number.MIN_VALUE', () => {
  const buf = Buffer.from([Number.MIN_VALUE]);
  return buf[0] === 0;
});

test('特殊数字 - Number.MAX_VALUE', () => {
  const buf = Buffer.from([Number.MAX_VALUE]);
  return buf.length === 1;
});

test('特殊数字 - Number.EPSILON', () => {
  const buf = Buffer.from([Number.EPSILON]);
  return buf[0] === 0;
});

test('特殊数字 - -0', () => {
  const buf = Buffer.from([-0]);
  return buf[0] === 0;
});

test('特殊数字 - +0', () => {
  const buf = Buffer.from([+0]);
  return buf[0] === 0;
});

// UTF-8 极端序列
test('UTF-8 极端 - 最长合法 UTF-8 序列', () => {
  const str = '\uDBFF\uDFFF'; // 最大码点
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 4;
});

test('UTF-8 极端 - BMP 最大字符', () => {
  const str = '\uFFFF';
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 3;
});

test('UTF-8 极端 - ASCII 最大字符', () => {
  const str = '\x7F';
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 1 && buf[0] === 127;
});

// Buffer 链式操作
test('链式操作 - 连续多次 from', () => {
  let buf = Buffer.from([1, 2, 3]);
  for (let i = 0; i < 10; i++) {
    buf = Buffer.from(buf);
  }
  return buf.length === 3 && buf[0] === 1;
});

test('链式操作 - 交替字符串和 Buffer', () => {
  let buf = Buffer.from('test');
  for (let i = 0; i < 5; i++) {
    buf = Buffer.from(buf);
    buf = Buffer.from(buf.toString('utf8'));
  }
  return buf.toString('utf8') === 'test';
});

// 平台相关（间接测试）
test('平台兼容 - 字节序不影响数组创建', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && buf[3] === 4;
});

test('平台兼容 - 负数数组值跨平台一致', () => {
  const buf = Buffer.from([-1, -128, -255]);
  return buf[0] === 255 && buf[1] === 128;
});

// 内存压力测试（适度）
test('内存压力 - 创建 100 个中等 Buffer', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from(new Array(1000).fill(i % 256)));
  }
  return buffers.length === 100 && buffers[0].length === 1000;
});

test('内存压力 - 创建和释放循环', () => {
  for (let i = 0; i < 500; i++) {
    const buf = Buffer.from(new Array(100).fill(i % 256));
    if (buf.length !== 100) return false;
  }
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
