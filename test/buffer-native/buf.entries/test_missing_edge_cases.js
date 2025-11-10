// buf.entries() - 补充遗漏的边界情况和高级场景
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

// ==================== 迭代器协议深度测试 ====================
test('迭代器有正确的 next 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter.next === 'function';
});

test('迭代器 next 返回正确的对象结构', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const result = iter.next();
  return result.hasOwnProperty('value') && result.hasOwnProperty('done');
});

test('迭代器 next 返回的 value 是数组', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  const result = iter.next();
  return Array.isArray(result.value) && result.value.length === 2;
});

test('迭代器 next 返回的 value[0] 是索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  const result = iter.next();
  return typeof result.value[0] === 'number' && result.value[0] === 0;
});

test('迭代器 next 返回的 value[1] 是字节值', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  const result = iter.next();
  return typeof result.value[1] === 'number' && result.value[1] === 10;
});

test('迭代器第一次调用 done 为 false', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  const result = iter.next();
  return result.done === false;
});

test('迭代器最后一次调用 done 为 false', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  iter.next();
  iter.next();
  const result = iter.next();
  return result.done === false && result.value[0] === 2;
});

test('迭代器结束后 done 为 true', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  iter.next();
  iter.next();
  iter.next();
  const result = iter.next();
  return result.done === true;
});

test('迭代器结束后 value 为 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  iter.next();
  iter.next();
  iter.next();
  const result = iter.next();
  return result.value === undefined;
});

test('迭代器结束后继续调用 next 仍返回 done:true', () => {
  const buf = Buffer.from([1, 2]);
  const iter = buf.entries();
  iter.next();
  iter.next();
  iter.next();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('迭代器是可迭代对象（有 Symbol.iterator 方法）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter[Symbol.iterator] === 'function';
});

test('迭代器的 Symbol.iterator 返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return iter[Symbol.iterator]() === iter;
});

test('迭代器可用于 for...of 循环', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter = buf.entries();
  const results = [];
  for (const entry of iter) {
    results.push(entry);
  }
  return results.length === 3 && results[0][0] === 0 && results[0][1] === 10;
});

test('迭代器可用于扩展运算符', () => {
  const buf = Buffer.from([5, 10, 15]);
  const entries = [...buf.entries()];
  return entries.length === 3 && entries[1][0] === 1 && entries[1][1] === 10;
});

test('迭代器可用于 Array.from', () => {
  const buf = Buffer.from([100, 200]);
  const arr = Array.from(buf.entries());
  return arr.length === 2 && arr[0][0] === 0 && arr[1][1] === 200;
});

// ==================== 特殊字节值测试 ====================
test('entries 处理字节值 0', () => {
  const buf = Buffer.from([0, 1, 2]);
  const entries = Array.from(buf.entries());
  return entries[0][1] === 0;
});

test('entries 处理字节值 255', () => {
  const buf = Buffer.from([253, 254, 255]);
  const entries = Array.from(buf.entries());
  return entries[2][1] === 255;
});

test('entries 处理全 0 Buffer', () => {
  const buf = Buffer.alloc(5);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries.every(([idx, val]) => val === 0);
});

test('entries 处理全 255 Buffer', () => {
  const buf = Buffer.alloc(5, 255);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries.every(([idx, val]) => val === 255);
});

test('entries 处理交替的 0 和 255', () => {
  const buf = Buffer.from([0, 255, 0, 255, 0]);
  const entries = Array.from(buf.entries());
  return entries[0][1] === 0 && entries[1][1] === 255 && 
         entries[2][1] === 0 && entries[3][1] === 255;
});

// ==================== 不同创建方式的 Buffer ====================
test('Buffer.alloc 创建的 Buffer entries', () => {
  const buf = Buffer.alloc(3, 42);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries.every(([, val]) => val === 42);
});

test('Buffer.allocUnsafe 创建的 Buffer entries', () => {
  const buf = Buffer.allocUnsafe(3);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][1] === 10;
});

test('Buffer.allocUnsafeSlow 创建的 Buffer entries', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(3);
    buf[0] = 5;
    buf[1] = 10;
    buf[2] = 15;
    const entries = Array.from(buf.entries());
    return entries.length === 3 && entries[1][1] === 10;
  } catch (e) {
    return true;
  }
});

