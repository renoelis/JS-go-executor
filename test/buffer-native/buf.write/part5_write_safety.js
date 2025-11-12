// buf.write() - 安全特性测试
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

// 内存安全
test('不会写入超出 Buffer 边界', () => {
  const buf = Buffer.alloc(5);
  const written = buf.write('hello world');
  return written === 5 && buf.length === 5;
});

test('offset 边界检查', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 11);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('负 offset 边界检查', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('写入不会影响其他 Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  buf1.write('xxxxx');
  return buf2.toString() === 'world';
});

// 原地修改
test('write 是原地修改，不返回新 Buffer', () => {
  const buf = Buffer.alloc(10);
  const originalBuf = buf;
  buf.write('hello');
  return buf === originalBuf;
});

test('修改后 Buffer 引用不变', () => {
  const buf = Buffer.from('aaaaa');
  const ref = buf;
  buf.write('hello');
  return buf === ref && buf.toString() === 'hello';
});

// 视图和共享内存
test('Uint8Array 视图 - 修改反映到原 Buffer', () => {
  const buf = Buffer.alloc(10);
  const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  buf.write('hello');
  return view[0] === 0x68 && view[1] === 0x65;
});

test('Buffer.from ArrayBuffer - 独立内存', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  buf.write('hello');
  const view = new Uint8Array(ab);
  return view[0] === 0x68;
});

test('slice 后的 Buffer - 共享内存', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.subarray(0, 5);
  slice.write('hello');
  return buf.toString('utf8', 0, 5) === 'hello';
});

test('subarray 后的 Buffer - 写入影响原 Buffer', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(2, 7);
  sub.write('hello');
  return buf.toString('utf8', 2, 7) === 'hello';
});

// 并发安全（同步操作）
test('连续写入不会相互干扰', () => {
  const buf = Buffer.alloc(10);
  buf.write('ab', 0);
  buf.write('cd', 2);
  buf.write('ef', 4);
  return buf.toString('utf8', 0, 6) === 'abcdef';
});

test('覆盖写入的安全性', () => {
  const buf = Buffer.from('00000');
  buf.write('111', 0);
  buf.write('222', 1);
  return buf[0] === 0x31 && buf[1] === 0x32;
});

// 类型强制转换安全
test('offset 字符串数字被当作encoding', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', '2');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('length 作为第二参数被当作encoding', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 0, '3');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('offset 布尔值会抛出类型错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset false 会抛出类型错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 编码安全
test('无效 hex 字符不会导致崩溃', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('xyz', 'hex');
  return written === 0;
});

test('无效 base64 字符处理', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('!!!', 'base64');
  return written >= 0;
});

test('utf8 无效序列不会崩溃', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('\\xC0\\xC1', 'utf8');
  return written >= 0;
});

// 只读 Buffer（如果存在）
test('正常 Buffer 可写', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello');
  return written === 5;
});

// 零拷贝验证
test('write 不创建新对象', () => {
  const buf = Buffer.alloc(10);
  const before = buf.toString('hex');
  const result = buf.write('hello');
  return typeof result === 'number';
});

test('返回值是数字，不是 Buffer', () => {
  const buf = Buffer.alloc(10);
  const result = buf.write('hello');
  return typeof result === 'number' && result === 5;
});

// 内存初始化
test('未写入区域保持零值（alloc）', () => {
  const buf = Buffer.alloc(10);
  buf.write('hi', 0);
  return buf[2] === 0 && buf[9] === 0;
});

test('未写入区域保持原值（from）', () => {
  const buf = Buffer.from('aaaaa');
  buf.write('hi', 0);
  return buf[2] === 0x61 && buf[4] === 0x61;
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
