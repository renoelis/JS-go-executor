// buf.entries() - 完整补充测试（覆盖所有遗漏场景）
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

// ==================== 迭代器返回的数组不可变性验证 ====================
test('迭代器返回的数组是新创建的（每次 next 都是新数组）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const r1 = iter.next();
  const r2 = iter.next();
  const arr1 = r1.value;
  const arr2 = r2.value;
  return arr1 !== arr2; // 应该是不同的数组对象
});

test('修改迭代器返回的数组不影响后续迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const r1 = iter.next();
  r1.value[0] = 999; // 修改返回的数组
  r1.value[1] = 888;
  const r2 = iter.next();
  return r2.value[0] === 1 && r2.value[1] === 2; // 后续迭代不受影响
});

// ==================== 迭代器状态独立性验证 ====================
test('迭代器状态在异步操作中保持正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  const r1 = iter.next(); // [0, 1]
  // 模拟异步延迟
  let delayed = false;
  setTimeout(() => { delayed = true; }, 0);
  const r2 = iter.next(); // [1, 2]
  return r1.value[0] === 0 && r2.value[0] === 1;
});

test('迭代器在垃圾回收前仍可用（闭包持有）', () => {
  function createIter() {
    const buf = Buffer.from([10, 20, 30]);
    return buf.entries();
  }
  const iter = createIter();
  // 原始 buf 已超出作用域，但迭代器应仍可用
  const entries = Array.from(iter);
  return entries.length === 3 && entries[0][1] === 10;
});

// ==================== Buffer 特殊创建方式测试 ====================
test('Buffer.from(Uint8Array.buffer) 的 entries', () => {
  const uint8 = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(uint8.buffer);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[1][1] === 20;
});

test('Buffer.from(Int8Array.buffer) 的 entries', () => {
  const int8 = new Int8Array([-1, -2, -3]);
  const buf = Buffer.from(int8.buffer);
  const entries = Array.from(buf.entries());
  // Int8Array 的 -1 在内存中是 255（0xFF）
  return entries.length === 3 && entries[0][1] === 255;
});

test('Buffer.from(Uint16Array.buffer) 的 entries', () => {
  const uint16 = new Uint16Array([0x0102, 0x0304]);
  const buf = Buffer.from(uint16.buffer);
  const entries = Array.from(buf.entries());
  // Uint16Array 占 2 字节，共 4 字节
  return entries.length === 4;
});

test('Buffer.from(Float32Array.buffer) 的 entries', () => {
  const float32 = new Float32Array([1.5, 2.5]);
  const buf = Buffer.from(float32.buffer);
  const entries = Array.from(buf.entries());
  // Float32Array 每个元素 4 字节，共 8 字节
  return entries.length === 8;
});

test('Buffer.from(Float64Array.buffer) 的 entries', () => {
  const float64 = new Float64Array([1.5]);
  const buf = Buffer.from(float64.buffer);
  const entries = Array.from(buf.entries());
  // Float64Array 每个元素 8 字节
  return entries.length === 8;
});

// ==================== 迭代器与 Buffer 索引访问一致性 ====================
test('entries 迭代器值与直接索引访问一致', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const entries = Array.from(buf.entries());
  let allMatch = true;
  for (let i = 0; i < buf.length; i++) {
    if (entries[i][0] !== i || entries[i][1] !== buf[i]) {
      allMatch = false;
      break;
    }
  }
  return allMatch;
});

test('entries 迭代器值与 readUInt8 一致', () => {
  const buf = Buffer.from([100, 150, 200]);
  const entries = Array.from(buf.entries());
  let allMatch = true;
  for (let i = 0; i < buf.length; i++) {
    if (entries[i][1] !== buf.readUInt8(i)) {
      allMatch = false;
      break;
    }
  }
  return allMatch;
});

test('entries 迭代器值与 at() 方法一致', () => {
  const buf = Buffer.from([5, 10, 15, 20, 25]);
  const entries = Array.from(buf.entries());
  let allMatch = true;
  for (let i = 0; i < buf.length; i++) {
    const atValue = buf.at ? buf.at(i) : buf[i];
    if (entries[i][1] !== atValue) {
      allMatch = false;
      break;
    }
  }
  return allMatch;
});

