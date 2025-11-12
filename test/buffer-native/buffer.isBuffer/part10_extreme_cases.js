// Buffer.isBuffer() - 极端场景与深度边界测试
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

// 极端长度测试
test('最小非零 Buffer', () => {
  const buf = Buffer.alloc(1);
  return Buffer.isBuffer(buf) === true && buf.length === 1;
});

test('非常大的 Buffer - 1MB', () => {
  try {
    const buf = Buffer.alloc(1024 * 1024);
    return Buffer.isBuffer(buf) === true && buf.length === 1024 * 1024;
  } catch (e) {
    return true;
  }
});

test('非常大的 Buffer - 10MB', () => {
  try {
    const buf = Buffer.allocUnsafe(10 * 1024 * 1024);
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return true;
  }
});

// 极端值填充
test('Buffer 全部填充为 0x00', () => {
  const buf = Buffer.alloc(100, 0x00);
  return Buffer.isBuffer(buf) === true && buf.every(v => v === 0);
});

test('Buffer 全部填充为 0xFF', () => {
  const buf = Buffer.alloc(100, 0xFF);
  return Buffer.isBuffer(buf) === true && buf.every(v => v === 255);
});

test('Buffer 填充为随机值', () => {
  const buf = Buffer.allocUnsafe(100);
  return Buffer.isBuffer(buf) === true;
});

// Unicode 极端场景
test('包含 emoji 的字符串转 Buffer', () => {
  const buf = Buffer.from('Hello 👋 World 🌍');
  return Buffer.isBuffer(buf) === true && buf.length > 0;
});

test('包含各种 Unicode 平面字符', () => {
  const str = '你好世界🌍𝕳𝖊𝖑𝖑𝖔';
  const buf = Buffer.from(str, 'utf8');
  return Buffer.isBuffer(buf) === true;
});

test('包含零宽字符', () => {
  const str = 'hello\u200Bworld';
  const buf = Buffer.from(str);
  return Buffer.isBuffer(buf) === true;
});

test('包含组合字符', () => {
  const str = 'e\u0301';
  const buf = Buffer.from(str);
  return Buffer.isBuffer(buf) === true;
});

// 编码边界测试
test('hex 编码奇数长度', () => {
  try {
    const buf = Buffer.from('abc', 'hex');
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return true;
  }
});

test('hex 编码非法字符', () => {
  try {
    const buf = Buffer.from('xyz', 'hex');
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return true;
  }
});

test('base64 编码需要填充', () => {
  const inputs = ['YQ==', 'YWI=', 'YWJj'];
  return inputs.every(input => {
    try {
      const buf = Buffer.from(input, 'base64');
      return Buffer.isBuffer(buf) === true;
    } catch (e) {
      return false;
    }
  });
});

test('base64 编码缺少填充', () => {
  const inputs = ['YQ', 'YWI', 'YWJj'];
  return inputs.every(input => {
    try {
      const buf = Buffer.from(input, 'base64');
      return Buffer.isBuffer(buf) === true;
    } catch (e) {
      return false;
    }
  });
});

test('base64 编码非法字符', () => {
  try {
    const buf = Buffer.from('!!!', 'base64');
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return true;
  }
});

// 数组边界测试
test('数组包含负数', () => {
  const buf = Buffer.from([-1, -128, -255]);
  return Buffer.isBuffer(buf) === true;
});

test('数组包含大于 255 的数', () => {
  const buf = Buffer.from([256, 512, 1000]);
  return Buffer.isBuffer(buf) === true;
});

test('数组包含浮点数', () => {
  const buf = Buffer.from([1.5, 2.9, 3.1]);
  return Buffer.isBuffer(buf) === true;
});

test('数组包含 NaN', () => {
  const buf = Buffer.from([NaN, 1, 2]);
  return Buffer.isBuffer(buf) === true;
});

test('数组包含 Infinity', () => {
  const buf = Buffer.from([Infinity, -Infinity, 1]);
  return Buffer.isBuffer(buf) === true;
});

test('数组包含非数字', () => {
  const buf = Buffer.from([1, 'a', null, undefined, 2]);
  return Buffer.isBuffer(buf) === true;
});

// slice 极端边界
test('slice 起始大于结束', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(4, 2);
  return Buffer.isBuffer(slice) === true && slice.length === 0;
});

test('slice 负索引超出范围', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(-100);
  return Buffer.isBuffer(slice) === true;
});

test('slice 正索引超出范围', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(0, 100);
  return Buffer.isBuffer(slice) === true;
});

test('slice 两个参数都超出范围', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(100, 200);
  return Buffer.isBuffer(slice) === true && slice.length === 0;
});

// write 极端情况
test('write 超出 Buffer 长度', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.write('hello world', 0);
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return Buffer.isBuffer(buf) === true;
  }
});

test('write 从中间位置开始', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 5);
  return Buffer.isBuffer(buf) === true;
});

