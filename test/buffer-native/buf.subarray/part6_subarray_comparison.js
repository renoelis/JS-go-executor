// buf.subarray() - slice() vs subarray() Comparison
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, passed: pass, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, status: '❌', error: e.message, stack: e.stack });
  }
}

// slice() 和 subarray() 的对比
test('slice 和 subarray 参数行为相同', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const subarrayed = buf.subarray(1, 4);

  if (sliced.length !== subarrayed.length) return false;
  if (sliced.length !== 3) return false;

  for (let i = 0; i < sliced.length; i++) {
    if (sliced[i] !== subarrayed[i]) return false;
  }

  console.log('✅ slice 和 subarray 参数行为相同');
  return true;
});

test('slice 和 subarray 在 Node v25 都共享内存', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const subarrayed = buf.subarray(1, 4);

  // 在 Node.js v25.0.0 中，slice 和 subarray 行为一致，都共享内存
  sliced[0] = 99;
  if (buf[1] !== 99) return false;

  buf[1] = 88;
  subarrayed[0] = 77;
  if (buf[1] !== 77) return false;

  console.log('✅ slice 和 subarray 都共享内存');
  return true;
});

test('slice 和 subarray 负数索引行为相同', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(-3, -1);
  const subarrayed = buf.subarray(-3, -1);

  if (sliced.length !== subarrayed.length) return false;
  if (sliced.length !== 2) return false;

  for (let i = 0; i < sliced.length; i++) {
    if (sliced[i] !== subarrayed[i]) return false;
  }

  console.log('✅ slice 和 subarray 负数索引相同');
  return true;
});

test('slice 和 subarray 空范围行为相同', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(3, 1);
  const subarrayed = buf.subarray(3, 1);

  if (sliced.length !== 0 || subarrayed.length !== 0) return false;

  console.log('✅ slice 和 subarray 空范围相同');
  return true;
});

test('slice 和 subarray 越界行为相同', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(10, 20);
  const subarrayed = buf.subarray(10, 20);

  if (sliced.length !== 0 || subarrayed.length !== 0) return false;

  console.log('✅ slice 和 subarray 越界行为相同');
  return true;
});

// Uint8Array.prototype.subarray 行为对比
test('Uint8Array subarray 和 Buffer subarray 行为一致', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const arrSub = arr.subarray(1, 4);
  const bufSub = buf.subarray(1, 4);

  if (arrSub.length !== bufSub.length) return false;
  if (arrSub.length !== 3) return false;

  for (let i = 0; i < arrSub.length; i++) {
    if (arrSub[i] !== bufSub[i]) return false;
  }

  console.log('✅ Uint8Array 和 Buffer subarray 一致');
  return true;
});

test('Uint8Array subarray 也共享内存', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const sub = arr.subarray(1, 4);

  sub[0] = 99;
  if (arr[1] !== 99) return false;

  console.log('✅ Uint8Array subarray 共享内存');
  return true;
});

test('Buffer subarray 保持 Buffer 类型', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  if (!Buffer.isBuffer(sub)) return false;
  if (!(sub instanceof Buffer)) return false;

  // 可以调用 Buffer 特有方法
  const str = sub.toString('hex');
  if (str !== '020304') return false;

  console.log('✅ subarray 保持 Buffer 类型');
  return true;
});

test('Uint8Array subarray 返回 Uint8Array', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const sub = arr.subarray(1, 4);

  if (Buffer.isBuffer(sub)) return false;
  if (!(sub instanceof Uint8Array)) return false;

  console.log('✅ Uint8Array subarray 返回 Uint8Array');
  return true;
});

// 实际应用场景
test('多个 subarray 可以独立修改不同区域', () => {
  const buf = Buffer.alloc(10);
  const sub1 = buf.subarray(0, 3);
  const sub2 = buf.subarray(3, 6);
  const sub3 = buf.subarray(6, 10);

  sub1.fill(1);
  sub2.fill(2);
  sub3.fill(3);

  // 验证原 buffer
  if (buf[0] !== 1 || buf[2] !== 1) return false;
  if (buf[3] !== 2 || buf[5] !== 2) return false;
  if (buf[6] !== 3 || buf[9] !== 3) return false;

  console.log('✅ 多个 subarray 独立修改');
  return true;
});

test('subarray 可以用于零拷贝分块处理', () => {
  const buf = Buffer.from('Hello World');
  const hello = buf.subarray(0, 5);
  const world = buf.subarray(6, 11);

  if (hello.toString() !== 'Hello') return false;
  if (world.toString() !== 'World') return false;

  console.log('✅ subarray 零拷贝分块');
  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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
