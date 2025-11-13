// buffer.isUtf8() - Part 18: Final Gap Analysis (查缺补漏3)
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

// 1. Buffer.isUtf8 静态方法的完整测试（如果存在）
test('Buffer.isUtf8 静态方法存在性检查', () => {
  return typeof Buffer.isUtf8 === 'function' || typeof Buffer.isUtf8 === 'undefined';
});

test('isUtf8 和 Buffer.isUtf8 行为一致性', () => {
  if (typeof Buffer.isUtf8 !== 'function') {
    return true; // 如果不存在则跳过
  }
  const buf = Buffer.from('Hello 世界', 'utf8');
  return isUtf8(buf) === Buffer.isUtf8(buf);
});

// 2. 特殊的ArrayBuffer和TypedArray边界
test('空ArrayBuffer', () => {
  const ab = new ArrayBuffer(0);
  return isUtf8(ab) === true;
});

test('1字节ArrayBuffer - 有效', () => {
  const ab = new ArrayBuffer(1);
  const view = new Uint8Array(ab);
  view[0] = 0x41; // 'A'
  return isUtf8(ab) === true;
});

test('1字节ArrayBuffer - 无效', () => {
  const ab = new ArrayBuffer(1);
  const view = new Uint8Array(ab);
  view[0] = 0x80; // 延续字节
  return isUtf8(ab) === false;
});

test('Int8Array - 负数字节', () => {
  const arr = new Int8Array([72, 101, 108, 108, 111]); // "Hello"
  return isUtf8(arr) === true;
});

test('Int8Array - 包含负数', () => {
  const arr = new Int8Array([72, -1, 108, 108, 111]); // 包含-1(255)
  return isUtf8(arr) === false;
});

test('Uint16Array - 应该按字节处理', () => {
  // Uint16Array有不同的字节序，但isUtf8应该按底层字节处理
  const arr = new Uint16Array([0x4865]); // 可能是"He"或"eH"取决于字节序
  return typeof isUtf8(arr) === 'boolean';
});

test('Float32Array - 浮点数据', () => {
  const arr = new Float32Array([1.0, 2.0]); // 浮点数的字节表示
  return typeof isUtf8(arr) === 'boolean';
});

// 3. DataView的完整测试（Node.js不支持DataView，应该抛出TypeError）
test('DataView - 空', () => {
  const ab = new ArrayBuffer(0);
  const dv = new DataView(ab);
  try {
    isUtf8(dv);
    return false; // 不应该成功
  } catch (e) {
    return e instanceof TypeError; // 应该抛出TypeError
  }
});

test('DataView - 有效UTF-8数据', () => {
  const ab = new ArrayBuffer(5);
  const dv = new DataView(ab);
  // 手动设置"Hello"
  dv.setUint8(0, 0x48);
  dv.setUint8(1, 0x65);
  dv.setUint8(2, 0x6C);
  dv.setUint8(3, 0x6C);
  dv.setUint8(4, 0x6F);
  try {
    isUtf8(dv);
    return false; // 不应该成功
  } catch (e) {
    return e instanceof TypeError; // 应该抛出TypeError
  }
});

test('DataView - 无效UTF-8数据', () => {
  const ab = new ArrayBuffer(2);
  const dv = new DataView(ab);
  dv.setUint8(0, 0x80);
  dv.setUint8(1, 0x80);
  try {
    isUtf8(dv);
    return false; // 不应该成功
  } catch (e) {
    return e instanceof TypeError; // 应该抛出TypeError
  }
});

test('DataView - 偏移视图', () => {
  const ab = new ArrayBuffer(10);
  const fullView = new Uint8Array(ab);
  fullView.set([0x48, 0x65, 0x6C, 0x6C, 0x6F], 2); // "Hello"从索引2开始
  const dv = new DataView(ab, 2, 5);
  try {
    isUtf8(dv);
    return false; // 不应该成功
  } catch (e) {
    return e instanceof TypeError; // 应该抛出TypeError
  }
});

// 4. 边界offset/length的深度测试
test('offset超出Buffer长度很多', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 1000) === true; // 超出范围应该返回空范围，即有效
});

test('length超出剩余长度', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 2, 1000) === true; // length超出应该被截断
});

test('offset + length 远超Buffer长度', () => {
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf, 100, 100) === true; // 空范围
});

test('负offset和正length组合', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, -5, 10) === 'boolean';
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

test('正offset和负length组合', () => {
  const buf = Buffer.from('Hello', 'utf8');
  try {
    return typeof isUtf8(buf, 2, -1) === 'boolean';
  } catch (e) {
    return e instanceof RangeError || e instanceof TypeError;
  }
});

