// buf.indexOf() - Additional Edge Cases
// 补充遗漏的边界场景测试
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
    tests.push({ name, status: '❌', error: 'Expected error but none thrown' });
  } catch (e) {
    const pass = e.name === expectedErrorType || e.message.includes(expectedErrorType);
    tests.push({ name, status: pass ? '✅' : '❌', error: pass ? undefined : e.message });
  }
}

// 测试 byteOffset 为编码名称时的行为（应作为 encoding 参数）
test('byteOffset 为有效编码 - 两参数形式', () => {
  const buf = Buffer.from('hello world');
  // 当只传两个参数且第二个是编码名称时，应该作为 encoding
  return buf.indexOf('world', 'utf8') === 6;
});

test('byteOffset 为有效编码 - ascii', () => {
  const buf = Buffer.from('hello world', 'ascii');
  return buf.indexOf('world', 'ascii') === 6;
});

// 测试 slice 和 subarray 的完整行为
test('使用 slice 创建的 Buffer - 完整测试', () => {
  const original = Buffer.from('this is a buffer example');
  const sliced = original.slice(10, 16); // "buffer"
  const buf = Buffer.from('find buffer here');
  return buf.indexOf(sliced) === 5;
});

test('使用 subarray 创建的 Buffer - 完整测试', () => {
  const original = Buffer.from('this is a buffer example');
  const subarrayed = original.subarray(10, 16); // "buffer"
  const buf = Buffer.from('find buffer here');
  return buf.indexOf(subarrayed) === 5;
});

// 测试空值在不同位置的行为
test('空字符串在空 Buffer 中 - byteOffset 0', () => {
  const buf = Buffer.alloc(0);
  return buf.indexOf('', 0) === 0;
});

test('空字符串在空 Buffer 中 - byteOffset 大于 0', () => {
  const buf = Buffer.alloc(0);
  return buf.indexOf('', 10) === 0;
});

test('空 Buffer 在空 Buffer 中', () => {
  const buf = Buffer.alloc(0);
  return buf.indexOf(Buffer.alloc(0)) === 0;
});

// 测试 TypedArray 的 byteOffset 和 byteLength
test('Uint8Array 带 byteOffset - 部分视图', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab, 2, 3); // 从偏移 2 开始，长度 3
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  const buf = Buffer.from([0, 0, 1, 2, 3, 0]);
  return buf.indexOf(Buffer.from(view.buffer, view.byteOffset, view.byteLength)) === 2;
});

test('Int8Array 带负数值', () => {
  const arr = new Int8Array([-1, -2, -3]);
  const buf = Buffer.from([255, 254, 253, 0]); // -1 = 255, -2 = 254, -3 = 253
  return buf.indexOf(Buffer.from(arr.buffer)) === 0;
});

// 测试数字转换的特殊情况
test('数字 0.5 应转换为 0', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.indexOf(0.5) === 0;
});

test('数字 -0.5 应转换为 0', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.indexOf(-0.5) === 0;
});

test('数字 255.1 应转换为 255', () => {
  const buf = Buffer.from([0, 255, 2]);
  return buf.indexOf(255.1) === 1;
});

test('数字 255.9 应转换为 255', () => {
  const buf = Buffer.from([0, 255, 2]);
  return buf.indexOf(255.9) === 1;
});

// 测试负数的完整转换
test('数字 -2 应转换为 254', () => {
  const buf = Buffer.from([0, 254, 2]);
  return buf.indexOf(-2) === 1;
});

test('数字 -128 应转换为 128', () => {
  const buf = Buffer.from([0, 128, 2]);
  return buf.indexOf(-128) === 1;
});

test('数字 -129 应转换为 127', () => {
  const buf = Buffer.from([0, 127, 2]);
  return buf.indexOf(-129) === 1;
});

// 测试大数字的模运算
test('数字 1000 % 256 = 232', () => {
  const buf = Buffer.from([0, 232, 2]);
  return buf.indexOf(1000) === 1;
});

test('数字 10000 % 256 = 16', () => {
  const buf = Buffer.from([0, 16, 2]);
  return buf.indexOf(10000) === 1;
});

// 测试 byteOffset 的浮点数转换
test('byteOffset 0.1 应转换为 0', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('hello', 0.1) === 0;
});

