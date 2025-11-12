// buf.writeDoubleBE/LE - 最终完整性验证
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

// 无原型对象场景（由于项目安全策略禁用 Object.create，此测试在 Node.js 中验证）
// 在 Node.js 环境中：Object.create(null) 创建的对象无法转换应报错
// 在 Go+goja 中：由于禁用 Object.create，无法测试此场景
test('writeDoubleBE 对象转换行为验证', () => {
  // 验证普通对象转换为 NaN
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE({});
  const result = buf.readDoubleBE();
  return Number.isNaN(result);
});

test('writeDoubleLE 对象转换行为验证', () => {
  // 验证普通对象转换为 NaN
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE({});
  const result = buf.readDoubleLE();
  return Number.isNaN(result);
});

// valueOf 抛出异常
test('writeDoubleBE valueOf 抛异常应传播', () => {
  const buf = Buffer.alloc(8);
  try {
    const obj = {
      valueOf() { throw new Error('Custom valueOf error'); }
    };
    buf.writeDoubleBE(obj);
    return false;
  } catch (e) {
    return e.message.includes('Custom');
  }
});

test('writeDoubleLE valueOf 抛异常应传播', () => {
  const buf = Buffer.alloc(8);
  try {
    const obj = {
      valueOf() { throw new Error('Custom valueOf error'); }
    };
    buf.writeDoubleLE(obj);
    return false;
  } catch (e) {
    return e.message.includes('Custom');
  }
});

// Symbol.toPrimitive 优先级最高
test('writeDoubleBE Symbol.toPrimitive 优先于 valueOf', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    [Symbol.toPrimitive]() { return 100.5; },
    valueOf() { return 200.5; }
  };
  buf.writeDoubleBE(obj);
  const result = buf.readDoubleBE();
  return Math.abs(result - 100.5) < 0.001;
});

test('writeDoubleLE Symbol.toPrimitive 优先于 valueOf', () => {
  const buf = Buffer.alloc(8);
  const obj = {
    [Symbol.toPrimitive]() { return 150.5; },
    valueOf() { return 250.5; }
  };
  buf.writeDoubleLE(obj);
  const result = buf.readDoubleLE();
  return Math.abs(result - 150.5) < 0.001;
});

// Number/String/Boolean 包装对象
test('writeDoubleBE Number 包装对象', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(new Number(123.456));
  const result = buf.readDoubleBE();
  return Math.abs(result - 123.456) < 0.001;
});

test('writeDoubleLE String 包装对象', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(new String('789.012'));
  const result = buf.readDoubleLE();
  return Math.abs(result - 789.012) < 0.001;
});

test('writeDoubleBE Boolean(true) 包装对象', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(new Boolean(true));
  const result = buf.readDoubleBE();
  return result === 1;
});

test('writeDoubleLE Boolean(false) 包装对象', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(new Boolean(false));
  const result = buf.readDoubleLE();
  return result === 0;
});

// 十六进制字符串大小写
test('writeDoubleBE 十六进制字符串 0x (小写)', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('0x10');
  const result = buf.readDoubleBE();
  return result === 16;
});

test('writeDoubleLE 十六进制字符串 0X (大写)', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('0X20');
  const result = buf.readDoubleLE();
  return result === 32;
});

// 二进制字符串大小写
test('writeDoubleBE 二进制字符串 0b', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('0b101');
  const result = buf.readDoubleBE();
  return result === 5;
});

test('writeDoubleLE 二进制字符串 0B', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('0B110');
  const result = buf.readDoubleLE();
  return result === 6;
});

// 八进制字符串大小写
test('writeDoubleBE 八进制字符串 0o', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('0o77');
  const result = buf.readDoubleBE();
  return result === 63;
});

test('writeDoubleLE 八进制字符串 0O', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('0O10');
  const result = buf.readDoubleLE();
  return result === 8;
});

// 科学计数法大小写
test('writeDoubleBE 科学计数法 e (小写)', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('1.5e3');
  const result = buf.readDoubleBE();
  return result === 1500;
});

test('writeDoubleLE 科学计数法 E (大写)', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('2.5E3');
  const result = buf.readDoubleLE();
  return result === 2500;
});