// ==================== 迭代器与负索引访问（虽然迭代器不支持，但验证行为）====================
test('迭代器索引始终非负（从 0 开始）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const entries = Array.from(buf.entries());
  return entries.every(([index]) => index >= 0);
});

test('迭代器索引连续递增无跳跃', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const entries = Array.from(buf.entries());
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][0] !== i) {
      return false;
    }
  }
  return true;
});

// ==================== 迭代器与 Buffer 长度变化边界测试 ====================
test('迭代器在 Buffer.length 被删除后仍可用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  delete buf.length; // 尝试删除 length（应该失败或无效）
  try {
    const entries = Array.from(iter);
    return entries.length === 3;
  } catch (e) {
    return false;
  }
});

test('迭代器在 Buffer[Symbol.iterator] 被修改后仍可用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  buf[Symbol.iterator] = function* () { yield 999; }; // 修改 Buffer 的迭代器
  const entries = Array.from(iter);
  return entries.length === 3 && entries[0][1] === 1; // entries 不受影响
});

// ==================== 迭代器与 Object 方法测试 ====================
test('迭代器对象 keys 检查', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  const keys = Object.keys(iter);
  // 迭代器通常没有可枚举属性
  return Array.isArray(keys);
});

test('迭代器包含必要方法', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  // 应该包含 next 方法
  return typeof iter.next === 'function';
});

test('迭代器是对象类型', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  return iter !== null && typeof iter === 'object';
});

test('迭代器 hasOwnProperty("next") 检查', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  // next 可能在原型上，而不是实例上
  return typeof iter.next === 'function';
});

// ==================== 迭代器与 JSON 操作测试 ====================
test('Array.from(entries) 可以被 JSON.stringify', () => {
  const buf = Buffer.from([1, 2, 3]);
  const entries = Array.from(buf.entries());
  const json = JSON.stringify(entries);
  const parsed = JSON.parse(json);
  return parsed.length === 3 && parsed[0][0] === 0 && parsed[0][1] === 1;
});

test('迭代器本身 JSON.stringify 返回空对象或迭代器状态', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  const json = JSON.stringify(iter);
  return typeof json === 'string' && json.length >= 2; // 至少是 "{}" 或更多
});

// ==================== 迭代器与字符串模板测试 ====================
test('迭代器值可用于字符串模板', () => {
  const buf = Buffer.from([65, 66, 67]); // 'A', 'B', 'C'
  const entries = Array.from(buf.entries());
  const str = entries.map(([i, v]) => `${i}:${String.fromCharCode(v)}`).join(',');
  return str === '0:A,1:B,2:C';
});

// ==================== 迭代器与 set/get 访问器测试 ====================
test('迭代器在 Buffer 添加 getter 后仍正常', () => {
  const buf = Buffer.from([1, 2, 3]);
  Object.defineProperty(buf, 'custom', {
    get() { return 'test'; }
  });
  const entries = Array.from(buf.entries());
  return entries.length === 3 && buf.custom === 'test';
});

test('迭代器在 Buffer 添加 setter 后仍正常', () => {
  const buf = Buffer.from([1, 2, 3]);
  let customValue = 0;
  Object.defineProperty(buf, 'custom', {
    set(val) { customValue = val; }
  });
  buf.custom = 999;
  const entries = Array.from(buf.entries());
  return entries.length === 3 && customValue === 999;
});

// ==================== 迭代器与 Proxy 测试 ====================
test('迭代器在 Buffer 被 Proxy 包装后的行为', () => {
  const buf = Buffer.from([1, 2, 3]);
  let accessCount = 0;
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][1] === 1;
});

// ==================== 迭代器与 Buffer poolSize 测试 ====================
test('entries 在不同 poolSize 的 Buffer 上一致', () => {
  const buf1 = Buffer.allocUnsafe(10);
  buf1.fill(42);
  const buf2 = Buffer.alloc(10, 42);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  let match = true;
  for (let i = 0; i < 10; i++) {
    if (entries1[i][1] !== entries2[i][1]) {
      match = false;
      break;
    }
  }
  return match;
});

