// buf.writeInt16BE() - 第10轮补充：终极压力和非常规场景
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

// 大量连续相同操作
test('连续写入相同值 10000 次', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 10000; i++) {
    buf.writeInt16BE(100, 0);
  }
  return buf.readInt16BE(0) === 100;
});

test('交替写入两个值 5000 次', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 5000; i++) {
    buf.writeInt16BE(100, 0);
    buf.writeInt16BE(200, 0);
  }
  return buf.readInt16BE(0) === 200;
});

test('快速连续写入不同位置', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 1000; i++) {
    buf.writeInt16BE(i % 100, (i % 9) * 2);
  }
  return true;
});

// 极限嵌套和递归
test('嵌套对象的 valueOf 10 层', () => {
  const buf = Buffer.alloc(10);
  let obj = { valueOf: () => 100 };
  for (let i = 0; i < 9; i++) {
    const prev = obj;
    obj = { valueOf: () => prev.valueOf() };
  }
  buf.writeInt16BE(obj, 0);
  return buf.readInt16BE(0) === 100;
});

// 零字节测试
test('写入后所有未触及字节仍为 0', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(100, 2);
  return buf[0] === 0 && buf[1] === 0 &&
         buf[4] === 0 && buf[5] === 0;
});

test('连续零值写入', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 5; i++) {
    buf.writeInt16BE(0, i * 2);
  }
  return buf.every(byte => byte === 0);
});

// 交叉类型写入
test('Int16BE 和 UInt8 交织写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(0x1234, 0);
  buf.writeUInt8(0xAA, 2);
  buf.writeInt16BE(0x5678, 3);
  buf.writeUInt8(0xBB, 5);
  return buf[0] === 0x12 && buf[1] === 0x34 &&
         buf[2] === 0xAA &&
         buf[3] === 0x56 && buf[4] === 0x78 &&
         buf[5] === 0xBB;
});

test('Int16BE 和 Int32BE 交错', () => {
  const buf = Buffer.alloc(12);
  buf.writeInt16BE(0x1122, 0);
  buf.writeInt32BE(0x33445566, 2);
  buf.writeInt16BE(0x7788, 6);
  return buf[0] === 0x11 && buf[1] === 0x22 &&
         buf[2] === 0x33 && buf[3] === 0x44 &&
         buf[6] === 0x77 && buf[7] === 0x88;
});

test('Int16BE 和 FloatBE 交错', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(100, 0);
  buf.writeFloatBE(3.14, 2);
  buf.writeInt16BE(200, 6);
  return buf.readInt16BE(0) === 100 && buf.readInt16BE(6) === 200;
});

test('Int16BE 和 DoubleBE 交错', () => {
  const buf = Buffer.alloc(12);
  buf.writeInt16BE(100, 0);
  buf.writeDoubleBE(2.718, 2);
  buf.writeInt16BE(200, 10);
  return buf.readInt16BE(0) === 100 && buf.readInt16BE(10) === 200;
});

// Buffer 比较操作
test('两个写入相同值的 buffer 相等', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt16BE(12345, 0);
  buf2.writeInt16BE(12345, 0);
  return buf1.equals(buf2.subarray(0, 4));
});

test('写入不同值的 buffer 不相等', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt16BE(100, 0);
  buf2.writeInt16BE(200, 0);
  return !buf1.equals(buf2);
});

// 边界地址测试
test('写入到 buffer 倒数第二和第三字节', () => {
  const buf = Buffer.alloc(100);
  buf.writeInt16BE(999, 98);
  return buf[98] === 0x03 && buf[99] === 0xE7;
});

test('多个 buffer 并行写入不互相影响', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  const buf3 = Buffer.alloc(4);
  buf1.writeInt16BE(111, 0);
  buf2.writeInt16BE(222, 0);
  buf3.writeInt16BE(333, 0);
  return buf1.readInt16BE(0) === 111 &&
         buf2.readInt16BE(0) === 222 &&
         buf3.readInt16BE(0) === 333;
});

