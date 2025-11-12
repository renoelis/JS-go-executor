// buffer.isUtf8() - Part 15: Additional Edge Cases (查缺补漏)
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 1. 测试 Buffer.isUtf8 作为静态方法（如果存在）
test('Buffer.isUtf8 静态方法 - 有效 UTF-8', () => {
  if (typeof Buffer.isUtf8 === 'function') {
    const buf = Buffer.from('Hello', 'utf8');
    return Buffer.isUtf8(buf) === true;
  }
  return true; // 如果不存在则跳过
});

test('Buffer.isUtf8 静态方法 - 无效 UTF-8', () => {
  if (typeof Buffer.isUtf8 === 'function') {
    const buf = Buffer.from([0x80, 0x80]);
    return Buffer.isUtf8(buf) === false;
  }
  return true;
});

// 2. 测试非标准但可能存在的输入
test('Buffer 原型污染防护', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const originalProto = Object.getPrototypeOf(buf);
  try {
    // 尝试访问但不修改原型
    const result = isUtf8(buf);
    return result === true;
  } finally {
    // 确保原型未被修改
    if (Object.getPrototypeOf(buf) !== originalProto) {
      throw new Error('Prototype was modified');
    }
  }
});

// 3. 测试冻结和密封的 Buffer（在 Node.js v25 中不支持）
test('Object.freeze 后的 Buffer', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    Object.freeze(buf);
    return isUtf8(buf) === true;
  } catch (e) {
    // 某些 Node 版本不允许冻结 Buffer
    return e.message.includes('freeze') || e.message.includes('array buffer');
  }
});

test('Object.seal 后的 Buffer', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    Object.seal(buf);
    return isUtf8(buf) === true;
  } catch (e) {
    // 某些 Node 版本不允许密封 Buffer
    return e.message.includes('seal') || e.message.includes('array buffer');
  }
});

test('Object.preventExtensions 后的 Buffer', () => {
  const buf = Buffer.from('Hello', 'utf8');
  Object.preventExtensions(buf);
  return isUtf8(buf) === true;
});

// 4. 测试带有额外属性的 Buffer
test('Buffer 带有自定义属性', () => {
  const buf = Buffer.from('Hello', 'utf8');
  buf.customProperty = 'test';
  return isUtf8(buf) === true;
});

test('Buffer 带有 Symbol 属性', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const sym = Symbol('test');
  buf[sym] = 'value';
  return isUtf8(buf) === true;
});

// 5. 测试 ArrayBuffer 的不同起始位置和长度
test('ArrayBuffer - byteOffset 非零', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab, 2, 5); // 从偏移 2 开始，长度 5
  view.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(view) === true;
});

test('ArrayBuffer - 完整 vs 部分视图', () => {
  const ab = new ArrayBuffer(10);
  const fullView = new Uint8Array(ab);
  fullView.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello" 在前 5 字节
  fullView.set([0x80, 0x80], 5); // 无效字节在后面

  const partialView = new Uint8Array(ab, 0, 5); // 只看前 5 字节
  return isUtf8(partialView) === true && isUtf8(fullView) === false;
});

// 6. 测试 TypedArray 的字节序（虽然 isUtf8 应该按字节处理）
test('TypedArray - 大端序 DataView', () => {
  const ab = new ArrayBuffer(2);
  const dv = new DataView(ab);
  dv.setUint16(0, 0x4865, false); // 大端序："He"
  const uint8 = new Uint8Array(ab);
  return isUtf8(uint8) === true;
});

test('TypedArray - 小端序 DataView', () => {
  const ab = new ArrayBuffer(2);
  const dv = new DataView(ab);
  dv.setUint16(0, 0x6548, true); // 小端序："He" (反转)
  const uint8 = new Uint8Array(ab);
  return isUtf8(uint8) === true;
});

// 7. 测试特殊的 UTF-8 序列组合
test('连续 BOM', () => {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const repeated = Buffer.concat([bom, bom, bom, bom, bom]);
  return isUtf8(repeated) === true;
});

test('BOM 在中间', () => {
  const text1 = Buffer.from('Hello', 'utf8');
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const text2 = Buffer.from('World', 'utf8');
  const combined = Buffer.concat([text1, bom, text2]);
  return isUtf8(combined) === true;
});

// 8. 测试所有有效的 2 字节起始 + 所有延续字节
test('2 字节序列 - 所有延续字节 0x80-0xBF', () => {
  for (let cont = 0x80; cont <= 0xBF; cont++) {
    const buf = Buffer.from([0xC2, cont]);
    if (isUtf8(buf) !== true) {
      return false;
    }
  }
  return true;
});

// 9. 测试边界附近的值
test('U+D7FF vs U+D800 边界', () => {
  const valid = Buffer.from([0xED, 0x9F, 0xBF]); // U+D7FF (有效)
  const invalid = Buffer.from([0xED, 0xA0, 0x80]); // U+D800 (代理对，无效)
  return isUtf8(valid) === true && isUtf8(invalid) === false;
});

test('U+DFFF vs U+E000 边界', () => {
  const invalid = Buffer.from([0xED, 0xBF, 0xBF]); // U+DFFF (代理对，无效)
  const valid = Buffer.from([0xEE, 0x80, 0x80]); // U+E000 (有效)
  return isUtf8(invalid) === false && isUtf8(valid) === true;
});

