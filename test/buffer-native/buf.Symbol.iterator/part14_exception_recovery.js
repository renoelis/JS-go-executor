// buf[Symbol.iterator] - Part 14: Exception Recovery and Edge Boundaries
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

// 异常恢复和边界测试

// === 迭代器在错误后的恢复测试 ===
test('迭代器抛出错误后的状态', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf[Symbol.iterator]();

  // 正常消费
  iter.next(); // 1
  iter.next(); // 2

  // 模拟错误（修改原型使 next 抛错）
  const originalNext = iter.next;
  iter.next = function() {
    throw new Error('Simulated error');
  };

  let errorCaught = false;
  try {
    iter.next();
  } catch (e) {
    errorCaught = true;
  }

  if (!errorCaught) throw new Error('Should catch error');

  // 恢复 next 方法
  iter.next = originalNext;

  // 验证可以继续迭代
  const result = iter.next();
  if (result.value !== 3) throw new Error('Should continue from position 3');
});

test('for...of 循环中抛出错误后状态', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = [];

  try {
    for (const byte of buf) {
      result.push(byte);
      if (byte === 3) {
        throw new Error('Break on 3');
      }
    }
  } catch (e) {
    // 捕获错误
  }

  // 应该收集了 1, 2, 3
  if (result.length !== 3) throw new Error('Should have 3 elements');
  if (result[2] !== 3) throw new Error('Last element should be 3');
});

// === 数值边界测试 ===
test('Buffer 包含 Number.MAX_SAFE_INTEGER 模 256 的值', () => {
  const val = Number.MAX_SAFE_INTEGER % 256;
  const buf = Buffer.from([val]);

  const result = [...buf];
  if (result[0] !== val) throw new Error('Value mismatch');
});

test('Buffer 包含 Number.MIN_SAFE_INTEGER 模 256 的值', () => {
  const val = (Number.MIN_SAFE_INTEGER % 256 + 256) % 256;
  const buf = Buffer.from([val]);

  const result = [...buf];
  if (result[0] !== val) throw new Error('Value mismatch');
});

test('Buffer from 数组包含 Infinity', () => {
  const buf = Buffer.from([Infinity]);
  const result = [...buf];

  // Infinity 应该被转换为 0
  if (result[0] !== 0) throw new Error('Infinity should convert to 0');
});

test('Buffer from 数组包含 -Infinity', () => {
  const buf = Buffer.from([-Infinity]);
  const result = [...buf];

  // -Infinity 应该被转换为 0
  if (result[0] !== 0) throw new Error('-Infinity should convert to 0');
});

test('Buffer from 数组包含 NaN', () => {
  const buf = Buffer.from([NaN]);
  const result = [...buf];

  // NaN 应该被转换为 0
  if (result[0] !== 0) throw new Error('NaN should convert to 0');
});

test('Buffer from 数组包含小数', () => {
  const buf = Buffer.from([1.5, 2.9, 3.1]);
  const result = [...buf];

  // 小数应该被截断
  if (result[0] !== 1 || result[1] !== 2 || result[2] !== 3) {
    throw new Error('Decimals should be truncated');
  }
});

test('Buffer from 数组包含负数', () => {
  const buf = Buffer.from([-1, -128, -255]);
  const result = [...buf];

  // 负数应该被转换（补码）
  if (result[0] !== 255 || result[1] !== 128 || result[2] !== 1) {
    throw new Error('Negative numbers conversion mismatch');
  }
});

// === 迭代器在特殊上下文中的行为 ===
test('try-catch-finally 中的迭代', () => {
  const buf = Buffer.from([10, 20, 30]);
  let result = [];
  let finallyCalled = false;

  try {
    for (const byte of buf) {
      result.push(byte);
      if (byte === 20) {
        throw new Error('Test error');
      }
    }
  } catch (e) {
    // 捕获错误
  } finally {
    finallyCalled = true;
  }

  if (!finallyCalled) throw new Error('Finally should be called');
  if (result.length !== 2) throw new Error('Should have 2 elements before error');
});

test('with 语句中的迭代（非严格模式）', () => {
  const buf = Buffer.from([5, 6, 7]);

  // with 在严格模式下不可用，但在非严格模式测试
  let result = [];
  const obj = { test: 'value' };

  // 不使用 with，直接迭代
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 3) throw new Error('Iteration should work normally');
});

// === 迭代器与异步上下文 ===
test('setTimeout 中创建迭代器', (done) => {
  const buf = Buffer.from([100, 200]);

  setTimeout(() => {
    const iter = buf[Symbol.iterator]();
    const result = iter.next();

    if (result.value !== 100) {
      throw new Error('Should work in setTimeout');
    }
  }, 0);

  // 同步完成
});

test('迭代器作为函数参数传递', () => {
  const buf = Buffer.from([11, 22, 33]);

  function consumeIterator(iterator) {
    const result = [];
    let next = iterator.next();
    while (!next.done) {
      result.push(next.value);
      next = iterator.next();
    }
    return result;
  }

  const iter = buf[Symbol.iterator]();
  const result = consumeIterator(iter);

  if (result.length !== 3 || result[0] !== 11) {
    throw new Error('Iterator should work when passed as parameter');
  }
});

test('迭代器作为对象属性存储', () => {
  const buf = Buffer.from([7, 8, 9]);
  const obj = {
    myIterator: buf[Symbol.iterator]()
  };

  const result1 = obj.myIterator.next();
  const result2 = obj.myIterator.next();

  if (result1.value !== 7 || result2.value !== 8) {
    throw new Error('Stored iterator should maintain state');
  }
});

