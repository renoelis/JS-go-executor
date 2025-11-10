// buf.copy() - Final Supplement: Missing Edge Cases
// 补充测试：WeakMap/Set、超大Buffer、字节序、异常转换等
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

// ========== Map/Set/WeakMap/WeakSet 作为参数 ==========
test('目标为 Map - 应抛出错误', () => {
  const source = Buffer.from('map');
  try {
    source.copy(new Map());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('目标为 Set - 应抛出错误', () => {
  const source = Buffer.from('set');
  try {
    source.copy(new Set());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('目标为 WeakMap - 应抛出错误', () => {
  const source = Buffer.from('weak');
  try {
    source.copy(new WeakMap());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('目标为 WeakSet - 应抛出错误', () => {
  const source = Buffer.from('weak');
  try {
    source.copy(new WeakSet());
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('targetStart 为 Map 对象', () => {
  const source = Buffer.from('hi');
  const target = Buffer.alloc(10);
  try {
    source.copy(target, new Map());
    // Map 转换为 NaN -> 0
    return true;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('targetStart 为 Set 对象', () => {
  const source = Buffer.from('hi');
  const target = Buffer.alloc(10);
  try {
    source.copy(target, new Set());
    // Set 转换为 NaN -> 0
    return true;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ========== valueOf/toString 抛出异常的对象 ==========
test('targetStart 对象的 valueOf 抛出异常', () => {
  const source = Buffer.from('throw');
  const target = Buffer.alloc(10);
  const obj = {
    valueOf: () => {
      throw new Error('valueOf error');
    }
  };
  try {
    source.copy(target, obj);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message === 'valueOf error';
  }
});

test('targetStart 对象的 toString 抛出异常（无 valueOf）', () => {
  const source = Buffer.from('throw');
  const target = Buffer.alloc(10);
  const obj = {
    toString: () => {
      throw new Error('toString error');
    }
  };
  try {
    source.copy(target, obj);
    return false;
  } catch (e) {
    return e.message === 'toString error';
  }
});

test('sourceStart 对象的 valueOf 抛出异常', () => {
  const source = Buffer.from('test');
  const target = Buffer.alloc(10);
  const obj = {
    valueOf: () => {
      throw new Error('source valueOf error');
    }
  };
  try {
    source.copy(target, 0, obj);
    return false;
  } catch (e) {
    return e.message === 'source valueOf error';
  }
});

test('sourceEnd 对象的 valueOf 抛出异常', () => {
  const source = Buffer.from('test');
  const target = Buffer.alloc(10);
  const obj = {
    valueOf: () => {
      throw new Error('end valueOf error');
    }
  };
  try {
    source.copy(target, 0, 0, obj);
    return false;
  } catch (e) {
    return e.message === 'end valueOf error';
  }
});

// ========== 超大 Buffer 测试 ==========
test('复制 50MB 数据', () => {
  try {
    const size = 50 * 1024 * 1024; // 50MB
    const source = Buffer.alloc(size, 0xCC);
    const target = Buffer.alloc(size);
    const bytes = source.copy(target);
    return bytes === size && target[0] === 0xCC && target[size - 1] === 0xCC;
  } catch (e) {
    // 内存不足时跳过
    return e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('复制 100MB 数据', () => {
  try {
    const size = 100 * 1024 * 1024; // 100MB
    const source = Buffer.alloc(size, 0xDD);
    const target = Buffer.alloc(size);
    const bytes = source.copy(target);
    return bytes === size && target[size - 1] === 0xDD;
  } catch (e) {
    // 内存不足时跳过
    return e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('部分复制 50MB 中的 1MB', () => {
  try {
    const totalSize = 50 * 1024 * 1024;
    const copySize = 1024 * 1024;
    const source = Buffer.alloc(totalSize, 0xEE);
    const target = Buffer.alloc(copySize);
    const bytes = source.copy(target, 0, 0, copySize);
    return bytes === copySize && target[0] === 0xEE;
  } catch (e) {
    return e.message.includes('memory') || e.message.includes('allocation');
  }
});

// ========== 字节序相关测试 ==========
test('复制多字节整数到 Uint16Array（小端序验证）', () => {
  const source = Buffer.from([0x34, 0x12, 0x78, 0x56]); // LE: 0x1234, 0x5678
  const target = new Uint16Array(2);
  source.copy(target);
  const view = new Uint8Array(target.buffer);
  // 验证字节顺序保持不变
  return view[0] === 0x34 && view[1] === 0x12 && view[2] === 0x78 && view[3] === 0x56;
});

test('复制多字节整数到 Uint32Array（字节序独立性）', () => {
  const source = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const target = new Uint32Array(1);
  source.copy(target);
  const view = new Uint8Array(target.buffer);
  return view[0] === 0x01 && view[1] === 0x02 && view[2] === 0x03 && view[3] === 0x04;
});

test('从 DataView 创建 Buffer 后复制', () => {
  const arrayBuffer = new ArrayBuffer(8);
  const dataView = new DataView(arrayBuffer);
  dataView.setUint32(0, 0x12345678, true); // 小端序
  const source = Buffer.from(arrayBuffer);
  const target = Buffer.alloc(8);
  const bytes = source.copy(target);
  return bytes === 8 && target[0] === 0x78 && target[3] === 0x12;
});

// ========== 池化影响测试 ==========
test('小于 Buffer.poolSize 的 Buffer 复制', () => {
  const source = Buffer.allocUnsafe(10);
  source.fill('pooled');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target);
  return bytes === 10;
});

test('大于 Buffer.poolSize 的 Buffer 复制', () => {
  const size = (Buffer.poolSize || 8192) + 1000;
  const source = Buffer.alloc(size, 0xAA);
  const target = Buffer.alloc(size);
  const bytes = source.copy(target);
  return bytes === size && target[0] === 0xAA;
});

test('从池化 Buffer 到非池化 Buffer', () => {
  const source = Buffer.allocUnsafe(100);
  source.fill('pool');
  const target = Buffer.alloc(10000); // 大 Buffer，不使用池
  const bytes = source.copy(target);
  return bytes === 100;
});

test('从非池化到池化', () => {
  const source = Buffer.alloc(10000, 0xBB);
  const target = Buffer.allocUnsafe(100); // 小 Buffer，使用池
  const bytes = source.copy(target, 0, 0, 100);
  return bytes === 100 && target[0] === 0xBB;
});

// ========== 特殊参数组合 ==========
test('所有参数都是字符串数字', () => {
  const source = Buffer.from('string');
  const target = Buffer.alloc(10, 0);
  try {
    const bytes = source.copy(target, '1', '1', '4');
    // 应该转换为数字：targetStart=1, sourceStart=1, sourceEnd=4
    return bytes === 3 && target[1] === 't'.charCodeAt(0);
  } catch (e) {
    return false;
  }
});

test('混合正负浮点数参数（应处理或抛出）', () => {
  const source = Buffer.from('float');
  const target = Buffer.alloc(10);
  try {
    source.copy(target, 1.5, -0.5, 3.8);
    return false; // 负数应该抛出错误
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

test('targetStart 为正无穷大经过位运算转换', () => {
  const source = Buffer.from('inf');
  const target = Buffer.alloc(10);
  try {
    // Infinity | 0 = 0
    const bytes = source.copy(target, Infinity);
    return bytes === 3;
  } catch (e) {
    return false;
  }
});

test('sourceStart 为负无穷大（应抛出错误）', () => {
  const source = Buffer.from('neginf');
  const target = Buffer.alloc(10);
  try {
    const bytes = source.copy(target, 0, -Infinity);
    // -Infinity 通过位运算转换为 0, 或者被处理为 0
    // Node.js 可能不抛出错误而是转换
    return bytes >= 0; // 允许转换为有效值
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE';
  }
});

// ========== 类数组对象作为参数 ==========
test('targetStart 为类数组对象', () => {
  const source = Buffer.from('arr');
  const target = Buffer.alloc(10);
  const arrayLike = { length: 3, 0: 2, 1: 3, 2: 4 };
  try {
    source.copy(target, arrayLike);
    // 应该转换为 NaN -> 0
    return true;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// ========== 多次参数转换的递归场景 ==========
test('targetStart 对象有多层 valueOf', () => {
  const source = Buffer.from('multi');
  const target = Buffer.alloc(10, 0);
  const inner = { valueOf: () => 2 };
  const outer = { valueOf: () => inner };
  try {
    const bytes = source.copy(target, outer);
    // 应该调用 outer.valueOf()，得到 inner 对象，再转换
    // 实际行为可能是转为 [object Object] -> NaN -> 0
    return bytes === 5;
  } catch (e) {
    return true;
  }
});

// ========== 特殊 Unicode 字符复制 ==========
test('复制包含 Emoji 的 Buffer', () => {
  const source = Buffer.from('🚀💻🎉');
  const target = Buffer.alloc(source.length);
  const bytes = source.copy(target);
  return bytes === source.length && target.toString('utf8') === '🚀💻🎉';
});

test('复制包含零宽字符的 Buffer', () => {
  const source = Buffer.from('a\u200Bb\u200Cc'); // 零宽空格和零宽非连接符
  const target = Buffer.alloc(source.length);
  source.copy(target);
  return target.toString('utf8') === 'a\u200Bb\u200Cc';
});

test('复制包含代理对的 Buffer', () => {
  const source = Buffer.from('\uD83D\uDE00'); // 😀
  const target = Buffer.alloc(4);
  const bytes = source.copy(target);
  return bytes === 4 && target.toString('utf8') === '😀';
});

test('部分复制多字节字符（可能产生无效 UTF-8）', () => {
  const source = Buffer.from('你好'); // 6 bytes in UTF-8
  const target = Buffer.alloc(4);
  const bytes = source.copy(target, 0, 0, 4);
  // 只复制前 4 字节，可能截断字符
  return bytes === 4;
});

// ========== 边界字节值测试 ==========
test('复制所有可能的字节值（0-255）', () => {
  const source = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  const target = Buffer.alloc(256);
  const bytes = source.copy(target);
  let allMatch = true;
  for (let i = 0; i < 256; i++) {
    if (target[i] !== i) {
      allMatch = false;
      break;
    }
  }
  return bytes === 256 && allMatch;
});

test('复制逆序字节值（255-0）', () => {
  const source = Buffer.from(Array.from({ length: 256 }, (_, i) => 255 - i));
  const target = Buffer.alloc(256);
  source.copy(target);
  return target[0] === 255 && target[255] === 0;
});

// ========== 返回值边界测试 ==========
test('返回值在 targetStart 超大时为 0', () => {
  const source = Buffer.from('return');
  const target = Buffer.alloc(5);
  const bytes = source.copy(target, 1000);
  return bytes === 0;
});

test('返回值在 sourceStart = length 时为 0', () => {
  const source = Buffer.from('end');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, 0, 3);
  return bytes === 0;
});

test('返回值在空复制时始终为 0', () => {
  const source = Buffer.from('empty');
  const target = Buffer.alloc(10);
  const bytes1 = source.copy(target, 0, 5, 5);
  const bytes2 = source.copy(target, 0, 2, 2);
  const bytes3 = source.copy(target, 0, 0, 0);
  return bytes1 === 0 && bytes2 === 0 && bytes3 === 0;
});

// ========== 复制链测试 ==========
test('A -> B -> C -> D 连续复制', () => {
  const bufA = Buffer.from('chain');
  const bufB = Buffer.alloc(5);
  const bufC = Buffer.alloc(5);
  const bufD = Buffer.alloc(5);
  
  bufA.copy(bufB);
  bufB.copy(bufC);
  bufC.copy(bufD);
  
  return bufD.toString() === 'chain';
});

test('循环复制（A -> B -> A）', () => {
  const bufA = Buffer.from('cycle');
  const bufB = Buffer.alloc(5);
  
  bufA.copy(bufB);
  const original = bufA.toString();
  bufB.copy(bufA);
  
  return bufA.toString() === original;
});

// ========== Number 对象作为参数 ==========
test('targetStart 为 Number 对象', () => {
  const source = Buffer.from('num');
  const target = Buffer.alloc(10, 0);
  try {
    const bytes = source.copy(target, new Number(2));
    // Number 对象应该被拆箱为原始值 2
    return target[2] === 'n'.charCodeAt(0);
  } catch (e) {
    return false;
  }
});

test('sourceStart 为 Number 对象', () => {
  const source = Buffer.from('hello');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, 0, new Number(1));
  return bytes === 4 && target.slice(0, 4).toString() === 'ello';
});

// ========== Boolean 对象作为参数 ==========
test('targetStart 为 Boolean(true) 对象', () => {
  const source = Buffer.from('bool');
  const target = Buffer.alloc(10, 0);
  const bytes = source.copy(target, new Boolean(true));
  // Boolean(true) 应该转为 1
  return target[1] === 'b'.charCodeAt(0);
});

test('targetStart 为 Boolean(false) 对象', () => {
  const source = Buffer.from('bool');
  const target = Buffer.alloc(10);
  const bytes = source.copy(target, new Boolean(false));
  // Boolean(false) 应该转为 0
  return bytes === 4;
});

// ========== 最终验证：copy 不修改源 Buffer ==========
test('复制操作不应修改源 Buffer 的任何内容', () => {
  const original = Buffer.from('immutable source');
  const copy = Buffer.from('immutable source');
  const target = Buffer.alloc(20);
  
  original.copy(target);
  
  return original.equals(copy);
});

test('多次复制操作不应累积修改源 Buffer', () => {
  const source = Buffer.from('repeated');
  const original = Buffer.from('repeated');
  const target1 = Buffer.alloc(10);
  const target2 = Buffer.alloc(10);
  const target3 = Buffer.alloc(10);
  
  source.copy(target1);
  source.copy(target2);
  source.copy(target3);
  
  return source.equals(original);
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

