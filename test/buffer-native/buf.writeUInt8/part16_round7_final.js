// buf.writeUInt8() - 第7轮最终补漏：元编程、属性和字符串边界
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

// 方法属性检查
test('writeUInt8 是函数类型', () => {
  return typeof Buffer.prototype.writeUInt8 === 'function';
});

test('writeUInt8.length 等于 1', () => {
  return Buffer.prototype.writeUInt8.length === 1;
});

test('writeUInt8.name 等于 "writeUInt8"', () => {
  return Buffer.prototype.writeUInt8.name === 'writeUInt8';
});

// 方法可重写性
test('实例方法可以被重写', () => {
  const buf = Buffer.alloc(4);
  const original = buf.writeUInt8;
  buf.writeUInt8 = function() { return 999; };
  const result = buf.writeUInt8(100, 0);
  buf.writeUInt8 = original;
  return result === 999;
});

test('重写后恢复仍可正常使用', () => {
  const buf = Buffer.alloc(4);
  const original = buf.writeUInt8;
  buf.writeUInt8 = function() { return 999; };
  buf.writeUInt8 = original;
  buf.writeUInt8(123, 0);
  return buf[0] === 123;
});

// 字符串特殊字符处理
test('value 为字符串带换行符 "100\\n" 转为 100', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('100\n', 0);
  return buf[0] === 100;
});

test('value 为字符串带制表符 "\\t50\\r" 转为 50', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('\t50\r', 0);
  return buf[0] === 50;
});

test('value 为字符串带回车符 "200\\r\\n" 转为 200', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('200\r\n', 0);
  return buf[0] === 200;
});

test('value 为字符串带前导零 "0100" 转为 100', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('0100', 0);
  return buf[0] === 100;
});

test('value 为字符串带多个前导零 "00000255" 转为 255', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('00000255', 0);
  return buf[0] === 255;
});

// Unicode 和特殊字符
test('value 为 Unicode 数字字符 "①" 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('①', 0);
  return buf[0] === 0;
});

test('value 为 Emoji "😀" 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('😀', 0);
  return buf[0] === 0;
});

test('value 为中文字符 "一百" 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('一百', 0);
  return buf[0] === 0;
});

test('value 为全角数字 "１２３" 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('１２３', 0);
  return buf[0] === 0;
});

// 链式返回值使用
test('连续3次链式调用验证返回值递增', () => {
  const buf = Buffer.alloc(10);
  let ret = buf.writeUInt8(10, 0);
  const ret1 = ret;
  ret = buf.writeUInt8(20, ret);
  const ret2 = ret;
  ret = buf.writeUInt8(30, ret);
  const ret3 = ret;
  return ret1 === 1 && ret2 === 2 && ret3 === 3;
});

test('链式调用10次返回值正确', () => {
  const buf = Buffer.alloc(10);
  let pos = 0;
  for (let i = 0; i < 10; i++) {
    pos = buf.writeUInt8(i * 10, pos);
  }
  return pos === 10;
});

// 同位置多次写入时序
test('同位置连续写入保留最后值', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(1, 0);
  buf.writeUInt8(2, 0);
  buf.writeUInt8(3, 0);
  buf.writeUInt8(4, 0);
  buf.writeUInt8(5, 0);
  return buf[0] === 5;
});

test('交替位置写入不影响', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt8(10, 0);
  buf.writeUInt8(20, 1);
  buf.writeUInt8(30, 0);
  buf.writeUInt8(40, 1);
  return buf[0] === 30 && buf[1] === 40;
});

// 特殊数字字符串
test('value 为罗马数字字符串 "X" 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('X', 0);
  return buf[0] === 0;
});

test('value 为分数字符串 "1/2" 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('1/2', 0);
  return buf[0] === 0;
});

test('value 为百分号字符串 "50%" 转为 0 (NaN)', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8('50%', 0);
  return buf[0] === 0;
});

// 对象的特殊方法
test('value 为带 [Symbol.toPrimitive] 的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    [Symbol.toPrimitive](hint) {
      return 150;
    }
  };
  buf.writeUInt8(obj, 0);
  return buf[0] === 150;
});

test('value 为带 [Symbol.toPrimitive] 返回字符串的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    [Symbol.toPrimitive](hint) {
      return '200';
    }
  };
  buf.writeUInt8(obj, 0);
  return buf[0] === 200;
});

// 极端小数
test('value 为 0.0001 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0.0001, 0);
  return buf[0] === 0;
});

test('value 为 0.4999 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0.4999, 0);
  return buf[0] === 0;
});

test('value 为 0.5 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0.5, 0);
  return buf[0] === 0;
});

test('value 为 0.9999 转为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0.9999, 0);
  return buf[0] === 0;
});

test('value 为 254.5 转为 254', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(254.5, 0);
  return buf[0] === 254;
});

test('value 为 254.9999 转为 254', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(254.9999, 0);
  return buf[0] === 254;
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
