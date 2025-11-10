// buf.subarray() - 操作符和属性描述符深度测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, passed: pass, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, status: '❌', error: e.message, stack: e.stack });
  }
}

// ============ 操作符测试 ============

test('in 操作符 - 索引存在', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  // sub[0], sub[1], sub[2] 存在
  if (!(0 in sub)) return false;
  if (!(1 in sub)) return false;
  if (!(2 in sub)) return false;
  console.log('✅ in 操作符 - 索引存在');
  return true;
});

test('in 操作符 - 索引不存在', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  // sub 长度为 3，索引 3 不存在
  if (3 in sub) return false;
  if (100 in sub) return false;
  if (-1 in sub) return false;
  console.log('✅ in 操作符 - 索引不存在');
  return true;
});

test('in 操作符 - 检查 length 属性', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  if (!('length' in sub)) return false;
  console.log('✅ in 操作符 - length 属性存在');
  return true;
});

test('in 操作符 - 检查方法属性', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  if (!('subarray' in sub)) return false;
  if (!('toString' in sub)) return false;
  if (!('fill' in sub)) return false;
  console.log('✅ in 操作符 - 方法属性存在');
  return true;
});

test('delete 操作符 - 尝试删除索引（应该失败）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const before = sub[0];
  delete sub[0];
  // delete 对 TypedArray 索引无效
  if (sub[0] !== before) return false;
  console.log('✅ delete 操作符对索引无效');
  return true;
});

test('typeof 操作符 - subarray 返回值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  if (typeof sub !== 'object') return false;
  console.log('✅ typeof subarray 返回 object');
  return true;
});

test('typeof 操作符 - subarray 方法本身', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  if (typeof buf.subarray !== 'function') return false;
  console.log('✅ typeof buf.subarray 返回 function');
  return true;
});

// ============ 属性描述符测试 ============

test('subarray 方法的 name 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  if (buf.subarray.name !== 'subarray') return false;
  console.log('✅ subarray.name === "subarray"');
  return true;
});

test('subarray 方法的 length 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  // subarray 接受 0-2 个参数，length 应该是 2
  if (buf.subarray.length !== 2) return false;
  console.log('✅ subarray.length === 2');
  return true;
});

test('length 属性不可修改', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const originalLength = sub.length;
  try {
    sub.length = 100;
    // 严格模式下会报错，非严格模式下赋值无效
    if (sub.length !== originalLength) return false;
  } catch (e) {
    // 预期的错误
  }
  console.log('✅ length 属性不可修改');
  return true;
});

test('索引属性可枚举', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray();
  const keys = Object.keys(sub);
  // TypedArray 的索引是可枚举的
  if (!keys.includes('0')) return false;
  if (!keys.includes('1')) return false;
  if (!keys.includes('2')) return false;
  console.log('✅ 索引属性可枚举');
  return true;
});

test('for...in 遍历 subarray', () => {
  const buf = Buffer.from([10, 20, 30]);
  const sub = buf.subarray();
  const indices = [];
  for (let key in sub) {
    // 只收集数字索引
    if (!isNaN(parseInt(key))) {
      indices.push(key);
    }
  }
  if (indices.length !== 3) return false;
  if (!indices.includes('0')) return false;
  if (!indices.includes('1')) return false;
  if (!indices.includes('2')) return false;
  console.log('✅ for...in 可遍历 subarray');
  return true;
});

// ============ 迭代器边界测试 ============

test('空 subarray 的迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 2);
  const arr = [...sub];
  if (arr.length !== 0) return false;
  console.log('✅ 空 subarray 迭代器正常');
  return true;
});

test('单元素 subarray 的迭代器', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 3);
  const arr = [...sub];
  if (arr.length !== 1 || arr[0] !== 3) return false;
  console.log('✅ 单元素 subarray 迭代器正常');
  return true;
});

test('for...of 遍历 subarray', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const sub = buf.subarray(1, 3);
  const values = [];
  for (let val of sub) {
    values.push(val);
  }
  if (values.length !== 2) return false;
  if (values[0] !== 20 || values[1] !== 30) return false;
  console.log('✅ for...of 遍历 subarray 正常');
  return true;
});

test('Symbol.iterator 存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray();
  if (typeof sub[Symbol.iterator] !== 'function') return false;
  console.log('✅ Symbol.iterator 存在');
  return true;
});

test('手动调用迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(1, 3);
  const iterator = sub[Symbol.iterator]();
  
  let result1 = iterator.next();
  if (result1.done || result1.value !== 2) return false;
  
  let result2 = iterator.next();
  if (result2.done || result2.value !== 3) return false;
  
  let result3 = iterator.next();
  if (!result3.done) return false;
  
  console.log('✅ 手动调用迭代器正常');
  return true;
});

// ============ 方法调用边界测试 ============

test('call 调用 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray.call(buf, 1, 4);
  if (sub.length !== 3 || sub[0] !== 2) return false;
  console.log('✅ call 调用 subarray 正常');
  return true;
});

test('apply 调用 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray.apply(buf, [1, 4]);
  if (sub.length !== 3 || sub[0] !== 2) return false;
  console.log('✅ apply 调用 subarray 正常');
  return true;
});

