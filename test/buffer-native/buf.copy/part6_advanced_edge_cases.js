// buf.copy() - Advanced Edge Cases and Deep Validation
// 补充高级边界情况和深度验证测试
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

// ========== 错误类型精确验证 ==========
test('目标为 null 应抛出 TypeError 且包含正确信息', () => {
  const buf = Buffer.from('test');
  try {
    buf.copy(null);
    return false;
  } catch (e) {
    return e instanceof TypeError && 
           e.name === 'TypeError' &&
           (e.message.includes('target') || e.message.includes('argument'));
  }
});

test('目标为 undefined 应抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.copy(undefined);
    return false;
  } catch (e) {
    return e instanceof TypeError && e.name === 'TypeError';
  }
});

test('目标为普通对象应抛出 TypeError', () => {
  const buf = Buffer.from('test');
  try {
    buf.copy({ length: 10 });
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ========== sourceEnd < sourceStart 的更多组合 ==========
test('sourceEnd < sourceStart (具体值: 1 < 5)', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.alloc(20);
  const bytes = buf1.copy(buf2, 0, 5, 1);
  return bytes === 0;
});

test('sourceEnd < sourceStart (负差值)', () => {
  const buf1 = Buffer.from('abcdefgh');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 7, 2);
  return bytes === 0;
});

test('sourceEnd = sourceStart (中间位置)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10, 0x61);
  const bytes = buf1.copy(buf2, 0, 2, 2);
  return bytes === 0 && buf2.toString() === 'aaaaaaaaaa';
});

// ========== 参数转换的极端场景 ==========
test('targetStart 为含 toString 的对象', () => {
  const buf1 = Buffer.from('ab');
  const buf2 = Buffer.alloc(10, 0);
  const obj = {
    toString: () => '2',
    valueOf: () => 3
  };
  const bytes = buf1.copy(buf2, obj);
  // valueOf 优先于 toString
  return buf2[3] === 97; // 'a' = 97
});

test('sourceStart 为含 valueOf 返回负数的对象（应抛出错误）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const obj = { valueOf: () => -5 };
  try {
    buf1.copy(buf2, 0, obj);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('targetStart 为空字符串', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, '');
  // 空字符串转换为 NaN -> 0
  return bytes === 2 && buf2.slice(0, 2).toString() === 'hi';
});

test('targetStart 为多元素数组', () => {
  const buf1 = Buffer.from('hi');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, [1, 2, 3]);
  // [1,2,3] 转为字符串 "1,2,3" -> NaN -> 0
  return bytes === 2;
});

// ========== 混合 TypedArray 视图测试 ==========
test('从 Buffer 复制到跨越边界的 Uint8Array 视图', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arrayBuffer = new ArrayBuffer(10);
  const view = new Uint8Array(arrayBuffer, 3, 5); // 从第3字节开始，5字节长
  const bytes = buf.copy(view, 0);
  const fullView = new Uint8Array(arrayBuffer);
  return bytes === 5 && fullView[3] === 1 && fullView[7] === 5;
});

test('复制到 Uint32Array 的非对齐位置', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const target = new Uint32Array(2); // 8 bytes
  const bytes = buf.copy(target, 1); // 从字节偏移 1 开始
  return bytes === 4; // 应该能复制 4 字节
});

test('复制到 Int8Array 负数值处理', () => {
  const buf = Buffer.from([0x80, 0xFF, 0x01, 0x7F]); // -128, -1, 1, 127 in signed
  const target = new Int8Array(4);
  buf.copy(target);
  return target[0] === -128 && target[1] === -1 && target[2] === 1 && target[3] === 127;
});

// ========== 零长度和单字节组合 ==========
test('1字节源复制到0字节目标', () => {
  const buf1 = Buffer.from([42]);
  const buf2 = Buffer.alloc(0);
  const bytes = buf1.copy(buf2);
  return bytes === 0;
});

test('0字节源复制到1字节目标', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.from([99]);
  const bytes = buf1.copy(buf2);
  return bytes === 0 && buf2[0] === 99; // 目标不变
});

