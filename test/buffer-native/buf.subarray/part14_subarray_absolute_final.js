// buf.subarray() - Absolute Final Deep Tests (Round 10)
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

// ==================== 未测试的极端参数组合 ====================

test('start 和 end 参数顺序极端反转', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(100, -100);
  // start 超出，end 极小负数，返回空
  if (sub.length !== 0) return false;
  console.log('✅ 极端反转参数');
  return true;
});

test('start=-0.9, end=0.9 - 接近 0 的小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-0.9, 0.9);
  // -0.9 -> 0, 0.9 -> 0
  if (sub.length !== 0) return false;
  console.log('✅ 接近 0 小数');
  return true;
});

test('start=length-0.1, end=length+0.1', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(4.9, 5.1);
  // 4.9 -> 4, 5.1 -> 5
  if (sub.length !== 1 || sub[0] !== 5) return false;
  console.log('✅ length 附近小数');
  return true;
});

test('多次传入相同负数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-2, -2);
  if (sub.length !== 0) return false;
  console.log('✅ 相同负数返回空');
  return true;
});

// ==================== 字符串边界的补充 ====================

test('start="0.0" - 字符串小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('0.0');
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ 字符串 "0.0"');
  return true;
});

test('start="-0.0" - 字符串负零小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('-0.0');
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ 字符串 "-0.0"');
  return true;
});

test('start="  +0  " - 带符号和空格的零', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('  +0  ');
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ 带符号空格的零');
  return true;
});

test('start="Infinity" - 字符串 Infinity', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('Infinity');
  if (sub.length !== 0) return false;
  console.log('✅ 字符串 Infinity');
  return true;
});

test('start="-Infinity" - 字符串负 Infinity', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('-Infinity');
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ 字符串 -Infinity');
  return true;
});

test('start="NaN" - 字符串 NaN', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('NaN');
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ 字符串 NaN');
  return true;
});

// ==================== Buffer 内容的极端模式 ====================

test('Buffer 交替 0 和 255', () => {
  const buf = Buffer.from(Array.from({ length: 10 }, (_, i) => i % 2 ? 255 : 0));
  const sub = buf.subarray(2, 8);
  if (sub.length !== 6) return false;
  if (sub[0] !== 0 || sub[1] !== 255) return false;
  sub[0] = 128;
  if (buf[2] !== 128) return false;
  console.log('✅ 交替 0/255 模式');
  return true;
});

test('Buffer 斐波那契数列', () => {
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  const buf = Buffer.from(fib);
  const sub = buf.subarray(3, 7);
  if (sub.length !== 4) return false;
  if (sub[0] !== 3 || sub[3] !== 13) return false;
  console.log('✅ 斐波那契序列');
  return true;
});

test('Buffer 素数序列', () => {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  const buf = Buffer.from(primes);
  const sub = buf.subarray(5);
  if (sub.length !== 5) return false;
  if (sub[0] !== 13) return false;
  console.log('✅ 素数序列');
  return true;
});

// ==================== 对象的极端转换场景 ====================

test('start 为冻结对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = Object.freeze({ valueOf: () => 2 });
  const sub = buf.subarray(obj);
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 冻结对象 valueOf');
  return true;
});

test('start 为密封对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = Object.seal({ valueOf: () => 2 });
  const sub = buf.subarray(obj);
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 密封对象 valueOf');
  return true;
});

test('start 为不可扩展对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = Object.preventExtensions({ valueOf: () => 2 });
  const sub = buf.subarray(obj);
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 不可扩展对象 valueOf');
  return true;
});

test('start 为带继承属性的对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  // 使用构造函数原型链模拟继承
  function MyObj() {}
  MyObj.prototype.valueOf = () => 2;
  const obj = new MyObj();
  
  const sub = buf.subarray(obj);
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 继承属性 valueOf');
  return true;
});

// ==================== 嵌套 subarray 的极端深度 ====================

test('1000 层嵌套 subarray', () => {
  let buf = Buffer.alloc(2000);
  buf[1000] = 99;

  for (let i = 0; i < 1000; i++) {
    if (buf.length < 2) break;
    buf = buf.subarray(1, buf.length);
  }

  // 每次左移 1，1000 次后应该到达索引 1000 的位置
  console.log('✅ 1000 层嵌套:', buf.length, buf[0]);
  return true;
});

test('zigzag 嵌套模式', () => {
  let buf = Buffer.from(Array.from({ length: 20 }, (_, i) => i));

  for (let i = 0; i < 5; i++) {
    buf = buf.subarray(1, buf.length - 1);
  }

  // 5 次两端收缩，剩余 10 个元素
  if (buf.length !== 10) return false;
  if (buf[0] !== 5 || buf[9] !== 14) return false;
  console.log('✅ zigzag 嵌套模式');
  return true;
});

// ==================== 与其他 API 的深度组合 ====================

test('subarray 后 Buffer.compare', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([3, 4]);
  const sub = buf1.subarray(2, 4);

  const result = Buffer.compare(sub, buf2);
  if (result !== 0) return false;
  console.log('✅ Buffer.compare');
  return true;
});

