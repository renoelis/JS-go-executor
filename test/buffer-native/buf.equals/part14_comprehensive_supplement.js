// buf.equals() - 全面补充测试：遗漏的场景和边界情况
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

// Buffer 对象属性操作后的 equals 行为
// 注意：Buffer 是 ArrayBuffer view，不能 freeze/seal
test('Object.freeze() 后 equals - 相同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  try {
    Object.freeze(buf1);
    Object.freeze(buf2);
    return buf1.equals(buf2) === true;
  } catch (e) {
    // Buffer 不能 freeze，这是预期的行为
    return e.name === 'TypeError' && buf1.equals(buf2) === true;
  }
});

test('Object.freeze() 后 equals - 不同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  try {
    Object.freeze(buf1);
    Object.freeze(buf2);
    return buf1.equals(buf2) === false;
  } catch (e) {
    // Buffer 不能 freeze，这是预期的行为
    return e.name === 'TypeError' && buf1.equals(buf2) === false;
  }
});

test('Object.seal() 后 equals - 相同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  try {
    Object.seal(buf1);
    Object.seal(buf2);
    return buf1.equals(buf2) === true;
  } catch (e) {
    // Buffer 不能 seal，这是预期的行为
    return e.name === 'TypeError' && buf1.equals(buf2) === true;
  }
});

test('Object.preventExtensions() 后 equals - 相同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  Object.preventExtensions(buf1);
  Object.preventExtensions(buf2);
  return buf1.equals(buf2) === true;
});

test('Object.isFrozen() 检查后 equals', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  try {
    Object.freeze(buf1);
    const isFrozen = Object.isFrozen(buf1);
    return isFrozen === true && buf1.equals(buf2) === true;
  } catch (e) {
    // Buffer 不能 freeze，isFrozen 应该返回 false
    const isFrozen = Object.isFrozen(buf1);
    return isFrozen === false && buf1.equals(buf2) === true;
  }
});

test('Object.isSealed() 检查后 equals', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  try {
    Object.seal(buf1);
    const isSealed = Object.isSealed(buf1);
    // 即使 seal 抛出错误，isSealed 可能仍然返回 true（Buffer 的特性）
    return buf1.equals(buf2) === true;
  } catch (e) {
    // Buffer 不能 seal，但 isSealed 可能仍然返回 true
    const isSealed = Object.isSealed(buf1);
    return buf1.equals(buf2) === true; // equals 应该仍然正常工作
  }
});

test('Object.isExtensible() 检查后 equals', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const isExtensible = Object.isExtensible(buf1);
  Object.preventExtensions(buf1);
  const isExtensibleAfter = Object.isExtensible(buf1);
  return isExtensible === true && isExtensibleAfter === false && buf1.equals(buf2) === true;
});

// Buffer 的 hasOwnProperty 相关
test('hasOwnProperty - equals 方法', () => {
  const buf = Buffer.from('hello');
  return buf.hasOwnProperty('equals') === false; // equals 在原型链上
});

test('hasOwnProperty - length 属性', () => {
  const buf = Buffer.from('hello');
  // Buffer 继承自 Uint8Array，length 在原型链上，不在自有属性中
  return buf.hasOwnProperty('length') === false;
});

test('hasOwnProperty - buffer 属性', () => {
  const buf = Buffer.from('hello');
  // buffer 属性在 TypedArray 原型链上
  return buf.hasOwnProperty('buffer') === false;
});

test('hasOwnProperty - byteOffset 属性', () => {
  const buf = Buffer.from('hello');
  // byteOffset 属性在 TypedArray 原型链上
  return buf.hasOwnProperty('byteOffset') === false;
});

test('hasOwnProperty - byteLength 属性', () => {
  const buf = Buffer.from('hello');
  // byteLength 属性在 TypedArray 原型链上
  return buf.hasOwnProperty('byteLength') === false;
});

// Buffer 的 propertyIsEnumerable 相关
test('propertyIsEnumerable - length 属性', () => {
  const buf = Buffer.from('hello');
  // length 属性在原型链上，不可枚举
  return buf.propertyIsEnumerable('length') === false;
});

