// buf.values() - 第 4 轮补漏：审阅测试脚本补充组合场景
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

// 测试 1：迭代器在 try-catch 中使用
test('迭代器在 try-catch 中应正常工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  let values = [];

  try {
    for (const v of buf.values()) {
      values.push(v);
      if (v === 2) throw new Error('test error');
    }
  } catch (e) {
    // 捕获异常后继续
  }

  // 应该收集到 1 和 2
  return values.length === 2 && values[0] === 1 && values[1] === 2;
});

// 测试 2：多个迭代器并发进行的状态隔离
test('多个迭代器应保持完全独立的状态', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const iter1 = buf.values();
  const iter2 = buf.values();
  const iter3 = buf.values();

  // 交错推进各个迭代器
  const v1_1 = iter1.next().value; // 10
  const v2_1 = iter2.next().value; // 10
  const v1_2 = iter1.next().value; // 20
  const v3_1 = iter3.next().value; // 10
  const v2_2 = iter2.next().value; // 20
  const v2_3 = iter2.next().value; // 30

  return v1_1 === 10 && v1_2 === 20 && v2_1 === 10 && v2_2 === 20 && v2_3 === 30 && v3_1 === 10;
});

// 测试 3：迭代器与 Generator 函数的配合
test('迭代器值应可传递给 Generator 函数', () => {
  const buf = Buffer.from([1, 2, 3]);

  function* processValues(iter) {
    for (const v of iter) {
      yield v * 2;
    }
  }

  const gen = processValues(buf.values());
  const doubled = [...gen];

  if (doubled.length !== 3) return false;
  if (doubled[0] !== 2 || doubled[2] !== 6) return false;
  return true;
});

// 测试 4：迭代器与递归函数的配合
test('迭代器应可用于递归场景', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  function sumIterator(iter, acc = 0) {
    const result = iter.next();
    if (result.done) return acc;
    return sumIterator(iter, acc + result.value);
  }

  const sum = sumIterator(buf.values());
  return sum === 15; // 1+2+3+4+5
});

// 测试 5：call 调用时 this 为 Buffer 的 prototype
test('在 Buffer.prototype 上调用 values 应抛出错误', () => {
  try {
    Buffer.prototype.values.call(Buffer.prototype);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 测试 6：迭代器与 Buffer.fill 的交互
test('fill Buffer 后迭代应反映新值', () => {
  const buf = Buffer.alloc(5);
  buf.fill(42);

  const values = [...buf.values()];
  if (values.length !== 5) return false;
  for (const v of values) {
    if (v !== 42) return false;
  }
  return true;
});

// 测试 7：迭代器与 Buffer.write 的交互
test('write Buffer 后迭代应反映新值', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 'utf8');

  const values = [...buf.values()];
  // 'hello' 的 ASCII 值
  if (values[0] !== 104 || values[4] !== 111) return false; // h=104, o=111
  // 后面应该是 0
  if (values[5] !== 0) return false;
  return true;
});

// 测试 8：迭代器与 Buffer.copy 的交互
test('copy 到 Buffer 后迭代应反映新值', () => {
  const src = Buffer.from([1, 2, 3]);
  const dst = Buffer.alloc(5);

  src.copy(dst, 1);

  const values = [...dst.values()];
  // [0, 1, 2, 3, 0]
  if (values.length !== 5) return false;
  if (values[0] !== 0 || values[1] !== 1 || values[3] !== 3 || values[4] !== 0) return false;
  return true;
});

// 测试 9：迭代器与 Buffer.swap16 的交互
test('swap16 后迭代应反映字节序变化', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  const values = [...buf.values()];
  // 应该变成 [0x02, 0x01, 0x04, 0x03]
  if (values.length !== 4) return false;
  if (values[0] !== 0x02 || values[1] !== 0x01 || values[2] !== 0x04 || values[3] !== 0x03) return false;
  return true;
});

