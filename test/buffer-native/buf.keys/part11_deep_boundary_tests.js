// buf.keys() - Part 11: 深度边界测试
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

// 极端大小的 Buffer
test('最大安全整数大小的索引', () => {
  // 测试接近最大值的索引
  const size = 1000000;
  const buf = Buffer.alloc(size);
  const iter = buf.keys();
  
  // 跳到最后
  let last;
  let count = 0;
  for (const key of iter) {
    last = key;
    count++;
    if (count > size) break; // 防止无限循环
  }
  
  return last === size - 1 && count === size;
});

test('零字节 Buffer 的多次迭代', () => {
  const buf = Buffer.alloc(0);
  const iter1 = buf.keys();
  const iter2 = buf.keys();
  const iter3 = buf.keys();
  
  const r1 = iter1.next();
  const r2 = iter2.next();
  const r3 = iter3.next();
  
  return r1.done && r2.done && r3.done;
});

// 迭代器与数组方法的深度集成
test('迭代器与 Array.prototype.concat', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  const concatenated = [].concat(keys);
  return concatenated.length === 3 && concatenated[0] === 0;
});

test('迭代器与 Array.prototype.slice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  const sliced = keys.slice(1, 3);
  return sliced.length === 2 && sliced[0] === 1 && sliced[1] === 2;
});

test('迭代器与 Array.prototype.reverse', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  const reversed = keys.reverse();
  return reversed[0] === 2 && reversed[2] === 0;
});

test('迭代器与 Array.prototype.sort', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  const sorted = keys.sort((a, b) => b - a);
  return sorted[0] === 4 && sorted[4] === 0;
});

test('迭代器与 Array.prototype.join', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  const joined = keys.join(',');
  return joined === '0,1,2';
});

// 迭代器与字符串方法
test('迭代器索引转字符串', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  const strings = keys.map(k => k.toString());
  return strings[0] === '0' && strings[2] === '2';
});

test('迭代器索引的 JSON 序列化', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  const json = JSON.stringify(keys);
  return json === '[0,1,2]';
});

// 迭代器与数学运算
test('迭代器索引求和', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const keys = Array.from(buf.keys());
  const sum = keys.reduce((acc, k) => acc + k, 0);
  return sum === 10; // 0+1+2+3+4
});

test('迭代器索引求积', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const keys = Array.from(buf.keys()).filter(k => k > 0);
  const product = keys.reduce((acc, k) => acc * k, 1);
  return product === 6; // 1*2*3
});

test('迭代器索引的平均值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  const avg = keys.reduce((acc, k) => acc + k, 0) / keys.length;
  return avg === 2; // (0+1+2+3+4)/5
});

// 迭代器与比较操作
test('迭代器索引的最大值', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const keys = Array.from(buf.keys());
  const max = Math.max(...keys);
  return max === 3;
});

test('迭代器索引的最小值', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const keys = Array.from(buf.keys());
  const min = Math.min(...keys);
  return min === 0;
});

// 迭代器与条件判断
test('迭代器索引的 some 测试', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  const hasThree = keys.some(k => k === 3);
  return hasThree === true;
});

test('迭代器索引的 every 测试', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const keys = Array.from(buf.keys());
  const allLessThanTen = keys.every(k => k < 10);
  return allLessThanTen === true;
});

test('迭代器索引的 includes 测试', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  const includesTwo = keys.includes(2);
  return includesTwo === true;
});

test('迭代器索引的 indexOf 测试', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  const index = keys.indexOf(3);
  return index === 3;
});

// 迭代器与循环嵌套
test('嵌套 for...of 循环', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  let count = 0;
  
  for (const k1 of buf1.keys()) {
    for (const k2 of buf2.keys()) {
      count++;
    }
  }
  
  return count === 4; // 2*2
});

test('迭代器在 while 循环中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  let count = 0;
  let result = iter.next();
  
  while (!result.done) {
    count++;
    result = iter.next();
  }
  
  return count === 3;
});

test('迭代器在 do...while 循环中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.keys();
  let count = 0;
  let result;
  
  do {
    result = iter.next();
    if (!result.done) count++;
  } while (!result.done);
  
  return count === 3;
});

// 迭代器与条件表达式
test('迭代器在三元运算符中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  const result = keys.length > 0 ? keys[0] : -1;
  return result === 0;
});

test('迭代器在逻辑运算中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  const result = keys.length && keys[0] === 0;
  return result === true;
});

// 迭代器与对象操作
test('迭代器索引作为对象键', () => {
  const buf = Buffer.from([10, 20, 30]);
  const obj = {};
  for (const key of buf.keys()) {
    obj[key] = buf[key];
  }
  return obj[0] === 10 && obj[2] === 30;
});

test('迭代器索引用于 Buffer 属性访问', () => {
  const buf = Buffer.from([100, 200, 50]);
  const keys = Array.from(buf.keys());
  const values = keys.map(k => buf[k]);
  return values[0] === 100 && values[1] === 200 && values[2] === 50;
});

// 迭代器与类型转换
test('迭代器索引转布尔值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  const booleans = keys.map(k => Boolean(k));
  return booleans[0] === false && booleans[1] === true;
});

test('迭代器索引的类型检查', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  const allNumbers = keys.every(k => typeof k === 'number');
  return allNumbers === true;
});

// 迭代器与错误处理
test('迭代器在 try-catch 中正常工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  try {
    const keys = Array.from(buf.keys());
    return keys.length === 3;
  } catch (e) {
    return false;
  }
});

test('迭代器在 finally 块中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  let finallyExecuted = false;
  
  try {
    const keys = Array.from(buf.keys());
  } finally {
    finallyExecuted = true;
  }
  
  return finallyExecuted;
});

// 输出结果
const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

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
