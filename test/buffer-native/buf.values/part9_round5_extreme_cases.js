// buf.values() - 第 5 轮补漏：极端场景和兼容性再挑刺
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

// 测试 1：非常大的 Buffer 切片迭代
test('非常大的 Buffer 切片应正确迭代', () => {
  const size = 100000;
  const buf = Buffer.alloc(size, 0xFF);
  const slice = buf.slice(99990, 100000);

  const values = [...slice.values()];
  if (values.length !== 10) return false;
  for (const v of values) {
    if (v !== 0xFF) return false;
  }
  return true;
});

// 测试 2：迭代器与 Symbol.toStringTag
test('迭代器应有合适的 toStringTag', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  // 检查 toString 行为
  const str = Object.prototype.toString.call(iter);
  // 应该是 [object Array Iterator] 或类似
  return str.includes('Iterator') || str.includes('Object');
});

// 测试 3：迭代器与 Object.keys
test('迭代器对象的 keys 应该很少', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  const keys = Object.keys(iter);
  // 迭代器通常没有自有属性
  return keys.length === 0;
});

// 测试 4：迭代器与 Object.getOwnPropertyNames（禁用的替代方法）
test('迭代器应该没有额外的自有属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  // 使用 for...in 来检查可枚举属性
  const props = [];
  for (const prop in iter) {
    props.push(prop);
  }

  // 迭代器应该没有可枚举的自有属性
  return props.length === 0;
});

// 测试 5：特殊字节序列（UTF-8 边界）
test('UTF-8 多字节边界的字节迭代应正确', () => {
  // 测试 emoji 和特殊字符的字节表示
  const buf = Buffer.from('A\u00A9\u{1F4A9}', 'utf8');
  const values = [...buf.values()];

  // 'A' = 1 字节，© = 2 字节，💩 = 4 字节，共 7 字节
  if (values.length !== 7) return false;

  // 所有值都应该在 0-255 范围
  for (const v of values) {
    if (v < 0 || v > 255) return false;
  }
  return true;
});

// 测试 6：Buffer.from 使用 string 和不同编码的迭代一致性
test('不同编码创建的 Buffer 迭代应一致', () => {
  const str = 'test';
  const buf1 = Buffer.from(str, 'utf8');
  const buf2 = Buffer.from(str, 'ascii');

  const values1 = [...buf1.values()];
  const values2 = [...buf2.values()];

  // 对于纯 ASCII 字符，utf8 和 ascii 编码应该相同
  if (values1.length !== values2.length) return false;
  for (let i = 0; i < values1.length; i++) {
    if (values1[i] !== values2[i]) return false;
  }
  return true;
});

// 测试 7：Buffer 与 Array.from 的第二个参数（mapFn）
test('Array.from 的 mapFn 应正确应用到迭代器值', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const hexStrings = Array.from(buf.values(), v => v.toString(16).padStart(2, '0'));

  if (hexStrings.length !== 4) return false;
  if (hexStrings[0] !== '01' || hexStrings[3] !== '04') return false;
  return true;
});

// 测试 8：迭代器与 Array.prototype.concat
test('迭代器值数组应可用于 concat', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);

  const values1 = [...buf1.values()];
  const values2 = [...buf2.values()];
  const combined = values1.concat(values2);

  if (combined.length !== 4) return false;
  if (combined[0] !== 1 || combined[3] !== 4) return false;
  return true;
});

// 测试 9：迭代器与 Array.prototype.slice
test('迭代器值数组应可用于 slice', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const values = [...buf.values()];
  const sliced = values.slice(1, 4);

  if (sliced.length !== 3) return false;
  if (sliced[0] !== 20 || sliced[2] !== 40) return false;
  return true;
});

// 测试 10：迭代器与 Array.prototype.join
test('迭代器值数组应可用于 join', () => {
  const buf = Buffer.from([72, 101, 108, 108, 111]); // "Hello"
  const values = [...buf.values()];
  const joined = values.join(',');

  return joined === '72,101,108,108,111';
});

// 测试 11：迭代器与 Spread + Math.max
test('迭代器值应可用于 Math.max', () => {
  const buf = Buffer.from([5, 99, 23, 67, 12]);
  const values = [...buf.values()];
  const max = Math.max(...values);

  return max === 99;
});

// 测试 12：迭代器与 Spread + Math.min
test('迭代器值应可用于 Math.min', () => {
  const buf = Buffer.from([5, 99, 23, 67, 1]);
  const values = [...buf.values()];
  const min = Math.min(...values);

  return min === 1;
});

// 测试 13：混合 TypedArray 和 Buffer 的迭代
test('TypedArray 和 Buffer 的迭代器应可混合使用', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from([4, 5, 6]);

  const values1 = [...uint8.values()];
  const values2 = [...buf.values()];
  const combined = values1.concat(values2);

  if (combined.length !== 6) return false;
  if (combined[0] !== 1 || combined[5] !== 6) return false;
  return true;
});

// 测试 14：迭代器与 for-await-of（虽然是同步迭代器）
test('同步迭代器在普通 for...of 中应正常工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = [];

  // 注意：这里不能用 for await，因为是同步迭代器
  for (const v of buf.values()) {
    values.push(v);
  }

  return values.length === 3 && values[0] === 1 && values[2] === 3;
});

// 测试 15：迭代器与 JSON.parse 配合
test('迭代器值应可用于构造后 parse 回来', () => {
  const buf = Buffer.from([1, 2, 3]);
  const values = [...buf.values()];
  const json = JSON.stringify(values);
  const parsed = JSON.parse(json);

  if (!Array.isArray(parsed)) return false;
  if (parsed.length !== 3) return false;
  if (parsed[0] !== 1 || parsed[2] !== 3) return false;
  return true;
});

// 测试 16：重复调用 values() 应每次返回新的迭代器
test('重复调用 values() 应返回全新独立的迭代器', () => {
  const buf = Buffer.from([10, 20, 30]);

  const iter1 = buf.values();
  iter1.next();
  iter1.next();

  const iter2 = buf.values();
  const v1 = iter2.next().value;

  // iter2 应该从头开始
  return v1 === 10;
});

// 测试 17：Buffer 内容全为 0 的迭代
test('全 0 Buffer 的迭代应正确', () => {
  const buf = Buffer.alloc(100);
  let count = 0;

  for (const v of buf.values()) {
    if (v !== 0) return false;
    count++;
  }

  return count === 100;
});

// 测试 18：Buffer 内容为递增序列的迭代
test('递增序列 Buffer 的迭代应保持顺序', () => {
  const size = 256;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = i;
  }

  let prev = -1;
  for (const v of buf.values()) {
    if (v !== (prev + 1) % 256) return false;
    prev = v;
  }

  return true;
});

// 测试 19：迭代器与字符串模板
test('迭代器值应可用于字符串模板', () => {
  const buf = Buffer.from([72, 105]); // "Hi"
  const values = [...buf.values()];
  const message = `Values: ${values[0]}, ${values[1]}`;

  return message === 'Values: 72, 105';
});

// 测试 20：确保迭代器不会修改 Buffer
test('迭代过程不应修改 Buffer 内容', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const original = [...buf];

  // 完整迭代
  for (const v of buf.values()) {
    // 只读操作
  }

  // 检查 Buffer 未被修改
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== original[i]) return false;
  }

  return true;
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