// 测试 10：迭代器与 Buffer.reverse 的交互
test('reverse 后迭代应反映顺序变化', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse();

  const values = [...buf.values()];
  if (values.length !== 5) return false;
  if (values[0] !== 5 || values[4] !== 1) return false;
  return true;
});

// 测试 11：迭代器在不同作用域中的使用
test('迭代器应可在不同作用域间传递', () => {
  const buf = Buffer.from([1, 2, 3]);
  let iter;

  {
    iter = buf.values();
    iter.next(); // 消耗第一个
  }

  // 在外层作用域继续使用
  const v2 = iter.next().value;
  return v2 === 2;
});

// 测试 12：迭代器与闭包的配合
test('迭代器应可在闭包中使用', () => {
  const buf = Buffer.from([10, 20, 30]);

  function createIteratorReader(buffer) {
    const iter = buffer.values();
    return function() {
      return iter.next();
    };
  }

  const read = createIteratorReader(buf);
  const v1 = read();
  const v2 = read();
  const v3 = read();
  const v4 = read();

  return v1.value === 10 && v2.value === 20 && v3.value === 30 && v4.done === true;
});

// 测试 13：迭代器与 apply 调用
test('values 应可通过 apply 调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = Buffer.prototype.values.apply(buf);

  const values = [...iter];
  if (values.length !== 3) return false;
  if (values[0] !== 1 || values[2] !== 3) return false;
  return true;
});

// 测试 14：迭代器与 bind 调用
test('values 应可通过 bind 调用', () => {
  const buf = Buffer.from([5, 10, 15]);
  const boundValues = Buffer.prototype.values.bind(buf);
  const iter = boundValues();

  const values = [...iter];
  if (values.length !== 3) return false;
  if (values[0] !== 5 || values[2] !== 15) return false;
  return true;
});

// 测试 15：迭代器在条件语句中的使用
test('迭代器应可在条件语句中使用', () => {
  const buf = Buffer.from([0, 1, 2, 0, 3]);
  const values = [];

  for (const v of buf.values()) {
    if (v !== 0) {
      values.push(v);
    }
  }

  return values.length === 3 && values[0] === 1 && values[2] === 3;
});

// 测试 16：迭代器与 while 循环
test('迭代器应可在 while 循环中手动消费', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const values = [];

  let result = iter.next();
  while (!result.done) {
    values.push(result.value);
    result = iter.next();
  }

  return values.length === 3 && values[0] === 1 && values[2] === 3;
});

// 测试 17：迭代器与 do-while 循环
test('迭代器应可在 do-while 循环中使用', () => {
  const buf = Buffer.from([10, 20]);
  const iter = buf.values();
  const values = [];
  let result;

  do {
    result = iter.next();
    if (!result.done) {
      values.push(result.value);
    }
  } while (!result.done);

  return values.length === 2 && values[0] === 10 && values[1] === 20;
});

// 测试 18：迭代器与三元运算符
test('迭代器值应可在三元运算符中使用', () => {
  const buf = Buffer.from([5, 15, 25]);
  const results = [];

  for (const v of buf.values()) {
    results.push(v > 10 ? 'big' : 'small');
  }

  return results.length === 3 && results[0] === 'small' && results[1] === 'big' && results[2] === 'big';
});

// 测试 19：迭代器与 switch 语句
test('迭代器值应可在 switch 语句中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  let countOnes = 0;
  let countTwos = 0;
  let countOthers = 0;

  for (const v of buf.values()) {
    switch (v) {
      case 1:
        countOnes++;
        break;
      case 2:
        countTwos++;
        break;
      default:
        countOthers++;
    }
  }

  return countOnes === 1 && countTwos === 1 && countOthers === 1;
});

// 测试 20：迭代器与标签语句和 break
test('迭代器应支持带标签的 break', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([10, 20]);
  let sum = 0;

  outer: for (const v1 of buf1.values()) {
    for (const v2 of buf2.values()) {
      sum += v1 + v2;
      if (sum > 20) break outer;
    }
  }

  // 1+10=11（继续），1+20=32（>20，break outer）
  return sum === 32;
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
