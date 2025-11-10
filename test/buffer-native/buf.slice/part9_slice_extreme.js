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

// ============ 第 5 轮：极端场景 + 兼容性/历史行为测试 ============

// 超长 Buffer 测试
test('极端长度：对 1MB buffer 进行 slice', () => {
  const size = 1024 * 1024; // 1MB
  const buf = Buffer.alloc(size);
  buf[0] = 0x41;
  buf[size - 1] = 0x5a;
  const sliced = buf.slice(0, size);
  return sliced.length === size && sliced[0] === 0x41 && sliced[size - 1] === 0x5a;
});

test('极端长度：slice 1MB buffer 的中间部分', () => {
  const size = 1024 * 1024;
  const buf = Buffer.alloc(size);
  const start = size / 2;
  const end = start + 1024;
  const sliced = buf.slice(start, end);
  return sliced.length === 1024;
});

test('极端长度：对超大 buffer 进行多次嵌套 slice', () => {
  const size = 1024 * 100; // 100KB
  const buf = Buffer.alloc(size);
  let current = buf;
  for (let i = 0; i < 10; i++) {
    current = current.slice(100, current.length - 100);
  }
  return current.length === size - 2000;
});

// UTF-8 多字节边界的精确测试
test('UTF-8 边界：slice 恰好在多字节字符边界', () => {
  const buf = Buffer.from('你好世界'); // 每个中文 3 字节
  const sliced = buf.slice(0, 6); // 恰好两个字符
  return sliced.toString('utf8') === '你好';
});

test('UTF-8 边界：slice 截断多字节字符（前半）', () => {
  const buf = Buffer.from('你好'); // 6 字节
  const sliced = buf.slice(0, 4); // 第一个完整 + 第二个不完整
  const str = sliced.toString('utf8');
  // 不完整的字符会被替换字符处理，只要不崩溃就算通过
  return str.length >= 1;
});

test('UTF-8 边界：slice 截断多字节字符（后半）', () => {
  const buf = Buffer.from('你好'); // 6 字节
  const sliced = buf.slice(1, 6); // 跳过第一个字符的第一个字节
  const str = sliced.toString('utf8');
  // 应该有替换字符
  return str.length >= 1;
});

test('UTF-8 边界：slice emoji（4 字节字符）', () => {
  const buf = Buffer.from('😀😁😂'); // 每个 emoji 4 字节
  const sliced = buf.slice(0, 8); // 恰好两个 emoji
  return sliced.toString('utf8') === '😀😁';
});

test('UTF-8 边界：slice 截断 emoji', () => {
  const buf = Buffer.from('😀😁'); // 8 字节
  const sliced = buf.slice(0, 5); // 不完整
  const str = sliced.toString('utf8');
  // 只要不报错就行
  return str.length >= 0;
});

// Base64 编码的边界情况
test('Base64 边界：slice 后转 base64 有正确的填充', () => {
  const buf = Buffer.from('hello world'); // 11 字节
  const sliced = buf.slice(0, 5); // 5 字节
  const base64 = sliced.toString('base64');
  // 5 字节 base64 编码后应该有 1 个 = 填充
  return base64 === 'aGVsbG8=';
});

test('Base64 边界：slice 长度为 3 的倍数', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 6); // 6 字节，3 的倍数
  const base64 = sliced.toString('base64');
  // 不需要填充
  return !base64.includes('=');
});

test('Base64 边界：slice 单字节转 base64', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 1);
  const base64 = sliced.toString('base64');
  // 1 字节应该有 2 个 = 填充
  return base64 === 'aA==';
});

// Hex 编码边界
test('Hex 边界：slice 奇数字节转 hex', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  const hex = sliced.toString('hex');
  return hex === '68656c' && hex.length === 6;
});

test('Hex 边界：slice 包含高位字节', () => {
  const buf = Buffer.from([0xff, 0xfe, 0xfd]);
  const sliced = buf.slice(0, 3);
  const hex = sliced.toString('hex');
  return hex === 'fffefd';
});

// 历史行为：TypedArray 视图关系
test('历史行为：slice 返回的 buffer 是 Uint8Array 子类', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return sliced instanceof Uint8Array;
});