// 特殊数值序列
test('写入斐波那契数列前10项', () => {
  const buf = Buffer.alloc(20);
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  for (let i = 0; i < fib.length; i++) {
    buf.writeInt16BE(fib[i], i * 2);
  }
  for (let i = 0; i < fib.length; i++) {
    if (buf.readInt16BE(i * 2) !== fib[i]) return false;
  }
  return true;
});

test('写入质数序列', () => {
  const buf = Buffer.alloc(20);
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  for (let i = 0; i < primes.length; i++) {
    buf.writeInt16BE(primes[i], i * 2);
  }
  for (let i = 0; i < primes.length; i++) {
    if (buf.readInt16BE(i * 2) !== primes[i]) return false;
  }
  return true;
});

test('写入 2 的幂次序列', () => {
  const buf = Buffer.alloc(30);
  const powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];
  for (let i = 0; i < powers.length; i++) {
    buf.writeInt16BE(powers[i], i * 2);
  }
  for (let i = 0; i < powers.length; i++) {
    if (buf.readInt16BE(i * 2) !== powers[i]) return false;
  }
  return true;
});

// 特殊组合模式
test('正负交替写入 100 个值', () => {
  const buf = Buffer.alloc(200);
  for (let i = 0; i < 100; i++) {
    const val = i % 2 === 0 ? i : -i;
    buf.writeInt16BE(val, i * 2);
  }
  for (let i = 0; i < 100; i++) {
    const expected = i % 2 === 0 ? i : -i;
    if (buf.readInt16BE(i * 2) !== expected) return false;
  }
  return true;
});

test('递增后递减写入', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 5; i++) {
    buf.writeInt16BE(i * 100, i * 2);
  }
  for (let i = 5; i < 10; i++) {
    buf.writeInt16BE((9 - i) * 100, i * 2);
  }
  return buf.readInt16BE(0) === 0 &&
         buf.readInt16BE(8) === 400 &&
         buf.readInt16BE(18) === 0;
});

// toString/toJSON 与写入的交互
test('写入后 toString 不受影响', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(0x4142, 0); // 'AB'
  const str = buf.toString('utf8', 0, 2);
  return str === 'AB';
});

test('写入后 toJSON 正确', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x0102, 0);
  const json = buf.toJSON();
  return json.type === 'Buffer' &&
         json.data[0] === 0x01 &&
         json.data[1] === 0x02;
});

// Buffer.copy 后写入
test('copy 后的 buffer 独立写入', () => {
  const src = Buffer.alloc(10);
  const dst = Buffer.alloc(10);
  src.writeInt16BE(100, 0);
  src.copy(dst);
  dst.writeInt16BE(200, 0);
  return src.readInt16BE(0) === 100 && dst.readInt16BE(0) === 200;
});

// 特殊值的按位表示
test('写入所有字节 0xAA 的模式', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-21846, 0); // 0xAAAA
  return buf[0] === 0xAA && buf[1] === 0xAA;
});

test('写入所有字节 0x55 的模式', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x5555, 0);
  return buf[0] === 0x55 && buf[1] === 0x55;
});

test('写入棋盘模式 0xA5', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-23131, 0); // 0xA5A5
  return buf[0] === 0xA5 && buf[1] === 0xA5;
});

test('写入反棋盘模式 0x5A', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x5A5A, 0);
  return buf[0] === 0x5A && buf[1] === 0x5A;
});

// 极限性能测试
test('大 buffer 随机位置写入 1000 次', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 1000; i++) {
    const offset = Math.floor(Math.random() * 4999) * 2;
    buf.writeInt16BE(i, offset);
  }
  return true;
});

test('小 buffer 密集写入', () => {
  const buf = Buffer.alloc(4);
  for (let i = -1000; i < 1000; i++) {
    if (i >= -32768 && i <= 32767) {
      buf.writeInt16BE(i, 0);
    }
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
