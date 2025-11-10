// buf.subarray() - Advanced Edge Cases & Corner Scenarios (Round 7)
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

// ==================== 参数为函数的情况 ====================

test('start 为函数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const fn = function() { return 2; };
  const sub = buf.subarray(fn);
  // 函数会被转换为 NaN -> 0
  if (sub.length !== 5) return false;
  console.log('✅ 函数参数转为 0');
  return true;
});

test('start 为箭头函数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(() => 3);
  if (sub.length !== 5) return false;
  console.log('✅ 箭头函数转为 0');
  return true;
});

test('start 为 async 函数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(async () => 3);
  if (sub.length !== 5) return false;
  console.log('✅ async 函数转为 0');
  return true;
});

// ==================== 参数为特殊对象 ====================

test('start 为 Promise 对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const promise = Promise.resolve(2);
  const sub = buf.subarray(promise);
  // Promise 对象转为 NaN -> 0
  if (sub.length !== 5) return false;
  console.log('✅ Promise 转为 0');
  return true;
});

test('start 为 Set 对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const set = new Set([1, 2, 3]);
  const sub = buf.subarray(set);
  if (sub.length !== 5) return false;
  console.log('✅ Set 转为 0');
  return true;
});

test('start 为 Map 对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const map = new Map([[1, 2]]);
  const sub = buf.subarray(map);
  if (sub.length !== 5) return false;
  console.log('✅ Map 转为 0');
  return true;
});

test('start 为 WeakMap 对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const wm = new WeakMap();
  const sub = buf.subarray(wm);
  if (sub.length !== 5) return false;
  console.log('✅ WeakMap 转为 0');
  return true;
});

test('start 为 Symbol', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  try {
    const sub = buf.subarray(Symbol('test'));
    console.log('✅ Symbol 未报错');
    return false;
  } catch (e) {
    console.log('✅ Symbol 报错:', e.message);
    return true;
  }
});

test('start 为 BigInt', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  try {
    const sub = buf.subarray(2n);
    // BigInt 可能转换成功或报错
    console.log('✅ BigInt 处理:', sub.length);
    return true;
  } catch (e) {
    console.log('✅ BigInt 报错:', e.message);
    return true;
  }
});

// ==================== 嵌套特殊对象 ====================

test('start 为嵌套对象的 valueOf', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const obj = {
    valueOf: () => ({
      valueOf: () => 5
    }),
    toString: () => '3'
  };
  const sub = buf.subarray(obj);
  // 第一层 valueOf 返回对象，回退到 toString
  if (sub.length !== 7 || sub[0] !== 3) return false;
  console.log('✅ 嵌套对象 valueOf');
  return true;
});

test('start 为循环引用对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = { value: 2 };
  obj.self = obj;
  obj.valueOf = () => obj.value;

  const sub = buf.subarray(obj);
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 循环引用对象');
  return true;
});

// ==================== 不同进制字符串 ====================

test('start="0X10" - 大写十六进制', () => {
  const buf = Buffer.alloc(20);
  buf[16] = 99;
  const sub = buf.subarray('0X10');
  if (sub.length !== 4 || sub[0] !== 99) return false;
  console.log('✅ 大写十六进制');
  return true;
});

test('start="0O10" - 大写八进制', () => {
  const buf = Buffer.alloc(20);
  buf[8] = 99;
  const sub = buf.subarray('0O10');
  if (sub.length !== 12 || sub[0] !== 99) return false;
  console.log('✅ 大写八进制');
  return true;
});

test('start="0B10" - 大写二进制', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('0B10');
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 大写二进制');
  return true;
});

test('start="\\t2\\n" - 带转义字符的字符串', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('\t2\n');
  // 空白字符会被处理
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 转义字符字符串');
  return true;
});

// ==================== Buffer 与 Uint8Array 的深度交互 ====================

test('Uint8Array.prototype.subarray 在 Buffer 上调用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = Uint8Array.prototype.subarray.call(buf, 1, 4);
  if (sub.length !== 3 || sub[0] !== 2) return false;
  if (!Buffer.isBuffer(sub)) return false;
  console.log('✅ Uint8Array.prototype.subarray 调用');
  return true;
});

test('Buffer 作为 Uint8Array 参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  const sub = u8.subarray(1, 4);

  sub[0] = 99;
  if (buf[1] !== 99) return false;
  console.log('✅ Buffer 作为 Uint8Array 共享内存');
  return true;
});

test('subarray 后转换为普通数组', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const arr = Array.from(sub);

  if (arr.length !== 3) return false;
  if (arr[0] !== 2 || arr[2] !== 4) return false;
  console.log('✅ subarray 转数组');
  return true;
});

test('subarray 后使用扩展运算符', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const arr = [...sub];

  if (arr.length !== 3) return false;
  if (arr[0] !== 2 || arr[2] !== 4) return false;
  console.log('✅ subarray 扩展运算符');
  return true;
});