test('单字节复制到单字节', () => {
  const buf1 = Buffer.from([65]); // 'A'
  const buf2 = Buffer.from([66]); // 'B'
  const bytes = buf1.copy(buf2);
  return bytes === 1 && buf2[0] === 65;
});

// ========== 大范围复制的精确验证 ==========
test('复制时 sourceEnd 远大于 length（验证自动截断）', () => {
  const buf1 = Buffer.from('short');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 0, 999999);
  return bytes === 5 && buf2.slice(0, 5).toString() === 'short';
});

test('targetStart + 源长度超出目标长度（验证截断）', () => {
  const buf1 = Buffer.from('12345678');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 5); // 从位置5开始，只能放5字节
  return bytes === 5 && buf2.slice(5, 10).toString() === '12345';
});

test('部分复制导致目标末尾不被修改', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.alloc(10, 0xFF);
  buf1.copy(buf2, 0);
  // 验证只有前3字节被修改，后面仍是 0xFF
  return buf2.slice(0, 3).toString() === 'abc' && 
         buf2[3] === 0xFF && buf2[9] === 0xFF;
});

// ========== 自身重叠的极端情况 ==========
test('自身复制 - 完全相同区域（无效复制）', () => {
  const buf = Buffer.from('test');
  const bytes = buf.copy(buf, 0, 0, 4);
  // 复制自己到自己应该保持不变
  return bytes === 4 && buf.toString() === 'test';
});

test('自身复制 - 单字节右移', () => {
  const buf = Buffer.from('abcd');
  buf.copy(buf, 1, 0, 1); // 复制第0字节到第1字节
  return buf.toString() === 'aacd';
});

test('自身复制 - 单字节左移', () => {
  const buf = Buffer.from('abcd');
  buf.copy(buf, 0, 1, 2); // 复制第1字节到第0字节
  return buf.toString() === 'bbcd'; // 只有第0字节被修改为 'b'
});

test('自身复制 - 大范围向右移动', () => {
  const buf = Buffer.from('0123456789');
  buf.copy(buf, 5, 0, 5); // 将前5字节复制到位置5-9
  return buf.toString() === '0123401234';
});

test('自身复制 - 大范围向左移动', () => {
  const buf = Buffer.from('0123456789');
  buf.copy(buf, 0, 5, 10); // 将后5字节复制到位置0-4
  return buf.toString() === '5678956789';
});

// ========== 连续复制到同一位置（覆盖测试）==========
test('多次复制到同一目标位置', () => {
  const buf1 = Buffer.from('AAA');
  const buf2 = Buffer.from('BBB');
  const buf3 = Buffer.from('CCC');
  const target = Buffer.alloc(10, 0);
  
  buf1.copy(target, 0);
  buf2.copy(target, 0); // 覆盖
  buf3.copy(target, 0); // 再次覆盖
  
  return target.slice(0, 3).toString() === 'CCC';
});

test('部分重叠连续复制', () => {
  const buf1 = Buffer.from('1234');
  const buf2 = Buffer.from('5678');
  const target = Buffer.alloc(10, 0);
  
  buf1.copy(target, 0);
  buf2.copy(target, 2); // 部分覆盖
  
  return target.slice(0, 6).toString() === '125678';
});

// ========== 特殊编码和字符测试 ==========
test('包含 NULL 字节的数据复制', () => {
  const buf1 = Buffer.from([65, 0, 66, 0, 67]); // A\0B\0C
  const buf2 = Buffer.alloc(5);
  buf1.copy(buf2);
  return buf2[0] === 65 && buf2[1] === 0 && buf2[4] === 67;
});

test('全部为 NULL 字节', () => {
  const buf1 = Buffer.alloc(10, 0);
  const buf2 = Buffer.alloc(10, 0xFF);
  buf1.copy(buf2);
  return buf2.every(b => b === 0);
});

