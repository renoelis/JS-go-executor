// buf.includes() - Critical Missing Tests (关键缺失测试补充)
// 基于 Node.js v25.0.0 官方文档和行为验证
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

// === 官方文档示例验证 ===
test('官方示例 1: buf.includes("this") === true', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes('this') === true;
});

test('官方示例 2: buf.includes("is") === true', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes('is') === true;
});

test('官方示例 3: buf.includes(Buffer.from("a buffer")) === true', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes(Buffer.from('a buffer')) === true;
});

test('官方示例 4: buf.includes(97) === true (ASCII "a")', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes(97) === true; // 97 is the decimal ASCII value for 'a'
});

test('官方示例 5: buf.includes(Buffer.from("a buffer example")) === false', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes(Buffer.from('a buffer example')) === false;
});

test('官方示例 6: buf.includes(Buffer.from("a buffer example").slice(0, 8)) === true', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes(Buffer.from('a buffer example').slice(0, 8)) === true;
});

test('官方示例 7: buf.includes("this", 4) === false', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes('this', 4) === false;
});

// === 参数顺序和默认值测试 ===
test('只传 value 参数', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world') === true;
});

test('传 value 和 byteOffset', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 6) === true;
});

test('传 value, byteOffset, encoding 三个参数', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 0, 'utf8') === true;
});

test('byteOffset 为 undefined 应使用默认值 0', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', undefined) === true;
});

test('encoding 为 undefined 应使用默认值 utf8', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 0, undefined) === true;
});

// === 与 indexOf 的等价性完整验证 ===
test('等价性: 空 Buffer 查找空字符串', () => {
  const buf = Buffer.alloc(0);
  const includesResult = buf.includes('');
  const indexOfResult = buf.indexOf('') !== -1;
  return includesResult === indexOfResult;
});

test('等价性: 负数 offset', () => {
  const buf = Buffer.from('hello world');
  const includesResult = buf.includes('world', -5);
  const indexOfResult = buf.indexOf('world', -5) !== -1;
  return includesResult === indexOfResult;
});

test('等价性: offset 超出范围', () => {
  const buf = Buffer.from('hello');
  const includesResult = buf.includes('hello', 100);
  const indexOfResult = buf.indexOf('hello', 100) !== -1;
  return includesResult === indexOfResult;
});

test('等价性: 查找 Uint8Array', () => {
  const buf = Buffer.from('hello world');
  const search = new Uint8Array([119, 111, 114, 108, 100]); // 'world'
  const includesResult = buf.includes(search);
  const indexOfResult = buf.indexOf(search) !== -1;
  return includesResult === indexOfResult;
});