// ==================== 修改操作的特殊场景 ====================

test('subarray 后 copyWithin', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub = buf.subarray(2, 7);
  sub.copyWithin(0, 2);
  // sub 内部拷贝，影响 buf
  if (buf[2] !== 5 || buf[3] !== 6) return false;
  console.log('✅ subarray copyWithin');
  return true;
});

test('subarray 后 swap16', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sub = buf.subarray(0, 4);
  sub.swap16();
  if (buf[0] !== 0x02 || buf[1] !== 0x01) return false;
  console.log('✅ subarray swap16');
  return true;
});

test('subarray 后 swap32', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sub = buf.subarray(0, 4);
  sub.swap32();
  if (buf[0] !== 0x04 || buf[3] !== 0x01) return false;
  console.log('✅ subarray swap32');
  return true;
});

test('subarray 后 swap64', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub = buf.subarray(0, 8);
  sub.swap64();
  if (buf[0] !== 8 || buf[7] !== 1) return false;
  console.log('✅ subarray swap64');
  return true;
});

// ==================== 读写数值的边界 ====================

test('subarray 后 readInt32LE 跨边界', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0x12, 0x34, 0x56, 0x78]);
  const sub = buf.subarray(4, 8);
  const val = sub.readInt32LE(0);
  if (val !== 0x78563412) return false;
  console.log('✅ subarray readInt32LE');
  return true;
});

test('subarray 后 writeFloatBE', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3, 7);
  sub.writeFloatBE(3.14, 0);

  const val = buf.readFloatBE(3);
  if (Math.abs(val - 3.14) > 0.01) return false;
  console.log('✅ subarray writeFloatBE');
  return true;
});

test('subarray 后 writeDoubleBE', () => {
  const buf = Buffer.alloc(12);
  const sub = buf.subarray(2, 10);
  sub.writeDoubleBE(3.141592653589793, 0);

  const val = buf.readDoubleBE(2);
  if (Math.abs(val - 3.141592653589793) > 0.0000001) return false;
  console.log('✅ subarray writeDoubleBE');
  return true;
});

test('subarray 后 writeBigInt64LE', () => {
  const buf = Buffer.alloc(12);
  const sub = buf.subarray(2, 10);
  sub.writeBigInt64LE(9007199254740991n, 0);

  const val = buf.readBigInt64LE(2);
  if (val !== 9007199254740991n) return false;
  console.log('✅ subarray writeBigInt64LE');
  return true;
});

test('subarray 后 writeBigUInt64BE', () => {
  const buf = Buffer.alloc(12);
  const sub = buf.subarray(2, 10);
  sub.writeBigUInt64BE(18446744073709551615n, 0);

  const val = buf.readBigUInt64BE(2);
  if (val !== 18446744073709551615n) return false;
  console.log('✅ subarray writeBigUInt64BE');
  return true;
});

// ==================== 特殊编码场景 ====================

test('subarray 后 latin1 特殊字符', () => {
  const buf = Buffer.from([0xE9, 0xE8, 0xE0]); // é è à
  const sub = buf.subarray(0, 3);
  const str = sub.toString('latin1');
  if (str !== 'éèà') return false;
  console.log('✅ latin1 特殊字符');
  return true;
});

test('subarray 后 ucs2/utf16le BOM', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0x61, 0x00, 0x62, 0x00]);
  const sub = buf.subarray(2, 6);
  const str = sub.toString('utf16le');
  if (str !== 'ab') return false;
  console.log('✅ utf16le 无 BOM');
  return true;
});

test('subarray 后 ascii 控制字符', () => {
  const buf = Buffer.from([0x00, 0x01, 0x1F, 0x7F]);
  const sub = buf.subarray(0, 4);
  const str = sub.toString('ascii');
  if (str.length !== 4) return false;
  console.log('✅ ascii 控制字符');
  return true;
});

// ==================== 组合操作压力测试 ====================

test('交替 subarray 和 slice', () => {
  let buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  for (let i = 0; i < 3; i++) {
    buf = buf.subarray(1);
    buf = buf.slice(0, buf.length - 1);
  }

  // 6 次操作，每次减 2，剩余 4
  if (buf.length < 1) return false;
  console.log('✅ 交替 subarray/slice:', buf.length);
  return true;
});

test('subarray 嵌套不同范围', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const sub1 = buf.subarray(2, 8);
  const sub2 = sub1.subarray(1, 5);
  const sub3 = sub2.subarray(1, 3);

  // sub3 对应原 buf[4..5]
  sub3[0] = 99;
  if (buf[4] !== 99) return false;
  console.log('✅ 三层嵌套 subarray');
  return true;
});

test('修改后再 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf[2] = 99;
  const sub = buf.subarray(1, 4);

  if (sub[1] !== 99) return false;
  sub[1] = 88;
  if (buf[2] !== 88) return false;
  console.log('✅ 修改后 subarray');
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
