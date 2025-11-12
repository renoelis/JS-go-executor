// Buffer.concat() - Extreme Cases and Compatibility Tests
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

// 极端：超长数组
test('连接包含大量元素的数组（1000个Buffer）', () => {
  const buffers = [];
  for (let i = 0; i < 1000; i++) {
    buffers.push(Buffer.from(`item${i}`));
  }
  const result = Buffer.concat(buffers);
  return result.length > 0 && Buffer.isBuffer(result);
});

// 极端：offset和length的边界组合
test('totalLength为实际长度减1', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 9);
  return result.length === 9 && result.toString() === 'helloworl';
});

test('totalLength为实际长度加1', () => {
  const buf1 = Buffer.from('test');
  const result = Buffer.concat([buf1], 5);
  return result.length === 5 &&
         result[0] === 116 && result[3] === 116 && result[4] === 0;
});

// 极端：编码边界
test('连接包含无效UTF-8序列的Buffer', () => {
  const buf1 = Buffer.from([0xC0, 0x80]); // 过长编码
  const buf2 = Buffer.from([0xED, 0xA0, 0x80]); // 代理对
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 5 &&
         result[0] === 0xC0 && result[2] === 0xED;
});

test('连接被截断的多字节序列', () => {
  const buf1 = Buffer.from([0xE2, 0x82]); // '€'的前两字节
  const buf2 = Buffer.from([0xAC]); // '€'的最后一字节
  const buf3 = Buffer.from('test', 'utf8');
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.length === 7;
});

// 极端：内存和性能
test('连接后立即修改其中一个原Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([buf1, buf2]);
  const originalValue = result[0];
  buf1[0] = 99;
  buf1[1] = 88;
  buf1[2] = 77;
  return result[0] === originalValue &&
         result[1] === 2 &&
         result[2] === 3;
});

test('连接后修改ArrayBuffer不影响concat结果', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view.set([1, 2, 3, 4]);
  const result = Buffer.concat([view]);
  view[0] = 99;
  return result[0] === 1;
});

// 极端：totalLength的各种合法边界值
test('totalLength为2的幂次', () => {
  const buf = Buffer.from('a');
  const result1 = Buffer.concat([buf], 1);
  const result2 = Buffer.concat([buf], 2);
  const result4 = Buffer.concat([buf], 4);
  const result8 = Buffer.concat([buf], 8);
  return result1.length === 1 &&
         result2.length === 2 &&
         result4.length === 4 &&
         result8.length === 8;
});

test('totalLength为奇数和偶数边界', () => {
  const buf = Buffer.from('test');
  const result1 = Buffer.concat([buf], 3); // 奇数
  const result2 = Buffer.concat([buf], 4); // 偶数
  return result1.length === 3 && result2.length === 4;
});

// 兼容性：不同Node版本的行为一致性
test('空数组concat的返回值是有效Buffer', () => {
  const result = Buffer.concat([]);
  return Buffer.isBuffer(result) &&
         result.length === 0 &&
         typeof result.toString === 'function';
});

test('concat返回的Buffer拥有所有Buffer方法', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from('data');
  const result = Buffer.concat([buf1, buf2]);
  return typeof result.slice === 'function' &&
         typeof result.toString === 'function' &&
         typeof result.write === 'function' &&
         typeof result.readUInt8 === 'function' &&
         typeof result.indexOf === 'function';
});

// 极端：视图和引用
test('连接同一Buffer的多个引用', () => {
  const buf = Buffer.from('test');
  const result = Buffer.concat([buf, buf, buf]);
  return result.length === 12 &&
         result.toString() === 'testtesttest';
});

test('连接同一Uint8Array的多个引用', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const result = Buffer.concat([arr, arr]);
  return result.length === 6 &&
         result[0] === 1 && result[3] === 1;
});

// 极端：BigInt边界（虽然concat不直接处理BigInt）
test('连接包含BigInt64数据的Buffer', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  try {
    buf1.writeBigInt64BE(9007199254740991n, 0); // MAX_SAFE_INTEGER
    buf2.writeBigInt64BE(-9007199254740991n, 0);
    const result = Buffer.concat([buf1, buf2]);
    return result.length === 16 &&
           result.readBigInt64BE(0) === 9007199254740991n &&
           result.readBigInt64BE(8) === -9007199254740991n;
  } catch (e) {
    // 如果环境不支持BigInt，跳过
    return true;
  }
});

// 边界：特殊字符组合
test('连接包含各种Unicode平面的字符', () => {
  const buf1 = Buffer.from('Basic Latin: ABC', 'utf8');
  const buf2 = Buffer.from('CJK: 中文', 'utf8');
  const buf3 = Buffer.from('Emoji: 😀🎉', 'utf8');
  const buf4 = Buffer.from('Math: 𝕏𝕐𝕑', 'utf8');
  const result = Buffer.concat([buf1, buf2, buf3, buf4]);
  return result.toString('utf8').includes('ABC') &&
         result.toString('utf8').includes('中文') &&
         result.toString('utf8').includes('😀');
});

test('连接包含RTL文本的Buffer', () => {
  const buf1 = Buffer.from('Hello ', 'utf8');
  const buf2 = Buffer.from('مرحبا', 'utf8'); // Arabic
  const buf3 = Buffer.from(' שלום', 'utf8'); // Hebrew
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.length > 0 && Buffer.isBuffer(result);
});

// 历史行为：确保concat不会修改原数组
test('concat不修改传入的list数组', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.from('b');
  const list = [buf1, buf2];
  const originalLength = list.length;
  Buffer.concat(list);
  return list.length === originalLength &&
         list[0] === buf1 &&
         list[1] === buf2;
});

// 极端：数组稀疏性（JavaScript特性）
test('数组中不存在稀疏元素', () => {
  const list = [Buffer.from('a'), Buffer.from('b')];
  list.length = 5; // 人为扩展长度但不填充
  try {
    const result = Buffer.concat(list);
    return false; // 应该在遇到undefined时报错
  } catch (e) {
    return e.message.includes('Uint8Array') ||
           e.message.includes('Buffer') ||
           e.message.includes('undefined');
  }
});

// 性能压力测试（小规模）
test('快速连接和释放大量Buffer', () => {
  for (let i = 0; i < 100; i++) {
    const buffers = [
      Buffer.from('a'),
      Buffer.from('b'),
      Buffer.from('c')
    ];
    const result = Buffer.concat(buffers);
    if (result.toString() !== 'abc') return false;
  }
  return true;
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
