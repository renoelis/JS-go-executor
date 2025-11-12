// buf.values() - 错误处理测试
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

// 测试 1：在 null 上调用 values 应抛出 TypeError
test('在 null 上调用 values 应抛出 TypeError', () => {
  try {
    Buffer.prototype.values.call(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 2：在 undefined 上调用 values 应抛出 TypeError
test('在 undefined 上调用 values 应抛出 TypeError', () => {
  try {
    Buffer.prototype.values.call(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 3：在普通对象上调用 values 应抛出 TypeError
test('在普通对象上调用 values 应抛出 TypeError', () => {
  try {
    Buffer.prototype.values.call({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 4：在数组上调用 values 应抛出 TypeError
test('在数组上调用 values 应抛出 TypeError', () => {
  try {
    Buffer.prototype.values.call([1, 2, 3]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 5：在字符串上调用 values 应抛出 TypeError
test('在字符串上调用 values 应抛出 TypeError', () => {
  try {
    Buffer.prototype.values.call('hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 6：在数字上调用 values 应抛出 TypeError
test('在数字上调用 values 应抛出 TypeError', () => {
  try {
    Buffer.prototype.values.call(123);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 7：在布尔值上调用 values 应抛出 TypeError
test('在布尔值上调用 values 应抛出 TypeError', () => {
  try {
    Buffer.prototype.values.call(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 8：在 Symbol 上调用 values 应抛出 TypeError
test('在 Symbol 上调用 values 应抛出 TypeError', () => {
  try {
    Buffer.prototype.values.call(Symbol('test'));
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 9：values 方法不接受参数（传入参数应被忽略）
test('传入参数应被忽略，不影响迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values('ignored', 123, null);
  const values = [...iter];
  if (values.length !== 3) return false;
  if (values[0] !== 1 || values[2] !== 3) return false;
  return true;
});

// 测试 10：在 Uint16Array 上调用 values（返回元素值）
test('在 Uint16Array 上调用 values 应返回元素值', () => {
  const uint16 = new Uint16Array([256, 512, 768]);
  const iter = Buffer.prototype.values.call(uint16);
  const values = [...iter];
  // 返回 3 个元素值，而不是 6 个字节
  if (values.length !== 3) return false;
  if (values[0] !== 256 || values[1] !== 512 || values[2] !== 768) return false;
  return true;
});

// 测试 11：在 Int32Array 上调用 values（返回元素值）
test('在 Int32Array 上调用 values 应返回元素值', () => {
  const int32 = new Int32Array([100, 200]);
  const iter = Buffer.prototype.values.call(int32);
  const values = [...iter];
  // 返回 2 个元素值，而不是 8 个字节
  if (values.length !== 2) return false;
  if (values[0] !== 100 || values[1] !== 200) return false;
  return true;
});

// 测试 12：在 Float64Array 上调用 values（返回元素值）
test('在 Float64Array 上调用 values 应返回元素值', () => {
  const float64 = new Float64Array([1.5, 2.5]);
  const iter = Buffer.prototype.values.call(float64);
  const values = [...iter];
  // 返回 2 个元素值，而不是 16 个字节
  if (values.length !== 2) return false;
  if (values[0] !== 1.5 || values[1] !== 2.5) return false;
  return true;
});

// 测试 13：在类 Buffer 对象上调用（只有 length 属性）
test('在只有 length 属性的对象上调用应抛出 TypeError', () => {
  try {
    const fakeBuf = { length: 3, 0: 1, 1: 2, 2: 3 };
    Buffer.prototype.values.call(fakeBuf);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 14：在 DataView 上调用 values
test('在 DataView 上调用 values 应抛出 TypeError', () => {
  try {
    const ab = new ArrayBuffer(8);
    const dv = new DataView(ab);
    Buffer.prototype.values.call(dv);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 15：迭代器的 next 方法不接受参数
test('迭代器的 next 方法传入参数应被忽略', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  const first = iter.next('ignored');
  const second = iter.next(999);
  const third = iter.next({ foo: 'bar' });

  if (first.value !== 1 || second.value !== 2 || third.value !== 3) return false;
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