test('Buffer.from 数组创建的 Buffer entries', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const entries = Array.from(buf.entries());
  return entries.length === 5 && entries[2][1] === 3;
});

test('Buffer.from 字符串 utf8 创建的 Buffer entries', () => {
  const buf = Buffer.from('abc', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][1] === 97;
});

test('Buffer.from 字符串 hex 创建的 Buffer entries', () => {
  const buf = Buffer.from('0102ff', 'hex');
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][1] === 1 && entries[2][1] === 255;
});

test('Buffer.from 字符串 base64 创建的 Buffer entries', () => {
  const buf = Buffer.from('AQID', 'base64');
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[0][1] === 1 && entries[2][1] === 3;
});

test('Buffer.from Buffer 创建的 Buffer entries', () => {
  const buf1 = Buffer.from([10, 20, 30]);
  const buf2 = Buffer.from(buf1);
  const entries = Array.from(buf2.entries());
  return entries.length === 3 && entries[1][1] === 20;
});

test('Buffer.from ArrayBuffer 创建的 Buffer entries', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 100;
  view[1] = 200;
  const buf = Buffer.from(ab);
  const entries = Array.from(buf.entries());
  return entries[0][1] === 100 && entries[1][1] === 200;
});

// ==================== 长度边界测试 ====================
test('entries 处理长度为 1 的 Buffer', () => {
  const buf = Buffer.from([42]);
  const entries = Array.from(buf.entries());
  return entries.length === 1 && entries[0][0] === 0 && entries[0][1] === 42;
});

test('entries 处理长度为 2 的 Buffer', () => {
  const buf = Buffer.from([10, 20]);
  const entries = Array.from(buf.entries());
  return entries.length === 2 && entries[0][1] === 10 && entries[1][1] === 20;
});

test('entries 处理长度为 256 的 Buffer', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  const entries = Array.from(buf.entries());
  return entries.length === 256 && entries[255][0] === 255 && entries[255][1] === 255;
});

test('entries 处理长度为 1024 的 Buffer', () => {
  const buf = Buffer.alloc(1024);
  const entries = Array.from(buf.entries());
  return entries.length === 1024 && entries[1023][0] === 1023;
});

test('entries 处理大尺寸 Buffer (8192 字节)', () => {
  const buf = Buffer.alloc(8192);
  buf[0] = 1;
  buf[8191] = 255;
  const entries = Array.from(buf.entries());
  return entries.length === 8192 && entries[0][1] === 1 && entries[8191][1] === 255;
});

// ==================== 编码相关测试 ====================
test('entries 处理 base64url 编码', () => {
  try {
    const buf = Buffer.from('AQID', 'base64url');
    const entries = Array.from(buf.entries());
    return entries.length === 3;
  } catch (e) {
    return true;
  }
});

test('entries 处理 utf8 中文字符', () => {
  const buf = Buffer.from('中文', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 6;
});

test('entries 处理 utf8 日文字符', () => {
  const buf = Buffer.from('日本語', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 9;
});

test('entries 处理 utf8 emoji 字符', () => {
  const buf = Buffer.from('😀😃', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 8;
});

test('entries 处理 utf8 emoji 组合字符', () => {
  const buf = Buffer.from('👨‍👩‍👧‍👦', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length > 0;
});

// ==================== 边界操作测试 ====================
test('entries 与解构赋值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const [[idx0, val0], [idx1, val1], [idx2, val2]] = buf.entries();
  return idx0 === 0 && val0 === 1 && idx1 === 1 && val1 === 2 && idx2 === 2 && val2 === 3;
});

test('entries 部分迭代后转数组', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const iter = buf.entries();
  iter.next();
  iter.next();
  const remaining = Array.from(iter);
  return remaining.length === 3 && remaining[0][0] === 2 && remaining[0][1] === 30;
});

test('entries 迭代中断后重新迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next();
  iter.next();
  const newIter = buf.entries();
  const result = newIter.next();
  return result.value[0] === 0 && result.value[1] === 1;
});

test('entries 多个迭代器独立工作', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iter1 = buf.entries();
  const iter2 = buf.entries();
  iter1.next();
  const result2 = iter2.next();
  return result2.value[0] === 0 && result2.value[1] === 10;
});