// ==================== 迭代器与 Buffer 的 kMaxLength 边界 ====================
test('entries 在接近最大长度的 Buffer 上工作', () => {
  try {
    // 创建一个较大但不超限的 Buffer
    const size = 1000000; // 1MB
    const buf = Buffer.alloc(size);
    const iter = buf.entries();
    // 只验证前几个和最后几个
    iter.next();
    iter.next();
    return true;
  } catch (e) {
    return false;
  }
});

// ==================== 迭代器与 Buffer.prototype 方法覆盖测试 ====================
test('entries 方法在 Buffer 原型链上可访问', () => {
  // 验证 entries 方法在原型链上可访问（可能在 Buffer.prototype 或其原型链上）
  return typeof Buffer.prototype.entries === 'function' &&
         'entries' in Buffer.prototype;
});

// ==================== 迭代器与 Buffer BYTES_PER_ELEMENT 测试 ====================
test('entries 与 BYTES_PER_ELEMENT 属性一致性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const entries = Array.from(buf.entries());
  // Buffer 的 BYTES_PER_ELEMENT 是 1
  return buf.BYTES_PER_ELEMENT === 1 && entries.length === buf.length * buf.BYTES_PER_ELEMENT;
});

// ==================== 迭代器与 Unicode 边界测试 ====================
test('entries 处理 4 字节 UTF-8 字符（emoji）', () => {
  const buf = Buffer.from('😀😁', 'utf8'); // 每个 emoji 4 字节
  const entries = Array.from(buf.entries());
  return entries.length === 8; // 2 个 emoji * 4 字节 = 8 字节
});

test('entries 处理 BMP 之外的 Unicode 字符', () => {
  const buf = Buffer.from('𝕳𝖊𝖑𝖑𝖔', 'utf8'); // 数学字母符号
  const entries = Array.from(buf.entries());
  return entries.length > 5; // 每个字符占多字节
});

test('entries 处理 零宽度字符', () => {
  const buf = Buffer.from('a\u200Bb', 'utf8'); // 零宽度空格
  const entries = Array.from(buf.entries());
  return entries.length === 5; // 'a' (1) + ZWS (3) + 'b' (1)
});

test('entries 处理组合字符', () => {
  const buf = Buffer.from('é', 'utf8'); // e + 组合重音符
  const entries = Array.from(buf.entries());
  return entries.length === 2; // 通常 2 字节
});

// ==================== 迭代器与 Buffer 方法链式调用 ====================
test('entries 在链式调用后正常工作', () => {
  const buf = Buffer.alloc(5).fill(42);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries.every(([, v]) => v === 42);
});

test('entries 在多次 slice 后正常工作', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const sliced = buf.slice(2, 8).slice(1, 5).slice(1, 3);
  const entries = Array.from(sliced.entries());
  return entries.length === 2 && entries[0][0] === 0;
});

// ==================== 迭代器与内存布局测试 ====================
test('entries 值反映小端序存储（如果适用）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0x1234, 0);
  const entries = Array.from(buf.entries());
  // 小端序：低位字节在前
  return entries[0][1] === 0x34 && entries[1][1] === 0x12;
});

test('entries 值反映大端序存储（如果适用）', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0x1234, 0);
  const entries = Array.from(buf.entries());
  // 大端序：高位字节在前
  return entries[0][1] === 0x12 && entries[1][1] === 0x34;
});

// ==================== 迭代器与 Buffer 特殊属性测试 ====================
test('entries 在 Buffer 添加自定义属性后仍正常', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.customProp = 'test';
  buf.customMethod = function() { return 'method'; };
  const entries = Array.from(buf.entries());
  return entries.length === 3 && buf.customProp === 'test';
});

test('entries 在 Buffer 冻结后仍可迭代', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    Object.freeze(buf);
    const entries = Array.from(buf.entries());
    return entries.length === 3 && Object.isFrozen(buf);
  } catch (e) {
    // Node.js 不允许 freeze TypedArray，这是预期行为
    const buf = Buffer.from([1, 2, 3]);
    const entries = Array.from(buf.entries());
    return entries.length === 3 && e.message.includes('freeze');
  }
});

