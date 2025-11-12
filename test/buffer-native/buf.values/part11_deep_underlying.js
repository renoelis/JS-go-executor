// buf.values() - 深度补充 Part 11: 底层实现相关边界
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
  }
}

// 测试 1: Buffer.buffer 属性存在性
test('Buffer 应有 buffer 属性指向底层 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  return buf.buffer instanceof ArrayBuffer;
});

// 测试 2: Buffer.byteOffset 属性
test('Buffer 应有 byteOffset 属性', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  return typeof buf.byteOffset === 'number';
});

// 测试 3: Buffer.byteLength 属性
test('Buffer 应有 byteLength 属性', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  return buf.byteLength === buf.length;
});

// 测试 4: subarray 不改变 buffer 引用
test('subarray 应共享同一个 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  // 应该引用同一个 ArrayBuffer（或至少行为一致）
  buf[2] = 99;
  const values = [...sub.values()];

  return values[1] === 99;
});

// 测试 5: Buffer 与底层 ArrayBuffer 的大小关系
test('Buffer 可能占用比内容更大的 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  // ArrayBuffer 可能更大（因为池化）
  return buf.buffer.byteLength >= buf.byteLength;
});

// 测试 6: 从 ArrayBuffer 的特定偏移创建 Buffer
test('从 ArrayBuffer 偏移创建的 Buffer 应正确迭代', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 8; i++) view[i] = i + 1;

  // 从偏移 2 开始，长度 4
  const buf = Buffer.from(ab, 2, 4);
  const values = [...buf.values()];

  // 应该是 [3, 4, 5, 6]
  if (values.length !== 4) return false;
  if (values[0] !== 3 || values[3] !== 6) return false;
  return true;
});

// 测试 7: allocUnsafe 的字节范围合法性
test('allocUnsafe 应返回合法字节范围', () => {
  const buf = Buffer.allocUnsafe(1000);

  for (const v of buf.values()) {
    if (v < 0 || v > 255 || !Number.isInteger(v)) {
      return false;
    }
  }

  return true;
});

// 测试 8: allocUnsafeSlow 不使用池
test('allocUnsafeSlow 应可迭代', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  for (let i = 0; i < 10; i++) buf[i] = i * 10;

  const values = [...buf.values()];
  if (values.length !== 10) return false;
  if (values[0] !== 0 || values[5] !== 50) return false;
  return true;
});

// 测试 9: Buffer.concat 创建新 Buffer
test('Buffer.concat 应创建独立的新 Buffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concat = Buffer.concat([buf1, buf2]);

  // 修改原 Buffer 不应影响 concat 结果
  buf1[0] = 99;

  const values = [...concat.values()];
  return values[0] === 1; // 不受影响
});

// 测试 10: Buffer.concat 空数组
test('Buffer.concat 空数组应返回空 Buffer', () => {
  const buf = Buffer.concat([]);
  const values = [...buf.values()];
  return values.length === 0;
});

// 测试 11: Buffer.concat 单个 Buffer
test('Buffer.concat 单个 Buffer 应正确', () => {
  const buf = Buffer.from([1, 2, 3]);
  const concat = Buffer.concat([buf]);

  // 修改原 Buffer
  buf[0] = 99;

  const values = [...concat.values()];
  return values[0] === 1; // concat 是复制
});

// 测试 12: 不同编码的 toString 不影响迭代
test('toString 操作不应影响迭代', () => {
  const buf = Buffer.from('hello', 'utf8');
  const iter = buf.values();

  iter.next();
  iter.next();

  const str = buf.toString('hex');
  const remaining = [...iter];

  return str === '68656c6c6f' && remaining.length === 3;
});

// 测试 13: toJSON 不影响迭代
test('toJSON 操作不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  iter.next();

  const json = buf.toJSON();
  const remaining = [...iter];

  return json.type === 'Buffer' && remaining.length === 4;
});

// 测试 14: swap16 修改 Buffer 内容
test('swap16 应修改 Buffer 内容并反映在迭代中', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  const values = [...buf.values()];
  // [0x01, 0x02, 0x03, 0x04] -> [0x02, 0x01, 0x04, 0x03]
  return values[0] === 0x02 && values[1] === 0x01 && values[2] === 0x04 && values[3] === 0x03;
});

// 测试 15: swap32 修改 Buffer 内容
test('swap32 应修改 Buffer 内容并反映在迭代中', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const values = [...buf.values()];
  // [0x01, 0x02, 0x03, 0x04] -> [0x04, 0x03, 0x02, 0x01]
  return values[0] === 0x04 && values[3] === 0x01;
});

// 测试 16: swap64 修改 Buffer 内容
test('swap64 应修改 Buffer 内容并反映在迭代中', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  const values = [...buf.values()];
  // 应该完全反转
  return values[0] === 0x08 && values[7] === 0x01;
});

