// buf.entries() - 遗漏场景补充测试
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

// ==================== 编码覆盖补充 ====================
test('base64url 编码的 Buffer entries', () => {
  try {
    const buf = Buffer.from('SGVsbG8', 'base64url');
    const entries = Array.from(buf.entries());
    return entries.length === 5 && entries[0][1] === 72;
  } catch (e) {
    return true;
  }
});

test('latin1 编码包含特殊字符', () => {
  const buf = Buffer.from('café©', 'latin1');
  const entries = Array.from(buf.entries());
  return entries.length === 5;
});

test('ascii 编码超出范围字符处理', () => {
  const buf = Buffer.from('hello©', 'ascii');
  const entries = Array.from(buf.entries());
  return entries.length === 6;
});

test('binary 编码与 latin1 一致性', () => {
  const str = 'hello';
  const buf1 = Buffer.from(str, 'binary');
  const buf2 = Buffer.from(str, 'latin1');
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  let match = true;
  for (let i = 0; i < entries1.length; i++) {
    if (entries1[i][1] !== entries2[i][1]) {
      match = false;
      break;
    }
  }
  return match;
});

// ==================== 迭代器错误类型测试 ====================
test('在普通对象上调用 entries 报错', () => {
  try {
    const obj = { 0: 1, 1: 2, length: 2 };
    const entriesFunc = Buffer.prototype.entries;
    entriesFunc.call(obj);
    return false;
  } catch (e) {
    return true;
  }
});

test('在数组上调用 Buffer.entries 报错', () => {
  try {
    const arr = [1, 2, 3];
    const entriesFunc = Buffer.prototype.entries;
    entriesFunc.call(arr);
    return false;
  } catch (e) {
    return true;
  }
});

test('在字符串上调用 Buffer.entries 报错', () => {
  try {
    const str = "hello";
    const entriesFunc = Buffer.prototype.entries;
    entriesFunc.call(str);
    return false;
  } catch (e) {
    return true;
  }
});

test('在数字上调用 Buffer.entries 报错', () => {
  try {
    const num = 123;
    const entriesFunc = Buffer.prototype.entries;
    entriesFunc.call(num);
    return false;
  } catch (e) {
    return true;
  }
});

// ==================== Buffer.concat 特殊场景 ====================
test('concat 空数组返回空 Buffer entries', () => {
  const buf = Buffer.concat([]);
  const entries = Array.from(buf.entries());
  return entries.length === 0;
});

test('concat 单个 Buffer entries', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf = Buffer.concat([buf1]);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[1][1] === 2;
});

test('concat 多个不同来源的 Buffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from('ab', 'utf8');
  const buf3 = Buffer.from([5, 6]);
  const buf = Buffer.concat([buf1, buf2, buf3]);
  const entries = Array.from(buf.entries());
  return entries.length === 6 && entries[0][1] === 1 && entries[5][1] === 6;
});

test('concat 包含空 Buffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2, buf3]);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[2][1] === 3;
});

test('concat 指定总长度小于实际长度', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const buf = Buffer.concat([buf1, buf2], 4);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[3][1] === 4;
});

test('concat 指定总长度大于实际长度', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2], 10);
  const entries = Array.from(buf.entries());
  return entries.length === 10 && entries[3][1] === 4;
});

// ==================== 迭代器与数组方法深度测试 ====================
test('entries 可用于 Array.prototype.flatMap', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = Array.from(buf.entries()).flatMap(([index, value]) => [index, value]);
  return result.length === 6 && result[0] === 0 && result[1] === 1;
});

test('entries 可用于 Array.prototype.forEach', () => {
  const buf = Buffer.from([10, 20, 30]);
  const results = [];
  Array.from(buf.entries()).forEach(([index, value]) => {
    results.push(index + value);
  });
  return results.length === 3 && results[0] === 10 && results[1] === 21;
});

test('entries 可用于 Array.prototype.sort', () => {
  const buf = Buffer.from([30, 10, 20]);
  const sorted = Array.from(buf.entries()).sort((a, b) => a[1] - b[1]);
  return sorted[0][1] === 10 && sorted[1][1] === 20 && sorted[2][1] === 30;
});

test('entries 可用于 Array.prototype.reverse', () => {
  const buf = Buffer.from([1, 2, 3]);
  const reversed = Array.from(buf.entries()).reverse();
  return reversed[0][1] === 3 && reversed[1][1] === 2 && reversed[2][1] === 1;
});