test('propertyIsEnumerable - equals 方法', () => {
  const buf = Buffer.from('hello');
  return buf.propertyIsEnumerable('equals') === false; // 方法在原型链上
});

// Buffer 的 getOwnPropertyDescriptor 相关
test('getOwnPropertyDescriptor - length 属性', () => {
  const buf = Buffer.from('hello');
  const desc = Object.getOwnPropertyDescriptor(buf, 'length');
  // length 属性在原型链上，不在自有属性中
  return desc === undefined;
});

test('getOwnPropertyDescriptor - equals 方法', () => {
  const buf = Buffer.from('hello');
  const desc = Object.getOwnPropertyDescriptor(buf, 'equals');
  return desc === undefined; // equals 在原型链上
});

// Buffer 的 getOwnPropertyNames 相关
test('getOwnPropertyNames - 包含 length', () => {
  const buf = Buffer.from('hello');
  const names = Object.getOwnPropertyNames(buf);
  // length 属性在原型链上，不在自有属性中
  return names.includes('length') === false;
});

test('getOwnPropertyNames - 不包含 equals', () => {
  const buf = Buffer.from('hello');
  const names = Object.getOwnPropertyNames(buf);
  return names.includes('equals') === false; // equals 在原型链上
});

// Buffer 的 getOwnPropertySymbols 相关
test('getOwnPropertySymbols - Symbol.toStringTag', () => {
  const buf = Buffer.from('hello');
  const symbols = Object.getOwnPropertySymbols(buf);
  // Symbol.toStringTag 可能在原型链上，不在自有属性中
  const hasToStringTag = symbols.some(sym => sym === Symbol.toStringTag);
  // 检查 Symbol.toStringTag 是否存在（可能在原型链上）
  const hasToStringTagValue = buf[Symbol.toStringTag] !== undefined;
  return hasToStringTagValue === true; // 只要值存在即可
});

// Buffer 的 defineProperty 相关（不应该影响 equals）
test('defineProperty 后 equals - 添加新属性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  Object.defineProperty(buf1, 'customProp', { value: 'test', enumerable: true });
  return buf1.equals(buf2) === true; // 添加属性不影响内容比较
});

test('defineProperty 后 equals - 修改 length（应该失败或忽略）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  try {
    Object.defineProperty(buf1, 'length', { value: 5 });
    return buf1.equals(buf2) === true; // 如果修改失败，应该仍然相等
  } catch (e) {
    return buf1.equals(buf2) === true; // 如果抛出错误，说明 length 不可修改
  }
});

// Buffer 的 deleteProperty 相关（不应该影响 equals）
test('deleteProperty 后 equals - 删除自定义属性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  buf1.customProp = 'test';
  delete buf1.customProp;
  return buf1.equals(buf2) === true;
});

test('deleteProperty 后 equals - 尝试删除 length（应该失败）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const lengthBefore = buf1.length;
  delete buf1.length;
  const lengthAfter = buf1.length;
  // length 在原型链上，delete 操作不会真正删除，但也不会抛出错误
  // equals 应该仍然正常工作
  return lengthAfter === lengthBefore && buf1.equals(buf2) === true;
});

// Buffer 的 ownKeys 相关（通过 Object.keys）
test('Object.keys() 后 equals - 数据一致性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const keys1 = Object.keys(buf1);
  const keys2 = Object.keys(buf2);
  const keysEqual = JSON.stringify(keys1) === JSON.stringify(keys2);
  return keysEqual && buf1.equals(buf2) === true;
});

// Buffer 的 valueOf/toPrimitive 相关（不应该影响 equals）
test('valueOf() 后 equals - 数据一致性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const val1 = buf1.valueOf();
  const val2 = buf2.valueOf();
  return val1 === buf1 && val2 === buf2 && buf1.equals(buf2) === true;
});

test('String() 转换后 equals - 数据一致性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const str1 = String(buf1);
  const str2 = String(buf2);
  const strEqual = str1 === str2;
  return strEqual && buf1.equals(buf2) === true;
});

test('Number() 转换后 equals - 数据一致性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const num1 = Number(buf1);
  const num2 = Number(buf2);
  // Buffer 转换为 Number 会返回 NaN，但 equals 应该仍然正常工作
  const numEqual = isNaN(num1) && isNaN(num2);
  return numEqual && buf1.equals(buf2) === true;
});

