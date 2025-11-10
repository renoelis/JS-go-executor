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

// ============ 深度查缺：特殊场景的穷举测试 ============

// 零长度的各种边界
test('零长度穷举：slice(0, 0) 在不同长度 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(1);
  const buf3 = Buffer.alloc(10);

  return buf1.slice(0, 0).length === 0 &&
         buf2.slice(0, 0).length === 0 &&
         buf3.slice(0, 0).length === 0;
});

test('零长度穷举：slice(n, n) 所有有效 n', () => {
  const buf = Buffer.from('hello');
  const results = [];
  for (let i = 0; i <= 5; i++) {
    results.push(buf.slice(i, i).length === 0);
  }
  return results.every(r => r === true);
});

test('零长度穷举：slice(n, n) 超出范围的 n', () => {
  const buf = Buffer.from('hello');
  const slice1 = buf.slice(10, 10);
  const slice2 = buf.slice(100, 100);
  const slice3 = buf.slice(-10, -10);
  return slice1.length === 0 && slice2.length === 0 && slice3.length === 0;
});

// 单字节 slice 的所有可能
test('单字节穷举：从每个位置 slice 单字节', () => {
  const buf = Buffer.from('hello');
  const results = [
    buf.slice(0, 1).toString() === 'h',
    buf.slice(1, 2).toString() === 'e',
    buf.slice(2, 3).toString() === 'l',
    buf.slice(3, 4).toString() === 'l',
    buf.slice(4, 5).toString() === 'o'
  ];
  return results.every(r => r === true);
});

test('单字节穷举：使用负索引 slice 单字节', () => {
  const buf = Buffer.from('hello');
  const results = [
    buf.slice(-5, -4).toString() === 'h',
    buf.slice(-4, -3).toString() === 'e',
    buf.slice(-3, -2).toString() === 'l',
    buf.slice(-2, -1).toString() === 'l',
    buf.slice(-1).toString() === 'o'
  ];
  return results.every(r => r === true);
});

// 两字节组合的穷举
test('两字节穷举：所有相邻两字节组合', () => {
  const buf = Buffer.from('abcd');
  const results = [
    buf.slice(0, 2).toString() === 'ab',
    buf.slice(1, 3).toString() === 'bc',
    buf.slice(2, 4).toString() === 'cd'
  ];
  return results.every(r => r === true);
});

test('两字节穷举：跳跃的两字节组合', () => {
  const buf = Buffer.from('abcdef');
  const results = [
    buf.slice(0, 2).toString() === 'ab',
    buf.slice(2, 4).toString() === 'cd',
    buf.slice(4, 6).toString() === 'ef'
  ];
  return results.every(r => r === true);
});

// slice 后再 slice 的深度嵌套
test('深度嵌套：5 层 slice 嵌套', () => {
  const buf = Buffer.from('hello world');
  const s1 = buf.slice(0, 11);
  const s2 = s1.slice(0, 10);
  const s3 = s2.slice(0, 9);
  const s4 = s3.slice(0, 8);
  const s5 = s4.slice(0, 7);
  return s5.toString() === 'hello w';
});

test('深度嵌套：每层从不同位置 slice', () => {
  const buf = Buffer.from('hello world');
  const s1 = buf.slice(1, 11);   // 'ello world'
  const s2 = s1.slice(1, 10);    // 'llo world'
  const s3 = s2.slice(1, 8);     // 'lo worl'
  return s3.toString() === 'lo worl';
});

test('深度嵌套：交替使用正负索引', () => {
  const buf = Buffer.from('hello');
  const s1 = buf.slice(0, -0);   // ''
  const s2 = buf.slice(-5, 5);   // 'hello'
  const s3 = s2.slice(1, -1);    // 'ell'
  return s1.length === 0 && s2.length === 5 && s3.toString() === 'ell';
});

// 修改传播的完整测试
test('修改传播：原 buffer 每个位置的修改都传播到 slice', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);

  for (let i = 0; i < 5; i++) {
    buf[i] = 0x41 + i; // A, B, C, D, E
  }

  return sliced.toString() === 'ABCDE';
});

test('修改传播：slice 每个位置的修改都传播到原 buffer', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(0, 5);

  for (let i = 0; i < 5; i++) {
    sliced[i] = 0x61 + i; // a, b, c, d, e
  }

  return buf.toString() === 'abcde';
});