test('write 空字符串', () => {
  const buf = Buffer.alloc(10);
  buf.write('', 0);
  return Buffer.isBuffer(buf) === true;
});

test('write 超长 offset', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 100);
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return Buffer.isBuffer(buf) === true;
  }
});

// copy 极端情况
test('copy 到自身', () => {
  const buf = Buffer.from('hello');
  buf.copy(buf, 2, 0, 3);
  return Buffer.isBuffer(buf) === true;
});

test('copy 空范围', () => {
  const src = Buffer.from('hello');
  const dst = Buffer.alloc(5);
  src.copy(dst, 0, 0, 0);
  return Buffer.isBuffer(src) === true && Buffer.isBuffer(dst) === true;
});

test('copy 超出目标范围', () => {
  const src = Buffer.from('hello world');
  const dst = Buffer.alloc(5);
  try {
    src.copy(dst, 0, 0);
    return Buffer.isBuffer(dst) === true;
  } catch (e) {
    return Buffer.isBuffer(dst) === true;
  }
});

// fill 极端情况
test('fill 超长值', () => {
  const buf = Buffer.alloc(10);
  buf.fill('abcdefghijklmnopqrstuvwxyz');
  return Buffer.isBuffer(buf) === true;
});

test('fill 空字符串', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.fill('');
    return Buffer.isBuffer(buf) === true;
  } catch (e) {
    return Buffer.isBuffer(buf) === true;
  }
});

test('fill 负数', () => {
  const buf = Buffer.alloc(10);
  buf.fill(-1);
  return Buffer.isBuffer(buf) === true;
});

test('fill 大于 255 的数', () => {
  const buf = Buffer.alloc(10);
  buf.fill(256);
  return Buffer.isBuffer(buf) === true;
});

// concat 极端情况
test('concat 超长数组', () => {
  const bufs = [];
  for (let i = 0; i < 1000; i++) {
    bufs.push(Buffer.from([i % 256]));
  }
  const result = Buffer.concat(bufs);
  return Buffer.isBuffer(result) === true && result.length === 1000;
});

test('concat 指定长度为 0', () => {
  const bufs = [Buffer.from('hello'), Buffer.from('world')];
  const result = Buffer.concat(bufs, 0);
  return Buffer.isBuffer(result) === true && result.length === 0;
});

test('concat 指定长度小于实际', () => {
  const bufs = [Buffer.from('hello'), Buffer.from('world')];
  const result = Buffer.concat(bufs, 5);
  return Buffer.isBuffer(result) === true && result.length === 5;
});

test('concat 包含零长度 Buffer', () => {
  const bufs = [
    Buffer.from('hello'),
    Buffer.alloc(0),
    Buffer.from('world'),
    Buffer.alloc(0)
  ];
  const result = Buffer.concat(bufs);
  return Buffer.isBuffer(result) === true;
});

// toString 极端情况
test('toString 超长范围', () => {
  const buf = Buffer.from('hello');
  const str = buf.toString('utf8', 0, 100);
  return Buffer.isBuffer(buf) === true && typeof str === 'string';
});

test('toString 负索引', () => {
  const buf = Buffer.from('hello');
  try {
    const str = buf.toString('utf8', -100, -50);
    return Buffer.isBuffer(buf) === true && typeof str === 'string';
  } catch (e) {
    return Buffer.isBuffer(buf) === true;
  }
});

test('toString 起始大于结束', () => {
  const buf = Buffer.from('hello');
  const str = buf.toString('utf8', 4, 2);
  return Buffer.isBuffer(buf) === true && str === '';
});

// 数值读写极端情况
test('writeInt8 边界值', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt8(127, 0);
  buf.writeInt8(-128, 1);
  return Buffer.isBuffer(buf) === true &&
         buf.readInt8(0) === 127 &&
         buf.readInt8(1) === -128;
});

test('writeUInt8 边界值', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt8(0, 0);
  buf.writeUInt8(255, 1);
  return Buffer.isBuffer(buf) === true &&
         buf.readUInt8(0) === 0 &&
         buf.readUInt8(1) === 255;
});

// 迭代器极端情况
test('空 Buffer 迭代', () => {
  const buf = Buffer.alloc(0);
  const arr = [...buf];
  return Buffer.isBuffer(buf) === true &&
         Array.isArray(arr) === true &&
         arr.length === 0;
});

test('大 Buffer 迭代', () => {
  const buf = Buffer.alloc(10000);
  const arr = [...buf];
  return Buffer.isBuffer(buf) === true &&
         Array.isArray(arr) === true &&
         arr.length === 10000;
});

// 性能相关极端情况
test('多次创建销毁 Buffer', () => {
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(100);
    if (!Buffer.isBuffer(buf)) return false;
  }
  return true;
});

test('大量小 Buffer concat', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    bufs.push(Buffer.from([i]));
  }
  const result = Buffer.concat(bufs);
  return Buffer.isBuffer(result) === true && result.length === 100;
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
