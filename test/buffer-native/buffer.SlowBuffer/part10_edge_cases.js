// Buffer.allocUnsafeSlow - 边界和极端场景 (Round 3 补漏)
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

// 长度为 0 的边界测试
test('长度为 0 的 Buffer 可以调用所有方法', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return typeof buf.toString === 'function' &&
         typeof buf.write === 'function' &&
         typeof buf.slice === 'function';
});

test('长度为 0 的 Buffer write 返回 0', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.write('test') === 0;
});

test('长度为 0 的 Buffer toString 返回空字符串', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.toString() === '';
});

test('长度为 0 的 Buffer slice 返回空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  const slice = buf.slice();
  return slice.length === 0;
});

test('长度为 0 的 Buffer fill 不报错', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  buf.fill(0);
  return buf.length === 0;
});

// 单字节 Buffer 边界
test('单字节 Buffer 可以存储 0-255', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = 0;
  const zero = buf[0] === 0;
  buf[0] = 255;
  const max = buf[0] === 255;
  return zero && max;
});

test('单字节 Buffer 溢出值会取模', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = 256;
  return buf[0] === 0;
});

test('单字节 Buffer 负数会转换', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = -1;
  return buf[0] === 255;
});

test('单字节 Buffer 小数会截断', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = 10.9;
  return buf[0] === 10;
});

// slice 边界测试
test('slice 无参数返回完整视图', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.write('hello');
  const slice = buf.slice();
  return slice.length === 5 && slice.toString() === 'hello';
});

test('slice 起始索引等于长度返回空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const slice = buf.slice(5);
  return slice.length === 0;
});

test('slice 起始索引大于长度返回空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const slice = buf.slice(10);
  return slice.length === 0;
});

test('slice 负索引从末尾计算', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.write('hello');
  const slice = buf.slice(-2);
  return slice.toString() === 'lo';
});

test('slice 负起始和负结束', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.write('hello');
  const slice = buf.slice(-4, -1);
  return slice.toString() === 'ell';
});

test('slice 结束索引小于起始索引返回空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const slice = buf.slice(3, 1);
  return slice.length === 0;
});

// subarray 边界测试
test('subarray 行为与 slice 一致', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.write('hello');
  const sub = buf.subarray(1, 3);
  return sub.toString() === 'el';
});

test('subarray 返回 Uint8Array 视图', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const sub = buf.subarray();
  return sub instanceof Uint8Array;
});

// fill 边界测试
test('fill 单个字节值', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(65);
  return buf.every(b => b === 65);
});

test('fill 字符串值', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill('a');
  return buf.every(b => b === 97);
});

test('fill 多字节字符串重复填充', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.fill('ab');
  return buf[0] === 97 && buf[1] === 98 && buf[2] === 97;
});

test('fill Buffer 对象', () => {
  const fill = Buffer.from([1, 2, 3]);
  const buf = Buffer.allocUnsafeSlow(9);
  buf.fill(fill);
  return buf[0] === 1 && buf[3] === 1 && buf[6] === 1;
});

test('fill 支持 offset 参数', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(0);
  buf.fill(65, 2);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 65;
});

test('fill 支持 offset 和 end 参数', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(0);
  buf.fill(65, 1, 3);
  return buf[0] === 0 && buf[1] === 65 && buf[2] === 65 && buf[3] === 0;
});

// 数组索引越界行为
test('读取超出范围的索引返回 undefined', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  return buf[100] === undefined && buf[1000] === undefined;
});

test('写入超出范围的索引被忽略', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[100] = 65;
  return buf.length === 5 && buf[100] === undefined;
});

test('负索引读取返回 undefined', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  return buf[-1] === undefined && buf[-10] === undefined;
});

test('负索引写入被忽略', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[-1] = 65;
  return buf.length === 5 && buf[-1] === undefined;
});

// 特殊数值写入
test('写入 NaN 被转换为 0', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = NaN;
  return buf[0] === 0;
});

test('写入 Infinity 会取模', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = Infinity;
  return typeof buf[0] === 'number';
});

test('写入 undefined 被转换为 0', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = undefined;
  return buf[0] === 0;
});

test('写入 null 被转换为 0', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = null;
  return buf[0] === 0;
});

test('写入布尔值 true 被转换为 1', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = true;
  return buf[0] === 1;
});

test('写入布尔值 false 被转换为 0', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = false;
  return buf[0] === 0;
});

// 迭代器边界
test('空 Buffer 可以迭代', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  let count = 0;
  for (const byte of buf) {
    count++;
  }
  return count === 0;
});

test('Buffer 迭代返回字节值', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const values = [...buf];
  return values[0] === 1 && values[1] === 2 && values[2] === 3;
});

// keys, values, entries
test('Buffer.keys() 返回索引迭代器', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  const keys = [...buf.keys()];
  return keys[0] === 0 && keys[1] === 1 && keys[2] === 2;
});

test('Buffer.values() 返回值迭代器', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;
  const values = [...buf.values()];
  return values[0] === 10 && values[1] === 20 && values[2] === 30;
});

test('Buffer.entries() 返回 [index, value] 对', () => {
  const buf = Buffer.allocUnsafeSlow(2);
  buf[0] = 65;
  buf[1] = 66;
  const entries = [...buf.entries()];
  return entries[0][0] === 0 && entries[0][1] === 65;
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