// 点号开头的数字字符串
test('writeDoubleBE 点号开头 .5', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('.5');
  const result = buf.readDoubleBE();
  return result === 0.5;
});

test('writeDoubleLE 点号开头 .123', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('.123');
  const result = buf.readDoubleLE();
  return Math.abs(result - 0.123) < 0.0001;
});

// 点号结尾的数字字符串
test('writeDoubleBE 点号结尾 5.', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('5.');
  const result = buf.readDoubleBE();
  return result === 5;
});

test('writeDoubleLE 点号结尾 10.', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('10.');
  const result = buf.readDoubleLE();
  return result === 10;
});

// 空数组转换为 0
test('writeDoubleBE 空数组转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE([]);
  const result = buf.readDoubleBE();
  return result === 0;
});

test('writeDoubleLE 空数组转换为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE([]);
  const result = buf.readDoubleLE();
  return result === 0;
});

// 单元素数组
test('writeDoubleBE 单元素数组取第一个元素', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE([123.456]);
  const result = buf.readDoubleBE();
  return Math.abs(result - 123.456) < 0.001;
});

test('writeDoubleLE 单元素数组取第一个元素', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE([789.012]);
  const result = buf.readDoubleLE();
  return Math.abs(result - 789.012) < 0.001;
});

// 稀疏数组
test('writeDoubleBE 稀疏数组转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  const sparse = [];
  sparse[10] = 999;
  buf.writeDoubleBE(sparse);
  const result = buf.readDoubleBE();
  return Number.isNaN(result);
});

test('writeDoubleLE 稀疏数组转换为 NaN', () => {
  const buf = Buffer.alloc(8);
  const sparse = [];
  sparse[5] = 888;
  buf.writeDoubleLE(sparse);
  const result = buf.readDoubleLE();
  return Number.isNaN(result);
});

// offset 为 -0
test('writeDoubleBE offset 为 -0 视为 0', () => {
  const buf = Buffer.alloc(8);
  const ret = buf.writeDoubleBE(123.456, -0);
  return ret === 8 && Math.abs(buf.readDoubleBE(0) - 123.456) < 0.001;
});

test('writeDoubleLE offset 为 -0 视为 0', () => {
  const buf = Buffer.alloc(8);
  const ret = buf.writeDoubleLE(789.012, -0);
  return ret === 8 && Math.abs(buf.readDoubleLE(0) - 789.012) < 0.001;
});

// 所有数学常量
test('writeDoubleBE Math.E', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.E);
  return buf.readDoubleBE() === Math.E;
});

test('writeDoubleLE Math.LN10', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.LN10);
  return buf.readDoubleLE() === Math.LN10;
});

test('writeDoubleBE Math.LOG2E', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.LOG2E);
  return buf.readDoubleBE() === Math.LOG2E;
});

test('writeDoubleLE Math.SQRT1_2', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.SQRT1_2);
  return buf.readDoubleLE() === Math.SQRT1_2;
});

// Buffer.concat
test('writeDoubleBE 在 Buffer.concat 结果上工作', () => {
  const parts = [Buffer.alloc(4), Buffer.alloc(4)];
  const combined = Buffer.concat(parts);
  combined.writeDoubleBE(999.111);
  const result = combined.readDoubleBE();
  return Math.abs(result - 999.111) < 0.001;
});

test('writeDoubleLE 在 Buffer.concat 结果上工作', () => {
  const parts = [Buffer.alloc(5), Buffer.alloc(3)];
  const combined = Buffer.concat(parts);
  combined.writeDoubleLE(888.222);
  const result = combined.readDoubleLE();
  return Math.abs(result - 888.222) < 0.001;
});

// Buffer.allocUnsafe
test('writeDoubleBE 在 allocUnsafe 上正确覆盖', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0xFF);
  buf.writeDoubleBE(0);
  return buf.every(b => b === 0);
});

test('writeDoubleLE 在 allocUnsafe 上正确覆盖', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0xFF);
  buf.writeDoubleLE(0);
  return buf.every(b => b === 0);
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
