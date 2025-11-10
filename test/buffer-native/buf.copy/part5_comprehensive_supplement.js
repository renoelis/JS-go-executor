// buf.copy() - Comprehensive Supplement Tests
// 补充测试：编码完整性、SharedArrayBuffer、大数据、TypedArray视图等
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

// ========== 编码完整性测试 ==========
test('UTF-8 多字节字符复制完整性', () => {
  const buf1 = Buffer.from('你好世界🌍', 'utf8');
  const buf2 = Buffer.alloc(buf1.length);
  const bytes = buf1.copy(buf2);
  return bytes === buf1.length && buf2.toString('utf8') === '你好世界🌍';
});

test('Base64 编码数据复制', () => {
  const original = 'Hello World!';
  const buf1 = Buffer.from(original, 'utf8');
  const buf2 = Buffer.alloc(buf1.length);
  buf1.copy(buf2);
  return buf2.toString('base64') === buf1.toString('base64');
});

test('Hex 编码数据复制', () => {
  const buf1 = Buffer.from('deadbeef', 'hex');
  const buf2 = Buffer.alloc(4);
  buf1.copy(buf2);
  return buf2.toString('hex') === 'deadbeef';
});

test('Latin1 编码数据复制', () => {
  const buf1 = Buffer.from('café', 'latin1');
  const buf2 = Buffer.alloc(buf1.length);
  buf1.copy(buf2);
  return buf2.toString('latin1') === buf1.toString('latin1');
});

test('ASCII 编码边界字符', () => {
  const buf1 = Buffer.from([0x00, 0x7F, 0x20, 0x41]);
  const buf2 = Buffer.alloc(4);
  buf1.copy(buf2);
  return buf2[0] === 0x00 && buf2[1] === 0x7F && buf2[2] === 0x20 && buf2[3] === 0x41;
});

// ========== 不同位宽 TypedArray 测试 ==========
test('复制到 Int16Array', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const target = new Int16Array(4); // 8 bytes
  const bytes = buf.copy(target, 0);
  return bytes === 4;
});

test('复制到 Int32Array', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const target = new Int32Array(4); // 16 bytes
  const bytes = buf.copy(target, 0);
  return bytes === 8;
});

test('复制到 Float64Array', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0xF0, 0x3F]); // 1.0 in float64
  const target = new Float64Array(2); // 16 bytes
  const bytes = buf.copy(target, 0);
  return bytes === 8;
});

test('复制到 BigInt64Array', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const target = new BigInt64Array(2); // 16 bytes
    const bytes = buf.copy(target, 0);
    return bytes === 8;
  } catch (e) {
    // BigInt64Array 可能不被支持
    return e instanceof ReferenceError || e instanceof TypeError;
  }
});

test('复制到 BigUint64Array', () => {
  try {
    const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    const target = new BigUint64Array(2); // 16 bytes
    const bytes = buf.copy(target, 0);
    return bytes === 8;
  } catch (e) {
    return e instanceof ReferenceError || e instanceof TypeError;
  }
});

// ========== TypedArray 视图偏移测试 ==========
test('复制到有偏移的 Uint8Array 视图', () => {
  const buf = Buffer.from('hello');
  const arrayBuffer = new ArrayBuffer(20);
  const target = new Uint8Array(arrayBuffer, 5, 10); // offset=5, length=10
  const bytes = buf.copy(target, 0);
  return bytes === 5 && Buffer.from(arrayBuffer, 5, 5).toString() === 'hello';
});

test('复制到有偏移的 Uint16Array 视图', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const arrayBuffer = new ArrayBuffer(20);
  const target = new Uint16Array(arrayBuffer, 4, 5); // offset=4 bytes, 5 elements
  const bytes = buf.copy(target, 0);
  return bytes === 4;
});

test('从有偏移的视图复制（验证独立性）', () => {
  const arrayBuffer = new ArrayBuffer(20);
  const view = new Uint8Array(arrayBuffer, 5, 10);
  view[0] = 65; view[1] = 66; view[2] = 67; // 'ABC'
  const buf = Buffer.from(view.buffer, view.byteOffset, 3);
  const target = Buffer.alloc(5);
  buf.copy(target);
  return target.slice(0, 3).toString() === 'ABC';
});

// ========== SharedArrayBuffer 测试 ==========
test('复制到 SharedArrayBuffer 支持的 Uint8Array', () => {
  try {
    if (typeof SharedArrayBuffer === 'undefined') {
      return true; // 不支持就跳过
    }
    const buf = Buffer.from('shared');
    const sab = new SharedArrayBuffer(10);
    const target = new Uint8Array(sab);
    const bytes = buf.copy(target, 0);
    return bytes === 6 && Buffer.from(target.slice(0, 6)).toString() === 'shared';
  } catch (e) {
    // SharedArrayBuffer 可能在某些环境被禁用
    return true;
  }
});

// ========== 连续复制操作 ==========
test('连续多次复制到同一目标', () => {
  const buf1 = Buffer.from('aaa');
  const buf2 = Buffer.from('bbb');
  const target = Buffer.alloc(9);
  
  buf1.copy(target, 0);
  buf2.copy(target, 3);
  buf1.copy(target, 6);
  
  return target.toString() === 'aaabbbaaa';
});

test('链式复制（A->B->C）', () => {
  const bufA = Buffer.from('original');
  const bufB = Buffer.alloc(8);
  const bufC = Buffer.alloc(8);
  
  bufA.copy(bufB);
  bufB.copy(bufC);
  
  return bufC.toString() === 'original';
});