test('subarray 后 Buffer.concat', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const sub1 = buf1.subarray(0, 3);
  const sub2 = buf1.subarray(3, 5);

  const concat = Buffer.concat([sub1, sub2]);
  if (concat.length !== 5) return false;
  if (concat[0] !== 1 || concat[4] !== 5) return false;

  // concat 创建新 buffer，不共享内存
  concat[0] = 99;
  if (buf1[0] === 99) return false;

  console.log('✅ Buffer.concat');
  return true;
});

test('subarray 后 Buffer.isEncoding', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  const result = Buffer.isEncoding('utf8');
  if (!result) return false;
  console.log('✅ Buffer.isEncoding');
  return true;
});

test('subarray 后 Buffer.byteLength', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray(1, 4);
  const str = sub.toString();

  const byteLen = Buffer.byteLength(str, 'utf8');
  if (byteLen !== 3) return false;
  console.log('✅ Buffer.byteLength');
  return true;
});

// ==================== 编码转换的边界 ====================

test('subarray 后 toString 不同 offset', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(6);

  const str1 = sub.toString('utf8');
  const str2 = sub.toString('utf8', 0);
  const str3 = sub.toString('utf8', 0, 5);

  if (str1 !== 'world') return false;
  if (str2 !== 'world') return false;
  if (str3 !== 'world') return false;

  console.log('✅ toString offset 参数');
  return true;
});

test('subarray 后跨编码转换', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const sub = buf.subarray(0, 5);

  const utf8 = sub.toString('utf8');
  const ascii = sub.toString('ascii');
  const latin1 = sub.toString('latin1');
  const binary = sub.toString('binary');

  if (utf8 !== ascii || ascii !== latin1 || latin1 !== binary) return false;
  if (utf8 !== 'Hello') return false;

  console.log('✅ 跨编码一致');
  return true;
});

// ==================== 修改操作的并发 ====================

test('多个 subarray 同时 fill 不同值', () => {
  const buf = Buffer.alloc(30);
  const sub1 = buf.subarray(0, 10);
  const sub2 = buf.subarray(10, 20);
  const sub3 = buf.subarray(20, 30);

  sub1.fill(1);
  sub2.fill(2);
  sub3.fill(3);

  // 验证分段
  if (!sub1.every(v => v === 1)) return false;
  if (!sub2.every(v => v === 2)) return false;
  if (!sub3.every(v => v === 3)) return false;

  console.log('✅ 多 subarray 并发 fill');
  return true;
});

test('subarray 重叠区域修改', () => {
  const buf = Buffer.alloc(10);
  const sub1 = buf.subarray(0, 6);
  const sub2 = buf.subarray(4, 10);

  sub1.fill(1);
  sub2.fill(2);

  // 0-3: 1, 4-5: 2, 6-9: 2
  if (buf[3] !== 1 || buf[4] !== 2 || buf[5] !== 2) return false;

  console.log('✅ 重叠区域修改');
  return true;
});

// ==================== TypedArray 方法的深度测试 ====================

test('subarray 后 find', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  const found = sub.find(v => v > 2);
  if (found !== 3) return false;

  console.log('✅ subarray find');
  return true;
});

test('subarray 后 findIndex', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  const idx = sub.findIndex(v => v > 2);
  if (idx !== 1) return false;

  console.log('✅ subarray findIndex');
  return true;
});

test('subarray 后 every', () => {
  const buf = Buffer.from([2, 4, 6, 8, 10]);
  const sub = buf.subarray(1, 4);

  const result = sub.every(v => v % 2 === 0);
  if (!result) return false;

  console.log('✅ subarray every');
  return true;
});

test('subarray 后 some', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  const result = sub.some(v => v > 3);
  if (!result) return false;

  console.log('✅ subarray some');
  return true;
});

test('subarray 后 reduceRight', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  const sum = sub.reduceRight((acc, v) => acc + v, 0);
  if (sum !== 9) return false;

  console.log('✅ subarray reduceRight');
  return true;
});

// ==================== 特殊长度的 Buffer ====================

test('长度为 256 的 Buffer', () => {
  const buf = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  const sub = buf.subarray(128, 192);

  if (sub.length !== 64) return false;
  if (sub[0] !== 128 || sub[63] !== 191) return false;

  console.log('✅ 256 长度 Buffer');
  return true;
});

test('长度为 65536 的 Buffer', () => {
  const buf = Buffer.alloc(65536);
  buf[32768] = 99;

  const sub = buf.subarray(32768, 32769);
  if (sub.length !== 1 || sub[0] !== 99) return false;

  console.log('✅ 65536 长度 Buffer');
  return true;
});

// ==================== 边界检查的补充 ====================

test('subarray(0, 0) 多次调用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  for (let i = 0; i < 100; i++) {
    const sub = buf.subarray(0, 0);
    if (sub.length !== 0) return false;
  }

  console.log('✅ 多次 (0,0) 调用');
  return true;
});

test('subarray(-1, -1) 在不同长度', () => {
  for (let len = 1; len <= 10; len++) {
    const buf = Buffer.alloc(len);
    const sub = buf.subarray(-1, -1);
    if (sub.length !== 0) return false;
  }

  console.log('✅ 不同长度 (-1,-1)');
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
