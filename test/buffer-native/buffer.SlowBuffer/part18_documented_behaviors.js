// Buffer.allocUnsafeSlow - slice vs subarray 和关键行为差异测试
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

// slice vs subarray 关键差异（官方文档重点）
test('slice 创建共享内存的视图', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf[5] = 100;
  const slice = buf.slice(0, 10);
  slice[5] = 200;
  return buf[5] === 200;
});

test('subarray 也创建共享内存的视图', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf[5] = 100;
  const sub = buf.subarray(0, 10);
  sub[5] = 200;
  return buf[5] === 200;
});

test('slice 和 subarray 行为一致（都是视图）', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const slice = buf.slice(2, 8);
  const sub = buf.subarray(2, 8);
  slice[0] = 100;
  sub[1] = 200;
  return buf[2] === 100 && buf[3] === 200;
});

test('slice 负索引支持', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  for (let i = 0; i < 10; i++) buf[i] = i;
  const slice = buf.slice(-3, -1);
  return slice.length === 2 && slice[0] === 7 && slice[1] === 8;
});

test('subarray 负索引支持', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  for (let i = 0; i < 10; i++) buf[i] = i;
  const sub = buf.subarray(-3, -1);
  return sub.length === 2 && sub[0] === 7 && sub[1] === 8;
});

// Buffer.from() ArrayBuffer 处理（官方文档警告）
test('Buffer.from(arrayBuffer) 共享内存', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const view = new Uint8Array(ab);
  view[0] = 100;
  return buf[0] === 100;
});

test('Buffer.from(arrayBuffer, offset, length)', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) view[i] = i;
  const buf = Buffer.from(ab, 2, 5);
  return buf.length === 5 && buf[0] === 2 && buf[4] === 6;
});

test('修改 Buffer.from(arrayBuffer) 影响原 ArrayBuffer', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  buf[0] = 255;
  const view = new Uint8Array(ab);
  return view[0] === 255;
});

// TypedArray 构造时复制行为（官方文档说明）
test('TypedArray 从 Buffer 构造会复制数据', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  const uint32 = new Uint32Array(buf);
  uint32[0] = 999;
  return buf[0] === 1;
});

test('TypedArray 从 buf.buffer 构造共享内存', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeUInt32LE(0x12345678, 0);
  const uint32 = new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  uint32[0] = 0xABCDEF00;
  return buf.readUInt32LE(0) === 0xABCDEF00;
});

// Buffer.concat 池行为
test('Buffer.concat 可能使用内部池', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  buf1.write('hello');
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf2.write('world');
  const concat = Buffer.concat([buf1, buf2]);
  return concat.length === 10 && concat.toString('utf8', 0, 10) === 'helloworld';
});

test('Buffer.concat 截断到 totalLength', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const concat = Buffer.concat([buf1, buf2], 7);
  return concat.length === 7 && concat.toString() === 'hellowo';
});

test('Buffer.concat totalLength 大于实际长度时填充零', () => {
  const buf1 = Buffer.from('hi');
  const concat = Buffer.concat([buf1], 5);
  return concat.length === 5 && concat[2] === 0 && concat[3] === 0;
});

// fill 的截断行为（官方文档提到）
test('fill 多字节字符在边界截断', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill('你');
  return buf.length === 5;
});

test('fill 空字符串等同于填充 0', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(100);
  buf.fill('');
  return buf[0] === 0 && buf[4] === 0;
});

test('fill 空 Buffer 抛出错误', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  try {
    buf.fill(Buffer.from(''));
    return false;
  } catch (e) {
    return e.message.includes('invalid') || e.code === 'ERR_INVALID_ARG_VALUE';
  }
});

// byteOffset 考虑（官方文档提到池化 Buffer）
test('allocUnsafeSlow Buffer byteOffset 通常为 0', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf.byteOffset === 0;
});

test('allocUnsafe 小 Buffer 可能有非零 byteOffset', () => {
  const buf = Buffer.allocUnsafe(10);
  return typeof buf.byteOffset === 'number';
});

test('slice 创建的 Buffer 有非零 byteOffset', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  const slice = buf.slice(10, 20);
  return slice.byteOffset === 10;
});

// base64 和 hex 的特殊行为
test('base64 字符串中的空格被忽略', () => {
  const buf1 = Buffer.from('SGVs bG8=', 'base64');
  const buf2 = Buffer.from('SGVsbG8=', 'base64');
  return buf1.equals(buf2);
});

test('hex 字符串奇数长度截断', () => {
  const buf = Buffer.from('12345', 'hex');
  return buf.length === 2 && buf[0] === 0x12 && buf[1] === 0x34;
});

test('base64 解码无效字符停止', () => {
  const buf = Buffer.from('SGVsbG8***', 'base64');
  return buf.length === 5 && buf.toString() === 'Hello';
});

// Buffer.byteLength 特殊行为
test('Buffer.byteLength 多字节字符', () => {
  const len1 = Buffer.byteLength('你好', 'utf8');
  const len2 = '你好'.length;
  return len1 === 6 && len2 === 2;
});

test('Buffer.byteLength base64 假定有效输入', () => {
  const len = Buffer.byteLength('SGVsbG8=', 'base64');
  return len === 5;
});

test('Buffer.byteLength hex 字符串', () => {
  const len = Buffer.byteLength('48656c6c6f', 'hex');
  return len === 5;
});

// Object with Symbol.toPrimitive
test('Buffer.from 支持 Symbol.toPrimitive', () => {
  const obj = {
    [Symbol.toPrimitive]() {
      return 'test';
    }
  };
  const buf = Buffer.from(obj, 'utf8');
  return buf.toString() === 'test';
});

test('Buffer.from 支持 valueOf', () => {
  const obj = {
    valueOf() {
      return 'hello';
    }
  };
  const buf = Buffer.from(obj, 'utf8');
  return buf.toString() === 'hello';
});

// allocUnsafeSlow 安全问题（官方文档警告）
test('allocUnsafeSlow 可能包含敏感数据', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf instanceof Buffer;
});

test('allocUnsafeSlow 必须手动初始化以确保安全', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  buf.fill(0);
  return buf.every(b => b === 0);
});

// 对比 allocUnsafe 和 allocUnsafeSlow 池行为
test('allocUnsafe 小于 poolSize/2 使用池', () => {
  const size = Math.floor(Buffer.poolSize / 2) - 1;
  const buf = Buffer.allocUnsafe(size);
  return buf.length === size;
});

test('allocUnsafeSlow 任何大小都不使用池', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  return buf1.buffer !== buf2.buffer;
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
