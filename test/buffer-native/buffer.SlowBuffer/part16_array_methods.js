// Buffer.allocUnsafeSlow - 数组方法和其他遗漏测试
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

// reverse 方法
test('reverse 反转 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  buf.reverse();
  return buf[0] === 5 && buf[4] === 1;
});

test('reverse 返回原 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const result = buf.reverse();
  return result === buf;
});

test('reverse 空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  buf.reverse();
  return buf.length === 0;
});

test('reverse 单字节 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = 42;
  buf.reverse();
  return buf[0] === 42;
});

test('reverse 偶数长度 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf.reverse();
  return buf[0] === 4 && buf[1] === 3 && buf[2] === 2 && buf[3] === 1;
});

test('reverse 奇数长度 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  buf.reverse();
  return buf[0] === 5 && buf[2] === 3 && buf[4] === 1;
});

// sort 方法
test('sort 排序 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 5;
  buf[1] = 2;
  buf[2] = 4;
  buf[3] = 1;
  buf[4] = 3;
  buf.sort();
  return buf[0] === 1 && buf[4] === 5;
});

test('sort 返回原 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const result = buf.sort();
  return result === buf;
});

test('sort 已排序的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  buf.sort();
  return buf[0] === 1 && buf[4] === 5;
});

test('sort 反向排序的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 5;
  buf[1] = 4;
  buf[2] = 3;
  buf[3] = 2;
  buf[4] = 1;
  buf.sort();
  return buf[0] === 1 && buf[4] === 5;
});

test('sort 空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  buf.sort();
  return buf.length === 0;
});

test('sort 单字节 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = 42;
  buf.sort();
  return buf[0] === 42;
});

test('sort 相同值', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(42);
  buf.sort();
  return buf.every(b => b === 42);
});

test('sort 支持自定义比较函数', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  buf.sort((a, b) => b - a);
  return buf[0] === 5 && buf[4] === 1;
});

// at 方法
test('at 正索引', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;
  return buf.at(0) === 10 && buf.at(1) === 20 && buf.at(2) === 30;
});

test('at 负索引', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;
  buf[3] = 40;
  buf[4] = 50;
  return buf.at(-1) === 50 && buf.at(-2) === 40;
});

test('at 越界返回 undefined', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  return buf.at(10) === undefined && buf.at(-10) === undefined;
});

test('at 索引 0', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 100;
  return buf.at(0) === 100;
});

test('at 最后一个元素', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[4] = 99;
  return buf.at(4) === 99 && buf.at(-1) === 99;
});

// join 方法（Uint8Array 继承）
test('join 默认分隔符', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  return buf.join() === '1,2,3';
});

test('join 自定义分隔符', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  return buf.join('-') === '1-2-3';
});

test('join 空分隔符', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  return buf.join('') === '123';
});

test('join 空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.join() === '';
});

test('join 单字节 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = 42;
  return buf.join() === '42';
});

// copyWithin 方法
test('copyWithin 基本用法', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  buf.copyWithin(0, 3);
  return buf[0] === 4 && buf[1] === 5;
});

test('copyWithin 指定结束位置', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  buf.copyWithin(0, 2, 4);
  return buf[0] === 3 && buf[1] === 4 && buf[2] === 3;
});

test('copyWithin 负索引', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  buf.copyWithin(-2, 0);
  return buf[3] === 1 && buf[4] === 2;
});

test('copyWithin 返回原 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const result = buf.copyWithin(0, 1);
  return result === buf;
});

// fill 更多边界场景
test('fill 使用 Uint8Array 作为填充', () => {
  const fill = new Uint8Array([1, 2, 3]);
  const buf = Buffer.allocUnsafeSlow(9);
  buf.fill(fill);
  return buf[0] === 1 && buf[3] === 1 && buf[6] === 1;
});

test('fill 编码参数', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.fill('abc', 'utf8');
  return buf[0] === 97 && buf[3] === 97;
});

test('fill 起始偏移量', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.fill(255, 5);
  return buf[4] === 0 && buf[5] === 255;
});

test('fill 起始和结束偏移量', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.fill(255, 3, 7);
  return buf[2] === 0 && buf[3] === 255 && buf[7] === 0;
});

test('fill 负偏移量抛出错误', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  try {
    buf.fill(255, -3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊场景
test('allocUnsafeSlow 与 Symbol.iterator', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const arr = [...buf];
  return arr.length === 3 && arr[0] === 1;
});

test('allocUnsafeSlow Buffer 支持 for...of', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;
  let sum = 0;
  for (const byte of buf) {
    sum += byte;
  }
  return sum === 60;
});

test('allocUnsafeSlow Buffer 的 toString tag', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const tag = Object.prototype.toString.call(buf);
  return tag.includes('Uint8Array') || tag.includes('Buffer');
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