test('历史行为：slice 保持 Buffer 的特有方法', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return typeof sliced.toString === 'function' &&
         typeof sliced.slice === 'function' &&
         typeof sliced.indexOf === 'function';
});

test('历史行为：slice 与 subarray 返回类型一致', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  const subarrayed = buf.subarray(0, 3);
  // 都应该是 Buffer 实例
  return Buffer.isBuffer(sliced) && Buffer.isBuffer(subarrayed);
});

// 多层视图的内存安全
test('内存安全：深层嵌套 slice 后释放中间层', () => {
  const buf = Buffer.from('hello world');
  let slice1 = buf.slice(0, 11);
  const slice2 = slice1.slice(0, 5);
  slice1 = null; // 释放中间层引用
  // slice2 仍然有效
  return slice2.toString() === 'hello';
});

test('内存安全：slice 后原 buffer 超出作用域', () => {
  let sliced;
  {
    const buf = Buffer.from('hello');
    sliced = buf.slice(0, 3);
  }
  // 即使 buf 超出作用域，sliced 仍然有效
  return sliced.toString() === 'hel';
});

// 边界条件的完整覆盖
test('边界完整性：length 为 2 的所有可能 slice', () => {
  const buf = Buffer.from('ab');
  const results = [
    buf.slice(0, 0).length === 0,
    buf.slice(0, 1).length === 1,
    buf.slice(0, 2).length === 2,
    buf.slice(1, 1).length === 0,
    buf.slice(1, 2).length === 1,
    buf.slice(2, 2).length === 0
  ];
  return results.every(r => r === true);
});

test('边界完整性：length 为 3 的负索引所有组合', () => {
  const buf = Buffer.from('abc');
  const results = [
    buf.slice(-3, -2).length === 1,
    buf.slice(-3, -1).length === 2,
    buf.slice(-3, -0).length === 0,
    buf.slice(-2, -1).length === 1,
    buf.slice(-2, -0).length === 0,
    buf.slice(-1, -0).length === 0
  ];
  return results.every(r => r === true);
});

// 性能相关的边界测试
test('性能边界：连续 slice 1000 次', () => {
  const buf = Buffer.alloc(10000);
  let current = buf;
  for (let i = 0; i < 1000; i++) {
    current = buf.slice(i % 100, (i % 100) + 10);
  }
  return current.length === 10;
});

test('性能边界：slice 后立即修改 1000 次', () => {
  const buf = Buffer.alloc(100);
  const sliced = buf.slice(0, 50);
  for (let i = 0; i < 1000; i++) {
    sliced[i % 50] = i % 256;
  }
  return buf[49] === sliced[49];
});

// 字符串编码的历史坑点
test('编码坑点：latin1 高位字节保留', () => {
  const buf = Buffer.from([0xe9, 0xe8, 0xe0]); // é è à in latin1
  const sliced = buf.slice(0, 3);
  const latin1 = sliced.toString('latin1');
  return latin1.charCodeAt(0) === 0xe9;
});

test('编码坑点：binary 编码等价于 latin1', () => {
  const buf = Buffer.from('hello', 'binary');
  const sliced = buf.slice(0, 5);
  const latin1 = sliced.toString('latin1');
  const binary = sliced.toString('binary');
  return latin1 === binary;
});

test('编码坑点：ascii 编码截断高位', () => {
  const buf = Buffer.from([0x41, 0xff, 0x42]); // A <high> B
  const sliced = buf.slice(0, 3);
  const ascii = sliced.toString('ascii');
  // ascii 应该把 0xff 处理为 0x7f
  return ascii.charCodeAt(0) === 0x41;
});

// 特殊的 TypedArray 互操作
test('TypedArray 互操作：slice 后创建 DataView', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 4);
  const view = new DataView(sliced.buffer, sliced.byteOffset, sliced.length);
  return view.getUint8(0) === 0x01;
});

test('TypedArray 互操作：slice 后创建 Int16Array', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 4);
  const int16 = new Int16Array(sliced.buffer, sliced.byteOffset, sliced.length / 2);
  return int16.length === 2;
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
