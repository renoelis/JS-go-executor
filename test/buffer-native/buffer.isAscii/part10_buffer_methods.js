// buffer.isAscii() - Part 10: Buffer Methods and Operations Tests
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer.write 方法测试
test('Buffer.write - ASCII 字符串', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 0, 'utf8');
  return isAscii(buf) === true;
});

test('Buffer.write - 非 ASCII 字符串', () => {
  const buf = Buffer.alloc(10);
  buf.write('你好', 0, 'utf8');
  return isAscii(buf) === false;
});

test('Buffer.write - ASCII 然后非 ASCII', () => {
  const buf = Buffer.alloc(20);
  buf.write('hello', 0, 'utf8');
  const beforeAdd = isAscii(buf);
  buf.write('你好', 5, 'utf8');
  const afterAdd = isAscii(buf);
  return beforeAdd === true && afterAdd === false;
});

test('Buffer.write - 带 offset 和 length', () => {
  const buf = Buffer.alloc(10, 0x41);
  buf.write('test', 2, 4, 'utf8');
  return isAscii(buf) === true;
});

test('Buffer.write - 超出范围自动截断', () => {
  const buf = Buffer.alloc(3);
  buf.write('hello', 0, 'utf8'); // 只写入 'hel'
  return isAscii(buf) === true;
});

// Buffer.fill 方法测试
test('Buffer.fill - 单字节 ASCII 值', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0x41);
  return isAscii(buf) === true;
});

test('Buffer.fill - 单字节非 ASCII 值', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0x80);
  return isAscii(buf) === false;
});

test('Buffer.fill - 字符串 ASCII', () => {
  const buf = Buffer.alloc(10);
  buf.fill('abc');
  return isAscii(buf) === true;
});

test('Buffer.fill - 字符串非 ASCII', () => {
  const buf = Buffer.alloc(10);
  buf.fill('中');
  return isAscii(buf) === false;
});

test('Buffer.fill - 指定范围 ASCII', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0x41, 2, 7);
  return isAscii(buf) === true;
});

test('Buffer.fill - 指定范围非 ASCII', () => {
  const buf = Buffer.alloc(10, 0x41);
  buf.fill(0x80, 5, 10);
  return isAscii(buf) === false;
});

test('Buffer.fill - Buffer 作为填充值', () => {
  const buf = Buffer.alloc(10);
  const fillValue = Buffer.from([0x41, 0x42]);
  buf.fill(fillValue);
  return isAscii(buf) === true;
});

test('Buffer.fill - 非 ASCII Buffer 作为填充值', () => {
  const buf = Buffer.alloc(10);
  const fillValue = Buffer.from([0x80, 0xFF]);
  buf.fill(fillValue);
  return isAscii(buf) === false;
});

// Buffer.copy 方法测试
test('Buffer.copy - ASCII 复制到空 Buffer', () => {
  const src = Buffer.from('hello');
  const dst = Buffer.alloc(10);
  src.copy(dst, 0);
  return isAscii(dst) === true;
});

test('Buffer.copy - 非 ASCII 复制到空 Buffer', () => {
  const src = Buffer.from('你好');
  const dst = Buffer.alloc(10);
  src.copy(dst, 0);
  return isAscii(dst) === false;
});

test('Buffer.copy - ASCII 复制到 ASCII', () => {
  const src = Buffer.from('abc');
  const dst = Buffer.alloc(10, 0x44);
  src.copy(dst, 0);
  return isAscii(dst) === true;
});

test('Buffer.copy - 非 ASCII 复制到 ASCII', () => {
  const src = Buffer.from([0x80, 0xFF]);
  const dst = Buffer.alloc(10, 0x41);
  src.copy(dst, 5);
  return isAscii(dst) === false;
});

test('Buffer.copy - 部分复制', () => {
  const src = Buffer.from([0x41, 0x80, 0x42]);
  const dst = Buffer.alloc(10, 0x43);
  src.copy(dst, 0, 0, 1); // 只复制第一个字节 0x41
  return isAscii(dst) === true;
});

test('Buffer.copy - 部分复制包含非 ASCII', () => {
  const src = Buffer.from([0x41, 0x80, 0x42]);
  const dst = Buffer.alloc(10, 0x43);
  src.copy(dst, 0, 1, 2); // 只复制 0x80
  return isAscii(dst) === false;
});

// TypedArray.set 方法测试
test('Uint8Array.set - ASCII 数组', () => {
  const arr = new Uint8Array(10);
  arr.fill(0x41);
  arr.set([0x42, 0x43], 5);
  return isAscii(arr) === true;
});

test('Uint8Array.set - 非 ASCII 数组', () => {
  const arr = new Uint8Array(10);
  arr.fill(0x41);
  arr.set([0x80, 0xFF], 5);
  return isAscii(arr) === false;
});

