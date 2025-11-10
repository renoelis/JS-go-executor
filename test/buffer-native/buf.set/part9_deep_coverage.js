// buf.set() - Part 9: Deep Coverage & Missing Edge Cases
// 深度查缺补漏：识别并测试之前遗漏的边缘场景
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

function testError(name, fn, expectedErrorType) {
  try {
    fn();
    tests.push({ 
      name, 
      status: '❌', 
      error: 'Expected error was not thrown' 
    });
  } catch (e) {
    let pass = true;
    if (expectedErrorType) {
      if (typeof expectedErrorType === 'string') {
        pass = e.name === expectedErrorType || e.code === expectedErrorType;
      } else {
        pass = e instanceof expectedErrorType;
      }
    }
    tests.push({ 
      name, 
      status: pass ? '✅' : '❌',
      error: pass ? undefined : `Expected ${expectedErrorType}, got ${e.name}: ${e.message}`,
      actualError: e.message
    });
  }
}

// ===== 1. 循环引用和自引用场景 =====

test('数组包含自身引用（转换为字符串）', () => {
  const buf = Buffer.alloc(5);
  const arr = [1, 2, 3];
  arr.push(arr); // 循环引用
  try {
    buf.set(arr);
    // 循环引用的元素会转换为字符串，然后转为 NaN -> 0
    return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && buf[3] === 0;
  } catch (e) {
    // 某些实现可能会抛出错误
    return true;
  }
});

test('类数组对象包含循环引用', () => {
  const buf = Buffer.alloc(5);
  const obj = { 0: 1, 1: 2, length: 3 };
  obj[2] = obj; // 循环引用
  try {
    buf.set(obj);
    return buf[0] === 1 && buf[1] === 2;
  } catch (e) {
    return e instanceof TypeError || e instanceof RangeError;
  }
});

// ===== 2. 特殊对象类型 =====