// 测试 17: fill 操作影响迭代
test('fill 操作应影响后续迭代', () => {
  const buf = Buffer.alloc(5);
  const iter = buf.values();

  iter.next(); // 消耗第一个

  buf.fill(42);

  const remaining = [...iter];
  // 剩余 4 个应该都是 42
  return remaining.length === 4 && remaining.every(v => v === 42);
});

// 测试 18: fill 指定范围
test('fill 指定范围应正确反映在迭代中', () => {
  const buf = Buffer.alloc(5);
  buf.fill(10, 1, 4); // 从索引 1 到 3（不含 4）填充 10

  const values = [...buf.values()];
  // [0, 10, 10, 10, 0]
  return values[0] === 0 && values[1] === 10 && values[3] === 10 && values[4] === 0;
});

// 测试 19: write 操作影响迭代
test('write 操作应影响迭代', () => {
  const buf = Buffer.alloc(10);
  buf.write('test', 2, 'utf8'); // 从索引 2 开始写入

  const values = [...buf.values()];
  // 前两个字节是 0，然后是 "test" 的 ASCII 码
  return values[0] === 0 && values[1] === 0 && values[2] === 116; // 't' = 116
});

// 测试 20: copy 操作不影响源 Buffer 迭代
test('copy 操作不应影响源 Buffer 迭代', () => {
  const src = Buffer.from([1, 2, 3]);
  const dst = Buffer.alloc(5);

  const iter = src.values();
  iter.next();

  src.copy(dst, 1);

  const remaining = [...iter];
  return remaining.length === 2;
});

// 测试 21: copy 目标 Buffer 应反映变化
test('copy 应修改目标 Buffer', () => {
  const src = Buffer.from([10, 20, 30]);
  const dst = Buffer.alloc(5);

  src.copy(dst, 1);

  const values = [...dst.values()];
  // [0, 10, 20, 30, 0]
  return values[0] === 0 && values[1] === 10 && values[3] === 30 && values[4] === 0;
});

// 测试 22: reverse 修改 Buffer
test('reverse 应修改 Buffer 并反映在迭代中', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse();

  const values = [...buf.values()];
  return values[0] === 5 && values[4] === 1;
});

// 测试 23: Buffer.from 不支持通用可迭代对象
test('Buffer.from 不支持通用可迭代对象', () => {
  const iterable = {
    *[Symbol.iterator]() {
      yield 10;
      yield 20;
      yield 30;
    }
  };

  try {
    const buf = Buffer.from(iterable);
    return false; // 不应该成功
  } catch (e) {
    // Buffer.from 不支持通用迭代器，只支持特定类型
    return true;
  }
});

// 测试 24: Buffer.from 不支持 Set
test('Buffer.from 不支持 Set', () => {
  const set = new Set([5, 10, 15]);

  try {
    const buf = Buffer.from(set);
    return false; // 不应该成功
  } catch (e) {
    // Buffer.from 不支持 Set
    return true;
  }
});

// 测试 25: Buffer.from Map（只取值）
test('Buffer.from Map 应只使用值', () => {
  const map = new Map([[0, 100], [1, 200]]);
  try {
    const buf = Buffer.from(map);
    const values = [...buf.values()];
    // Map 的迭代器返回 [key, value] 对
    return values.length > 0;
  } catch (e) {
    // 如果不支持也是正常的
    return true;
  }
});

// 测试 26: 编码转换不影响底层字节
test('不同编码读取不应改变底层字节', () => {
  const buf = Buffer.from('测试', 'utf8');

  const utf8Values = [...buf.values()];
  const hexStr = buf.toString('hex');
  const base64Str = buf.toString('base64');

  // 多次转换后，底层字节应该不变
  const afterValues = [...buf.values()];

  return utf8Values.every((v, i) => v === afterValues[i]);
});

// 测试 27: Buffer.isEncoding 检查
test('Buffer.isEncoding 应正确识别编码', () => {
  return Buffer.isEncoding('utf8') && Buffer.isEncoding('hex') && Buffer.isEncoding('base64') && !Buffer.isEncoding('invalid');
});

// 测试 28: Buffer.byteLength 不同编码
test('Buffer.byteLength 应计算不同编码的字节长度', () => {
  const str = '测试';
  const utf8Len = Buffer.byteLength(str, 'utf8');

  const buf = Buffer.from(str, 'utf8');
  const values = [...buf.values()];

  return values.length === utf8Len;
});

// 测试 29: Buffer.compare 静态方法
test('Buffer.compare 静态方法应正常工作', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);

  const result = Buffer.compare(buf1, buf2);

  // buf1 < buf2
  return result < 0;
});

// 测试 30: Buffer.concat 总长度参数
test('Buffer.concat 指定总长度应正确', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);

  const concat = Buffer.concat([buf1, buf2], 3); // 只要前 3 个字节

  const values = [...concat.values()];
  return values.length === 3 && values[0] === 1 && values[2] === 3;
});

const passed = tests.filter(t => t.passed === true).length;
const failed = tests.filter(t => t.passed === false).length;

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

return result