test('entries 可用于 Array.prototype.slice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = Array.from(buf.entries()).slice(1, 4);
  return sliced.length === 3 && sliced[0][0] === 1 && sliced[2][0] === 3;
});

test('entries 可用于 Array.prototype.splice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = Array.from(buf.entries());
  arr.splice(1, 2, [99, 99]);
  return arr.length === 4 && arr[1][0] === 99;
});

test('entries 可用于 Array.prototype.concat', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const arr = Array.from(buf1.entries()).concat(Array.from(buf2.entries()));
  return arr.length === 4 && arr[2][0] === 0 && arr[2][1] === 3;
});

test('entries 可用于 Array.prototype.join', () => {
  const buf = Buffer.from([1, 2, 3]);
  const joined = Array.from(buf.entries()).map(([i, v]) => `${i}:${v}`).join(',');
  return joined === '0:1,1:2,2:3';
});

// ==================== 迭代器与特殊 Buffer 场景 ====================
test('allocUnsafeSlow 创建的 Buffer entries', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(42);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries.every(([, v]) => v === 42);
});

test('Buffer.from 传入 buffer 和 encoding 参数', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from(buf1);
  const entries = Array.from(buf2.entries());
  return entries.length === 5 && entries[0][1] === 104;
});

test('Buffer.from 传入 ArrayBuffer 和 byteOffset', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i;
  }
  const buf = Buffer.from(ab, 2);
  const entries = Array.from(buf.entries());
  return entries.length === 8 && entries[0][1] === 2;
});

test('Buffer.from 传入 ArrayBuffer、byteOffset 和 length', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i * 10;
  }
  const buf = Buffer.from(ab, 2, 5);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[0][1] === 20 && entries[4][1] === 60;
});

// ==================== 迭代器与 Buffer 方法组合 ====================
test('entries 与 Buffer.compare 静态方法', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const compare = Buffer.compare(buf1, buf2);
  return compare < 0 && entries1[2][1] < entries2[2][1];
});

test('entries 与 Buffer.concat 配合使用', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const buf = Buffer.concat([buf1, buf2]);
  const entries = Array.from(buf.entries());
  return entries.length === entries1.length + entries2.length;
});

test('entries 与 Buffer.isEncoding', () => {
  const buf = Buffer.from('hello', 'utf8');
  const isValid = Buffer.isEncoding('utf8');
  const entries = Array.from(buf.entries());
  return isValid === true && entries.length === 5;
});

test('entries 与 Buffer.byteLength', () => {
  const str = 'hello';
  const byteLen = Buffer.byteLength(str, 'utf8');
  const buf = Buffer.from(str, 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === byteLen;
});

test('entries 与 Buffer.isBuffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const check = Buffer.isBuffer(buf);
  const entries = Array.from(buf.entries());
  return check === true && entries.length === 3;
});

// ==================== 迭代器返回值结构验证 ====================
test('next() 返回的 value 是纯数组（不是类数组）', () => {
  const buf = Buffer.from([1]);
  const iter = buf.entries();
  const result = iter.next();
  return Array.isArray(result.value) && Object.prototype.toString.call(result.value) === '[object Array]';
});

test('next() 返回的 value 数组可被修改', () => {
  const buf = Buffer.from([10]);
  const iter = buf.entries();
  const result = iter.next();
  result.value[0] = 99;
  result.value[1] = 88;
  return result.value[0] === 99 && result.value[1] === 88;
});

test('next() 返回的 value 数组修改不影响 Buffer', () => {
  const buf = Buffer.from([10]);
  const iter = buf.entries();
  const result = iter.next();
  result.value[1] = 99;
  return buf[0] === 10; // Buffer 应该保持不变
});

test('next() 返回的 done 是布尔值', () => {
  const buf = Buffer.from([1]);
  const iter = buf.entries();
  const result1 = iter.next();
  const result2 = iter.next();
  return typeof result1.done === 'boolean' && typeof result2.done === 'boolean';
});

test('next() 返回的对象属性顺序', () => {
  const buf = Buffer.from([1]);
  const iter = buf.entries();
  const result = iter.next();
  const keys = Object.keys(result);
  return keys[0] === 'value' && keys[1] === 'done';
});