test('从 WeakMap 设置（应静默或报错）', () => {
  const buf = Buffer.from([99, 99, 99]);
  const wm = new WeakMap();
  try {
    buf.set(wm);
    // WeakMap 不可迭代，应该静默失败或报错
    return buf[0] === 99;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('从 WeakSet 设置（应静默或报错）', () => {
  const buf = Buffer.from([99, 99, 99]);
  const ws = new WeakSet();
  try {
    buf.set(ws);
    return buf[0] === 99;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('从 Promise 设置（应静默或报错）', () => {
  const buf = Buffer.from([99, 99, 99]);
  const promise = Promise.resolve([1, 2, 3]);
  try {
    buf.set(promise);
    return buf[0] === 99;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ===== 3. 字符串特殊字符场景 =====

test('数组包含 emoji 字符串（转换为 NaN -> 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set(['😀', '🎉', 1]);
  // emoji 字符串转数字为 NaN -> 0
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 1;
});

test('数组包含零宽字符（转换为 NaN -> 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set(['\u200B', '\u200C', 1]); // 零宽空格、零宽非连接符
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 1;
});

test('数组包含控制字符（转换为 NaN -> 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set(['\x00', '\x01', '\x1F']);
  // 控制字符转数字为 NaN -> 0
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

// ===== 4. 极端 offset 边界组合 =====

test('offset 为 0.9999999（截断为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], 0.9999999);
  return buf[0] === 99;
});

test('offset 为 -0.0000001（截断为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], -0.0000001);
  // 极小的负数在 ToInteger 转换时会被截断为 0
  return buf[0] === 99;
});

test('offset 为 Number.EPSILON（截断为 0）', () => {
  const buf = Buffer.alloc(5);
  buf.set([99], Number.EPSILON);
  return buf[0] === 99;
});

test('offset 为 2^53（超大值，应报错）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.set([1], Math.pow(2, 53));
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

// ===== 5. TypedArray 的特殊视图 =====

test('从 Uint8Array 的反向 subarray 设置', () => {
  const buf = Buffer.alloc(5);
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const sub = uint8.subarray(4, 1); // 反向，长度为 0
  buf.set(sub);
  return buf[0] === 0; // 没有修改
});

test('从 Uint8Array 的负索引 subarray 设置', () => {
  const buf = Buffer.alloc(5);
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const sub = uint8.subarray(-3, -1); // [3, 4]
  buf.set(sub);
  return buf[0] === 3 && buf[1] === 4;
});

test('从多层嵌套的 subarray 设置', () => {
  const buf = Buffer.alloc(5);
  const uint8 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub1 = uint8.subarray(1, 7); // [2, 3, 4, 5, 6, 7]
  const sub2 = sub1.subarray(1, 4);  // [3, 4, 5]
  buf.set(sub2);
  return buf[0] === 3 && buf[1] === 4 && buf[2] === 5;
});

// ===== 6. 与其他 Buffer 方法的交互 =====

test('set 后立即 slice', () => {
  const buf = Buffer.alloc(10);
  buf.set([1, 2, 3, 4, 5], 2);
  const sliced = buf.slice(2, 7);
  return sliced[0] === 1 && sliced[4] === 5;
});

test('set 后立即 subarray', () => {
  const buf = Buffer.alloc(10);
  buf.set([1, 2, 3, 4, 5], 2);
  const sub = buf.subarray(2, 7);
  return sub[0] === 1 && sub[4] === 5;
});

test('fill 后再 set', () => {
  const buf = Buffer.alloc(10);
  buf.fill(99);
  buf.set([1, 2, 3], 3);
  return buf[0] === 99 && buf[2] === 99 && buf[3] === 1 && 
         buf[4] === 2 && buf[5] === 3 && buf[6] === 99;
});

test('set 后再 fill', () => {
  const buf = Buffer.alloc(10);
  buf.set([1, 2, 3, 4, 5], 2);
  buf.fill(0, 0, 2);
  buf.fill(0, 7, 10);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && 
         buf[6] === 5 && buf[7] === 0;
});

test('copy 后再 set', () => {
  const buf1 = Buffer.from([10, 20, 30, 40, 50]);
  const buf2 = Buffer.alloc(10);
  buf1.copy(buf2, 2);
  buf2.set([1, 2], 0);
  return buf2[0] === 1 && buf2[1] === 2 && buf2[2] === 10 && buf2[6] === 50;
});

// ===== 7. 数组元素的极端类型转换 =====

test('数组包含 BigInt（应报错）', () => {
  const buf = Buffer.alloc(3);
  try {
    buf.set([1n, 2n, 3n]);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('数组包含混合 BigInt 和 Number（应报错）', () => {
  const buf = Buffer.alloc(3);
  try {
    buf.set([1, 2n, 3]);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('数组包含 Symbol.iterator', () => {
  const buf = Buffer.alloc(3);
  try {
    buf.set([Symbol.iterator, 1, 2]);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('数组包含函数（转换为 NaN -> 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set([function() {}, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('数组包含箭头函数（转换为 NaN -> 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set([() => {}, 1, 2]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

// ===== 8. 内存重叠的极端场景 =====

test('完全重叠：从自身 offset=0 复制到 offset=0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.set(buf, 0);
  return buf[0] === 1 && buf[4] === 5;
});

test('单字节重叠：复制单字节到相邻位置', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.set(buf.subarray(0, 1), 1);
  return buf[0] === 1 && buf[1] === 1 && buf[2] === 3;
});

test('交叉重叠：复制中间部分到开头', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  buf.set(buf.subarray(3, 6), 1); // [4, 5, 6] -> offset 1
  return buf[0] === 1 && buf[1] === 4 && buf[2] === 5 && buf[3] === 6;
});

test('交叉重叠：复制开头部分到中间', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  buf.set(buf.subarray(0, 4), 3); // [1, 2, 3, 4] -> offset 3
  return buf[0] === 1 && buf[3] === 1 && buf[4] === 2 && buf[6] === 4;
});

// ===== 9. 多维度组合测试 =====

test('空 Buffer + 空数组 + offset=0', () => {
  const buf = Buffer.alloc(0);
  buf.set([], 0);
  return buf.length === 0;
});

test('单字节 Buffer + 单元素数组 + offset=0', () => {
  const buf = Buffer.alloc(1);
  buf.set([255], 0);
  return buf[0] === 255 && buf.length === 1;
});

test('大 Buffer + 小数组 + 大 offset', () => {
  const buf = Buffer.alloc(10000);
  buf.set([1, 2, 3], 9997);
  return buf[9997] === 1 && buf[9998] === 2 && buf[9999] === 3;
});

// ===== 10. 异常后的状态验证 =====

test('set 失败后 Buffer 内容不变', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  try {
    buf.set([99, 99, 99, 99], 3); // 会越界
  } catch (e) {
    // 确保失败后内容不变
    return buf[0] === 1 && buf[4] === 5;
  }
  return false;
});

test('多次失败的 set 不影响 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let errorCount = 0;
  
  try { buf.set([99], -1); } catch (e) { errorCount++; }
  try { buf.set([99, 99, 99], 4); } catch (e) { errorCount++; }
  try { buf.set([99], 10); } catch (e) { errorCount++; }
  
  return errorCount === 3 && buf[0] === 1 && buf[4] === 5;
});

// ===== 11. 特殊数值的精确转换 =====

test('数组包含 0x100（256，应转换为 0）', () => {
  const buf = Buffer.alloc(3);
  buf.set([0x100, 0x101, 0x1FF]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 255;
});

test('数组包含二进制表示（0b）', () => {
  const buf = Buffer.alloc(3);
  buf.set([0b11111111, 0b10000000, 0b00000001]);
  return buf[0] === 255 && buf[1] === 128 && buf[2] === 1;
});

test('数组包含八进制表示（0o）', () => {
  const buf = Buffer.alloc(3);
  buf.set([0o377, 0o200, 0o001]);
  return buf[0] === 255 && buf[1] === 128 && buf[2] === 1;
});

test('数组包含科学计数法', () => {
  const buf = Buffer.alloc(3);
  buf.set([1e2, 2.55e2, 1e-1]);
  return buf[0] === 100 && buf[1] === 255 && buf[2] === 0;
});

// ===== 12. offset 的特殊对象转换 =====

test('offset 为有 toString 方法的对象', () => {
  const buf = Buffer.alloc(5);
  const obj = { toString() { return '2'; } };
  buf.set([99], obj);
  return buf[2] === 99;
});

test('offset 为有 valueOf 和 toString 的对象（优先 valueOf）', () => {
  const buf = Buffer.alloc(5);
  const obj = {
    valueOf() { return 1; },
    toString() { return '3'; }
  };
  buf.set([99], obj);
  return buf[1] === 99;
});

test('offset 为 Date 对象（转换为时间戳）', () => {
  const buf = Buffer.alloc(5);
  const date = new Date(2); // valueOf() 返回 2
  buf.set([99], date);
  return buf[2] === 99;
});

// ===== 13. TypedArray 的字节序测试 =====

test('Uint16Array 小端序数据', () => {
  const buf = Buffer.alloc(4);
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint16(0, 0x0102, true); // 小端序
  dv.setUint16(2, 0x0304, true);
  const uint8 = new Uint8Array(ab);
  buf.set(uint8);
  return buf[0] === 0x02 && buf[1] === 0x01 && 
         buf[2] === 0x04 && buf[3] === 0x03;
});

test('Uint16Array 大端序数据', () => {
  const buf = Buffer.alloc(4);
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint16(0, 0x0102, false); // 大端序
  dv.setUint16(2, 0x0304, false);
  const uint8 = new Uint8Array(ab);
  buf.set(uint8);
  return buf[0] === 0x01 && buf[1] === 0x02 && 
         buf[2] === 0x03 && buf[3] === 0x04;
});

// ===== 14. 性能相关的边界测试 =====

test('连续 100 次小数组 set', () => {
  const buf = Buffer.alloc(300);
  for (let i = 0; i < 100; i++) {
    buf.set([i % 256, (i + 1) % 256, (i + 2) % 256], i * 3);
  }
  // 最后一次循环 i=99: offset=297, 设置 [99, 100, 101]
  return buf[0] === 0 && buf[297] === 99 && buf[298] === 100 && buf[299] === 101;
});

test('交替 set 不同类型的源', () => {
  const buf = Buffer.alloc(20);
  buf.set([1, 2], 0);
  buf.set(new Uint8Array([3, 4]), 2);
  buf.set(Buffer.from([5, 6]), 4);
  buf.set([7, 8], 6);
  return buf[0] === 1 && buf[2] === 3 && buf[4] === 5 && buf[6] === 7;
});

// ===== 15. 边界条件的精确验证 =====

test('offset + length = MAX_SAFE_INTEGER（应报错）', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.set([1], Number.MAX_SAFE_INTEGER - 1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('数组长度为 MAX_SAFE_INTEGER（实际不可能，但测试行为）', () => {
  const buf = Buffer.alloc(5);
  const fakeArray = {
    length: Number.MAX_SAFE_INTEGER,
    0: 1
  };
  try {
    buf.set(fakeArray);
    return false;
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

// 输出结果
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
      successRate: total
        ? (passed * 100 / total).toFixed(2) + '%'
        : '0.00%'
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
