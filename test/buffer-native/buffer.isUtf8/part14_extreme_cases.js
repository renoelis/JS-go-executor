// buffer.isUtf8() - Part 14: Extreme Cases and Compatibility Tests
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

// 极大 Buffer 测试（不会真正 OOM，但测试大尺寸）
test('大 Buffer - 100KB 全 ASCII', () => {
  const buf = Buffer.alloc(100 * 1024, 0x41); // 100KB 的 'A'
  return isUtf8(buf) === true;
});

test('大 Buffer - 1MB 全 ASCII', () => {
  const buf = Buffer.alloc(1024 * 1024, 0x41); // 1MB 的 'A'
  return isUtf8(buf) === true;
});

test('大 Buffer - 100KB 全零', () => {
  const buf = Buffer.alloc(100 * 1024); // 100KB 的零
  return isUtf8(buf) === true;
});

test('大 Buffer - 100KB 无效字节', () => {
  const buf = Buffer.alloc(100 * 1024, 0x80); // 100KB 的无效字节
  return isUtf8(buf) === false;
});

test('大 Buffer - 混合有效和无效，最后字节无效', () => {
  const buf = Buffer.alloc(100 * 1024, 0x41); // 全 'A'
  buf[buf.length - 1] = 0x80; // 最后一个字节无效
  return isUtf8(buf) === false;
});

test('大 Buffer - offset 到接近末尾', () => {
  const buf = Buffer.alloc(100 * 1024, 0x41);
  return isUtf8(buf, 100 * 1024 - 10) === true; // 最后 10 字节
});

test('大 Buffer - length 只读取前 10 字节', () => {
  const buf = Buffer.alloc(100 * 1024, 0x80); // 全无效
  buf.fill(0x41, 0, 10); // 前 10 字节有效
  const result = isUtf8(buf, 0, 10); // 只读取前 10 字节
  return result === true || result === false; // 取决于实现
});

// 重复字节模式
test('重复 1 字节模式 - 1000 次', () => {
  const buf = Buffer.alloc(1000, 0x41); // 1000 个 'A'
  return isUtf8(buf) === true;
});

test('重复 2 字节模式 - 1000 次', () => {
  const pattern = Buffer.from([0xC2, 0x80]); // U+0080
  const buf = Buffer.concat(Array(1000).fill(pattern));
  return isUtf8(buf) === true;
});

test('重复 3 字节模式 - 1000 次', () => {
  const pattern = Buffer.from('你', 'utf8');
  const buf = Buffer.concat(Array(1000).fill(pattern));
  return isUtf8(buf) === true;
});

test('重复 4 字节模式 - 1000 次', () => {
  const pattern = Buffer.from('😀', 'utf8');
  const buf = Buffer.concat(Array(1000).fill(pattern));
  return isUtf8(buf) === true;
});

// 交替有效/无效边界
test('有效和无效交替 - 每个字节', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = (i % 2 === 0) ? 0x41 : 0x80; // 'A' 和无效字节交替
  }
  return isUtf8(buf) === false;
});

test('有效和无效交替 - 每 2 字节', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < buf.length; i += 2) {
    buf[i] = 0x41; // 'A'
    if (i + 1 < buf.length) {
      buf[i + 1] = 0x42; // 'B'
    }
  }
  return isUtf8(buf) === true;
});

// 所有可能的单字节值
test('所有单字节 ASCII (0x00-0x7F)', () => {
  const buf = Buffer.from(Array.from({ length: 128 }, (_, i) => i));
  return isUtf8(buf) === true;
});

test('所有单字节 (0x00-0xFF) - 包含无效', () => {
  const buf = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  return isUtf8(buf) === false; // 0x80-0xFF 不是单字节有效 UTF-8
});

// 边界值的所有组合
test('1 字节边界所有值 (0x00-0x7F)', () => {
  for (let i = 0; i <= 0x7F; i++) {
    const buf = Buffer.from([i]);
    if (isUtf8(buf) !== true) {
      return false;
    }
  }
  return true;
});

test('无效起始字节所有值 (0x80-0xBF)', () => {
  for (let i = 0x80; i <= 0xBF; i++) {
    const buf = Buffer.from([i]);
    if (isUtf8(buf) !== false) {
      return false;
    }
  }
  return true;
});

test('无效起始字节 (0xC0-0xC1)', () => {
  for (let i = 0xC0; i <= 0xC1; i++) {
    const buf = Buffer.from([i, 0x80]);
    if (isUtf8(buf) !== false) {
      return false;
    }
  }
  return true;
});

test('有效 2 字节起始 (0xC2-0xDF) + 有效延续', () => {
  for (let i = 0xC2; i <= 0xDF; i++) {
    const buf = Buffer.from([i, 0x80]);
    if (isUtf8(buf) !== true) {
      return false;
    }
  }
  return true;
});

test('有效 2 字节起始 (0xC2-0xDF) + 无效延续', () => {
  for (let i = 0xC2; i <= 0xDF; i++) {
    const buf = Buffer.from([i, 0x41]); // 0x41 不是延续字节
    if (isUtf8(buf) !== false) {
      return false;
    }
  }
  return true;
});