test('Uint8Array.set - 替换整个数组', () => {
  const arr = new Uint8Array(5);
  arr.set([0x41, 0x42, 0x43, 0x44, 0x45]);
  return isAscii(arr) === true;
});

test('Uint8Array.set - 从 TypedArray 设置', () => {
  const arr = new Uint8Array(10);
  arr.fill(0x41);
  const src = new Uint8Array([0x80, 0xFF]);
  arr.set(src, 5);
  return isAscii(arr) === false;
});

// Buffer.swap 方法测试
test('Buffer.swap16 - ASCII 值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return isAscii(buf) === true;
});

test('Buffer.swap16 - 包含非 ASCII', () => {
  const buf = Buffer.from([0x80, 0x01, 0x02, 0x03]);
  buf.swap16();
  return isAscii(buf) === false;
});

test('Buffer.swap32 - ASCII 值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();
  return isAscii(buf) === true;
});

test('Buffer.swap32 - 包含非 ASCII', () => {
  const buf = Buffer.from([0x01, 0x02, 0x80, 0x04]);
  buf.swap32();
  return isAscii(buf) === false;
});

test('Buffer.swap64 - ASCII 值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  return isAscii(buf) === true;
});

test('Buffer.swap64 - 包含非 ASCII', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x80, 0x06, 0x07, 0x08]);
  buf.swap64();
  return isAscii(buf) === false;
});

// Buffer 读取方法后的检查
test('Buffer.readUInt8 后 Buffer 不变', () => {
  const buf = Buffer.from([0x41, 0x42]);
  buf.readUInt8(0);
  return isAscii(buf) === true;
});

test('Buffer.writeUInt8 改变 Buffer', () => {
  const buf = Buffer.from([0x41, 0x42]);
  buf.writeUInt8(0x80, 0);
  return isAscii(buf) === false;
});

test('Buffer.writeUInt16LE - ASCII 范围', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x4142, 0); // 'BA' in little-endian
  return isAscii(buf) === true;
});

test('Buffer.writeUInt16BE - ASCII 范围', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x4142, 0); // 'AB' in big-endian
  return isAscii(buf) === true;
});

test('Buffer.writeUInt32LE - 包含非 ASCII 字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0x80414243, 0);
  return isAscii(buf) === false;
});

// Buffer 比较和查找
test('Buffer.equals - 相同 ASCII Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  buf1.equals(buf2);
  return isAscii(buf1) === true && isAscii(buf2) === true;
});

test('Buffer.indexOf - ASCII 搜索', () => {
  const buf = Buffer.from('hello world');
  buf.indexOf('world');
  return isAscii(buf) === true;
});

test('Buffer.lastIndexOf - ASCII 搜索', () => {
  const buf = Buffer.from('hello hello');
  buf.lastIndexOf('hello');
  return isAscii(buf) === true;
});

test('Buffer.includes - ASCII 搜索', () => {
  const buf = Buffer.from('hello world');
  buf.includes('world');
  return isAscii(buf) === true;
});

// 编码转换后的 Buffer
test('Buffer.toString 然后 from - ASCII', () => {
  const buf1 = Buffer.from('hello');
  const str = buf1.toString('utf8');
  const buf2 = Buffer.from(str);
  return isAscii(buf2) === true;
});

test('Buffer.toString 然后 from - 非 ASCII', () => {
  const buf1 = Buffer.from('你好');
  const str = buf1.toString('utf8');
  const buf2 = Buffer.from(str);
  return isAscii(buf2) === false;
});

test('Buffer.toJSON 不影响原 Buffer', () => {
  const buf = Buffer.from('hello');
  buf.toJSON();
  return isAscii(buf) === true;
});

// 特殊长度边界 (4KB 边界)
test('4095 字节 - ASCII', () => {
  const buf = Buffer.alloc(4095, 0x41);
  return isAscii(buf) === true;
});

test('4096 字节 - ASCII (页面大小)', () => {
  const buf = Buffer.alloc(4096, 0x41);
  return isAscii(buf) === true;
});

test('4097 字节 - ASCII', () => {
  const buf = Buffer.alloc(4097, 0x41);
  return isAscii(buf) === true;
});

test('8192 字节 - ASCII (2 页)', () => {
  const buf = Buffer.alloc(8192, 0x41);
  return isAscii(buf) === true;
});

// Buffer.reverse 方法（如果存在）
test('Buffer reverse - ASCII', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  if (typeof buf.reverse === 'function') {
    buf.reverse();
    return isAscii(buf) === true;
  }
  return true; // 跳过
});

test('Buffer reverse - 非 ASCII', () => {
  const buf = Buffer.from([0x41, 0x80, 0x43]);
  if (typeof buf.reverse === 'function') {
    buf.reverse();
    return isAscii(buf) === false;
  }
  return true; // 跳过
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
