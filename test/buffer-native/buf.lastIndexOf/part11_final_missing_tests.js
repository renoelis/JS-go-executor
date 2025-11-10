// buf.lastIndexOf() - 最终补充测试（确保无死角覆盖）
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

// ArrayBuffer 视图测试
test('ArrayBuffer: 从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(20);
  const view = new Uint8Array(ab);
  view.set([104, 101, 108, 108, 111], 0); // 'hello'
  view.set([104, 101, 108, 108, 111], 10);
  const buf = Buffer.from(ab);
  return buf.lastIndexOf('hello') === 10;
});

test('ArrayBuffer: SharedArrayBuffer 支持', () => {
  try {
    const sab = new SharedArrayBuffer(20);
    const view = new Uint8Array(sab);
    view.set([116, 101, 115, 116], 0); // 'test'
    view.set([116, 101, 115, 116], 10);
    const buf = Buffer.from(sab);
    return buf.lastIndexOf('test') === 10;
  } catch (e) {
    // SharedArrayBuffer 可能不可用
    return true;
  }
});

// 字符串参数识别为 encoding 的边界情况
test('参数识别: 第二个参数是有效编码名', () => {
  const buf = Buffer.from('hello hello');
  // 'utf8' 作为第二个参数应该被识别为 encoding，byteOffset 使用默认值
  return buf.lastIndexOf('hello', 'utf8') === 6;
});

test('参数识别: 第二个参数是无效编码名', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf('test', 'invalid');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('参数识别: 三个参数都提供', () => {
  const buf = Buffer.from('abc abc abc');
  return buf.lastIndexOf('abc', 7, 'utf8') === 4;
});

// 搜索位置精确性测试
test('精确位置: 多个重叠匹配', () => {
  const buf = Buffer.from('aaaa');
  // 'aaa' 可以在位置 0 和 1 匹配，lastIndexOf 应该返回 1
  return buf.lastIndexOf('aaa') === 1;
});

test('精确位置: 字节序列部分重叠', () => {
  const buf = Buffer.from([1, 2, 1, 2, 1]);
  return buf.lastIndexOf(Buffer.from([1, 2, 1])) === 2;
});

test('精确位置: 在 byteOffset 边界', () => {
  const buf = Buffer.from('abcdefabcdef');
  // byteOffset = 6 刚好是第二个 'abc' 的开始位置
  return buf.lastIndexOf('abc', 6) === 6;
});

test('精确位置: byteOffset 在匹配中间', () => {
  const buf = Buffer.from('hello world hello');
  // byteOffset = 13 在第二个 'hello' 的中间（位置 12 开始的 'hello'）
  // lastIndexOf 从 byteOffset 向前搜索，可以找到位置 12 的 'hello'
  return buf.lastIndexOf('hello', 13) === 12;
});

// 编码边界情况补充
test('编码: ucs-2 别名', () => {
  const buf = Buffer.from('test test', 'ucs-2');
  return buf.lastIndexOf('test', undefined, 'ucs-2') === 10;
});

test('编码: binary 别名', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFF, 0xFE]);
  return buf.lastIndexOf('\xFF\xFE', undefined, 'binary') === 2;
});

// 数字转换的更多边界
test('数字转换: 0.1 转换为 0', () => {
  const buf = Buffer.from([0, 1, 2, 0, 3]);
  return buf.lastIndexOf(0.1) === 3;
});

test('数字转换: -0.1 转换为 0', () => {
  const buf = Buffer.from([0, 1, 0, 2]);
  return buf.lastIndexOf(-0.1) === 2;
});

test('数字转换: 256 转换为 0', () => {
  const buf = Buffer.from([0, 1, 2, 0]);
  return buf.lastIndexOf(256) === 3;
});

test('数字转换: 512 转换为 0', () => {
  const buf = Buffer.from([0, 1, 0, 2]);
  return buf.lastIndexOf(512) === 2;
});

test('数字转换: -256 转换为 0', () => {
  const buf = Buffer.from([0, 1, 2, 0]);
  return buf.lastIndexOf(-256) === 3;
});

// 空值的更多测试
test('空值: 空 Uint8Array', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf(new Uint8Array(0)) === 4;
});

test('空值: 空字符串 with 负 offset', () => {
  const buf = Buffer.from('hello');
  // -2 相当于 5 - 2 = 3
  return buf.lastIndexOf('', -2) === 3;
});