test('bind 后调用 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const boundSubarray = buf.subarray.bind(buf);
  const sub = boundSubarray(1, 4);
  if (sub.length !== 3 || sub[0] !== 2) return false;
  console.log('✅ bind 后调用 subarray 正常');
  return true;
});

test('bind 预设参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const boundSubarray = buf.subarray.bind(buf, 1);
  const sub = boundSubarray(4);
  if (sub.length !== 3 || sub[0] !== 2) return false;
  console.log('✅ bind 预设参数正常');
  return true;
});

// ============ Array 方法边界测试 ============

test('Array.isArray 检测', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray();
  // Buffer 和 subarray 都不是真正的数组
  if (Array.isArray(sub)) return false;
  console.log('✅ Array.isArray(subarray) 返回 false');
  return true;
});

test('Array.from 转换 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const arr = Array.from(sub);
  if (!Array.isArray(arr)) return false;
  if (arr.length !== 3) return false;
  if (arr[0] !== 2 || arr[1] !== 3 || arr[2] !== 4) return false;
  console.log('✅ Array.from 转换 subarray 正常');
  return true;
});

test('Array.prototype.slice.call', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const arr = Array.prototype.slice.call(sub);
  if (!Array.isArray(arr)) return false;
  if (arr.length !== 3) return false;
  if (arr[0] !== 2) return false;
  console.log('✅ Array.prototype.slice.call 正常');
  return true;
});

// ============ 空值和边界测试 ============

test('subarray 后立即检查 byteLength', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  if (sub.byteLength !== 3) return false;
  console.log('✅ subarray 后 byteLength 正确');
  return true;
});

test('subarray 后 byteOffset 相对增加', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const originalOffset = buf.byteOffset;
  const sub = buf.subarray(2, 4);
  // subarray 的 byteOffset 应该是原 buffer 的 byteOffset + 2
  if (sub.byteOffset !== originalOffset + 2) return false;
  console.log('✅ subarray 后 byteOffset 相对增加正确');
  return true;
});

test('空 Buffer 的 subarray byteLength', () => {
  const buf = Buffer.alloc(0);
  const sub = buf.subarray();
  if (sub.byteLength !== 0) return false;
  console.log('✅ 空 Buffer subarray byteLength 为 0');
  return true;
});

test('空 Buffer 的 subarray byteOffset', () => {
  const buf = Buffer.alloc(0);
  const sub = buf.subarray();
  if (sub.byteOffset !== 0) return false;
  console.log('✅ 空 Buffer subarray byteOffset 为 0');
  return true;
});

// ============ 特殊参数测试 ============

test('参数为 null 转为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(null, null);
  // null 转为 0
  if (sub.length !== 0) return false;
  console.log('✅ 参数 null 转为 0');
  return true;
});

test('第一个参数为空字符串', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('', 3);
  // '' 转为 0
  if (sub.length !== 3 || sub[0] !== 1) return false;
  console.log('✅ 空字符串参数转为 0');
  return true;
});

test('参数为布尔值 true', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(true, 4);
  // true 转为 1
  if (sub.length !== 3 || sub[0] !== 2) return false;
  console.log('✅ true 转为 1');
  return true;
});

test('参数为布尔值 false', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(false, 3);
  // false 转为 0
  if (sub.length !== 3 || sub[0] !== 1) return false;
  console.log('✅ false 转为 0');
  return true;
});

test('参数为数组（转为 0 或 NaN）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub1 = buf.subarray([], 3);
  // [] 转为 0
  if (sub1.length !== 3 || sub1[0] !== 1) return false;
  
  const sub2 = buf.subarray([1], 3);
  // [1] 转为 1
  if (sub2.length !== 2 || sub2[0] !== 2) return false;
  
  const sub3 = buf.subarray([1, 2], 3);
  // [1, 2] 转为 NaN，即 0
  if (sub3.length !== 3 || sub3[0] !== 1) return false;
  
  console.log('✅ 数组参数转换正确');
  return true;
});

// ============ toString 和 valueOf 边界测试 ============

test('对象 valueOf 返回非原始值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = {
    valueOf: () => ({ nested: 1 }),
    toString: () => '2'
  };
  const sub = buf.subarray(obj, 4);
  // valueOf 返回对象，fallback 到 toString
  if (sub.length !== 2 || sub[0] !== 3) return false;
  console.log('✅ valueOf 返回非原始值时 fallback 到 toString');
  return true;
});

test('对象 toString 返回非字符串', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = {
    toString: () => 123,
    valueOf: () => 1
  };
  const sub = buf.subarray(obj, 4);
  // valueOf 优先，返回 1
  if (sub.length !== 3 || sub[0] !== 2) return false;
  console.log('✅ toString 返回非字符串时使用 valueOf');
  return true;
});

// ============ 输出结果 ============

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

const summary = {
  total: tests.length,
  passed: passed,
  failed: failed,
  successRate: `${((passed / tests.length) * 100).toFixed(2)}%`
};

const result = {
  success: true,
  summary: summary,
  tests: tests
};

console.log(JSON.stringify(result, null, 2));
return result;