test('混合 ASCII 和高位字节', () => {
  const buf1 = Buffer.from([0x41, 0x80, 0xFF, 0x00, 0x7F]);
  const buf2 = Buffer.alloc(5);
  buf1.copy(buf2);
  return buf2[0] === 0x41 && buf2[1] === 0x80 && buf2[2] === 0xFF;
});

// ========== 参数边界的组合测试 ==========
test('所有参数都是最大安全整数', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.alloc(10);
  try {
    buf1.copy(buf2, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    return false; // 应该抛出错误或复制0字节
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('targetStart=0, sourceStart=length-1, sourceEnd=length', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 4, 5); // 只复制最后1字节 'o'
  return bytes === 1 && buf2[0] === 'o'.charCodeAt(0);
});

test('targetStart=length-1, sourceStart=0, sourceEnd=1', () => {
  const buf1 = Buffer.from('A');
  const buf2 = Buffer.alloc(5);
  const bytes = buf1.copy(buf2, 4, 0, 1);
  return bytes === 1 && buf2[4] === 65;
});

// ========== 性能稳定性测试 ==========
test('连续复制不同大小的数据 100 次', () => {
  const sizes = [1, 10, 100, 1000];
  for (let i = 0; i < 100; i++) {
    const size = sizes[i % sizes.length];
    const buf1 = Buffer.alloc(size, i % 256);
    const buf2 = Buffer.alloc(size);
    buf1.copy(buf2);
    if (!buf1.equals(buf2)) return false;
  }
  return true;
});

test('交替复制和验证', () => {
  const buf1 = Buffer.from('original');
  const buf2 = Buffer.alloc(8);
  const buf3 = Buffer.alloc(8);
  
  buf1.copy(buf2);
  if (buf2.toString() !== 'original') return false;
  
  buf2.copy(buf3);
  if (buf3.toString() !== 'original') return false;
  
  buf3.copy(buf1);
  return buf1.toString() === 'original';
});

// ========== TypedArray 字节序和位宽测试 ==========
test('复制到 Uint16Array 并验证字节序', () => {
  const buf = Buffer.from([0x01, 0x00, 0x02, 0x00]); // little-endian: 1, 2
  const target = new Uint16Array(2);
  buf.copy(target);
  // 验证字节被正确复制（不考虑解释）
  const targetAsBuffer = Buffer.from(target.buffer);
  return targetAsBuffer[0] === 0x01 && targetAsBuffer[2] === 0x02;
});

test('复制4字节到 Float32Array', () => {
  // IEEE 754: 0x3F800000 = 1.0
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F]);
  const target = new Float32Array(1);
  buf.copy(target);
  // 验证字节复制正确（不验证浮点解释）
  const check = Buffer.from(target.buffer);
  return check[0] === 0x00 && check[3] === 0x3F;
});

// ========== 特殊 valueOf 转换 ==========
test('targetStart valueOf 返回浮点数', () => {
  const buf1 = Buffer.from('xy');
  const buf2 = Buffer.alloc(10, 0);
  const obj = { valueOf: () => 2.8 };
  buf1.copy(buf2, obj);
  // 应向下取整为 2
  return buf2[2] === 'x'.charCodeAt(0) && buf2[3] === 'y'.charCodeAt(0);
});

test('sourceStart valueOf 返回字符串数字', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const obj = { valueOf: () => '2' };
  const bytes = buf1.copy(buf2, 0, obj);
  // '2' 应转为 2
  return bytes === 3 && buf2.slice(0, 3).toString() === 'llo';
});

// ========== 复制后独立性验证 ==========
test('复制后修改源不影响目标', () => {
  const buf1 = Buffer.from('original');
  const buf2 = Buffer.alloc(8);
  buf1.copy(buf2);
  buf1.fill('X');
  return buf2.toString() === 'original' && buf1.toString() === 'XXXXXXXX';
});

test('复制后修改目标不影响源', () => {
  const buf1 = Buffer.from('source');
  const buf2 = Buffer.alloc(6);
  buf1.copy(buf2);
  buf2.fill('Y');
  return buf1.toString() === 'source' && buf2.toString() === 'YYYYYY';
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

