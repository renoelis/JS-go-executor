// buf.toJSON() - Deep Nesting, Collections, and Property Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// JSON.stringify 循环依赖
test('包含 Buffer 的循环引用对象无法序列化', () => {
  const obj = { buf: Buffer.from([1, 2, 3]) };
  obj.self = obj;

  let threw = false;
  try {
    JSON.stringify(obj);
  } catch (e) {
    threw = true;
    // 应该抛出循环引用错误
    if (!e.message.includes('circular') && !e.message.includes('Converting circular')) return false;
  }

  return threw;
});

test('Buffer 本身不会导致循环引用', () => {
  const buf = Buffer.from([1, 2, 3]);
  let threw = false;

  try {
    const str = JSON.stringify(buf);
    if (typeof str !== 'string') return false;
  } catch (e) {
    threw = true;
  }

  return !threw;
});

// toJSON 结果二次序列化
test('toJSON 结果可以再次 JSON.stringify', () => {
  const buf = Buffer.from([10, 20, 30]);
  const json = buf.toJSON();
  const str = JSON.stringify(json);
  const parsed = JSON.parse(str);

  if (parsed.type !== 'Buffer') return false;
  if (!Array.isArray(parsed.data)) return false;
  if (parsed.data.length !== 3) return false;

  return true;
});

test('toJSON 结果二次序列化后可重建 Buffer', () => {
  const original = Buffer.from([100, 101, 102]);
  const json = original.toJSON();
  const str = JSON.stringify(json);
  const parsed = JSON.parse(str);
  const rebuilt = Buffer.from(parsed.data);

  if (rebuilt.length !== original.length) return false;
  for (let i = 0; i < original.length; i++) {
    if (rebuilt[i] !== original[i]) return false;
  }

  return true;
});

// 多层嵌套
test('深层嵌套对象中的 Buffer', () => {
  const nested = {
    a: {
      b: {
        c: {
          d: {
            buf: Buffer.from([50, 60, 70])
          }
        }
      }
    }
  };

  const str = JSON.stringify(nested);
  const parsed = JSON.parse(str);

  if (parsed.a.b.c.d.buf.type !== 'Buffer') return false;
  if (parsed.a.b.c.d.buf.data.length !== 3) return false;

  return true;
});

test('数组中包含多个嵌套 Buffer', () => {
  const arr = [
    { buf: Buffer.from([1, 2]) },
    { nested: { buf: Buffer.from([3, 4]) } },
    { deep: { nested: { buf: Buffer.from([5, 6]) } } }
  ];

  const str = JSON.stringify(arr);
  const parsed = JSON.parse(str);

  if (parsed[0].buf.type !== 'Buffer') return false;
  if (parsed[1].nested.buf.type !== 'Buffer') return false;
  if (parsed[2].deep.nested.buf.type !== 'Buffer') return false;

  return true;
});

// Symbol 属性
test('Buffer 上的 Symbol 属性不影响 toJSON', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sym = Symbol('test');
  buf[sym] = 'hidden value';

  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json[sym] !== undefined) return false;

  return true;
});

test('toJSON 返回对象不包含 Symbol 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  const symbols = Object.getOwnPropertySymbols(json);
  if (symbols.length !== 0) return false;

  return true;
});

// Object.defineProperty
test('Buffer 上的自定义属性不包含在 toJSON 中', () => {
  const buf = Buffer.from([1, 2, 3]);
  Object.defineProperty(buf, 'customProp', {
    value: 'custom',
    enumerable: true,
    writable: true,
    configurable: true
  });

  const json = buf.toJSON();

  if (json.customProp !== undefined) return false;
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;

  return true;
});

test('Buffer 上的不可枚举属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  Object.defineProperty(buf, 'hidden', {
    value: 'secret',
    enumerable: false
  });

  const keys = Object.keys(buf);
  const json = buf.toJSON();

  // 不可枚举属性不在 keys 中
  if (keys.includes('hidden')) return false;
  // toJSON 也不包含
  if (json.hidden !== undefined) return false;

  return true;
});

