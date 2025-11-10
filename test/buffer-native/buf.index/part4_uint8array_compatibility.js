// buf[index] - Part 4: Uint8Array Compatibility Tests
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

// Buffer 与 Uint8Array 行为一致性测试
test('Buffer 和 Uint8Array 越界读取一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf[10] === arr[10];
});

test('Buffer 和 Uint8Array 负索引读取一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf[-1] === arr[-1];
});

test('Buffer 和 Uint8Array 越界写入一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  buf[10] = 99;
  arr[10] = 99;
  return buf.length === arr.length && buf[10] === arr[10];
});

test('Buffer 和 Uint8Array 负索引写入一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  buf[-1] = 99;
  arr[-1] = 99;
  return buf.length === arr.length && buf[-1] === arr[-1];
});

test('Buffer 和 Uint8Array 写入 256 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = 256;
  arr[0] = 256;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入 -1 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = -1;
  arr[0] = -1;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入 NaN 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = NaN;
  arr[0] = NaN;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入 Infinity 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = Infinity;
  arr[0] = Infinity;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入小数一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = 3.14;
  arr[0] = 3.14;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入 null 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = null;
  arr[0] = null;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入 undefined 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = undefined;
  arr[0] = undefined;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入 true 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = true;
  arr[0] = true;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入 false 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = false;
  arr[0] = false;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入字符串数字一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = '65';
  arr[0] = '65';
  return buf[0] === arr[0];
});

// 字符串索引测试
test('Buffer 和 Uint8Array 字符串索引读取一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf['1'] === arr['1'];
});

test('Buffer 和 Uint8Array 字符串索引写入一致', () => {
  const buf = Buffer.alloc(3);
  const arr = new Uint8Array(3);
  buf['1'] = 99;
  arr['1'] = 99;
  return buf[1] === arr[1];
});

test('Buffer 和 Uint8Array 小数索引一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf[1.5] === arr[1.5];
});

// 空 Buffer/Array 测试
test('空 Buffer 和空 Uint8Array 索引 0 一致', () => {
  const buf = Buffer.alloc(0);
  const arr = new Uint8Array(0);
  return buf[0] === arr[0];
});

test('空 Buffer 和空 Uint8Array 写入索引 0 一致', () => {
  const buf = Buffer.alloc(0);
  const arr = new Uint8Array(0);
  buf[0] = 99;
  arr[0] = 99;
  return buf.length === arr.length && buf[0] === arr[0];
});

// 大值测试
test('Buffer 和 Uint8Array 写入 1000 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = 1000;
  arr[0] = 1000;
  return buf[0] === arr[0];
});

test('Buffer 和 Uint8Array 写入 -1000 一致', () => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  buf[0] = -1000;
  arr[0] = -1000;
  return buf[0] === arr[0];
});

// 连续操作测试
test('Buffer 和 Uint8Array 连续读写一致', () => {
  const buf = Buffer.alloc(5);
  const arr = new Uint8Array(5);
  
  for (let i = 0; i < 5; i++) {
    buf[i] = i * 50;
    arr[i] = i * 50;
  }
  
  let match = true;
  for (let i = 0; i < 5; i++) {
    if (buf[i] !== arr[i]) {
      match = false;
      break;
    }
  }
  
  return match;
});

test('Buffer 和 Uint8Array 覆盖写入一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  
  buf[1] = 100;
  arr[1] = 100;
  buf[1] = 200;
  arr[1] = 200;
  
  return buf[1] === arr[1];
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
