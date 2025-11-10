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

// ============ UTF-8 编码测试 ============

test('UTF-8：slice 中文字符 - 按字节截取', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  // '你' 在 UTF-8 中是 3 字节，所以前 3 字节应该是完整的一个字符
  const sliced = buf.slice(0, 3);
  return sliced.toString('utf8') === '你';
});

test('UTF-8：slice 可能截断多字节字符', () => {
  const buf = Buffer.from('你好', 'utf8');
  // 截取前 4 字节，会包含第一个字符和第二个字符的一部分
  const sliced = buf.slice(0, 4);
  // 不完整的多字节序列可能显示为替换字符
  const str = sliced.toString('utf8');
  return str.length > 0; // 只要不报错就行
});

test('UTF-8：slice emoji 字符', () => {
  const buf = Buffer.from('😀😁', 'utf8');
  // emoji 通常是 4 字节
  const sliced = buf.slice(0, 4);
  return sliced.toString('utf8') === '😀';
});

test('UTF-8：slice 混合 ASCII 和中文', () => {
  const buf = Buffer.from('abc你好', 'utf8');
  // 前 3 字节是 'abc'
  const sliced = buf.slice(0, 3);
  return sliced.toString('utf8') === 'abc';
});

test('UTF-8：slice 中文后半部分', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  // 跳过前两个中文字符（6 字节）
  const sliced = buf.slice(6);
  return sliced.toString('utf8') === '世界';
});

// ============ Base64 编码测试 ============

test('Base64：从 base64 创建 buffer 后 slice', () => {
  const buf = Buffer.from('SGVsbG8gV29ybGQ=', 'base64');
  const sliced = buf.slice(0, 5);
  return sliced.toString('utf8') === 'Hello';
});

test('Base64：slice 后转为 base64', () => {
  const buf = Buffer.from('Hello World');
  const sliced = buf.slice(0, 5);
  return sliced.toString('base64') === 'SGVsbG8=';
});

test('Base64：slice 完整 buffer 后转 base64', () => {
  const buf = Buffer.from('Hello');
  const sliced = buf.slice();
  return sliced.toString('base64') === buf.toString('base64');
});

// ============ Hex 编码测试 ============

test('Hex：从 hex 创建 buffer 后 slice', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  const sliced = buf.slice(0, 2);
  return sliced.toString('hex') === '4865';
});

test('Hex：slice 后转为 hex', () => {
  const buf = Buffer.from('Hello');
  const sliced = buf.slice(1, 4);
  return sliced.toString('hex') === '656c6c';
});

test('Hex：slice 单字节后转 hex', () => {
  const buf = Buffer.from([0xff, 0xaa, 0x55]);
  const sliced = buf.slice(1, 2);
  return sliced.toString('hex') === 'aa';
});

// ============ Latin1 编码测试 ============

test('Latin1：从 latin1 创建 buffer 后 slice', () => {
  const buf = Buffer.from('Hello', 'latin1');
  const sliced = buf.slice(0, 2);
  return sliced.toString('latin1') === 'He';
});

test('Latin1：slice 后转为 latin1', () => {
  const buf = Buffer.from([0x48, 0xe9, 0x6c, 0x6c, 0x6f]); // Héllo in latin1
  const sliced = buf.slice(1, 4);
  return sliced.toString('latin1') === 'éll';
});

// ============ ASCII 编码测试 ============

test('ASCII：从 ascii 创建 buffer 后 slice', () => {
  const buf = Buffer.from('Hello World', 'ascii');
  const sliced = buf.slice(6);
  return sliced.toString('ascii') === 'World';
});

test('ASCII：slice 后转为 ascii', () => {
  const buf = Buffer.from('ABCDEF');
  const sliced = buf.slice(1, 5);
  return sliced.toString('ascii') === 'BCDE';
});

// ============ Binary 编码测试 ============

test('Binary：slice 二进制数据', () => {
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(1, 4);
  return sliced[0] === 0x01 && sliced[1] === 0x02 && sliced[2] === 0x03;
});

test('Binary：slice 保持原始字节', () => {
  const buf = Buffer.from([0xff, 0xfe, 0xfd, 0xfc]);
  const sliced = buf.slice(1, 3);
  return sliced[0] === 0xfe && sliced[1] === 0xfd;
});

// ============ 混合编码场景 ============

test('混合编码：创建时 utf8，slice 后转 hex', () => {
  const buf = Buffer.from('abc', 'utf8');
  const sliced = buf.slice(0, 2);
  return sliced.toString('hex') === '6162';
});

test('混合编码：创建时 hex，slice 后转 utf8', () => {
  const buf = Buffer.from('616263', 'hex');
  const sliced = buf.slice(0, 3);
  return sliced.toString('utf8') === 'abc';
});

test('混合编码：创建时 base64，slice 后转 ascii', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  const sliced = buf.slice(0, 5);
  return sliced.toString('ascii') === 'Hello';
});

// ============ 编码边界测试 ============

test('编码边界：slice 空 buffer 转各种编码', () => {
  const buf = Buffer.alloc(0);
  const sliced = buf.slice();
  return sliced.toString('utf8') === '' &&
         sliced.toString('hex') === '' &&
         sliced.toString('base64') === '';
});

test('编码边界：slice 单字节转各种编码', () => {
  const buf = Buffer.from([0x41]); // 'A'
  const sliced = buf.slice();
  return sliced.toString('utf8') === 'A' &&
         sliced.toString('hex') === '41' &&
         sliced.toString('base64') === 'QQ==';
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