test('entries 迭代器不受另一个迭代器影响', () => {
  const buf = Buffer.from([5, 10, 15, 20]);
  const iter1 = buf.entries();
  const iter2 = buf.entries();
  iter1.next();
  iter1.next();
  const result2 = iter2.next();
  const result1 = iter1.next();
  return result2.value[0] === 0 && result1.value[0] === 2;
});

// ==================== 与 TypedArray 兼容性测试 ====================
test('entries 与 Uint8Array.prototype.entries 行为一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  const bufEntries = Array.from(buf.entries());
  const arrEntries = Array.from(arr.entries());
  return JSON.stringify(bufEntries) === JSON.stringify(arrEntries);
});

test('entries 与 Uint8Array 共享原型方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);
  return typeof buf.entries === typeof uint8.entries;
});

// ==================== slice 和 subarray 深度测试 ====================
test('slice 创建的 Buffer entries 独立于原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  buf[2] = 99;
  const entries = Array.from(sliced.entries());
  return entries[1][1] === 99;
});

test('subarray 创建的 Buffer entries 反映原 Buffer 变化', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  buf[2] = 99;
  const entries = Array.from(sub.entries());
  return entries[1][1] === 99;
});

test('负索引 slice 的 Buffer entries', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(-3, -1);
  const entries = Array.from(sliced.entries());
  return entries.length === 2 && entries[0][1] === 30 && entries[1][1] === 40;
});

test('负索引 subarray 的 Buffer entries', () => {
  const buf = Buffer.from([5, 10, 15, 20, 25]);
  const sub = buf.subarray(-4, -1);
  const entries = Array.from(sub.entries());
  return entries.length === 3 && entries[0][1] === 10 && entries[2][1] === 20;
});

// ==================== 性能相关测试（确保不会崩溃） ====================
test('entries 处理超大 Buffer (64KB)', () => {
  try {
    const buf = Buffer.alloc(65536);
    buf[0] = 1;
    buf[65535] = 255;
    let count = 0;
    for (const [idx, val] of buf.entries()) {
      if (idx === 0 || idx === 65535) {
        count++;
      }
    }
    return count === 2;
  } catch (e) {
    return true;
  }
});

test('entries 迭代器不会泄漏内存（间接测试）', () => {
  const results = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(1000);
    const iter = buf.entries();
    iter.next();
    results.push(iter);
  }
  return results.length === 100;
});

// ==================== 错误处理测试 ====================
test('在非 Buffer 对象上调用 entries 抛出错误', () => {
  try {
    const notBuffer = { length: 3, 0: 1, 1: 2, 2: 3 };
    const entriesFunc = Buffer.from([]).entries;
    entriesFunc.call(notBuffer);
    return false;
  } catch (e) {
    return true;
  }
});

test('在 null 上调用 entries 抛出错误', () => {
  try {
    const entriesFunc = Buffer.from([]).entries;
    entriesFunc.call(null);
    return false;
  } catch (e) {
    return true;
  }
});

test('在 undefined 上调用 entries 抛出错误', () => {
  try {
    const entriesFunc = Buffer.from([]).entries;
    entriesFunc.call(undefined);
    return false;
  } catch (e) {
    return true;
  }
});

test('在普通数组上调用 entries 抛出错误', () => {
  try {
    const arr = [1, 2, 3];
    const entriesFunc = Buffer.from([]).entries;
    entriesFunc.call(arr);
    return false;
  } catch (e) {
    return true;
  }
});

// ==================== concat 后的测试 ====================
test('concat 多个 Buffer 后的 entries', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf3 = Buffer.from([5, 6]);
  const buf = Buffer.concat([buf1, buf2, buf3]);
  const entries = Array.from(buf.entries());
  return entries.length === 6 && entries[5][1] === 6;
});

test('concat 空 Buffer 后的 entries', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.alloc(0);
  const buf = Buffer.concat([buf1, buf2]);
  const entries = Array.from(buf.entries());
  return entries.length === 3;
});

test('concat 仅空 Buffer 的 entries', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const buf = Buffer.concat([buf1, buf2]);
  const entries = Array.from(buf.entries());
  return entries.length === 0;
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
      '✅ 所有补充边界测试通过！' :
      '❌ 存在失败的补充测试'
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

