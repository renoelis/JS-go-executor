// buf[Symbol.iterator] - Part 13: ECMAScript Specification Compliance
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅', passed: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// ECMAScript 规范合规性测试

// === 属性描述符测试 ===
// 注：属性描述符测试被移除（使用了 Object.getPrototypeOf 禁用关键词）

test('Buffer.prototype.values 方法的 length 属性', () => {
  if (Buffer.prototype.values.length !== 0) {
    throw new Error(`values.length should be 0, got ${Buffer.prototype.values.length}`);
  }
});

test('Buffer.prototype.values 方法的 name 属性', () => {
  if (Buffer.prototype.values.name !== 'values') {
    throw new Error(`values.name should be 'values', got ${Buffer.prototype.values.name}`);
  }
});

test('迭代器 next 方法的 length 属性为 0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  if (iter.next.length !== 0) {
    throw new Error(`next.length should be 0, got ${iter.next.length}`);
  }
});

// === 原型链测试 ===
// 注：原型链测试被移除（使用了 Object.getPrototypeOf 禁用关键词）

test('迭代器 toString 返回正确的字符串', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const str = iter.toString();
  if (str !== '[object Array Iterator]') {
    throw new Error(`toString should return '[object Array Iterator]', got ${str}`);
  }
});

test('迭代器 valueOf 返回迭代器本身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const val = iter.valueOf();
  if (val !== iter) {
    throw new Error('valueOf should return the iterator itself');
  }
});

// === this 绑定和调用上下文 ===
test('解绑的 next 方法应该抛出 TypeError', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();
  const unboundNext = iter.next;

  let errorThrown = false;
  try {
    unboundNext(); // 无 this 调用
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error('Should throw TypeError');
    }
  }

  if (!errorThrown) {
    throw new Error('Unbound next should throw TypeError');
  }
});

test('next 方法用 null 作为 this 应抛出 TypeError', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  let errorThrown = false;
  try {
    iter.next.call(null);
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error('Should throw TypeError');
    }
  }

  if (!errorThrown) {
    throw new Error('next.call(null) should throw TypeError');
  }
});

test('next 方法用 undefined 作为 this 应抛出 TypeError', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  let errorThrown = false;
  try {
    iter.next.call(undefined);
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error('Should throw TypeError');
    }
  }

  if (!errorThrown) {
    throw new Error('next.call(undefined) should throw TypeError');
  }
});

test('next 方法用普通对象作为 this 应抛出 TypeError', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  let errorThrown = false;
  try {
    iter.next.call({});
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error('Should throw TypeError');
    }
  }

  if (!errorThrown) {
    throw new Error('next.call({}) should throw TypeError');
  }
});

// === 原型修改测试 ===
// 注：原型修改测试被移除（使用了 Object.setPrototypeOf 禁用关键词）

test('修改 Buffer.prototype 的 Symbol.iterator 后行为', () => {
  const buf = Buffer.from([1, 2, 3]);

  // 保存原始方法
  const original = Buffer.prototype[Symbol.iterator];

  // 修改为自定义实现
  Buffer.prototype[Symbol.iterator] = function*() {
    yield 99;
    yield 88;
  };

  const result = [...buf];

  // 恢复原始方法
  Buffer.prototype[Symbol.iterator] = original;

  if (result[0] !== 99 || result[1] !== 88) {
    throw new Error('Should use modified iterator');
  }
});

// === Object.create 和克隆测试 ===
// 注：克隆测试被移除（使用了 Object.getPrototypeOf 禁用关键词）

// === BYTES_PER_ELEMENT 属性 ===
test('Buffer.prototype.BYTES_PER_ELEMENT 为 1', () => {
  if (Buffer.prototype.BYTES_PER_ELEMENT !== 1) {
    throw new Error('BYTES_PER_ELEMENT should be 1');
  }
});

test('Buffer 实例的 BYTES_PER_ELEMENT 为 1', () => {
  const buf = Buffer.from([1, 2, 3]);
  if (buf.BYTES_PER_ELEMENT !== 1) {
    throw new Error('Instance BYTES_PER_ELEMENT should be 1');
  }
});

// === 空和非空 Buffer 迭代器一致性 ===
// 注：迭代器一致性测试被移除（使用了 constructor 和 Object.getPrototypeOf 禁用关键词）

// === 迭代器方法的可写性测试 ===
test('可以覆盖迭代器的 next 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  // 覆盖 next 方法
  iter.next = function() {
    return { value: 999, done: false };
  };

  const result = iter.next();

  if (result.value !== 999) {
    throw new Error('Should use overridden next method');
  }
});

test('可以删除迭代器实例的 next 方法后回退到原型', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  // 添加实例方法
  iter.next = function() {
    return { value: 888, done: false };
  };

  // 验证覆盖生效
  if (iter.next().value !== 888) {
    throw new Error('Override should work');
  }

  // 删除实例方法
  delete iter.next;

  // 应该回退到原型方法
  const result = iter.next();
  if (result.value !== 1) {
    throw new Error('Should fallback to prototype method');
  }
});

// === 迭代器与 Object 方法 ===
test('Object.keys 在迭代器上返回空数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const keys = Object.keys(iter);

  if (keys.length !== 0) {
    throw new Error('Object.keys should return empty array');
  }
});

test('Object.getOwnPropertyNames 在迭代器上返回空数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const names = Object.getOwnPropertyNames(iter);

  if (names.length !== 0) {
    throw new Error('getOwnPropertyNames should return empty array');
  }
});

test('Object.getOwnPropertySymbols 在迭代器上', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  const symbols = Object.getOwnPropertySymbols(iter);

  // 可能为空，也可能有内部 Symbol
  console.log(`   Found ${symbols.length} own symbols`);
});

// === 迭代器的 hasOwnProperty 测试 ===
test('迭代器 hasOwnProperty("next") 为 false', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  if (iter.hasOwnProperty('next')) {
    throw new Error('next should not be own property');
  }
});

test('迭代器 hasOwnProperty(Symbol.toStringTag) 为 false', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  if (iter.hasOwnProperty(Symbol.toStringTag)) {
    throw new Error('Symbol.toStringTag should not be own property');
  }
});

// === 迭代器与 in 操作符 ===
test('"next" in iterator 为 true', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  if (!('next' in iter)) {
    throw new Error('next should be in iterator (via prototype)');
  }
});

test('Symbol.iterator in iterator 为 true', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  if (!(Symbol.iterator in iter)) {
    throw new Error('Symbol.iterator should be in iterator (via prototype)');
  }
});

// === 迭代器的 propertyIsEnumerable 测试 ===
test('迭代器 propertyIsEnumerable("next") 为 false', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();

  if (iter.propertyIsEnumerable('next')) {
    throw new Error('next should not be enumerable');
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 13: ES Specification',
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
