// buf.write() - 第5轮：极端场景和兼容性测试
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

// 极端场景：非常长的 Buffer
test('写入到 8KB Buffer', () => {
  const buf = Buffer.alloc(8192);
  const len = buf.write('test', 4096);
  return len === 4 && buf.toString('utf8', 4096, 4100) === 'test';
});

test('写入到 64KB Buffer', () => {
  const buf = Buffer.alloc(65536);
  const len = buf.write('hello', 32768);
  return len === 5;
});

// 极端场景：非常长的字符串
test('写入 4KB 的字符串', () => {
  const buf = Buffer.alloc(5000);
  const str = 'x'.repeat(4096);
  const len = buf.write(str);
  return len === 4096;
});

test('写入 16KB 的字符串到更大的 Buffer', () => {
  const buf = Buffer.alloc(20000);
  const str = 'y'.repeat(16384);
  const len = buf.write(str);
  return len === 16384;
});

// 极端场景：多字节字符的大量重复
test('写入 1000 个中文字符', () => {
  const buf = Buffer.alloc(10000);
  const str = '测'.repeat(1000);
  const len = buf.write(str);
  return len === 3000;
});

test('写入 500 个 emoji', () => {
  const buf = Buffer.alloc(5000);
  const str = '😀'.repeat(500);
  const len = buf.write(str);
  return len === 2000;
});

// 极端场景：offset 边界
test('offset 为 Buffer.length - 1', () => {
  const buf = Buffer.alloc(100);
  const len = buf.write('xyz', 99);
  return len === 1;
});

test('offset 为大数值但仍在范围内', () => {
  const buf = Buffer.alloc(10000);
  const len = buf.write('test', 9995);
  return len === 4;
});

// 极端场景：连续大量写入
test('连续写入 1000 次', () => {
  const buf = Buffer.alloc(10000);
  let success = true;
  for (let i = 0; i < 1000; i++) {
    const len = buf.write('x', i);
    if (len !== 1) success = false;
  }
  return success && buf[999] === 0x78;
});

// 极端场景：hex 编码的极长字符串
test('hex - 写入 1000 字节', () => {
  const buf = Buffer.alloc(1000);
  const hex = '00'.repeat(1000);
  const len = buf.write(hex, 'hex');
  return len === 1000;
});

test('hex - 写入 5000 字节', () => {
  const buf = Buffer.alloc(5000);
  const hex = 'ff'.repeat(5000);
  const len = buf.write(hex, 'hex');
  return len === 5000;
});

// 极端场景：base64 编码的极长字符串
test('base64 - 写入大量数据', () => {
  const buf = Buffer.alloc(10000);
  const b64 = Buffer.alloc(7500).toString('base64');
  const len = buf.write(b64, 'base64');
  return len > 0;
});

// 兼容性：特殊 Unicode 范围
test('写入私有使用区字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\uE000');
  return len === 3;
});

test('写入增补平面字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\uD800\uDC00');
  return len === 4;
});

test('写入代理对', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('𝕳𝖊𝖑𝖑𝖔');
  return len > 0;
});

// 兼容性：不同平台的换行符
test('写入 Windows 换行符 CRLF', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\r\n');
  return len === 2 && buf[0] === 0x0d && buf[1] === 0x0a;
});

test('写入 Unix 换行符 LF', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\n');
  return len === 1 && buf[0] === 0x0a;
});

test('写入旧 Mac 换行符 CR', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\r');
  return len === 1 && buf[0] === 0x0d;
});

// 兼容性：特殊空白字符
test('写入不换行空格', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\u00A0');
  return len === 2;
});

test('写入零宽度不连字', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\uFEFF');
  return len === 3;
});

test('写入全角空格', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\u3000');
  return len === 3;
});

// 兼容性：历史行为 - Node v25.0.0 的严格性
test('length 超出范围会抛出错误而非截断', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.write('hello', 0, 100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('offset 必须是整数', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 1.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('length 必须是整数', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 0, 2.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 极端场景：Buffer 与 ArrayBuffer 的边界
test('基于 ArrayBuffer 的 Buffer 可以写入', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const len = buf.write('test');
  return len === 4;
});

test('带 offset 的 ArrayBuffer 视图', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  const len = buf.write('hi');
  return len === 2;
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
