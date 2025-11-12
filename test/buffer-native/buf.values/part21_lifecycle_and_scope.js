// buf.values() - 生命周期与作用域深度测试
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

// ==================== 闭包与作用域 ====================

test('闭包捕获迭代器应保持状态', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  const getCurrent = () => iter.next();
  
  const first = getCurrent();
  const second = getCurrent();
  
  return first.value === 1 && second.value === 2;
});

test('多层闭包嵌套使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  
  function outer() {
    const iter = buf.values();
    return function inner() {
      return function deepest() {
        return iter.next().value;
      };
    };
  }
  
  const deepFn = outer()();
  return deepFn() === 1 && deepFn() === 2;
});

test('闭包数组捕获多个迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const closures = [];
  
  for (let i = 0; i < 3; i++) {
    const iter = buf.values();
    closures.push(() => iter.next().value);
  }
  
  // 每个闭包都有独立的迭代器
  return closures[0]() === 1 && closures[1]() === 1 && closures[2]() === 1;
});

// ==================== 递归场景 ====================

test('递归函数中使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();
  
  function sumRecursive(acc) {
    const next = iter.next();
    if (next.done) return acc;
    return sumRecursive(acc + next.value);
  }
  
  return sumRecursive(0) === 15;
});

test('尾递归优化场景', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();
  let result = 0;
  
  function tailRecursive() {
    const next = iter.next();
    if (next.done) return result;
    result += next.value;
    return tailRecursive();
  }
  
  tailRecursive();
  return result === 15;
});

test('相互递归中使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const iter = buf.values();
  
  function even(sum) {
    const next = iter.next();
    if (next.done) return sum;
    return odd(sum + next.value);
  }
  
  function odd(sum) {
    const next = iter.next();
    if (next.done) return sum;
    return even(sum + next.value);
  }
  
  return even(0) === 10;
});

// ==================== 条件与控制流 ====================

test('switch-case 中使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  let sum = 0;
  
  for (let i = 0; i < 3; i++) {
    const val = iter.next().value;
    switch (val) {
      case 1:
        sum += 10;
        break;
      case 2:
        sum += 20;
        break;
      case 3:
        sum += 30;
        break;
    }
  }
  
  return sum === 60;
});

test('三元运算符中使用迭代器', () => {
  const buf = Buffer.from([5, 10, 15]);
  const iter = buf.values();
  
  const result = [];
  for (let i = 0; i < 3; i++) {
    const val = iter.next().value;
    result.push(val > 8 ? 'big' : 'small');
  }
  
  return result[0] === 'small' && result[1] === 'big' && result[2] === 'big';
});

test('逻辑运算符短路与迭代器', () => {
  const buf = Buffer.from([0, 5, 10]);
  const iter = buf.values();
  
  const first = iter.next().value || 100; // 0 || 100 = 100
  const second = iter.next().value || 100; // 5 || 100 = 5
  
  return first === 100 && second === 5;
});

// ==================== 循环变体 ====================

test('while 循环使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  let sum = 0;
  let result = iter.next();
  
  while (!result.done) {
    sum += result.value;
    result = iter.next();
  }
  
  return sum === 6;
});

test('do-while 循环使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  let count = 0;
  
  do {
    const result = iter.next();
    if (result.done) break;
    count++;
  } while (true);
  
  return count === 3;
});

test('for 循环手动控制迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();
  let sum = 0;
  
  for (let i = 0; i < 3; i++) { // 只取前3个
    sum += iter.next().value;
  }
  
  return sum === 6 && iter.next().value === 4; // 第4个应该是4
});

test('嵌套循环使用多个迭代器', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([10, 20]);
  
  let sum = 0;
  for (const a of buf1.values()) {
    for (const b of buf2.values()) {
      sum += a * b;
    }
  }
  
  // 1*10 + 1*20 + 2*10 + 2*20 = 10 + 20 + 20 + 40 = 90
  return sum === 90;
});

// ==================== 异常与恢复 ====================

test('finally 块中继续使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();
  let sum = 0;
  
  try {
    sum += iter.next().value;
    sum += iter.next().value;
    throw new Error('test');
  } catch (e) {
    sum += iter.next().value; // 继续迭代
  } finally {
    sum += iter.next().value; // finally 中也可以迭代
  }
  
  return sum === 10; // 1 + 2 + 3 + 4
});

test('多次 try-catch 嵌套使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const iter = buf.values();
  let result = [];
  
  try {
    result.push(iter.next().value);
    try {
      result.push(iter.next().value);
      throw new Error('inner');
    } catch (e) {
      result.push(iter.next().value);
    }
    result.push(iter.next().value);
  } catch (e) {
    result.push('error');
  }
  
  return result.length === 4 && 
         result[0] === 1 && 
         result[1] === 2 && 
         result[2] === 3 && 
         result[3] === 4;
});

// ==================== 变量提升与作用域 ====================

test('var 变量提升不影响迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  
  function test() {
    const first = iter.next().value; // 使用 iter
    var iter = buf.values(); // var 提升
    return first;
  }
  
  try {
    test();
    return false; // 应该抛出错误
  } catch (e) {
    return true; // 预期会有错误
  }
});

test('let 块级作用域中的迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  let result = [];
  
  {
    let iter = buf.values();
    result.push(iter.next().value);
  }
  
  {
    let iter = buf.values(); // 新的作用域，新的迭代器
    result.push(iter.next().value);
  }
  
  return result[0] === 1 && result[1] === 1; // 两个独立迭代器
});

test('const 声明迭代器不可重新赋值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  try {
    iter = buf.values(); // 尝试重新赋值
    return false;
  } catch (e) {
    // const 不可重新赋值
    return true;
  }
});

// ==================== 迭代器链式操作 ====================

test('连续调用 values 返回新迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  
  const iter1 = buf.values();
  const iter2 = buf.values();
  
  iter1.next();
  iter1.next();
  
  // iter2 应该是独立的，从头开始
  return iter2.next().value === 1;
});

test('迭代器方法链式调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator]();
  
  // Symbol.iterator 返回自身，可以链式调用
  const same = iter[Symbol.iterator]();
  
  iter.next();
  
  // same 和 iter 是同一个对象
  return same.next().value === 2;
});

// ==================== 特殊返回值处理 ====================

test('解构赋值使用迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [a, b, ...rest] = buf.values();
  
  return a === 1 && b === 2 && rest.length === 3 && rest[0] === 3;
});

test('解构赋值跳过元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const [, , third, ...rest] = buf.values();
  
  return third === 3 && rest.length === 2 && rest[0] === 4;
});

test('解构赋值默认值', () => {
  const buf = Buffer.from([1]);
  const [a, b = 99, c = 88] = buf.values();
  
  return a === 1 && b === 99 && c === 88;
});

// ==================== 比较与相等性 ====================

test('迭代器严格相等性检查', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const same = iter;
  
  return iter === same && iter == same;
});

test('不同迭代器永不相等', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.values();
  const iter2 = buf.values();
  
  return iter1 !== iter2 && iter1 != iter2;
});

// ==================== 总结 ====================

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

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