// Buffer 相等性
test('相同内容的 Buffer 不是严格相等', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);

  if (buf1 === buf2) return false;
  if (buf1 == buf2) return false;

  return true;
});

test('相同内容 Buffer 的 toJSON 结果深度相等', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);

  const json1 = JSON.stringify(buf1.toJSON());
  const json2 = JSON.stringify(buf2.toJSON());

  if (json1 !== json2) return false;

  return true;
});

test('不同内容 Buffer 的 toJSON 结果不相等', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);

  const json1 = JSON.stringify(buf1.toJSON());
  const json2 = JSON.stringify(buf2.toJSON());

  if (json1 === json2) return false;

  return true;
});

// Buffer.length 和 toJSON data.length 一致性
test('Buffer.length 与 toJSON data.length 一致', () => {
  const sizes = [0, 1, 10, 100, 1000];

  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    const json = buf.toJSON();

    if (buf.length !== json.data.length) return false;
  }

  return true;
});

test('subarray 的 length 与 toJSON data.length 一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const tests = [
    [0, 3],
    [2, 7],
    [5, 10],
    [0, 0],
    [5, 5]
  ];

  for (const [start, end] of tests) {
    const sub = buf.subarray(start, end);
    const json = sub.toJSON();

    if (sub.length !== json.data.length) return false;
  }

  return true;
});

// 删除 toJSON 方法的影响
test('删除 Buffer.prototype.toJSON 后 JSON.stringify 行为', () => {
  const buf = Buffer.from([1, 2, 3]);
  const originalToJSON = Buffer.prototype.toJSON;

  delete Buffer.prototype.toJSON;

  let result;
  try {
    result = JSON.stringify(buf);
    // 没有 toJSON 方法时,会序列化为类似对象
    if (typeof result !== 'string') return false;
    // 不应该包含 "type":"Buffer"
    if (result.includes('"type":"Buffer"')) return false;
  } finally {
    Buffer.prototype.toJSON = originalToJSON;
  }

  return true;
});

test('恢复 Buffer.prototype.toJSON 后恢复正常', () => {
  const buf = Buffer.from([1, 2, 3]);
  const originalToJSON = Buffer.prototype.toJSON;

  delete Buffer.prototype.toJSON;
  Buffer.prototype.toJSON = originalToJSON;

  const result = JSON.stringify(buf);
  const parsed = JSON.parse(result);

  if (parsed.type !== 'Buffer') return false;
  if (parsed.data.length !== 3) return false;

  return true;
});

// Object.keys 在 toJSON 结果上
test('Object.keys 在 toJSON 结果上只返回 type 和 data', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  const keys = Object.keys(json);

  if (keys.length !== 2) return false;
  if (!keys.includes('type')) return false;
  if (!keys.includes('data')) return false;

  return true;
});

test('Object.values 在 toJSON 结果上', () => {
  const buf = Buffer.from([10, 20, 30]);
  const json = buf.toJSON();
  const values = Object.values(json);

  if (values.length !== 2) return false;
  if (!values.includes('Buffer')) return false;
  // 其中一个应该是数组
  const arrayValue = values.find(v => Array.isArray(v));
  if (!arrayValue) return false;
  if (arrayValue.length !== 3) return false;

  return true;
});

test('Object.entries 在 toJSON 结果上', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  const entries = Object.entries(json);

  if (entries.length !== 2) return false;

  const typeEntry = entries.find(([key]) => key === 'type');
  const dataEntry = entries.find(([key]) => key === 'data');

  if (!typeEntry || typeEntry[1] !== 'Buffer') return false;
  if (!dataEntry || !Array.isArray(dataEntry[1])) return false;

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
  console.log('\n' + JSON.stringify(result, null, 2));
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
