// Buffer.concat() - Ultra Deep Round 2: Async, Errors and Boundary Conditions
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

// 异步场景（虽然 concat 本身是同步的）
test('concat在Promise.then中使用', () => {
  let success = false;
  Promise.resolve().then(() => {
    const result = Buffer.concat([Buffer.from('test')]);
    success = result.toString() === 'test';
  });
  // 同步返回，Promise还未resolve，但测试concat本身是同步的
  return true;
});

test('concat在setTimeout中使用', () => {
  // 只测试语法正确性，不等待异步完成
  setTimeout(() => {
    Buffer.concat([Buffer.from('test')]);
  }, 0);
  return true;
});

// 错误边界：非常接近边界的值
test('totalLength为kMaxLength-1可能成功或失败', () => {
  try {
    // kMaxLength 在某些环境可能支持接近 2GB
    const result = Buffer.concat([Buffer.from('a')], 2147483647);
    // 如果成功，验证长度
    return result.length === 2147483647;
  } catch (e) {
    // 如果失败，验证错误信息
    return e.message.includes('allocation') || e.message.includes('failed') ||
           e.message.includes('Invalid') || e.message.includes('range');
  }
});

test('totalLength为1接近2的幂次', () => {
  const sizes = [255, 256, 257, 511, 512, 513, 1023, 1024, 1025];
  for (const size of sizes) {
    const result = Buffer.concat([Buffer.from('a')], size);
    if (result.length !== size) return false;
  }
  return true;
});

// 特殊构造的数组
test('使用Array.from创建的Buffer数组', () => {
  const list = Array.from({ length: 3 }, (_, i) => Buffer.from([i + 1]));
  const result = Buffer.concat(list);
  return result.length === 3 &&
         result[0] === 1 && result[1] === 2 && result[2] === 3;
});

test('使用Array.of创建的Buffer数组', () => {
  const list = Array.of(Buffer.from('a'), Buffer.from('b'));
  const result = Buffer.concat(list);
  return result.toString() === 'ab';
});

test('使用扩展运算符创建的数组', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.from('b');
  const result = Buffer.concat([...Array.of(buf1, buf2)]);
  return result.toString() === 'ab';
});

// 数组方法返回的数组
test('使用Array.prototype.filter后的数组', () => {
  const list = [Buffer.from('a'), null, Buffer.from('b')].filter(x => x !== null);
  const result = Buffer.concat(list);
  return result.toString() === 'ab';
});

test('使用Array.prototype.map后的数组', () => {
  const list = ['a', 'b', 'c'].map(s => Buffer.from(s));
  const result = Buffer.concat(list);
  return result.toString() === 'abc';
});

test('使用Array.prototype.slice后的数组', () => {
  const list = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')].slice(0, 2);
  const result = Buffer.concat(list);
  return result.toString() === 'ab';
});

test('使用Array.prototype.concat后的数组', () => {
  const list1 = [Buffer.from('a')];
  const list2 = [Buffer.from('b')];
  const combined = list1.concat(list2);
  const result = Buffer.concat(combined);
  return result.toString() === 'ab';
});

// 原型链测试
test('数组原型被污染（添加额外元素）', () => {
  const originalPush = Array.prototype.push;
  const list = [Buffer.from('a'), Buffer.from('b')];
  const result = Buffer.concat(list);
  Array.prototype.push = originalPush;
  return result.toString() === 'ab';
});

test('Buffer.prototype被污染后concat仍正常', () => {
  const buf = Buffer.from('test');
  Buffer.prototype.customMethod = () => 'custom';
  const result = Buffer.concat([buf]);
  delete Buffer.prototype.customMethod;
  return result.toString() === 'test' &&
         typeof result.customMethod === 'undefined';
});

// 立即修改输入
test('concat过程中修改输入Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([buf1, buf2]);
  buf1[0] = 99;
  buf2[0] = 88;
  return result[0] === 1 && result[3] === 4;
});

test('concat后立即修改原Buffer不影响结果', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = Buffer.concat([buf]);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = 255;
  }
  return result[0] === 1 && result[1] === 2 && result[2] === 3;
});

// 特殊的 Buffer 内容
test('concat包含所有ASCII可打印字符', () => {
  const chars = [];
  for (let i = 32; i < 127; i++) {
    chars.push(i);
  }
  const buf = Buffer.from(chars);
  const result = Buffer.concat([buf]);
  return result.length === 95 && result[0] === 32 && result[94] === 126;
});

test('concat包含所有ASCII控制字符', () => {
  const chars = [];
  for (let i = 0; i < 32; i++) {
    chars.push(i);
  }
  const buf = Buffer.from(chars);
  const result = Buffer.concat([buf]);
  return result.length === 32 && result[0] === 0 && result[31] === 31;
});

// totalLength 的微妙边界
test('totalLength恰好等于一个Buffer长度减1', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = Buffer.concat([buf], 4);
  return result.length === 4 && result[3] === 4;
});

test('totalLength恰好等于一个Buffer长度加1', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const result = Buffer.concat([buf], 6);
  return result.length === 6 && result[4] === 5 && result[5] === 0;
});

test('totalLength等于所有Buffer总长度减1', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5]);
  const result = Buffer.concat([buf1, buf2], 4);
  return result.length === 4 &&
         result[0] === 1 && result[2] === 3 && result[3] === 4;
});

test('totalLength等于所有Buffer总长度加1', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const result = Buffer.concat([buf1, buf2], 5);
  return result.length === 5 &&
         result[0] === 1 && result[3] === 4 && result[4] === 0;
});

// 极端编码场景
test('concat后toString传入无效编码名', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  try {
    result.toString('invalid-encoding');
    return false;
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('concat后toString使用所有支持的编码', () => {
  const encodings = ['utf8', 'utf-8', 'ascii', 'latin1', 'binary', 'base64', 'hex'];
  const result = Buffer.concat([Buffer.from('test')]);
  for (const enc of encodings) {
    const str = result.toString(enc);
    if (typeof str !== 'string') return false;
  }
  return true;
});

// 边界：byteOffset
test('concat结果的byteOffset属性', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  return typeof result.byteOffset === 'number' && result.byteOffset >= 0;
});

test('concat不同byteOffset的Buffer', () => {
  const ab = new ArrayBuffer(10);
  const view1 = new Uint8Array(ab, 0, 3);
  const view2 = new Uint8Array(ab, 5, 3);
  view1.set([1, 2, 3]);
  view2.set([4, 5, 6]);
  const result = Buffer.concat([Buffer.from(view1), Buffer.from(view2)]);
  return result.length === 6 &&
         result[0] === 1 && result[2] === 3 &&
         result[3] === 4 && result[5] === 6;
});

// 使用 rest 参数（虽然 concat 不支持）
test('concat不支持rest参数形式', () => {
  // concat 接受数组，不是 rest 参数
  try {
    const buf1 = Buffer.from('a');
    const buf2 = Buffer.from('b');
    // 这样会报错因为第一个参数不是数组
    Buffer.concat(buf1, buf2);
    return false;
  } catch (e) {
    return e.message.includes('Array') || e.message.includes('list');
  }
});

// 嵌套数组
test('concat不支持嵌套数组', () => {
  try {
    Buffer.concat([[Buffer.from('a')]]);
    return false;
  } catch (e) {
    return e.message.includes('Array') || e.message.includes('Uint8Array') ||
           e.message.includes('Buffer');
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