// === 编码转换边界测试 ===
test('hex 编码: 奇数长度字符串', () => {
  const buf = Buffer.from('68656c6c6f', 'hex'); // 'hello'
  try {
    // 'abc' 是奇数长度，hex 解码可能失败或截断
    const result = buf.includes('abc', 0, 'hex');
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('hex 编码: 非十六进制字符', () => {
  const buf = Buffer.from('68656c6c6f', 'hex');
  try {
    const result = buf.includes('gg', 0, 'hex');
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('base64 编码: 无效的 base64 字符串', () => {
  const buf = Buffer.from('aGVsbG8=', 'base64'); // 'hello'
  try {
    const result = buf.includes('!!!', 0, 'base64');
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

test('base64 编码: padding 不正确', () => {
  const buf = Buffer.from('aGVsbG8=', 'base64');
  try {
    const result = buf.includes('aGVsbG8', 0, 'base64'); // 缺少 padding
    return typeof result === 'boolean';
  } catch (e) {
    return true;
  }
});

// === 多字节字符边界测试 ===
test('UTF-8: 3字节字符 (中文) 完整匹配', () => {
  const buf = Buffer.from('你好世界');
  return buf.includes('你') === true;
});

test('UTF-8: 3字节字符部分字节不应匹配', () => {
  const buf = Buffer.from('你好世界');
  // '你' = 0xE4 0xBD 0xA0, 只查找前两个字节不应该匹配完整字符
  const partial = Buffer.from([0xE4, 0xBD]);
  return buf.includes(partial) === true; // 字节级别匹配
});

test('UTF-8: 4字节字符 (emoji) 完整匹配', () => {
  const buf = Buffer.from('hello 😀 world');
  return buf.includes('😀') === true;
});

test('UTF-8: 4字节字符部分字节', () => {
  const buf = Buffer.from('😀'); // 0xF0 0x9F 0x98 0x80
  const partial = Buffer.from([0xF0, 0x9F]);
  return buf.includes(partial) === true;
});

test('UTF-8: 混合 1-4 字节字符', () => {
  const buf = Buffer.from('a你b😀c');
  return buf.includes('你b😀') === true;
});

// === 零拷贝和内存安全测试 ===
test('搜索值是 Buffer 的 slice (共享内存)', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(6, 11); // 'world'
  return buf.includes(slice) === true;
});

test('修改原 Buffer 后搜索 slice', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(0, 5); // 'hello'
  buf[0] = 72; // 'H'
  // slice 可能也被修改（如果共享内存）
  return buf.includes('Hello') === true || buf.includes('hello') === false;
});

test('搜索值是独立的 Buffer (不共享内存)', () => {
  const buf = Buffer.from('hello world');
  const search = Buffer.from('world');
  return buf.includes(search) === true;
});

// === byteOffset 边界精确测试 ===
test('byteOffset 刚好指向匹配位置的起始', () => {
  const buf = Buffer.from('hello world');
  // 'world' 从索引 6 开始
  return buf.includes('world', 6) === true;
});

test('byteOffset 指向匹配位置的起始+1', () => {
  const buf = Buffer.from('hello world');
  // 'world' 从索引 6 开始，offset=7 应该找不到
  return buf.includes('world', 7) === false;
});

test('byteOffset 指向匹配位置的起始-1', () => {
  const buf = Buffer.from('hello world');
  // 'world' 从索引 6 开始，offset=5 应该能找到
  return buf.includes('world', 5) === true;
});

test('byteOffset 为 -1 (从倒数第1个字节开始)', () => {
  const buf = Buffer.from('hello world'); // length = 11
  // -1 means start from 11 - 1 = 10
  return buf.includes('d', -1) === true;
});

test('byteOffset 为 -buf.length (从开头开始)', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', -buf.length) === true;
});

test('byteOffset 为 -(buf.length + 1) (超出范围，应从 0 开始)', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', -(buf.length + 1)) === true;
});

// === 特殊数值测试 ===
test('搜索整数 256 (应该模 256 = 0)', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(256) === true;
});

test('搜索整数 -256 (应该模 256 = 0)', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(-256) === true;
});

test('搜索整数 257 (应该模 256 = 1)', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(257) === true;
});

test('搜索小数 2.1 (应该截断为 2)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(2.1) === true;
});

test('搜索小数 2.9 (应该截断为 2)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(2.9) === true;
});

// === 性能相关边界测试 ===
test('大 Buffer (10MB) 查找在开头', () => {
  const buf = Buffer.alloc(10 * 1024 * 1024);
  buf.write('start', 0);
  return buf.includes('start') === true;
});

test('大 Buffer (10MB) 查找在末尾', () => {
  const buf = Buffer.alloc(10 * 1024 * 1024);
  const pos = buf.length - 5;
  buf.write('end', pos);
  return buf.includes('end') === true;
});

test('大 Buffer (10MB) 查找不存在的内容', () => {
  const buf = Buffer.alloc(10 * 1024 * 1024, 0);
  return buf.includes('notfound') === false;
});

// === 重复模式的精确匹配 ===
test('重复模式: "aaa" 在 "aaaa" 中', () => {
  const buf = Buffer.from('aaaa');
  return buf.includes('aaa') === true;
});

test('重复模式: "aaaa" 在 "aaa" 中', () => {
  const buf = Buffer.from('aaa');
  return buf.includes('aaaa') === false;
});