test('U+FFFF vs U+10000 边界', () => {
  const valid3 = Buffer.from([0xEF, 0xBF, 0xBF]); // U+FFFF (3字节最大)
  const valid4 = Buffer.from([0xF0, 0x90, 0x80, 0x80]); // U+10000 (4字节最小)
  return isUtf8(valid3) === true && isUtf8(valid4) === true;
});

test('U+10FFFF vs U+110000 边界', () => {
  const valid = Buffer.from([0xF4, 0x8F, 0xBF, 0xBF]); // U+10FFFF (最大有效)
  const invalid = Buffer.from([0xF4, 0x90, 0x80, 0x80]); // U+110000 (超出范围)
  return isUtf8(valid) === true && isUtf8(invalid) === false;
});

// 10. 测试修改标志位的影响
test('修饰符序列 - Emoji + VS16', () => {
  const buf = Buffer.from('☺️', 'utf8'); // ☺ + VS16 (文本 vs 表情变体)
  return isUtf8(buf) === true;
});

test('区域指示符单个', () => {
  const buf = Buffer.from('🇺', 'utf8'); // 单个区域指示符（不完整的国旗）
  return isUtf8(buf) === true; // 仍然是有效 UTF-8
});

// 11. 测试组合附加符号的边界
test('多个组合附加符号', () => {
  const buf = Buffer.from('e\u0301\u0302\u0303', 'utf8'); // e + 3个组合符号
  return isUtf8(buf) === true;
});

test('孤立的组合附加符号', () => {
  const buf = Buffer.from('\u0301', 'utf8'); // 单独的组合符号（无基字符）
  return isUtf8(buf) === true; // 仍然是有效 UTF-8
});

// 12. 测试特殊的控制序列
test('换行符所有变体', () => {
  const variants = [
    Buffer.from('\n', 'utf8'),      // LF
    Buffer.from('\r', 'utf8'),      // CR
    Buffer.from('\r\n', 'utf8'),    // CRLF
    Buffer.from('\u0085', 'utf8'),  // NEL
    Buffer.from('\u2028', 'utf8'),  // LS
    Buffer.from('\u2029', 'utf8')   // PS
  ];
  for (const buf of variants) {
    if (isUtf8(buf) !== true) {
      return false;
    }
  }
  return true;
});

// 13. 测试 Buffer 长度为奇数和偶数
test('奇数长度 Buffer - 有效 UTF-8', () => {
  const buf = Buffer.from('ABC', 'utf8'); // 3 字节
  return isUtf8(buf) === true;
});

test('偶数长度 Buffer - 有效 UTF-8', () => {
  const buf = Buffer.from('ABCD', 'utf8'); // 4 字节
  return isUtf8(buf) === true;
});

test('质数长度 Buffer - 有效 UTF-8', () => {
  const buf = Buffer.alloc(97, 0x41); // 97 字节（质数）
  return isUtf8(buf) === true;
});

// 14. 测试二进制零和有效 UTF-8 的边界
test('0x00 单独', () => {
  const buf = Buffer.from([0x00]);
  return isUtf8(buf) === true; // NULL 是有效的 UTF-8
});

test('多个 0x00', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return isUtf8(buf) === true;
});

test('0x00 和文本混合', () => {
  const buf = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6C]); // "H\0e\0l"
  return isUtf8(buf) === true;
});

// 15. 测试内存对齐的影响（虽然不应该有影响，但测试一下）
test('16 字节对齐的 Buffer', () => {
  const buf = Buffer.alloc(16, 0x41); // 16 字节
  return isUtf8(buf) === true;
});

test('32 字节对齐的 Buffer', () => {
  const buf = Buffer.alloc(32, 0x41); // 32 字节
  return isUtf8(buf) === true;
});

test('64 字节对齐的 Buffer', () => {
  const buf = Buffer.alloc(64, 0x41); // 64 字节
  return isUtf8(buf) === true;
});

// 16. 测试 Buffer.from 的所有变体
test('Buffer.from(string)', () => {
  const buf = Buffer.from('Hello');
  return isUtf8(buf) === true;
});

test('Buffer.from(string, encoding)', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf) === true;
});

test('Buffer.from(array)', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return isUtf8(buf) === true;
});

test('Buffer.from(buffer)', () => {
  const original = Buffer.from('Hello', 'utf8');
  const copy = Buffer.from(original);
  return isUtf8(copy) === true;
});

// 17. 测试返回值的类型和一致性
test('返回值必须是布尔值 - 有效输入', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const result = isUtf8(buf);
  return typeof result === 'boolean' && result === true;
});

test('返回值必须是布尔值 - 无效输入', () => {
  const buf = Buffer.from([0x80, 0x80]);
  const result = isUtf8(buf);
  return typeof result === 'boolean' && result === false;
});

test('相同输入多次调用返回相同结果', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const r1 = isUtf8(buf);
  const r2 = isUtf8(buf);
  const r3 = isUtf8(buf);
  return r1 === r2 && r2 === r3 && r1 === true;
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
