// buf.subarray() - Input Types & TypedArray Compatibility
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, passed: pass, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer 不同创建方式
test('Buffer.from(array) 创建的 buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  if (sub.length !== 3) return false;
  if (sub[0] !== 2) return false;
  console.log('✅ Buffer.from(array) 正确处理');
  return true;
});

test('Buffer.from(string) 创建的 buffer', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray(1, 4);
  if (sub.length !== 3) return false;
  if (sub.toString() !== 'ell') return false;
  sub[0] = 97; // 'a'
  if (buf.toString() !== 'hallo') return false;
  console.log('✅ Buffer.from(string) 正确处理');
  return true;
});

test('Buffer.alloc() 创建的 buffer', () => {
  const buf = Buffer.alloc(10);
  buf[5] = 42;
  const sub = buf.subarray(5);
  if (sub.length !== 5) return false;
  if (sub[0] !== 42) return false;
  console.log('✅ Buffer.alloc() 正确处理');
  return true;
});

test('Buffer.allocUnsafe() 创建的 buffer', () => {
  const buf = Buffer.allocUnsafe(10);
  for (let i = 0; i < 10; i++) buf[i] = i;
  const sub = buf.subarray(3, 7);
  if (sub.length !== 4) return false;
  if (sub[0] !== 3 || sub[3] !== 6) return false;
  console.log('✅ Buffer.allocUnsafe() 正确处理');
  return true;
});

test('Buffer.from(buffer) 创建的 buffer', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from(buf1);
  const sub = buf2.subarray(1, 4);
  if (sub.length !== 3) return false;
  sub[0] = 99;
  if (buf2[1] !== 99) return false;
  if (buf1[1] === 99) return false; // buf2 是 buf1 的拷贝，不共享内存
  console.log('✅ Buffer.from(buffer) 正确处理');
  return true;
});

// TypedArray 兼容性
test('Uint8Array 调用 subarray', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(arr.buffer);
  const sub = buf.subarray(1, 4);
  if (sub.length !== 3) return false;
  if (sub[0] !== 2) return false;
  console.log('✅ 从 Uint8Array 创建的 buffer 正确处理');
  return true;
});

test('Buffer 是 Uint8Array 的子类', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  if (!(buf instanceof Uint8Array)) return false;
  console.log('✅ Buffer 是 Uint8Array 实例');
  return true;
});

test('subarray 返回的仍是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  if (!Buffer.isBuffer(sub)) return false;
  if (!(sub instanceof Buffer)) return false;
  if (!(sub instanceof Uint8Array)) return false;
  console.log('✅ subarray 返回 Buffer 实例');
  return true;
});

test('ArrayBuffer 转 Buffer 后 subarray', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) view[i] = i;
  const buf = Buffer.from(ab);
  const sub = buf.subarray(3, 7);
  if (sub.length !== 4) return false;
  if (sub[0] !== 3 || sub[3] !== 6) return false;
  console.log('✅ ArrayBuffer 转换正确处理');
  return true;
});

test('Buffer.concat 后 subarray', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const buf = Buffer.concat([buf1, buf2]);
  const sub = buf.subarray(2, 5);
  if (sub.length !== 3) return false;
  if (sub[0] !== 3 || sub[2] !== 5) return false;
  console.log('✅ Buffer.concat 后 subarray 正确');
  return true;
});

test('不同编码的 Buffer', () => {
  const hex = Buffer.from('48656c6c6f', 'hex');
  const sub = hex.subarray(1, 4);
  if (sub.length !== 3) return false;
  if (sub.toString() !== 'ell') return false;
  console.log('✅ hex 编码 Buffer subarray 正确');
  return true;
});

test('base64 编码的 Buffer', () => {
  const b64 = Buffer.from('SGVsbG8=', 'base64');
  const sub = b64.subarray(1, 4);
  if (sub.length !== 3) return false;
  if (sub.toString() !== 'ell') return false;
  console.log('✅ base64 编码 Buffer subarray 正确');
  return true;
});

test('utf8 多字节字符 Buffer', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  const len = buf.length; // 12 字节
  const sub = buf.subarray(0, 6);
  if (sub.length !== 6) return false;
  if (sub.toString('utf8') !== '你好') return false;
  console.log('✅ utf8 多字节 Buffer subarray 正确');
  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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