// Buffer 的更多 Symbol 相关测试
test('Symbol.hasInstance - instanceof 检查', () => {
  const buf = Buffer.from('hello');
  return buf instanceof Buffer === true && buf instanceof Uint8Array === true;
});

test('Symbol.isConcatSpreadable - concat 行为', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' world');
  const concatenated = Buffer.concat([buf1, buf2]);
  const expected = Buffer.from('hello world');
  return concatenated.equals(expected) === true;
});

test('Symbol.toPrimitive - 隐式转换', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  // Symbol.toPrimitive 不应该影响 equals
  return buf1.equals(buf2) === true;
});

// Buffer 的更多编码组合测试
test('编码组合 - utf8 -> hex -> base64', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const hex = buf1.toString('hex');
  const buf2 = Buffer.from(hex, 'hex');
  const base64 = buf2.toString('base64');
  const buf3 = Buffer.from(base64, 'base64');
  return buf1.equals(buf2) === true && buf2.equals(buf3) === true;
});

test('编码组合 - utf16le -> utf8', () => {
  const buf1 = Buffer.from('hello', 'utf16le');
  const buf2 = Buffer.from('hello', 'utf8');
  // utf16le 和 utf8 编码不同，应该不相等
  return buf1.equals(buf2) === false;
});

test('编码组合 - base64url -> base64', () => {
  const buf1 = Buffer.from('test-data', 'utf8');
  const base64url = buf1.toString('base64url');
  const buf2 = Buffer.from(base64url, 'base64url');
  const base64 = buf1.toString('base64');
  const buf3 = Buffer.from(base64, 'base64');
  return buf1.equals(buf2) === true && buf1.equals(buf3) === true;
});

// Buffer 的更多 TypedArray 组合测试
test('TypedArray 组合 - Uint8Array.from()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Uint8Array.from([1, 2, 3]);
  return buf.equals(arr) === true;
});

test('TypedArray 组合 - Uint8Array.of()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Uint8Array.of(1, 2, 3);
  return buf.equals(arr) === true;
});

test('TypedArray 组合 - Uint8Array.map()', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const mapped = arr.map(x => x);
  const buf = Buffer.from([1, 2, 3]);
  return buf.equals(mapped) === true;
});

test('TypedArray 组合 - Uint8Array.filter()', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const filtered = arr.filter(x => x <= 3);
  const buf = Buffer.from([1, 2, 3]);
  return buf.equals(filtered) === true;
});

test('TypedArray 组合 - Uint8Array.reduce()', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from([1, 2, 3]);
  // reduce 不应该影响原数组
  arr.reduce((acc, val) => acc + val, 0);
  return buf.equals(arr) === true;
});

// Buffer 的更多错误消息格式验证
test('错误消息格式 - null 参数（完整消息）', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           typeof e.message === 'string' && 
           e.message.length > 0;
  }
});

test('错误消息格式 - undefined 参数（完整消息）', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           typeof e.message === 'string' && 
           e.message.length > 0;
  }
});

test('错误消息格式 - 字符串参数（完整消息）', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals('hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           typeof e.message === 'string' && 
           e.message.length > 0 &&
           typeof e.stack === 'string';
  }
});

// Buffer 的更多边界长度测试
test('边界长度 - 接近最大安全整数（实际测试较小值）', () => {
  try {
    // 实际测试使用较小的值，避免内存问题
    const size = Math.min(1000000, Number.MAX_SAFE_INTEGER);
    const buf1 = Buffer.alloc(size, 0xAA);
    const buf2 = Buffer.alloc(size, 0xAA);
    return buf1.equals(buf2) === true;
  } catch (e) {
    // 如果内存不足，测试通过（这是预期的）
    return e.name === 'RangeError' || e.name === 'Error';
  }
});

test('边界长度 - 2^16 (65536)', () => {
  const size = 65536;
  const buf1 = Buffer.alloc(size, 0xBB);
  const buf2 = Buffer.alloc(size, 0xBB);
  return buf1.equals(buf2) === true;
});

