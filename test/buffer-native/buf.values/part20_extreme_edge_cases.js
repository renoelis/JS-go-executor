// buf.values() - 极端边界情况测试
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

// ==================== 零拷贝与内存共享 ====================

test('subarray 共享内存修改应反映到迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const sub = buf.subarray(1, 3);
  const iter = sub.values();
  
  buf[1] = 99; // 修改原 Buffer
  
  return iter.next().value === 99;
});

test('slice 在 Node.js v3+ 共享内存（别名 subarray）', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const sliced = buf.slice(1, 3);
  const iter = sliced.values();
  
  buf[1] = 99; // 修改原 Buffer
  
  // 在现代 Node.js 中，slice 是 subarray 的别名，共享内存
  return iter.next().value === 99;
});

test('多层 subarray 应正确迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub1 = buf.subarray(1, 4); // [2, 3, 4]
  const sub2 = sub1.subarray(1, 3); // [3, 4]
  const values = [...sub2.values()];
  
  return values.length === 2 && values[0] === 3 && values[1] === 4;
});

// ==================== 编码边界情况 ====================

test('UTF-8 多字节字符应按字节迭代', () => {
  const buf = Buffer.from('你好', 'utf8'); // "你好" = 6 bytes in UTF-8
  const values = [...buf.values()];
  
  // 验证是字节值，不是字符
  return values.length === 6 && values.every(v => v >= 0 && v <= 255);
});

test('Latin1 编码应与字节一一对应', () => {
  const str = 'café';
  const buf = Buffer.from(str, 'latin1');
  const values = [...buf.values()];
  
  return values.length === 4 && values[3] === 233; // é 的 Latin1 编码
});

test('Base64 解码后的 Buffer 应正确迭代', () => {
  const base64 = 'SGVsbG8='; // "Hello"
  const buf = Buffer.from(base64, 'base64');
  const values = [...buf.values()];
  
  return values.length === 5 && values[0] === 72; // 'H'
});

test('Hex 编码的 Buffer 应正确迭代', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  const values = [...buf.values()];
  
  return values.length === 5 && values[0] === 0x48;
});

// ==================== 空间与边界 ====================

test('byteLength 为 0 但 ArrayBuffer 不为空的情况', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5, 0); // offset=5, length=0
  const values = [...buf.values()];
  
  return values.length === 0;
});

test('Buffer 占用 ArrayBuffer 的中间部分', () => {
  const ab = new ArrayBuffer(10);
  const arr = new Uint8Array(ab);
  arr[3] = 42;
  arr[4] = 43;
  arr[5] = 44;
  
  const buf = Buffer.from(ab, 3, 3);
  const values = [...buf.values()];
  
  return values.length === 3 && values[0] === 42 && values[1] === 43 && values[2] === 44;
});

// ==================== 跨边界值测试 ====================

test('所有 256 个可能字节值应可正确迭代', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  
  const values = [...buf.values()];
  return values.length === 256 &&
         values.every((v, i) => v === i);
});

test('重复的字节值应全部返回', () => {
  const buf = Buffer.alloc(100);
  buf.fill(42);
  
  const values = [...buf.values()];
  return values.length === 100 &&
         values.every(v => v === 42);
});

// ==================== 迭代器内部状态 ====================

test('迭代器 next 方法的 this 绑定', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const next = iter.next;
  
  // 绑定到原迭代器
  const bound = next.bind(iter);
  return bound().value === 1;
});

test('迭代器 Symbol.iterator 的 this 绑定', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const symIter = iter[Symbol.iterator];
  
  const result = symIter.call(iter);
  return result === iter;
});

test('Object.assign 复制迭代器不应工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.values();
  const iter2 = Object.assign({}, iter1);
  
  // iter2 不应有 next 方法或 next 不应工作
  try {
    iter2.next();
    return false;
  } catch (e) {
    return true;
  }
});

// ==================== 构造函数与原型链 ====================

test('迭代器的 constructor 应存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  return typeof iter.constructor === 'function';
});

test('迭代器不应是 Buffer 的实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  return !(iter instanceof Buffer);
});

test('迭代器不应是 Uint8Array 的实例', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  return !(iter instanceof Uint8Array);
});

// ==================== Array 方法的兼容性 ====================

test('Array.from 第二参数 mapFn 应正确工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  const doubled = Array.from(buf.values(), x => x * 2);
  
  return doubled.length === 3 &&
         doubled[0] === 2 &&
         doubled[1] === 4 &&
         doubled[2] === 6;
});

test('Array.from 第三参数 thisArg 应正确绑定', () => {
  const buf = Buffer.from([1, 2, 3]);
  const ctx = { multiplier: 3 };
  
  const result = Array.from(buf.values(), function(x) {
    return x * this.multiplier;
  }, ctx);
  
  return result[0] === 3 && result[1] === 6 && result[2] === 9;
});

// ==================== 数学运算与转换 ====================

test('reduce 计算总和应正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sum = [...buf.values()].reduce((acc, val) => acc + val, 0);
  
  return sum === 15;
});

test('map 转换应正确', () => {
  const buf = Buffer.from([1, 2, 3]);
  const mapped = [...buf.values()].map(v => v * 2);
  
  return mapped[0] === 2 && mapped[1] === 4 && mapped[2] === 6;
});

test('filter 过滤应正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const evens = [...buf.values()].filter(v => v % 2 === 0);
  
  return evens.length === 2 && evens[0] === 2 && evens[1] === 4;
});

// ==================== 字符串化与序列化 ====================

test('JSON.stringify 迭代器应返回空对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const json = JSON.stringify(iter);
  
  return json === '{}' || json === 'null';
});

test('String() 转换迭代器应返回字符串', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const str = String(iter);
  
  return typeof str === 'string';
});

// ==================== 特殊操作符 ====================

test('typeof 迭代器应为 object', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  return typeof iter === 'object';
});

test('迭代器 == 自身应为 true', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  return iter == iter && iter === iter;
});

test('两个独立迭代器不应相等', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.values();
  const iter2 = buf.values();
  
  return iter1 !== iter2;
});

// ==================== 对象操作 ====================

test('delete 迭代器属性不应影响功能', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  // 尝试删除 next（可能无效）
  delete iter.next;
  
  // 如果 next 是不可删除的，应该仍然存在
  return typeof iter.next === 'function';
});

test('Object.preventExtensions 不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  Object.preventExtensions(iter);
  
  const result = iter.next();
  return !result.done && result.value === 1;
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