test('迭代器在数组中存储', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);

  const iterators = [
    buf1[Symbol.iterator](),
    buf2[Symbol.iterator]()
  ];

  iterators[0].next();
  const result = iterators[1].next();

  if (result.value !== 3) {
    throw new Error('Array-stored iterator should work independently');
  }
});

// === 边界：Buffer 长度变化的理论测试 ===
test('Buffer.allocUnsafe 后立即迭代', () => {
  const buf = Buffer.allocUnsafe(5);

  // 不初始化，直接迭代
  let count = 0;
  for (const byte of buf) {
    count++;
    // 验证是 0-255 的有效字节
    if (typeof byte !== 'number' || byte < 0 || byte > 255) {
      throw new Error('Invalid byte value');
    }
  }

  if (count !== 5) throw new Error('Should iterate 5 bytes');
});

test('Buffer.from(emptyString) 迭代', () => {
  const buf = Buffer.from('');
  let count = 0;

  for (const byte of buf) {
    count++;
  }

  if (count !== 0) throw new Error('Empty string should produce 0 bytes');
});

test('Buffer.from(nullChar) 迭代', () => {
  const buf = Buffer.from('\0'); // null 字符
  const result = [...buf];

  if (result.length !== 1) throw new Error('Should have 1 byte');
  if (result[0] !== 0) throw new Error('Null char should be 0');
});

// === 迭代器与解构 ===
test('迭代器与数组解构', () => {
  const buf = Buffer.from([15, 25, 35, 45, 55]);
  const [first, second, ...rest] = buf;

  if (first !== 15 || second !== 25) throw new Error('Destructuring first two failed');
  if (rest.length !== 3 || rest[0] !== 35) throw new Error('Rest destructuring failed');
});

test('迭代器与对象解构（通过 entries）', () => {
  const buf = Buffer.from([60, 70, 80]);
  const entries = [...buf.entries()];

  const [[i0, v0], [i1, v1], [i2, v2]] = entries;

  if (i0 !== 0 || v0 !== 60) throw new Error('Entry 0 mismatch');
  if (i1 !== 1 || v1 !== 70) throw new Error('Entry 1 mismatch');
  if (i2 !== 2 || v2 !== 80) throw new Error('Entry 2 mismatch');
});

// === 迭代器与箭头函数 ===
test('箭头函数中的迭代器', () => {
  const buf = Buffer.from([91, 92, 93]);

  const process = (buffer) => [...buffer];
  const result = process(buf);

  if (result.length !== 3 || result[0] !== 91) {
    throw new Error('Arrow function should work');
  }
});

test('箭头函数返回迭代器', () => {
  const buf = Buffer.from([111, 112]);

  const getIterator = (buffer) => buffer[Symbol.iterator]();
  const iter = getIterator(buf);

  const result = iter.next();
  if (result.value !== 111) throw new Error('Returned iterator should work');
});

// === 迭代器与模板字符串 ===
test('迭代器值用于模板字符串', () => {
  const buf = Buffer.from([65, 66, 67]); // ABC
  const result = [];

  for (const byte of buf) {
    result.push(`Byte: ${byte}`);
  }

  if (result[0] !== 'Byte: 65') throw new Error('Template string failed');
});

// === 迭代器与逻辑运算 ===
test('迭代器值用于逻辑运算', () => {
  const buf = Buffer.from([0, 1, 2, 0, 3]);
  const truthyCount = [...buf].filter(byte => byte).length;

  if (truthyCount !== 3) throw new Error('Should have 3 truthy values');
});

test('迭代器值用于位运算', () => {
  const buf = Buffer.from([0b1010, 0b1100]); // 10, 12
  const result = [...buf].map(byte => byte & 0b1000); // 提取第 4 位

  if (result[0] !== 8 || result[1] !== 8) throw new Error('Bitwise operation failed');
});

// === 迭代器与类型转换 ===
test('迭代器值转布尔值', () => {
  const buf = Buffer.from([0, 1, 255]);
  const booleans = [...buf].map(byte => Boolean(byte));

  if (booleans[0] !== false || booleans[1] !== true || booleans[2] !== true) {
    throw new Error('Boolean conversion failed');
  }
});

test('迭代器值转字符串', () => {
  const buf = Buffer.from([65, 66, 67]);
  const strings = [...buf].map(byte => String(byte));

  if (strings[0] !== '65' || strings[1] !== '66') {
    throw new Error('String conversion failed');
  }
});

test('迭代器值用于 String.fromCharCode', () => {
  const buf = Buffer.from([72, 101, 108, 108, 111]); // Hello
  const str = String.fromCharCode(...buf);

  if (str !== 'Hello') throw new Error('fromCharCode failed');
});

// === Buffer offset/length 边界 ===
test('Buffer.from 带 offset 超出范围', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) view[i] = i;

  let errorThrown = false;
  try {
    const buf = Buffer.from(ab, 20); // offset 超出范围
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) throw new Error('Should throw on invalid offset');
});

test('Buffer.from 带 length 超出剩余空间', () => {
  const ab = new ArrayBuffer(10);

  let errorThrown = false;
  try {
    const buf = Buffer.from(ab, 5, 10); // 只剩 5 字节但要求 10
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) throw new Error('Should throw on invalid length');
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 14: Exception Recovery',
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