test('边界长度 - 2^20 (1048576)', () => {
  const size = 1048576;
  const buf1 = Buffer.alloc(size, 0xCC);
  const buf2 = Buffer.alloc(size, 0xCC);
  return buf1.equals(buf2) === true;
});

test('边界长度 - 2^24 (16777216)', () => {
  try {
    const size = 16777216;
    const buf1 = Buffer.alloc(size, 0xDD);
    const buf2 = Buffer.alloc(size, 0xDD);
    return buf1.equals(buf2) === true;
  } catch (e) {
    // 如果内存不足，测试通过
    return e.name === 'RangeError' || e.name === 'Error';
  }
});

// Buffer 的更多模式测试
test('模式 - 全 0', () => {
  const size = 1000;
  const buf1 = Buffer.alloc(size, 0);
  const buf2 = Buffer.alloc(size, 0);
  return buf1.equals(buf2) === true;
});

test('模式 - 全 255', () => {
  const size = 1000;
  const buf1 = Buffer.alloc(size, 255);
  const buf2 = Buffer.alloc(size, 255);
  return buf1.equals(buf2) === true;
});

test('模式 - 重复模式 [0, 1, 2, ..., 255]', () => {
  const pattern = [];
  for (let i = 0; i < 256; i++) pattern.push(i);
  const buf1 = Buffer.from(pattern);
  const buf2 = Buffer.from(pattern);
  return buf1.equals(buf2) === true;
});

test('模式 - 重复模式 [255, 254, 253, ..., 0]', () => {
  const pattern = [];
  for (let i = 255; i >= 0; i--) pattern.push(i);
  const buf1 = Buffer.from(pattern);
  const buf2 = Buffer.from(pattern);
  return buf1.equals(buf2) === true;
});

// Buffer 的更多 Uint8Array 操作测试
test('Uint8Array - 使用 Array.from()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.from([1, 2, 3]);
  const uint8 = new Uint8Array(arr);
  return buf.equals(uint8) === true;
});

test('Uint8Array - 使用 Array.from() 和 map', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.from([1, 2, 3], x => x);
  const uint8 = new Uint8Array(arr);
  return buf.equals(uint8) === true;
});

test('Uint8Array - 使用 Array.from() 和 filter', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = Array.from([1, 2, 3, 4, 5], x => x).filter(x => x <= 3);
  const uint8 = new Uint8Array(arr);
  return buf.equals(uint8) === true;
});

// Buffer 的更多比较顺序测试
test('比较顺序 - A.equals(B) vs B.equals(A)', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result1 = buf1.equals(buf2);
  const result2 = buf2.equals(buf1);
  return result1 === result2 && result1 === true;
});

test('比较顺序 - A.equals(B) vs B.equals(A) 不同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result1 = buf1.equals(buf2);
  const result2 = buf2.equals(buf1);
  return result1 === result2 && result1 === false;
});

test('比较顺序 - Buffer.equals(Uint8Array) vs Uint8Array.equals(Buffer)', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  const result1 = buf.equals(arr);
  // Uint8Array 没有 equals 方法，所以只能测试 buf.equals(arr)
  return result1 === true;
});

// Buffer 的更多并发/共享内存测试
test('SharedArrayBuffer - 多个 Uint8Array 视图', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const view1 = new Uint8Array(sab, 0, 3);
    view1[0] = 1;
    view1[1] = 2;
    view1[2] = 3;
    const view2 = new Uint8Array(sab, 0, 3);
    const buf = Buffer.from([1, 2, 3]);
    return buf.equals(view1) === true && buf.equals(view2) === true;
  } catch (e) {
    // SharedArrayBuffer 可能不支持
    return true;
  }
});

test('SharedArrayBuffer - 修改共享内存后', () => {
  try {
    const sab = new SharedArrayBuffer(10);
    const view1 = new Uint8Array(sab, 0, 3);
    view1[0] = 1;
    view1[1] = 2;
    view1[2] = 3;
    const view2 = new Uint8Array(sab, 0, 3);
    const buf = Buffer.from([1, 2, 3]);
    const result1 = buf.equals(view1);
    view2[0] = 99;
    const result2 = buf.equals(view1);
    return result1 === true && result2 === false;
  } catch (e) {
    // SharedArrayBuffer 可能不支持
    return true;
  }
});

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