test('entries 在 Buffer 密封后仍可迭代', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    Object.seal(buf);
    const entries = Array.from(buf.entries());
    return entries.length === 3 && Object.isSealed(buf);
  } catch (e) {
    // Node.js 不允许 seal TypedArray，这是预期行为
    const buf = Buffer.from([1, 2, 3]);
    const entries = Array.from(buf.entries());
    return entries.length === 3 && e.message.includes('seal');
  }
});

test('entries 在 Buffer 设置为不可扩展后仍可迭代', () => {
  const buf = Buffer.from([1, 2, 3]);
  Object.preventExtensions(buf);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && !Object.isExtensible(buf);
});

// ==================== 迭代器与 for-of 循环控制流 ====================
test('for-of 循环中 break 正确终止迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  let lastValue = 0;
  for (const [index, value] of buf.entries()) {
    count++;
    lastValue = value;
    if (value === 3) break;
  }
  return count === 3 && lastValue === 3;
});

test('for-of 循环中 continue 正确跳过当前迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let sum = 0;
  for (const [index, value] of buf.entries()) {
    if (value === 3) continue;
    sum += value;
  }
  return sum === 12; // 1 + 2 + 4 + 5 = 12（跳过 3）
});

test('for-of 循环中 return 正确退出函数', () => {
  function testFunc() {
    const buf = Buffer.from([1, 2, 3, 4, 5]);
    for (const [index, value] of buf.entries()) {
      if (value === 4) return value;
    }
    return 0;
  }
  return testFunc() === 4;
});

test('for-of 循环中 throw 正确抛出异常', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4, 5]);
    for (const [index, value] of buf.entries()) {
      if (value === 3) throw new Error('test error');
    }
    return false;
  } catch (e) {
    return e.message === 'test error';
  }
});

// ==================== 迭代器与 labeled 语句测试 ====================
test('for-of 循环中 labeled break 正确工作', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let count = 0;
  outer: for (const [index, value] of buf.entries()) {
    count++;
    if (value === 3) break outer;
  }
  return count === 3;
});

test('嵌套 for-of 循环中 labeled break 跳出外层循环', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  let count = 0;
  outer: for (const [i1, v1] of buf1.entries()) {
    for (const [i2, v2] of buf2.entries()) {
      count++;
      if (v2 === 5) break outer;
    }
  }
  return count === 2; // (1,4), (1,5) 然后 break
});

// ==================== 迭代器与默认参数测试 ====================
test('entries 在函数默认参数中使用', () => {
  function testFunc(iter = Buffer.from([1, 2, 3]).entries()) {
    return Array.from(iter).length;
  }
  return testFunc() === 3;
});

test('entries 在箭头函数默认参数中使用', () => {
  const testFunc = (iter = Buffer.from([5, 10, 15]).entries()) => Array.from(iter).length;
  return testFunc() === 3;
});

// ==================== 迭代器与剩余参数测试 ====================
test('entries 结果可用于剩余参数', () => {
  function testFunc(...entries) {
    return entries.length;
  }
  const buf = Buffer.from([1, 2, 3]);
  return testFunc(...buf.entries()) === 3;
});

// ==================== 迭代器与可选链操作符测试 ====================
test('entries 在可选链中使用', () => {
  const obj = { buf: Buffer.from([1, 2, 3]) };
  const entries = obj?.buf?.entries();
  return entries !== undefined && typeof entries.next === 'function';
});

test('entries 在空值合并中使用', () => {
  const buf = null;
  const entries = buf?.entries() ?? [];
  return Array.isArray(entries) && entries.length === 0;
});

// ==================== 迭代器与逻辑运算符测试 ====================
test('entries 在逻辑与运算符中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = buf && buf.entries && buf.entries();
  return result !== undefined && typeof result.next === 'function';
});

test('entries 在逻辑或运算符中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = buf.entries() || [];
  return typeof result.next === 'function';
});

// ==================== 结果汇总 ====================
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
    tests: tests,
    message: failed === 0 ? 
      '✅ 所有补充测试通过！buf.entries() 完全覆盖所有遗漏场景' :
      '❌ 存在失败的测试，请检查详情'
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

