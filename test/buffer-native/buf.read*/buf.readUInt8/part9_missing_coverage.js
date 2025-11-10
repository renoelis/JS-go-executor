// buf.readUInt8() - 查缺补漏测试
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

// 多参数测试
test('传入多个参数（应只使用第一个）', () => {
  const buf = Buffer.from([100, 200, 50]);
  const result = buf.readUInt8(1, 999, 'extra');
  return result === 200;
});

test('传入 0 个参数（应使用默认值 0）', () => {
  const buf = Buffer.from([255, 128]);
  return buf.readUInt8() === 255;
});

// 对象转换测试
test('offset 为对象且有 toString 方法', () => {
  try {
    const buf = Buffer.from([100, 200]);
    const obj = { toString: () => '1' };
    buf.readUInt8(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('offset 为对象且有 valueOf 返回非数字', () => {
  try {
    const buf = Buffer.from([100, 200]);
    const obj = { valueOf: () => 'not a number' };
    buf.readUInt8(obj);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 负零测试
test('offset 为 -0（应等同于 0）', () => {
  const buf = Buffer.from([255, 128]);
  return buf.readUInt8(-0) === 255;
});

test('offset 为 -0.0（应等同于 0）', () => {
  const buf = Buffer.from([200, 100]);
  return buf.readUInt8(-0.0) === 200;
});

// 与 readInt8 对比测试
test('readUInt8 vs readInt8（值 < 128）', () => {
  const buf = Buffer.from([100]);
  return buf.readUInt8(0) === 100 && buf.readInt8(0) === 100;
});

test('readUInt8 vs readInt8（值 >= 128）', () => {
  const buf = Buffer.from([200]);
  const u = buf.readUInt8(0);
  const s = buf.readInt8(0);
  // 200 作为 uint8 是 200，作为 int8 是 -56
  return u === 200 && s === -56;
});

test('readUInt8 vs readInt8（值 = 255）', () => {
  const buf = Buffer.from([255]);
  const u = buf.readUInt8(0);
  const s = buf.readInt8(0);
  // 255 作为 uint8 是 255，作为 int8 是 -1
  return u === 255 && s === -1;
});

// 与数组索引对比
test('readUInt8 vs buf[offset]（应相等）', () => {
  const buf = Buffer.from([100, 200, 50]);
  return buf.readUInt8(0) === buf[0] &&
         buf.readUInt8(1) === buf[1] &&
         buf.readUInt8(2) === buf[2];
});

// 连续读取模式测试
test('从头到尾连续读取', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  let allCorrect = true;
  const expected = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== expected[i]) {
      allCorrect = false;
      break;
    }
  }
  return allCorrect;
});

test('倒序读取', () => {
  const buf = Buffer.from([255, 128, 64, 32, 16, 8, 4, 2, 1, 0]);
  let allCorrect = true;
  for (let i = buf.length - 1; i >= 0; i--) {
    const expected = [255, 128, 64, 32, 16, 8, 4, 2, 1, 0];
    if (buf.readUInt8(i) !== expected[i]) {
      allCorrect = false;
      break;
    }
  }
  return allCorrect;
});

// offset 精确边界测试
test('offset = buffer.length - 1（最后一个有效位置）', () => {
  const buf = Buffer.from([10, 20, 30, 40, 255]);
  return buf.readUInt8(buf.length - 1) === 255;
});

test('offset = buffer.length（应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20, 30]);
    buf.readUInt8(buf.length);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊数值序列测试
test('读取递增序列', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5]);
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== i) return false;
  }
  return true;
});

test('读取递减序列', () => {
  const buf = Buffer.from([255, 254, 253, 252, 251, 250]);
  const expected = [255, 254, 253, 252, 251, 250];
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== expected[i]) return false;
  }
  return true;
});

test('读取斐波那契数列（模 256）', () => {
  // 0, 1, 1, 2, 3, 5, 8, 13, 21, 34
  const buf = Buffer.from([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
  const expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34];
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== expected[i]) return false;
  }
  return true;
});

// 2的幂次测试
test('读取 2 的幂次值', () => {
  const buf = Buffer.from([1, 2, 4, 8, 16, 32, 64, 128]);
  const expected = [1, 2, 4, 8, 16, 32, 64, 128];
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== expected[i]) return false;
  }
  return true;
});

// 质数序列测试
test('读取质数序列', () => {
  const buf = Buffer.from([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  const expected = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== expected[i]) return false;
  }
  return true;
});

// 重复值测试
test('读取所有相同值的 buffer', () => {
  const buf = Buffer.alloc(10, 123);
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== 123) return false;
  }
  return true;
});

// offset 浮点数特殊情况
test('offset = 2.0（整数浮点数，应被接受）', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  return buf.readUInt8(2.0) === 30;
});

test('offset = -1.0（负整数浮点数，应抛出错误）', () => {
  try {
    const buf = Buffer.from([10, 20, 30]);
    buf.readUInt8(-1.0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 空值和特殊情况
test('读取全零 buffer', () => {
  const buf = Buffer.alloc(5);
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== 0) return false;
  }
  return true;
});

test('读取全 255 buffer', () => {
  const buf = Buffer.alloc(5, 255);
  for (let i = 0; i < buf.length; i++) {
    if (buf.readUInt8(i) !== 255) return false;
  }
  return true;
});

// 性能相关：同一位置多次读取
test('同一位置读取 1000 次应返回相同值', () => {
  const buf = Buffer.from([123]);
  for (let i = 0; i < 1000; i++) {
    if (buf.readUInt8(0) !== 123) return false;
  }
  return true;
});

// ASCII 字符测试
test('读取 ASCII 字符 A（65）', () => {
  const buf = Buffer.from('A', 'ascii');
  return buf.readUInt8(0) === 65;
});

test('读取 ASCII 字符 Z（90）', () => {
  const buf = Buffer.from('Z', 'ascii');
  return buf.readUInt8(0) === 90;
});

test('读取 ASCII 字符 a（97）', () => {
  const buf = Buffer.from('a', 'ascii');
  return buf.readUInt8(0) === 97;
});

test('读取 ASCII 字符 z（122）', () => {
  const buf = Buffer.from('z', 'ascii');
  return buf.readUInt8(0) === 122;
});

test('读取 ASCII 数字 0（48）', () => {
  const buf = Buffer.from('0', 'ascii');
  return buf.readUInt8(0) === 48;
});

test('读取 ASCII 数字 9（57）', () => {
  const buf = Buffer.from('9', 'ascii');
  return buf.readUInt8(0) === 57;
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