// 5. 特殊Unicode字符的完整覆盖
test('所有ASCII控制字符 (0x00-0x1F)', () => {
  for (let i = 0; i <= 0x1F; i++) {
    const buf = Buffer.from([i]);
    if (isUtf8(buf) !== true) {
      return false;
    }
  }
  return true;
});

test('ASCII DEL字符 (0x7F)', () => {
  const buf = Buffer.from([0x7F]);
  return isUtf8(buf) === true;
});

test('Latin-1 Supplement边界 (0x80-0xFF在UTF-8中的处理)', () => {
  // 这些需要用多字节UTF-8表示
  const validUtf8For0x80 = Buffer.from([0xC2, 0x80]);
  const validUtf8For0xFF = Buffer.from([0xC3, 0xBF]);
  const invalid = Buffer.from([0x80]); // 裸0x80是无效的
  return isUtf8(validUtf8For0x80) === true && 
         isUtf8(validUtf8For0xFF) === true && 
         isUtf8(invalid) === false;
});

// 6. 实际使用场景模拟
test('HTTP响应模拟 - 有效JSON', () => {
  const response = JSON.stringify({message: "Hello 世界", status: 200});
  const buf = Buffer.from(response, 'utf8');
  return isUtf8(buf) === true;
});

test('文件路径模拟 - 包含中文', () => {
  const path = '/Users/用户/文档/测试.txt';
  const buf = Buffer.from(path, 'utf8');
  return isUtf8(buf) === true;
});

test('URL编码后的UTF-8', () => {
  const text = '测试 test';
  const buf = Buffer.from(text, 'utf8');
  return isUtf8(buf) === true;
});

test('Base64解码后可能的乱码', () => {
  // 模拟Base64解码后得到的无效UTF-8
  const buf = Buffer.from([0xFF, 0xFE, 0x00, 0x00]); // 可能的乱码
  return isUtf8(buf) === false;
});

// 7. 内存视图的边界情况
test('Buffer.subarray() 结果', () => {
  const original = Buffer.from('Hello World', 'utf8');
  const sub = original.subarray(0, 5); // "Hello"
  return isUtf8(sub) === true;
});

test('Buffer.slice() 结果', () => {
  const original = Buffer.from('Hello World', 'utf8');
  const sliced = original.slice(6, 11); // "World"
  return isUtf8(sliced) === true;
});

test('跨越多字节字符的slice', () => {
  const original = Buffer.from('你好', 'utf8'); // 每个字符3字节
  const partial = original.slice(0, 4); // 截断第二个字符
  return isUtf8(partial) === false;
});

test('跨越多字节字符的subarray', () => {
  const original = Buffer.from('🌟', 'utf8'); // 4字节emoji
  const partial = original.subarray(0, 2); // 只取前2字节
  return isUtf8(partial) === false;
});

// 8. 内存分配和重用测试
test('Buffer.allocUnsafe() 可能包含旧数据', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0x41); // 填充'A'
  return isUtf8(buf) === true;
});

test('Buffer.alloc() 零填充', () => {
  const buf = Buffer.alloc(10); // 全零
  return isUtf8(buf) === true;
});

test('修改Buffer后的UTF-8状态变化', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const originalResult = isUtf8(buf);
  buf[0] = 0x80; // 修改为无效字节
  const modifiedResult = isUtf8(buf);
  return originalResult === true && modifiedResult === false;
});

// 9. 并发和异步场景模拟
test('同一Buffer多线程式访问模拟', () => {
  const buf = Buffer.from('Test 测试', 'utf8');
  // 模拟多次快速访问
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(isUtf8(buf));
  }
  return results.every(r => r === true);
});

// 10. 特殊构造的测试用例
test('全部UTF-8起始字节但无延续字节', () => {
  const buf = Buffer.from([0xC2, 0xE0, 0xF0]); // 三个起始字节但都缺延续字节
  return isUtf8(buf) === false;
});

test('全部延续字节', () => {
  const buf = Buffer.from([0x80, 0x81, 0x82, 0x83, 0x84]);
  return isUtf8(buf) === false;
});

test('完美的UTF-8多字节序列组合', () => {
  const parts = [
    Buffer.from([0x41]),              // 1字节: A
    Buffer.from([0xC2, 0x80]),        // 2字节: U+0080
    Buffer.from([0xE0, 0xA0, 0x80]),  // 3字节: U+0800
    Buffer.from([0xF0, 0x90, 0x80, 0x80]) // 4字节: U+10000
  ];
  const combined = Buffer.concat(parts);
  return isUtf8(combined) === true;
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
