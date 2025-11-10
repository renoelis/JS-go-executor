// buf[index] - Part 12: Performance and Additional Edge Cases Tests
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

// 大量连续读取性能测试
test('连续读取 10000 次', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let sum = 0;
  for (let i = 0; i < 10000; i++) {
    sum += buf[i % 5];
  }
  return sum === 30000;
});

test('连续写入 10000 次', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10000; i++) {
    buf[i % 10] = i % 256;
  }
  // 10000 次后，每个位置的值是 (9990 + index) % 256
  return buf[0] === ((9990 + 0) % 256) && buf[9] === ((9990 + 9) % 256);
});

test('交替读写 5000 次', () => {
  const buf = Buffer.alloc(5);
  for (let i = 0; i < 5000; i++) {
    buf[i % 5] = i % 256;
    const val = buf[i % 5];
    if (val !== i % 256) return false;
  }
  return true;
});

// 索引计算边界测试
test('使用 Math.floor 作为索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[Math.floor(1.9)] === 20;
});

test('使用 Math.ceil 作为索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[Math.ceil(0.1)] === 20;
});

test('使用 Math.round 作为索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[Math.round(1.4)] === 20;
});

test('使用 parseInt 作为索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[parseInt('1')] === 20;
});

test('使用 parseFloat 作为索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[parseFloat('1.9')] === undefined;
});

// 位运算索引测试
test('使用 | 0 转换索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[1.9 | 0] === 20;
});

test('使用 >> 0 转换索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[1.9 >> 0] === 20;
});

test('使用 >>> 0 转换索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[1.9 >>> 0] === 20;
});

test('使用 ~~ 转换索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[~~1.9] === 20;
});

// 写入位运算值
test('写入 | 运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 0xFF | 0xAB;
  return buf[0] === 0xFF;
});

test('写入 & 运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 0xFF & 0xAB;
  return buf[0] === 0xAB;
});

test('写入 ^ 运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 0xFF ^ 0xAB;
  return buf[0] === 0x54;
});

test('写入 ~ 运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = ~0;
  return buf[0] === 255;
});

test('写入 << 运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 1 << 6;
  return buf[0] === 64;
});

test('写入 >> 运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 128 >> 1;
  return buf[0] === 64;
});

test('写入 >>> 运算结果', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 128 >>> 1;
  return buf[0] === 64;
});

// 复杂表达式索引
test('使用三元运算符索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  const condition = true;
  return buf[condition ? 1 : 2] === 20;
});

test('使用逻辑运算符索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[0 || 1] === 20;
});

test('使用逻辑与运算符索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  return buf[true && 1] === 20;
});

// 特殊数学常量作为索引
test('使用 Math.PI 作为索引', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  return buf[Math.PI] === undefined;
});

test('使用 Math.E 作为索引', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  return buf[Math.E] === undefined;
});

test('使用 Math.SQRT2 作为索引', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  return buf[Math.SQRT2] === undefined;
});

// 特殊值写入边界
test('写入 Number.POSITIVE_INFINITY', () => {
  const buf = Buffer.alloc(1);
  buf[0] = Number.POSITIVE_INFINITY;
  return buf[0] === 0;
});

test('写入 Number.NEGATIVE_INFINITY', () => {
  const buf = Buffer.alloc(1);
  buf[0] = Number.NEGATIVE_INFINITY;
  return buf[0] === 0;
});

test('写入 Number.NaN', () => {
  const buf = Buffer.alloc(1);
  buf[0] = Number.NaN;
  return buf[0] === 0;
});

// 连续相同操作
test('连续读取同一索引 1000 次', () => {
  const buf = Buffer.from([123]);
  for (let i = 0; i < 1000; i++) {
    if (buf[0] !== 123) return false;
  }
  return true;
});

test('连续写入同一索引 1000 次', () => {
  const buf = Buffer.alloc(1);
  for (let i = 0; i < 1000; i++) {
    buf[0] = i % 256;
  }
  return buf[0] === 231;
});

test('连续覆盖写入', () => {
  const buf = Buffer.alloc(1);
  for (let i = 0; i < 256; i++) {
    buf[0] = i;
  }
  return buf[0] === 255;
});

// 索引范围扫描
test('扫描所有有效索引', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf[i] = i;
  }
  let allMatch = true;
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== i) {
      allMatch = false;
      break;
    }
  }
  return allMatch;
});

test('扫描所有越界索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  let allUndefined = true;
  for (let i = 3; i < 10; i++) {
    if (buf[i] !== undefined) {
      allUndefined = false;
      break;
    }
  }
  return allUndefined;
});

// 写入后立即验证
test('写入后立即验证 100 次', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 100; i++) {
    const idx = i % 10;
    const val = i % 256;
    buf[idx] = val;
    if (buf[idx] !== val) return false;
  }
  return true;
});

// 多 Buffer 并发操作
test('多个 Buffer 独立索引操作', () => {
  const buf1 = Buffer.alloc(5);
  const buf2 = Buffer.alloc(5);
  const buf3 = Buffer.alloc(5);
  
  for (let i = 0; i < 5; i++) {
    buf1[i] = i;
    buf2[i] = i + 10;
    buf3[i] = i + 20;
  }
  
  return buf1[2] === 2 && buf2[2] === 12 && buf3[2] === 22;
});

// 索引访问与方法调用混合
test('索引访问与 toString 混合', () => {
  const buf = Buffer.from([65, 66, 67]);
  const val = buf[0];
  const str = buf.toString();
  return val === 65 && str === 'ABC';
});

test('索引访问与 slice 混合', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const val = buf[2];
  const slice = buf.slice(1, 4);
  return val === 3 && slice[1] === 3;
});

test('索引访问与 fill 混合', () => {
  const buf = Buffer.alloc(5);
  buf[0] = 99;
  buf.fill(0, 1);
  return buf[0] === 99 && buf[1] === 0;
});

// 边界条件组合测试
test('最小和最大值组合', () => {
  const buf = Buffer.alloc(2);
  buf[0] = 0;
  buf[1] = 255;
  return buf[0] === 0 && buf[1] === 255;
});

test('所有字节值写入验证', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  for (let i = 0; i < 256; i++) {
    if (buf[i] !== i) return false;
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