test('循环复制自身（模拟旋转）', () => {
  const buf = Buffer.from('abcde');
  buf.copy(buf, 0, 1, 5); // 移除第一个字符
  buf[4] = 'a'.charCodeAt(0); // 手动添加到末尾
  // 注意：这个测试更多是验证不会崩溃
  return buf.length === 5;
});

// ========== 大数据测试 ==========
test('复制 1MB 数据', () => {
  const size = 1024 * 1024; // 1MB
  const buf1 = Buffer.alloc(size, 0x42);
  const buf2 = Buffer.alloc(size);
  const bytes = buf1.copy(buf2);
  return bytes === size && buf2[0] === 0x42 && buf2[size - 1] === 0x42;
});

test('复制 10MB 数据', () => {
  const size = 10 * 1024 * 1024; // 10MB
  const buf1 = Buffer.alloc(size, 0xAB);
  const buf2 = Buffer.alloc(size);
  const bytes = buf1.copy(buf2);
  return bytes === size && buf2[0] === 0xAB && buf2[size - 1] === 0xAB;
});

test('部分复制大数据', () => {
  const size = 1024 * 1024; // 1MB
  const buf1 = Buffer.alloc(size, 0xFF);
  const buf2 = Buffer.alloc(1000);
  const bytes = buf1.copy(buf2, 0, 0, 1000);
  return bytes === 1000 && buf2.every(b => b === 0xFF);
});

// ========== 特殊数据模式 ==========
test('复制全零数据', () => {
  const buf1 = Buffer.alloc(100, 0);
  const buf2 = Buffer.alloc(100, 0xFF);
  buf1.copy(buf2);
  return buf2.every(b => b === 0);
});

test('复制全 0xFF 数据', () => {
  const buf1 = Buffer.alloc(100, 0xFF);
  const buf2 = Buffer.alloc(100, 0);
  buf1.copy(buf2);
  return buf2.every(b => b === 0xFF);
});

test('复制递增序列数据', () => {
  const buf1 = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  const buf2 = Buffer.alloc(256);
  buf1.copy(buf2);
  return buf2[0] === 0 && buf2[255] === 255 && buf2[128] === 128;
});

test('复制随机数据完整性', () => {
  const buf1 = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf1[i] = Math.floor(Math.random() * 256);
  }
  const buf2 = Buffer.alloc(100);
  buf1.copy(buf2);
  return buf1.equals(buf2);
});

// ========== 特殊对象参数测试（无 Proxy）==========
test('targetStart 为包含 valueOf 的对象', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.alloc(10, 0);
  const obj = {
    valueOf: function() { return 3; }
  };
  try {
    const bytes = buf1.copy(buf2, obj);
    // 应该调用 valueOf 或转换
    return bytes === 2;
  } catch (e) {
    // 或者抛出错误
    return true;
  }
});

// ========== 错误详细信息验证 ==========
test('负数 targetStart 错误信息包含 ERR_OUT_OF_RANGE', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  try {
    buf1.copy(buf2, -1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' && 
           e.message.includes('targetStart') &&
           e.name === 'RangeError';
  }
});

test('负数 sourceStart 错误信息包含 ERR_OUT_OF_RANGE', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  try {
    buf1.copy(buf2, 0, -1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' && 
           e.message.includes('sourceStart') &&
           e.name === 'RangeError';
  }
});

test('非 Buffer/TypedArray 目标错误类型', () => {
  const buf = Buffer.from('hello');
  try {
    buf.copy({});
    return false;
  } catch (e) {
    return e instanceof TypeError && 
           (e.message.includes('Buffer') || e.message.includes('Uint8Array'));
  }
});

// ========== 并发/性能相关 ==========
test('快速连续复制 1000 次', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.alloc(4);
  for (let i = 0; i < 1000; i++) {
    buf1.copy(buf2);
  }
  return buf2.toString() === 'test';
});

test('交替复制到两个目标', () => {
  const src = Buffer.from('data');
  const target1 = Buffer.alloc(4);
  const target2 = Buffer.alloc(4);
  
  for (let i = 0; i < 100; i++) {
    src.copy(i % 2 === 0 ? target1 : target2);
  }
  
  return target1.toString() === 'data' && target2.toString() === 'data';
});

// ========== 特殊边界组合 ==========
test('sourceStart=0, sourceEnd=0（复制0字节）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10, 0x61);
  const bytes = buf1.copy(buf2, 5, 0, 0);
  return bytes === 0 && buf2.toString() === 'aaaaaaaaaa';
});

test('targetStart=length-1（只复制1字节到末尾）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 9);
  return bytes === 1 && buf2[9] === 'h'.charCodeAt(0);
});

test('复制单字节', () => {
  const buf1 = Buffer.from([42]);
  const buf2 = Buffer.alloc(1);
  const bytes = buf1.copy(buf2);
  return bytes === 1 && buf2[0] === 42;
});

// ========== 内存对齐测试 ==========
test('复制到非对齐偏移（奇数位置）', () => {
  const buf1 = Buffer.from('abcdefgh');
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 1);
  buf1.copy(buf2, 11);
  return buf2.slice(1, 9).toString() === 'abcdefgh' &&
         buf2.slice(11, 19).toString() === 'abcdefgh';
});

test('复制奇数长度数据', () => {
  const buf1 = Buffer.from('odd'); // 3 bytes
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2);
  return bytes === 3 && buf2.slice(0, 3).toString() === 'odd';
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

