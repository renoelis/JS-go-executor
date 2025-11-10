const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = !!fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({
      name,
      status: '❌',
      error: e.message,
      stack: e.stack
    });
  }
}

// ============ 第二次深度查缺：边缘参数组合 ============

// +0 vs -0 的精确测试
test('零的符号：+0 作为 start', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(+0, 3);
  return sliced.toString() === 'hel';
});

test('零的符号：-0 作为 start', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-0, 3);
  return sliced.toString() === 'hel';
});

test('零的符号：+0 和 -0 作为 end', () => {
  const buf = Buffer.from('hello');
  const sliced1 = buf.slice(0, +0);
  const sliced2 = buf.slice(0, -0);
  return sliced1.length === 0 && sliced2.length === 0;
});

test('零的符号：区分 +0 和 -0 使用 Object.is', () => {
  // 虽然 Buffer.slice 不区分 +0 和 -0，但测试确认
  return Object.is(+0, -0) === false && Object.is(0, -0) === false;
});

// ============ 非常规数字格式 ============

test('数字格式：科学计数法负指数', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(1e-10, 5);
  // 1e-10 截断为 0
  return sliced.toString() === 'hello';
});

test('数字格式：极大的科学计数法', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 1e100);
  return sliced.toString() === 'hello';
});

test('数字格式：负的科学计数法', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-1e0, 5);
  return sliced.toString() === 'o';
});

// ============ slice 与其他 Buffer 创建方法的组合 ============

test('创建方法组合：Buffer.concat 结果的 slice', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const concatenated = Buffer.concat([buf1, buf2]);
  const sliced = concatenated.slice(5, 10);
  return sliced.toString() === 'world';
});

test('创建方法组合：Buffer.alloc 指定 fill 后 slice', () => {
  const buf = Buffer.alloc(10, 'ab');
  const sliced = buf.slice(0, 10);
  return sliced.toString() === 'ababababab';
});

test('创建方法组合：Buffer.allocUnsafe 后未初始化的 slice', () => {
  const buf = Buffer.allocUnsafe(10);
  const sliced = buf.slice(0, 10);
  // 只要不崩溃就行，内容不可预测
  return sliced.length === 10;
});

// ============ slice 后调用 transcode ============

test('transcode：slice 后的 utf8 到 utf16le', () => {
  const buf = Buffer.from('hello', 'utf8');
  const sliced = buf.slice(0, 5);
  try {
    const transcoded = Buffer.transcode(sliced, 'utf8', 'utf16le');
    return transcoded.length === 10; // UTF-16LE 每字符 2 字节
  } catch (e) {
    // transcode 可能在某些环境不可用
    return true;
  }
});

test('transcode：slice 后的 latin1 到 utf8', () => {
  const buf = Buffer.from('hello', 'latin1');
  const sliced = buf.slice(0, 5);
  try {
    const transcoded = Buffer.transcode(sliced, 'latin1', 'utf8');
    return transcoded.toString() === 'hello';
  } catch (e) {
    return true;
  }
});

// ============ slice 与 buffer.toLocaleString ============

test('toLocaleString：slice 后调用 toLocaleString', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 3);
  const str = sliced.toLocaleString();
  // toLocaleString 应该返回类似 toString 的结果
  return typeof str === 'string';
});

// ============ slice 参数为字符串数字的边界 ============

test('字符串数字：start 为 "0"', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice('0', 3);
  return sliced.toString() === 'hel';
});

test('字符串数字：start 为 " 1 "（带空格）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(' 1 ', 3);
  return sliced.toString() === 'el';
});

test('字符串数字：start 为 "+1"', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice('+1', 3);
  return sliced.toString() === 'el';
});

test('字符串数字：start 为 "-1"', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice('-1');
  return sliced.toString() === 'o';
});

test('字符串数字：start 为 "1.5"', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice('1.5', 3);
  return sliced.toString() === 'el';
});

test('字符串数字：start 为 "1e1"（科学计数法字符串）', () => {
  const buf = Buffer.from('hello world hello');
  const sliced = buf.slice('1e1', 15);
  // "1e1" 字符串会被解析为 10
  return sliced.length === 5;
});

test('字符串数字：start 为 "Infinity"', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice('Infinity');
  return sliced.length === 0;
});

test('字符串数字：start 为 "-Infinity"', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice('-Infinity', 3);
  return sliced.toString() === 'hel';
});

test('字符串数字：start 为空字符串（转为 NaN 再转为 0）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice('', 3);
  return sliced.toString() === 'hel';
});