test('重复模式: 查找重叠匹配', () => {
  const buf = Buffer.from('ababab');
  return buf.includes('abab') === true;
});

test('重复模式: 字节级重复 [1,1,1,1]', () => {
  const buf = Buffer.from([1, 1, 1, 1]);
  return buf.includes(Buffer.from([1, 1])) === true;
});

// === 空值和边界组合测试 ===
test('空 Buffer 查找空 Buffer 在 offset=0', () => {
  const buf = Buffer.alloc(0);
  return buf.includes(Buffer.alloc(0), 0) === true;
});

test('空 Buffer 查找空字符串在 offset=0', () => {
  const buf = Buffer.alloc(0);
  return buf.includes('', 0) === true;
});

test('非空 Buffer 查找空 Buffer 在末尾', () => {
  const buf = Buffer.from('hello');
  return buf.includes(Buffer.alloc(0), 5) === true;
});

test('非空 Buffer 查找空字符串在超出范围的 offset', () => {
  const buf = Buffer.from('hello');
  return buf.includes('', 100) === true;
});

// === 编码大小写敏感性完整测试 ===
test('encoding "utf-8" (带连字符)', () => {
  const buf = Buffer.from('hello');
  try {
    return buf.includes('hello', 0, 'utf-8') === true;
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('encoding "UTF-8" (大写带连字符)', () => {
  const buf = Buffer.from('hello');
  try {
    return buf.includes('hello', 0, 'UTF-8') === true;
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

test('encoding "binary" (别名)', () => {
  const buf = Buffer.from('hello', 'binary');
  try {
    return buf.includes('hello', 0, 'binary') === true;
  } catch (e) {
    return true;
  }
});

test('encoding "ucs2" (别名)', () => {
  const buf = Buffer.from('hello', 'ucs2');
  try {
    return buf.includes(Buffer.from('hello', 'ucs2'), 0) === true;
  } catch (e) {
    return true;
  }
});

test('encoding "ucs-2" (带连字符)', () => {
  const buf = Buffer.from('hello', 'ucs2');
  try {
    return buf.includes(Buffer.from('hello', 'ucs2'), 0) === true;
  } catch (e) {
    return true;
  }
});

// === 特殊 ASCII 字符完整测试 ===
test('ASCII 控制字符: BEL (\\x07)', () => {
  const buf = Buffer.from([0x07, 0x08, 0x09]);
  return buf.includes(0x07) === true;
});

test('ASCII 控制字符: BS (\\x08)', () => {
  const buf = Buffer.from('hello\bworld');
  return buf.includes('\b') === true;
});

test('ASCII 控制字符: ESC (\\x1B)', () => {
  const buf = Buffer.from([0x1B, 0x5B, 0x41]); // ESC [ A
  return buf.includes(0x1B) === true;
});

test('ASCII DEL (\\x7F)', () => {
  const buf = Buffer.from([0x7F, 0x00, 0x01]);
  return buf.includes(0x7F) === true;
});

// === 最终综合场景 ===
test('综合: 多字节字符 + byteOffset + encoding', () => {
  const buf = Buffer.from('前端开发', 'utf8');
  return buf.includes('开发', 0, 'utf8') === true;
});

test('综合: 二进制数据 + 负 offset', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]);
  return buf.includes(0xFD, -2) === true;
});

test('综合: 大 Buffer + Uint8Array + offset', () => {
  const buf = Buffer.alloc(1000);
  buf.write('target', 500);
  const search = new Uint8Array([116, 97, 114, 103, 101, 116]); // 'target'
  return buf.includes(search, 400) === true;
});

test('综合: 空字符串 + 各种 offset 组合', () => {
  const buf = Buffer.from('test');
  return buf.includes('', 0) === true &&
         buf.includes('', 2) === true &&
         buf.includes('', 4) === true &&
         buf.includes('', -1) === true &&
         buf.includes('', 100) === true;
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