test('修改传播：多个 slice 之间的修改传播', () => {
  const buf = Buffer.from('hello');
  const slice1 = buf.slice(0, 3);
  const slice2 = buf.slice(2, 5);

  slice1[2] = 0x58; // 'X'

  // slice2[0] 应该也是 'X'（因为是同一个字节）
  return slice2[0] === 0x58 && buf[2] === 0x58;
});

test('修改传播：部分重叠的 slice', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 6);   // 'hello '
  const slice2 = buf.slice(3, 8);   // 'lo wo'

  slice1[3] = 0x4c; // 'L'

  // slice2[0] 对应 buf[3]，应该也是 'L'
  return slice2[0] === 0x4c && buf.toString() === 'helLo world';
});

// toString 所有编码的测试
test('toString 编码穷举：slice 后所有支持的编码', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);

  const encodings = ['utf8', 'utf-8', 'hex', 'base64', 'latin1', 'binary', 'ascii'];
  const results = [];

  for (const encoding of encodings) {
    try {
      const str = sliced.toString(encoding);
      results.push(str.length >= 0);
    } catch (e) {
      results.push(false);
    }
  }

  return results.every(r => r === true);
});

// Buffer.isBuffer 和 Buffer.isEncoding 测试
test('静态方法：Buffer.isBuffer 识别 slice', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return Buffer.isBuffer(sliced);
});

test('静态方法：Buffer.isEncoding 各种编码', () => {
  return Buffer.isEncoding('utf8') &&
         Buffer.isEncoding('hex') &&
         Buffer.isEncoding('base64') &&
         !Buffer.isEncoding('invalid');
});

test('静态方法：Buffer.byteLength 对 slice 结果', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  const str = sliced.toString();
  return Buffer.byteLength(str) === 3;
});

// slice 后的写操作边界测试
test('写操作边界：write 到 slice 的开头', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 5);
  sliced.write('hi', 0);
  return buf.slice(0, 2).toString() === 'hi';
});

test('写操作边界：write 到 slice 的末尾', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 5);
  sliced.write('hi', 3);
  return buf.slice(3, 5).toString() === 'hi';
});

test('写操作边界：write 超出 slice 范围被截断', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 5);
  const written = sliced.write('hello world', 0);
  return written === 5 && buf.slice(0, 5).toString() === 'hello';
});

test('写操作边界：write 指定 length', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 5);
  const written = sliced.write('hello', 0, 3);
  return written === 3 && buf.slice(0, 3).toString() === 'hel';
});

test('写操作边界：write 指定编码', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 10);
  const written = sliced.write('48656c6c6f', 0, 'hex');
  return buf.slice(0, 5).toString() === 'Hello';
});

// fill 的各种参数组合
test('fill 参数组合：fill 单个字节', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(0, 5);
  sliced.fill(0x41);
  return buf.toString() === 'AAAAA';
});

test('fill 参数组合：fill 字符串', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 10);
  sliced.fill('ab');
  return buf.toString() === 'ababababab';
});

test('fill 参数组合：fill 指定范围', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 10);
  sliced.fill('x', 2, 5);
  return buf[0] === 0 && buf[2] === 0x78 && buf[5] === 0;
});

test('fill 参数组合：fill 指定编码', () => {
  const buf = Buffer.alloc(6);
  const sliced = buf.slice(0, 6);
  sliced.fill('4142', 'hex');
  return buf.toString() === 'ABABAB';
});

// copy 的各种参数组合
test('copy 参数组合：copy 到目标 buffer 指定位置', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  const target = Buffer.alloc(10);
  sliced.copy(target, 5);
  return target.slice(5, 10).toString() === 'hello';
});

test('copy 参数组合：copy 部分内容', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  const target = Buffer.alloc(5);
  sliced.copy(target, 0, 1, 4);
  return target.slice(0, 3).toString() === 'ell';
});

test('copy 参数组合：copy 返回实际拷贝的字节数', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  const target = Buffer.alloc(3);
  const copied = sliced.copy(target);
  return copied === 3;
});

// 各种特殊字符的测试
test('特殊字符：null 字符', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x02]);
  const sliced = buf.slice(0, 4);
  return sliced[0] === 0 && sliced[2] === 0;
});

test('特殊字符：全是 null 的 buffer', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(0, 5);
  return sliced.every(byte => byte === 0);
});

test('特殊字符：控制字符', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  const sliced = buf.slice(0, 5);
  return sliced.every(byte => byte < 0x20);
});

test('特殊字符：DEL 字符（0x7F）', () => {
  const buf = Buffer.from([0x7f, 0x7f, 0x7f]);
  const sliced = buf.slice(0, 3);
  return sliced[0] === 0x7f;
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