test('空值: 空 Buffer with 负 offset', () => {
  const buf = Buffer.from('world');
  return buf.lastIndexOf(Buffer.alloc(0), -1) === 4;
});

// byteOffset 边界的更多测试
test('byteOffset: 浮点数 0.9', () => {
  const buf = Buffer.from('abc abc');
  // 0.9 转换为 0
  return buf.lastIndexOf('abc', 0.9) === 0;
});

test('byteOffset: 浮点数 -0.9', () => {
  const buf = Buffer.from('test');
  // -0.9 转换为 0
  return buf.lastIndexOf('test', -0.9) === 0;
});

test('byteOffset: 1.5', () => {
  const buf = Buffer.from('abcabc');
  // 1.5 转换为 1
  return buf.lastIndexOf('abc', 1.5) === 0;
});

// 特殊 Buffer 构造方式
test('Buffer.concat: 连接后的 Buffer', () => {
  const buf1 = Buffer.from('hello ');
  const buf2 = Buffer.from('world ');
  const buf3 = Buffer.from('hello');
  const buf = Buffer.concat([buf1, buf2, buf3]);
  return buf.lastIndexOf('hello') === 12;
});

test('Buffer.allocUnsafeSlow: 慢分配的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.write('test', 0);
  buf.write('test', 10);
  return buf.lastIndexOf('test') === 10;
});

// 多字节字符的更多测试
test('多字节: 日文字符', () => {
  const buf = Buffer.from('こんにちは こんにちは');
  return buf.lastIndexOf('こんにちは') === 16;
});

test('多字节: 韩文字符', () => {
  const buf = Buffer.from('안녕하세요 안녕하세요');
  return buf.lastIndexOf('안녕하세요') === 16;
});

test('多字节: 混合语言', () => {
  const buf = Buffer.from('Hello 你好 World 你好');
  return buf.lastIndexOf('你好') === 19;
});

// 特殊字节序列
test('特殊字节: BOM 标记', () => {
  const buf = Buffer.from([0xEF, 0xBB, 0xBF, 0x61, 0xEF, 0xBB, 0xBF]);
  return buf.lastIndexOf(Buffer.from([0xEF, 0xBB, 0xBF])) === 4;
});

test('特殊字节: 全 0xFF', () => {
  const buf = Buffer.alloc(10, 0xFF);
  return buf.lastIndexOf(0xFF) === 9;
});

test('特殊字节: 交替 0x00 和 0xFF', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF]);
  return buf.lastIndexOf(Buffer.from([0x00, 0xFF])) === 4;
});

// 性能相关的边界
test('性能: 搜索值在开头', () => {
  const buf = Buffer.alloc(1000);
  buf.write('target', 0);
  const start = Date.now();
  const result = buf.lastIndexOf('target');
  const duration = Date.now() - start;
  return result === 0 && duration < 50;
});

test('性能: 单字节重复搜索', () => {
  const buf = Buffer.alloc(1000, 65); // 全是 'A'
  const start = Date.now();
  const result = buf.lastIndexOf(65);
  const duration = Date.now() - start;
  return result === 999 && duration < 50;
});

// 与 indexOf 的对称性测试
test('对称性: 单个匹配时结果相同', () => {
  const buf = Buffer.from('unique string');
  return buf.indexOf('unique') === buf.lastIndexOf('unique');
});

test('对称性: 空 Buffer 行为一致', () => {
  const buf = Buffer.alloc(0);
  const idx = buf.indexOf('test');
  const lastIdx = buf.lastIndexOf('test');
  return idx === -1 && lastIdx === -1;
});

test('对称性: 未找到时都返回 -1', () => {
  const buf = Buffer.from('test');
  return buf.indexOf('notfound') === -1 && buf.lastIndexOf('notfound') === -1;
});

// 编码转换的完整性
test('编码完整: utf-8 别名', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', undefined, 'utf-8') === 5;
});

test('编码完整: UTF-8 大写', () => {
  const buf = Buffer.from('hello hello');
  return buf.lastIndexOf('hello', undefined, 'UTF-8') === 6;
});

// 极端 byteOffset 值
test('极端 offset: 2^31 - 1', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', 2147483647) === 5;
});

test('极端 offset: -(2^31)', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('test', -2147483648) === -1;
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