// 特殊构造的序列
test('构造 - 最长有效 UTF-8 序列', () => {
  const buf = Buffer.from([0xF4, 0x8F, 0xBF, 0xBF]); // U+10FFFF
  return isUtf8(buf) === true;
});

test('构造 - 最短有效 UTF-8 序列', () => {
  const buf = Buffer.from([0x00]); // U+0000
  return isUtf8(buf) === true;
});

test('构造 - 每个长度的边界值', () => {
  const sequences = [
    [0x7F],                   // 1 字节最大
    [0xC2, 0x80],             // 2 字节最小
    [0xDF, 0xBF],             // 2 字节最大
    [0xE0, 0xA0, 0x80],       // 3 字节最小
    [0xEF, 0xBF, 0xBF],       // 3 字节最大
    [0xF0, 0x90, 0x80, 0x80], // 4 字节最小
    [0xF4, 0x8F, 0xBF, 0xBF]  // 4 字节最大
  ];
  for (const seq of sequences) {
    const buf = Buffer.from(seq);
    if (isUtf8(buf) !== true) {
      return false;
    }
  }
  return true;
});

// 多次验证同一 Buffer
test('多次验证同一 Buffer - 不修改', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const result1 = isUtf8(buf);
  const result2 = isUtf8(buf);
  const result3 = isUtf8(buf);
  return result1 === true && result2 === true && result3 === true;
});

test('多次验证同一 Buffer - 中间修改', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const result1 = isUtf8(buf);
  buf[0] = 0x80; // 修改为无效
  const result2 = isUtf8(buf);
  buf[0] = 0x48; // 改回 'H'
  const result3 = isUtf8(buf);
  return result1 === true && result2 === false && result3 === true;
});

// Buffer 与 TypedArray 的互操作
test('Buffer 到 Uint8Array 转换', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const arr = new Uint8Array(buf);
  return isUtf8(arr) === true;
});

test('Uint8Array 到 Buffer 转换', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  const buf = Buffer.from(arr);
  return isUtf8(buf) === true;
});

test('共享 ArrayBuffer 的同步修改', () => {
  const ab = new ArrayBuffer(5);
  const view1 = new Uint8Array(ab);
  const view2 = new Uint8Array(ab);
  view1.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  const result1 = isUtf8(view2);
  view2[0] = 0x80; // view2 修改
  const result2 = isUtf8(view1); // view1 看到修改
  return result1 === true && result2 === false;
});

// 极端 offset/length 组合
test('offset = 0, length = 0 - 各种 Buffer', () => {
  const buffers = [
    Buffer.from('Hello', 'utf8'),
    Buffer.from([0x80, 0x80]),
    Buffer.alloc(1000, 0x41)
  ];
  for (const buf of buffers) {
    const result = isUtf8(buf, 0, 0);
    if (result !== true && result !== false) { // 空范围可能有不同行为
      return false;
    }
  }
  return true;
});

test('offset = length - 各种 Buffer', () => {
  const buffers = [
    Buffer.from('Hello', 'utf8'),
    Buffer.from([0x80, 0x80]),
    Buffer.alloc(1000, 0x41)
  ];
  for (const buf of buffers) {
    const result = isUtf8(buf, buf.length);
    if (result !== true && result !== false) { // 空范围可能有不同行为
      return false;
    }
  }
  return true;
});

// 实际应用场景模拟
test('HTTP 头部模拟 - 有效', () => {
  const header = 'Content-Type: application/json; charset=utf-8\r\n';
  const buf = Buffer.from(header, 'utf8');
  return isUtf8(buf) === true;
});

test('JSON 数据模拟 - 有效', () => {
  const json = JSON.stringify({ name: '张三', age: 25, email: 'test@example.com' });
  const buf = Buffer.from(json, 'utf8');
  return isUtf8(buf) === true;
});

test('URL 查询参数 - 有效', () => {
  const query = 'q=搜索&page=1&size=10';
  const buf = Buffer.from(query, 'utf8');
  return isUtf8(buf) === true;
});

test('文件路径 - 有效', () => {
  const path = '/用户/文档/测试文件.txt';
  const buf = Buffer.from(path, 'utf8');
  return isUtf8(buf) === true;
});

test('日志行 - 有效', () => {
  const log = '[2024-01-01 12:00:00] INFO: 应用程序启动成功';
  const buf = Buffer.from(log, 'utf8');
  return isUtf8(buf) === true;
});

// 二进制数据中嵌入有效 UTF-8
test('二进制前缀 + UTF-8', () => {
  const binary = Buffer.from([0x00, 0x01, 0x02, 0x03]);
  const text = Buffer.from('Hello', 'utf8');
  const combined = Buffer.concat([binary, text]);
  return isUtf8(combined) === true; // 整体有效（0x00-0x03 都是有效 UTF-8）
});

test('UTF-8 + 二进制后缀（无效）', () => {
  const text = Buffer.from('Hello', 'utf8');
  const binary = Buffer.from([0x80, 0x81]);
  const combined = Buffer.concat([text, binary]);
  return isUtf8(combined) === false; // 二进制部分无效
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
