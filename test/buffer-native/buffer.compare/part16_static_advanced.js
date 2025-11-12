// buffer.compare() - 静态方法边界与复杂组合补充测试
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

test('静态方法与实例方法结果一致性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const instanceResult = buf1.compare(buf2);
  const staticResult = Buffer.compare(buf1, buf2);
  return instanceResult === staticResult;
});

test('静态方法Uint8Array参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);
  const result = Buffer.compare(buf, uint8);
  return result === 0;
});

test('静态方法两个Uint8Array参数', () => {
  const uint8a = new Uint8Array([1, 2, 3]);
  const uint8b = new Uint8Array([1, 2, 3]);
  const result = Buffer.compare(uint8a, uint8b);
  return result === 0;
});

test('静态方法无参数应该抛出错误', () => {
  try {
    Buffer.compare();
    return false;
  } catch (e) {
    return e.message.includes('buf1') && e.message.includes('undefined');
  }
});

test('静态方法第一个参数为null', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    Buffer.compare(null, buf);
    return false;
  } catch (e) {
    return e.message.includes('buf1') || e.message.includes('instance');
  }
});

test('静态方法第二个参数为null', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    Buffer.compare(buf, null);
    return false;
  } catch (e) {
    return e.message.includes('buf2') || e.message.includes('instance');
  }
});

test('静态方法字符串参数应该抛出错误', () => {
  try {
    Buffer.compare('abc', 'def');
    return false;
  } catch (e) {
    return e.message.includes('instance');
  }
});

test('静态方法数字参数应该抛出错误', () => {
  try {
    Buffer.compare(123, 456);
    return false;
  } catch (e) {
    return e.message.includes('instance');
  }
});

test('静态方法与实例方法在空buffer上的一致性', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const instanceResult = buf1.compare(buf2);
  const staticResult = Buffer.compare(buf1, buf2);
  return instanceResult === 0 && staticResult === 0;
});

test('静态方法大buffer比较性能', () => {
  const size = 100000;
  const buf1 = Buffer.alloc(size, 0x42);
  const buf2 = Buffer.alloc(size, 0x42);

  const start = process.hrtime.bigint();
  const result = Buffer.compare(buf1, buf2);
  const end = process.hrtime.bigint();
  const duration = Number(end - start);

  console.log(`    📊 静态方法100KB比较: ${duration}ns`);
  return result === 0 && duration < 10000000; // 10ms
});

test('实例方法与静态方法在不同长度上的一致性', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([1, 2, 3]);
  const instanceResult = buf1.compare(buf2);
  const staticResult = Buffer.compare(buf1, buf2);
  return instanceResult < 0 && staticResult < 0;
});

test('静态方法反向比较对称性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result1 = Buffer.compare(buf1, buf2);
  const result2 = Buffer.compare(buf2, buf1);
  return (result1 < 0 && result2 > 0);
});

test('静态方法混合Buffer和TypedArray', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint16 = new Uint16Array([0x0201, 0x03]);
  const uint8 = new Uint8Array(uint16.buffer);
  const result = Buffer.compare(buf, uint8);
  return result !== 0 || buf.length !== uint8.length;
});

test('静态方法DataView参数应该失败', () => {
  try {
    const arrayBuffer = new ArrayBuffer(4);
    const dataView = new DataView(arrayBuffer);
    const buf = Buffer.from([1, 2, 3, 4]);
    Buffer.compare(buf, dataView);
    return false;
  } catch (e) {
    return e.message.includes('instance') || e.message.includes('Uint8Array');
  }
});

test('静态方法ArrayBuffer参数应该失败', () => {
  try {
    const arrayBuffer = new ArrayBuffer(4);
    const buf = Buffer.from([1, 2, 3, 4]);
    Buffer.compare(buf, arrayBuffer);
    return false;
  } catch (e) {
    return e.message.includes('instance');
  }
});

test('静态方法slice后的buffer比较', () => {
  const original1 = Buffer.from([1, 2, 3, 4, 5]);
  const original2 = Buffer.from([0, 1, 2, 3, 4, 5, 6]);
  const slice1 = original1.slice(1, 4);
  const slice2 = original2.slice(2, 5);
  const result = Buffer.compare(slice1, slice2);
  return result === 0;
});

test('静态方法subarray后的buffer比较', () => {
  const original = Buffer.from([0, 1, 2, 3, 4, 5]);
  const sub1 = original.subarray(1, 4);
  const sub2 = original.subarray(1, 4);
  const result = Buffer.compare(sub1, sub2);
  return result === 0;
});

test('静态方法Buffer.concat结果比较', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concat = Buffer.concat([buf1, buf2]);
  const manual = Buffer.from([1, 2, 3, 4]);
  const result = Buffer.compare(concat, manual);
  return result === 0;
});

test('静态方法多次调用稳定性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);

  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(Buffer.compare(buf1, buf2));
  }

  return results.every(r => r < 0);
});

test('静态方法与equals方法的关系', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const compareResult = Buffer.compare(buf1, buf2);
  const equalsResult = buf1.equals(buf2);
  return (compareResult === 0) === equalsResult;
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