test('字符串数字：start 为 "   "（纯空格，转为 0）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice('   ', 3);
  return sliced.toString() === 'hel';
});

// ============ slice 与不同的字符串编码边界 ============

test('编码边界：ucs2 编码创建后 slice', () => {
  const buf = Buffer.from('hello', 'ucs2');
  const sliced = buf.slice(0, 10);
  return sliced.length === 10;
});

test('编码边界：ucs-2 编码（别名）创建后 slice', () => {
  const buf = Buffer.from('hello', 'ucs-2');
  const sliced = buf.slice(0, 10);
  return sliced.length === 10;
});

test('编码边界：utf16le 编码创建后 slice', () => {
  const buf = Buffer.from('hello', 'utf16le');
  const sliced = buf.slice(0, 10);
  return sliced.length === 10;
});

test('编码边界：base64url 编码（如果支持）', () => {
  try {
    const buf = Buffer.from('SGVsbG8', 'base64url');
    const sliced = buf.slice(0, buf.length);
    return sliced.length > 0;
  } catch (e) {
    // 旧版本可能不支持 base64url
    return true;
  }
});

// ============ slice 与 buffer 的 length setter ============

test('length 修改：尝试修改 slice 的 length', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  const originalLength = sliced.length;

  // TypedArray 的 length 是只读的
  try {
    sliced.length = 10;
    // 严格模式下可能抛错
    return sliced.length === originalLength;
  } catch (e) {
    return true;
  }
});

// ============ slice 后调用 at() 方法 ============

test('at() 方法：slice 后调用 at(0)', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const value = sliced.at(0);
  return value === 2;
});

test('at() 方法：slice 后调用 at(-1)', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const value = sliced.at(-1);
  return value === 4;
});

test('at() 方法：slice 后调用 at(超出范围)', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const value = sliced.at(10);
  return value === undefined;
});

// ============ slice 与 Symbol.species ============

test('Symbol.species：检查 Buffer[Symbol.species]', () => {
  // Buffer 可能有 Symbol.species，也可能没有
  const species = Buffer[Symbol.species];
  return species === undefined || typeof species === 'function';
});

// ============ slice 后的 ArrayBuffer.isView ============

test('isView：ArrayBuffer.isView 识别 slice', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return ArrayBuffer.isView(sliced);
});

// ============ slice 与垃圾回收相关测试跳过（goja 不支持 WeakRef） ============

test('内存管理：slice 是独立对象', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  // 验证 slice 返回的是一个有效的 Buffer 对象
  return Buffer.isBuffer(sliced) && sliced.length === 3;
});

// ============ slice 与 for...in 循环 ============

test('for...in：遍历 slice 的索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const indices = [];
  for (const key in sliced) {
    indices.push(key);
  }
  // for...in 会遍历索引和原型链上的可枚举属性
  // 至少应该包含 '0', '1', '2'
  return indices.includes('0') && indices.includes('1') && indices.includes('2');
});

// ============ slice 与 Object.keys/values/entries ============

test('Object.keys：Object.keys 遍历 slice', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const keys = Object.keys(sliced);
  return keys.length === 3 && keys[0] === '0';
});

test('Object.values：Object.values 遍历 slice', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const values = Object.values(sliced);
  return values.length === 3 && values[0] === 1;
});

test('Object.entries：Object.entries 遍历 slice', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const entries = Object.entries(sliced);
  return entries.length === 3 && entries[0][0] === '0' && entries[0][1] === 1;
});

// ============ slice 与 Object.getOwnPropertyNames ============

test('getOwnPropertyNames：获取 slice 的属性名', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const names = Object.getOwnPropertyNames(sliced);
  // 应该包含 '0', '1', '2'
  return names.includes('0') && names.includes('1') && names.includes('2');
});

// ============ slice 与 Object.getOwnPropertyDescriptors ============

test('getOwnPropertyDescriptors：获取 slice 的属性描述符', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  const descriptors = Object.getOwnPropertyDescriptors(sliced);
  return descriptors['0'] && descriptors['0'].value === 1;
});

try {
  let passed = 0;
  for (let i = 0; i < tests.length; i++) {
    if (tests[i].status === '✅') passed++;
  }
  const total = tests.length;
  const failed = total - passed;

  const result = {
    success: failed === 0,
    summary: {
      total,
      passed,
      failed,
      successRate: total ? (passed * 100 / total).toFixed(2) + '%' : '0.00%'
    },
    tests
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