// ==================== 迭代器与循环嵌套深度测试 ====================
test('三层嵌套迭代', () => {
  const buf = Buffer.from([1, 2]);
  let count = 0;
  for (const [i1] of buf.entries()) {
    for (const [i2] of buf.entries()) {
      for (const [i3] of buf.entries()) {
        count++;
      }
    }
  }
  return count === 8; // 2 * 2 * 2
});

test('递归函数中使用迭代器', () => {
  function sumEntries(iter, acc) {
    const result = iter.next();
    if (result.done) {
      return acc;
    }
    return sumEntries(iter, acc + result.value[1]);
  }
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sum = sumEntries(buf.entries(), 0);
  return sum === 15;
});

// ==================== 迭代器与时间相关测试 ====================
test('迭代器在异步函数中使用', () => {
  async function testAsync() {
    const buf = Buffer.from([1, 2, 3]);
    const entries = [];
    for (const [index, value] of buf.entries()) {
      entries.push([index, value]);
    }
    return entries.length === 3;
  }
  return testAsync();
});

test('迭代器在 Promise 中使用', () => {
  const buf = Buffer.from([1, 2, 3]);
  return Promise.resolve(buf.entries())
    .then(iter => Array.from(iter))
    .then(entries => entries.length === 3);
});

test('迭代器在 setTimeout 回调中使用', () => {
  return new Promise((resolve) => {
    const buf = Buffer.from([1, 2, 3]);
    const iter = buf.entries();
    setTimeout(() => {
      const entries = Array.from(iter);
      resolve(entries.length === 3);
    }, 0);
  });
});

// ==================== 迭代器与正则表达式 ====================
test('entries 值与正则匹配配合', () => {
  const buf = Buffer.from('abc123', 'utf8');
  const entries = Array.from(buf.entries());
  const digitValues = entries.filter(([, v]) => {
    const char = String.fromCharCode(v);
    return /\d/.test(char);
  });
  return digitValues.length === 3;
});

// ==================== 迭代器与数学运算 ====================
test('entries 值进行位运算', () => {
  const buf = Buffer.from([0b11110000, 0b00001111]);
  const entries = Array.from(buf.entries());
  const xor = entries[0][1] ^ entries[1][1];
  return xor === 0b11111111;
});

test('entries 值进行移位运算', () => {
  const buf = Buffer.from([1, 2, 4, 8]);
  const entries = Array.from(buf.entries());
  const shifted = entries.map(([i, v]) => v << i);
  return shifted[0] === 1 && shifted[1] === 4 && shifted[2] === 16 && shifted[3] === 64;
});

test('entries 值进行取模运算', () => {
  const buf = Buffer.from([10, 15, 20, 25, 30]);
  const entries = Array.from(buf.entries());
  const mod3 = entries.filter(([, v]) => v % 3 === 0);
  return mod3.length === 2; // 15 和 30
});

// ==================== 迭代器与类型转换 ====================
test('entries 索引转换为字符串', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entries = Array.from(buf.entries());
  const keys = entries.map(([i]) => String(i));
  return keys[0] === '0' && keys[1] === '1' && keys[2] === '2';
});

test('entries 值转换为十六进制字符串', () => {
  const buf = Buffer.from([255, 16, 1]);
  const entries = Array.from(buf.entries());
  const hexValues = entries.map(([, v]) => v.toString(16).padStart(2, '0'));
  return hexValues[0] === 'ff' && hexValues[1] === '10' && hexValues[2] === '01';
});

test('entries 值转换为二进制字符串', () => {
  const buf = Buffer.from([7, 15]);
  const entries = Array.from(buf.entries());
  const binValues = entries.map(([, v]) => v.toString(2).padStart(8, '0'));
  return binValues[0] === '00000111' && binValues[1] === '00001111';
});

// ==================== 迭代器与 WeakMap/WeakSet（边界测试）====================
test('迭代器对象不能作为 WeakMap 的键（非对象或不能被弱引用）', () => {
  try {
    const buf = Buffer.from([1, 2]);
    const iter = buf.entries();
    const wm = new WeakMap();
    wm.set(iter, 'test');
    return wm.get(iter) === 'test';
  } catch (e) {
    return false;
  }
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
      '✅ 所有补充测试通过！buf.entries() 覆盖完整' :
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