test('byteOffset 0.9 应转换为 0', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('hello', 0.9) === 0;
});

test('byteOffset 1.1 应转换为 1', () => {
  const buf = Buffer.from('hello hello');
  return buf.indexOf('hello', 1.1) === 6;
});

test('byteOffset 1.9 应转换为 1', () => {
  const buf = Buffer.from('hello hello');
  return buf.indexOf('hello', 1.9) === 6;
});

test('byteOffset -0.1 应转换为 0', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', -0.1) === 0;
});

test('byteOffset -0.9 应转换为 0', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', -0.9) === 0;
});

test('byteOffset -1.1 应从倒数第二个字节开始', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o', -1.1) === 4;
});

test('byteOffset -1.9 应从倒数第二个字节开始', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o', -1.9) === 4;
});

// 测试特殊 Unicode 边界
test('Unicode - 四字节 emoji 序列', () => {
  const buf = Buffer.from('😀😁😂😃');
  return buf.indexOf('😂') === 8; // 每个 emoji 4 字节
});

test('Unicode - 零宽连接符', () => {
  const buf = Buffer.from('a\u200Db'); // 零宽连接符
  return buf.indexOf('\u200D') === 1;
});

test('Unicode - 组合字符序列', () => {
  const buf = Buffer.from('e\u0301\u0302'); // e + 两个组合音标
  return buf.indexOf('\u0301') === 1;
});

// 测试编码参数的边界
test('encoding 参数 - undefined 使用默认 utf8', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, undefined) === 6;
});

testError('encoding 参数 - null 抛出错误', () => {
  const buf = Buffer.from('hello world');
  buf.indexOf('world', 0, null);
}, 'TypeError');

testError('encoding 参数 - 数字抛出错误', () => {
  const buf = Buffer.from('hello world');
  buf.indexOf('world', 0, 123);
}, 'TypeError');

testError('encoding 参数 - 对象抛出错误', () => {
  const buf = Buffer.from('hello world');
  buf.indexOf('world', 0, {});
}, 'TypeError');

// 测试查找位置的精确性
test('查找位置精确性 - 连续相同模式', () => {
  const buf = Buffer.from('ababababab');
  return buf.indexOf('ab', 0) === 0;
});

test('查找位置精确性 - 连续相同模式偏移 1', () => {
  const buf = Buffer.from('ababababab');
  return buf.indexOf('ab', 1) === 2;
});

test('查找位置精确性 - 连续相同模式偏移 2', () => {
  const buf = Buffer.from('ababababab');
  return buf.indexOf('ab', 2) === 2;
});

test('查找位置精确性 - 连续相同模式偏移 3', () => {
  const buf = Buffer.from('ababababab');
  return buf.indexOf('ab', 3) === 4;
});

// 测试二进制数据的边界
test('二进制 - 查找单个 0x00', () => {
  const buf = Buffer.from([1, 2, 0, 3, 4]);
  return buf.indexOf(0) === 2;
});

test('二进制 - 查找单个 0xFF', () => {
  const buf = Buffer.from([1, 2, 0xFF, 3, 4]);
  return buf.indexOf(0xFF) === 2;
});

test('二进制 - 查找 0x00 序列', () => {
  const buf = Buffer.from([1, 0, 0, 0, 2]);
  return buf.indexOf(Buffer.from([0, 0, 0])) === 1;
});

test('二进制 - 查找 0xFF 序列', () => {
  const buf = Buffer.from([1, 0xFF, 0xFF, 0xFF, 2]);
  return buf.indexOf(Buffer.from([0xFF, 0xFF, 0xFF])) === 1;
});

// 测试大 Buffer 的边界
test('大 Buffer - 2MB 查找开头', () => {
  const buf = Buffer.alloc(2 * 1024 * 1024);
  buf.write('target', 0);
  return buf.indexOf('target') === 0;
});

test('大 Buffer - 2MB 查找末尾', () => {
  const buf = Buffer.alloc(2 * 1024 * 1024);
  const pos = buf.length - 6;
  buf.write('target', pos);
  return buf.indexOf('target') === pos;
});

test('大 Buffer - 2MB 未找到', () => {
  const buf = Buffer.alloc(2 * 1024 * 1024);
  return buf.indexOf('target') === -1;
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
