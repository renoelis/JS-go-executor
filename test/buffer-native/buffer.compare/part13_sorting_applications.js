// buffer.compare() - 排序和数组应用场景测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅', name);
    } else {
      console.log('❌', name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌', name, '-', e.message);
  }
}

test('Buffer数组排序 - 升序', () => {
  const arr = [
    Buffer.from([3, 2, 1]),
    Buffer.from([1, 2, 3]),
    Buffer.from([2, 2, 2])
  ];

  arr.sort(Buffer.compare);

  return arr[0].compare(Buffer.from([1, 2, 3])) === 0 &&
         arr[1].compare(Buffer.from([2, 2, 2])) === 0 &&
         arr[2].compare(Buffer.from([3, 2, 1])) === 0;
});

test('Buffer数组排序 - 降序', () => {
  const arr = [
    Buffer.from([1, 2, 3]),
    Buffer.from([3, 2, 1]),
    Buffer.from([2, 2, 2])
  ];

  arr.sort((a, b) => b.compare(a));

  return arr[0].compare(Buffer.from([3, 2, 1])) === 0 &&
         arr[1].compare(Buffer.from([2, 2, 2])) === 0 &&
         arr[2].compare(Buffer.from([1, 2, 3])) === 0;
});

test('Buffer数组排序 - 不同长度', () => {
  const arr = [
    Buffer.from([1, 2, 3, 4]),
    Buffer.from([1, 2]),
    Buffer.from([1, 2, 3])
  ];

  arr.sort(Buffer.compare);

  return arr[0].length === 2 &&
         arr[1].length === 3 &&
         arr[2].length === 4;
});

test('Buffer数组排序 - 包含空buffer', () => {
  const arr = [
    Buffer.from([1]),
    Buffer.alloc(0),
    Buffer.from([2])
  ];

  arr.sort(Buffer.compare);

  return arr[0].length === 0 &&
         arr[1][0] === 1 &&
         arr[2][0] === 2;
});

test('Buffer数组排序 - 相同内容', () => {
  const arr = [
    Buffer.from([1, 2, 3]),
    Buffer.from([1, 2, 3]),
    Buffer.from([1, 2, 3])
  ];

  arr.sort(Buffer.compare);

  return arr.every(buf => buf.compare(Buffer.from([1, 2, 3])) === 0);
});

test('Buffer数组排序 - 字节边界值', () => {
  const arr = [
    Buffer.from([255]),
    Buffer.from([0]),
    Buffer.from([128]),
    Buffer.from([127]),
    Buffer.from([1])
  ];

  arr.sort(Buffer.compare);

  return arr[0][0] === 0 &&
         arr[1][0] === 1 &&
         arr[2][0] === 127 &&
         arr[3][0] === 128 &&
         arr[4][0] === 255;
});

test('Buffer数组排序稳定性检查', () => {
  const arr = [
    Buffer.from([1, 2, 3]),
    Buffer.from([1, 2, 3]),
    Buffer.from([1, 2, 3])
  ];

  const original = arr.slice();
  arr.sort(Buffer.compare);

  return arr.every((buf, i) => buf === original[i]);
});

test('静态compare方法用于排序', () => {
  const arr = [
    Buffer.from([5, 6]),
    Buffer.from([1, 2]),
    Buffer.from([3, 4])
  ];

  arr.sort((a, b) => Buffer.compare(a, b));

  return arr[0].compare(Buffer.from([1, 2])) === 0 &&
         arr[1].compare(Buffer.from([3, 4])) === 0 &&
         arr[2].compare(Buffer.from([5, 6])) === 0;
});

test('混合TypedArray排序', () => {
  const arr = [
    Buffer.from([3]),
    new Uint8Array([1]),
    Buffer.from([2])
  ];

  arr.sort((a, b) => Buffer.compare(a, b));

  return arr[0][0] === 1 &&
         arr[1][0] === 2 &&
         arr[2][0] === 3;
});

test('大量buffer排序性能', () => {
  const arr = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(Math.floor(Math.random() * 1000));
    arr.push(buf);
  }

  const start = process.hrtime.bigint();
  arr.sort(Buffer.compare);
  const end = process.hrtime.bigint();
  const duration = Number(end - start);

  console.log(`    📊 100个buffer排序耗时: ${duration}ns`);

  // 验证排序正确性
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].compare(arr[i - 1]) < 0) {
      return false;
    }
  }

  return duration < 20000000; // 调整为20ms，适应goja环境
});

test('空数组排序不抛错', () => {
  const arr = [];
  arr.sort(Buffer.compare);
  return arr.length === 0;
});

test('单元素数组排序', () => {
  const arr = [Buffer.from([1, 2, 3])];
  arr.sort(Buffer.compare);
  return arr.length === 1 && arr[0].compare(Buffer.from([1, 2, 3])) === 0;
});

test('compare返回值的传递性', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([2, 3]);
  const buf3 = Buffer.from([3, 4]);

  const r12 = buf1.compare(buf2);
  const r23 = buf2.compare(buf3);
  const r13 = buf1.compare(buf3);

  // 如果 buf1 < buf2 且 buf2 < buf3, 则 buf1 < buf3
  return r12 < 0 && r23 < 0 && r13 < 0;
});

test('compare返回值的对称性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);

  const r12 = buf1.compare(buf2);
  const r21 = buf2.compare(buf1);

  // compare(a,b) === -compare(b,a)
  return (r12 < 0 && r21 > 0) || (r12 > 0 && r21 < 0) || (r12 === 0 && r21 === 0);
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
