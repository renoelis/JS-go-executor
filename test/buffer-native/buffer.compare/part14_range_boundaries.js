// buffer.compare() - 范围参数边界深度测试
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

test('targetStart等于target.length应该返回正数', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 3, 3);
  return result > 0; // 空范围 vs 整个buffer
});

test('sourceStart等于source.length应该返回负数', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3, 3, 3);
  return result < 0; // 整个buffer vs 空范围
});

test('两端都是空范围应该返回0', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = buf1.compare(buf2, 2, 2, 1, 1);
  return result === 0;
});

test('targetEnd刚好等于length边界', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3, 4]);
  const result = buf1.compare(buf2, 0, 3, 0, 3);
  return result === 0;
});

test('sourceEnd刚好等于length边界+1', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3, 0, 4); // buf2[0..3] vs buf1[0..4]
  return result > 0; // buf2[0..3]=[1,2,3] vs buf1[0..4]=[1,2,3,4], buf1更长
});

test('targetStart为0 targetEnd为0返回正数', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = buf1.compare(buf2, 0, 0); // buf2空范围 vs buf1全部
  return result > 0; // buf1全部 vs buf2空范围
});

test('所有范围参数都为0', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = buf1.compare(buf2, 0, 0, 0, 0);
  return result === 0;
});

test('targetStart超出边界允许', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  // Node.js 允许 targetStart 超出边界
  const result = buf1.compare(buf2, 10);
  return result > 0;
});

test('sourceStart超出边界允许', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  // Node.js 允许 sourceStart 超出边界
  const result = buf1.compare(buf2, 0, 3, 10);
  return result < 0; // buf2全部 vs buf1空范围
});

test('targetEnd超出边界应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 10); // targetEnd=10 > buf2.length=3
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('sourceEnd超出边界应该抛出错误', () => {
  try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([1, 2, 3]);
    buf1.compare(buf2, 0, 3, 0, 10); // sourceEnd=10 > buf1.length=3
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('边界参数组合 - 单字节范围', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([10, 20, 3, 40, 50]);
  const result = buf1.compare(buf2, 2, 3, 2, 3);
  return result === 0;
});

test('边界参数组合 - 尾部单字节', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([10, 20, 30, 40, 5]);
  const result = buf1.compare(buf2, 4, 5, 4, 5);
  return result === 0;
});

test('边界参数组合 - 头部单字节', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 20, 30]);
  const result = buf1.compare(buf2, 0, 1, 0, 1);
  return result === 0;
});

test('空buffer的范围比较', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 0, 0, 0);
  return result === 0;
});

test('范围参数导致的比较优化', () => {
  const buf1 = Buffer.alloc(10000);
  const buf2 = Buffer.alloc(10000);
  buf1.fill(0xAA);
  buf2.fill(0xAA);

  const start = process.hrtime.bigint();
  const result = buf1.compare(buf2, 0, 10, 0, 10);
  const end = process.hrtime.bigint();
  const duration = Number(end - start);

  console.log(`    📊 大buffer小范围比较: ${duration}ns`);
  return result === 0 && duration < 1000000; // 1ms
});

test('逆序范围返回正数', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 3, 0); // 空范围
  return result > 0; // 整个buf1 vs 空的buf2范围
});

test('sourceStart等于sourceEnd导致空范围', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = buf1.compare(buf2, 0, 3, 1, 1);
  return result < 0; // buf2空范围 vs buf1全部
});

test('targetStart等于targetEnd导致空范围', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = buf1.compare(buf2, 1, 1, 0, 3);
  return result > 0; // buf2空范围 vs buf1全部
});

test('最大安全整数作为targetStart允许', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  // Node.js 不抛出错误
  const result = buf1.compare(buf2, Number.MAX_SAFE_INTEGER);
  return result > 0;
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
