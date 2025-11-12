// Buffer.constants - 深度补漏：Buffer方法与constants的交互（第10轮）
const buffer = require('buffer');
const { Buffer } = buffer;
const constants = buffer.constants;

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// === Buffer.alloc 与 constants 关系 ===

// 1. Buffer.alloc(0) 成功
test('Buffer.alloc(0) 成功创建', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0 && buf.length <= constants.MAX_LENGTH;
});

// 2. Buffer.alloc(1) 成功
test('Buffer.alloc(1) 成功创建', () => {
  const buf = Buffer.alloc(1);
  return buf.length === 1 && buf.length <= constants.MAX_LENGTH;
});

// 3. Buffer.alloc 小数截断
test('Buffer.alloc(10.9) 截断为 10', () => {
  const buf = Buffer.alloc(10.9);
  return buf.length === 10;
});

// 4. Buffer.alloc 向下取整
test('Buffer.alloc(10.1) 截断为 10', () => {
  const buf = Buffer.alloc(10.1);
  return buf.length === 10;
});

// 5. Buffer.alloc 大整数（在范围内）
test('Buffer.alloc(1024*1024) 成功', () => {
  const size = 1024 * 1024;
  const buf = Buffer.alloc(size);
  return buf.length === size && size < constants.MAX_LENGTH;
});

// === Buffer.allocUnsafe 与 constants ===

// 6. Buffer.allocUnsafe(0) 成功
test('Buffer.allocUnsafe(0) 成功', () => {
  const buf = Buffer.allocUnsafe(0);
  return buf.length === 0;
});

// 7. Buffer.allocUnsafe 小数截断
test('Buffer.allocUnsafe(5.8) 截断为 5', () => {
  const buf = Buffer.allocUnsafe(5.8);
  return buf.length === 5;
});

// 8. Buffer.allocUnsafe 超限失败
test('Buffer.allocUnsafe(MAX_LENGTH + 1) 失败', () => {
  try {
    Buffer.allocUnsafe(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return true;
  }
});

// === Buffer.allocUnsafeSlow 与 constants ===

// 9. Buffer.allocUnsafeSlow(0) 成功
test('Buffer.allocUnsafeSlow(0) 成功', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0;
});

// 10. Buffer.allocUnsafeSlow 超限失败
test('Buffer.allocUnsafeSlow(MAX_LENGTH + 1) 失败', () => {
  try {
    Buffer.allocUnsafeSlow(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return true;
  }
});

// === Buffer.from 与 constants ===

// 11. Buffer.from([]) 成功
test('Buffer.from([]) 创建空 Buffer', () => {
  const buf = Buffer.from([]);
  return buf.length === 0;
});

// 12. Buffer.from(string) 长度合法
test('Buffer.from("hello") 长度小于 MAX_STRING_LENGTH', () => {
  const buf = Buffer.from('hello');
  return buf.length < constants.MAX_STRING_LENGTH;
});

// 13. Buffer.from(Buffer) 长度保持
test('Buffer.from(Buffer) 保持长度', () => {
  const src = Buffer.alloc(100);
  const buf = Buffer.from(src);
  return buf.length === 100;
});

// 14. Buffer.from(ArrayBuffer) 长度保持
test('Buffer.from(ArrayBuffer) 保持长度', () => {
  const ab = new ArrayBuffer(50);
  const buf = Buffer.from(ab);
  return buf.length === 50;
});

// 15. Buffer.from(Uint8Array) 长度保持
test('Buffer.from(Uint8Array) 保持长度', () => {
  const arr = new Uint8Array(30);
  const buf = Buffer.from(arr);
  return buf.length === 30;
});

// === Buffer.concat 与 constants ===

// 16. Buffer.concat([]) 返回空
test('Buffer.concat([]) 返回空 Buffer', () => {
  const buf = Buffer.concat([]);
  return buf.length === 0;
});

// 17. Buffer.concat 单个 Buffer
test('Buffer.concat([buf]) 返回副本', () => {
  const src = Buffer.alloc(10);
  const buf = Buffer.concat([src]);
  return buf.length === 10 && buf !== src;
});

// 18. Buffer.concat 多个 Buffer
test('Buffer.concat 总长度正确', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(20);
  const buf3 = Buffer.alloc(30);
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.length === 60;
});

// 19. Buffer.concat 指定总长度（截断）
test('Buffer.concat 可以截断', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(20);
  const result = Buffer.concat([buf1, buf2], 15);
  return result.length === 15;
});

// 20. Buffer.concat 指定总长度（扩展）
test('Buffer.concat 可以扩展（填充0）', () => {
  const buf1 = Buffer.alloc(10);
  const result = Buffer.concat([buf1], 20);
  return result.length === 20;
});

// === Buffer.byteLength 与 MAX_STRING_LENGTH ===

// 21. Buffer.byteLength 空字符串
test('Buffer.byteLength("") 为 0', () => {
  return Buffer.byteLength('') === 0;
});

// 22. Buffer.byteLength ASCII
test('Buffer.byteLength("hello") UTF-8', () => {
  return Buffer.byteLength('hello', 'utf8') === 5;
});

// 23. Buffer.byteLength 多字节字符
test('Buffer.byteLength("你好") UTF-8', () => {
  const len = Buffer.byteLength('你好', 'utf8');
  return len === 6; // 每个汉字 3 字节
});

// 24. Buffer.byteLength base64
test('Buffer.byteLength base64 编码', () => {
  const len = Buffer.byteLength('aGVsbG8=', 'base64');
  return len > 0;
});

// 25. Buffer.byteLength hex
test('Buffer.byteLength hex 编码', () => {
  const len = Buffer.byteLength('48656c6c6f', 'hex');
  return len === 5;
});

// === Buffer.compare 与值的关系 ===

// 26. Buffer.compare 相同 Buffer
test('Buffer.compare 相同返回 0', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  return Buffer.compare(buf1, buf2) === 0;
});

// 27. Buffer.compare 不同 Buffer
test('Buffer.compare 小于返回负数', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  return Buffer.compare(buf1, buf2) < 0;
});

// 28. Buffer.compare 大于返回正数
test('Buffer.compare 大于返回正数', () => {
  const buf1 = Buffer.from('abd');
  const buf2 = Buffer.from('abc');
  return Buffer.compare(buf1, buf2) > 0;
});

// === Buffer.isBuffer 测试 ===

// 29. Buffer.isBuffer(Buffer) 为 true
test('Buffer.isBuffer 识别 Buffer', () => {
  const buf = Buffer.alloc(10);
  return Buffer.isBuffer(buf) === true;
});

// 30. Buffer.isBuffer(Uint8Array) 为 false
test('Buffer.isBuffer 不识别 Uint8Array', () => {
  const arr = new Uint8Array(10);
  return Buffer.isBuffer(arr) === false;
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
