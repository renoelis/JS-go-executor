// buf.write() - 第8轮：边缘条件和特殊交互
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

// 特殊交互1：与 readInt/readUInt 系列的交互
test('写入后用 readUInt8 读取', () => {
  const buf = Buffer.alloc(10);
  buf.write('A');
  return buf.readUInt8(0) === 0x41;
});

test('写入后用 readUInt16LE 读取', () => {
  const buf = Buffer.alloc(10);
  buf.write('AB');
  return buf.readUInt16LE(0) === 0x4241;
});

test('写入后用 readInt8 读取负数', () => {
  const buf = Buffer.alloc(10);
  buf.write('\x80', 'latin1');
  return buf.readInt8(0) === -128;
});

// 特殊交互2：与 writeInt/writeUInt 系列的交互
test('write 后 writeUInt8 覆盖', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  buf.writeUInt8(0xFF, 0);
  return buf[0] === 0xFF && buf[1] === 0x65;
});

test('writeUInt8 后 write 覆盖', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(0xAA, 0);
  buf.write('test');
  return buf[0] === 0x74 && buf.readUInt8(0) === 0x74;
});

// 特殊交互3：与 readFloat/readDouble 的交互
test('写入 hex 后用 readFloatLE 读取', () => {
  const buf = Buffer.alloc(10);
  buf.write('0000803f', 'hex');
  const val = buf.readFloatLE(0);
  return Math.abs(val - 1.0) < 0.0001;
});

// 特殊交互4：循环写入的边界
test('循环写入填满 Buffer', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf.write('x', i, 1);
  }
  return buf[0] === 0x78 && buf[99] === 0x78;
});

test('循环写入不同 offset', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 10; i++) {
    buf.write('test', i * 10, 4);
  }
  return buf[0] === 0x74 && buf[90] === 0x74;
});

// 特殊交互5：写入后的 Buffer.isBuffer 检查
test('写入后仍然是 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  return Buffer.isBuffer(buf);
});

// 特殊交互6：写入后的 Buffer.isEncoding 检查
test('验证使用的编码有效性', () => {
  return Buffer.isEncoding('utf8') && Buffer.isEncoding('hex') && Buffer.isEncoding('base64');
});

// 特殊交互7：不同 Node.js 版本的行为（v25特性）
test('strict mode - offset 必须是整数', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('strict mode - length 必须是整数', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 0, 2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('strict mode - length 不能超出范围', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.write('hello', 0, 100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊场景8：写入特殊 Unicode 类别
test('写入数学符号', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('∑∫∂∇');
  return len > 0;
});

test('写入货币符号', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('$€¥£₹');
  return len > 0;
});

test('写入箭头符号', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('←→↑↓');
  return len > 0;
});

test('写入方框绘制字符', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('─│┌┐└┘');
  return len > 0;
});

// 特殊场景9：写入不同语言文字
test('写入日文假名', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('ひらがなカタカナ');
  return len > 0;
});

test('写入韩文', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('한글');
  return len > 0;
});

test('写入阿拉伯文', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('العربية');
  return len > 0;
});

test('写入希伯来文', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('עברית');
  return len > 0;
});

test('写入泰文', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('ภาษาไทย');
  return len > 0;
});

// 特殊场景10：写入后的 Buffer.toJSON
test('写入后 toJSON 返回正确格式', () => {
  const buf = Buffer.alloc(3);
  buf.write('ABC');
  const json = buf.toJSON();
  return json.type === 'Buffer' && json.data[0] === 0x41;
});

test('写入 hex 后 toJSON', () => {
  const buf = Buffer.alloc(3);
  buf.write('010203', 'hex');
  const json = buf.toJSON();
  return json.data[0] === 1 && json.data[1] === 2 && json.data[2] === 3;
});

// 特殊场景11：写入空白字符的各种形式
test('写入制表符（tab）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\t\t\t');
  return len === 3 && buf[0] === 0x09;
});

test('写入垂直制表符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\v');
  return len === 1 && buf[0] === 0x0B;
});

test('写入换页符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\f');
  return len === 1 && buf[0] === 0x0C;
});

// 特殊场景12：offset 和 length 的边界测试补充
test('offset=0, length=buffer.length', () => {
  const buf = Buffer.alloc(5);
  const len = buf.write('hello', 0, 5);
  return len === 5 && buf.toString() === 'hello';
});

test('offset=buffer.length-1, length=1', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('x', 9, 1);
  return len === 1 && buf[9] === 0x78;
});

test('offset=1, length=buffer.length-1', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('123456789', 1, 9);
  return len === 9 && buf[1] === 0x31;
});

// 特殊场景13：base64 的各种填充情况
test('base64 - 1个填充符正确解码', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('YWI=', 'base64');
  return len === 2 && buf[0] === 0x61 && buf[1] === 0x62;
});

test('base64 - 2个填充符正确解码', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('YQ==', 'base64');
  return len === 1 && buf[0] === 0x61;
});

test('base64 - 无填充符但长度正确', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('YWJj', 'base64');
  return len === 3;
});

// 特殊场景14：写入引号和转义字符
test('写入单引号', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write("'");
  return len === 1 && buf[0] === 0x27;
});

test('写入双引号', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('"');
  return len === 1 && buf[0] === 0x22;
});

test('写入反斜杠', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\\');
  return len === 1 && buf[0] === 0x5C;
});

test('写入反引号', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('`');
  return len === 1 && buf[0] === 0x60;
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
