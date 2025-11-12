// buf.writeFloatBE/LE - 深度完整性补充测试
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

// valueOf 抛出异常应传播
test('writeFloatBE valueOf 抛异常应传播', () => {
  const buf = Buffer.alloc(4);
  try {
    const obj = {
      valueOf() { throw new Error('Custom valueOf error'); }
    };
    buf.writeFloatBE(obj);
    return false;
  } catch (e) {
    return e.message.includes('Custom');
  }
});

test('writeFloatLE valueOf 抛异常应传播', () => {
  const buf = Buffer.alloc(4);
  try {
    const obj = {
      valueOf() { throw new Error('Custom valueOf error'); }
    };
    buf.writeFloatLE(obj);
    return false;
  } catch (e) {
    return e.message.includes('Custom');
  }
});

// Symbol.toPrimitive 优先级最高
test('writeFloatBE Symbol.toPrimitive 优先于 valueOf', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    [Symbol.toPrimitive]() { return 100.5; },
    valueOf() { return 200.5; }
  };
  buf.writeFloatBE(obj);
  const result = buf.readFloatBE();
  return Math.abs(result - 100.5) < 0.01;
});

test('writeFloatLE Symbol.toPrimitive 优先于 valueOf', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    [Symbol.toPrimitive]() { return 150.5; },
    valueOf() { return 250.5; }
  };
  buf.writeFloatLE(obj);
  const result = buf.readFloatLE();
  return Math.abs(result - 150.5) < 0.01;
});

// Symbol.toPrimitive 抛异常应传播
test('writeFloatBE Symbol.toPrimitive 抛异常应传播', () => {
  const buf = Buffer.alloc(4);
  try {
    const obj = {
      [Symbol.toPrimitive]() { throw new Error('toPrimitive error'); }
    };
    buf.writeFloatBE(obj);
    return false;
  } catch (e) {
    return e.message.includes('toPrimitive');
  }
});

test('writeFloatLE Symbol.toPrimitive 抛异常应传播', () => {
  const buf = Buffer.alloc(4);
  try {
    const obj = {
      [Symbol.toPrimitive]() { throw new Error('toPrimitive error'); }
    };
    buf.writeFloatLE(obj);
    return false;
  } catch (e) {
    return e.message.includes('toPrimitive');
  }
});

// Number 包装对象
test('writeFloatBE Number 包装对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(new Number(123.456));
  const result = buf.readFloatBE();
  return Math.abs(result - 123.456) < 0.001;
});

test('writeFloatLE Number 包装对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(new Number(789.012));
  const result = buf.readFloatLE();
  return Math.abs(result - 789.012) < 0.001;
});

// String 包装对象
test('writeFloatBE String 包装对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(new String('45.678'));
  const result = buf.readFloatBE();
  return Math.abs(result - 45.678) < 0.001;
});

test('writeFloatLE String 包装对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(new String('12.345'));
  const result = buf.readFloatLE();
  return Math.abs(result - 12.345) < 0.001;
});

// Boolean 包装对象
test('writeFloatBE Boolean(true) 包装对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(new Boolean(true));
  const result = buf.readFloatBE();
  return result === 1;
});

test('writeFloatLE Boolean(true) 包装对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(new Boolean(true));
  const result = buf.readFloatLE();
  return result === 1;
});

test('writeFloatBE Boolean(false) 包装对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(new Boolean(false));
  const result = buf.readFloatBE();
  return result === 0;
});

test('writeFloatLE Boolean(false) 包装对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(new Boolean(false));
  const result = buf.readFloatLE();
  return result === 0;
});

// 十六进制字符串
test('writeFloatBE 十六进制字符串 0x (小写)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('0x10');
  const result = buf.readFloatBE();
  return result === 16;
});

test('writeFloatLE 十六进制字符串 0X (大写)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('0X20');
  const result = buf.readFloatLE();
  return result === 32;
});

test('writeFloatBE 十六进制字符串 0xff', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('0xff');
  const result = buf.readFloatBE();
  return result === 255;
});

test('writeFloatLE 十六进制字符串 0XAB', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('0XAB');
  const result = buf.readFloatLE();
  return result === 171;
});

// 二进制字符串
test('writeFloatBE 二进制字符串 0b', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('0b101');
  const result = buf.readFloatBE();
  return result === 5;
});

test('writeFloatLE 二进制字符串 0B', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('0B110');
  const result = buf.readFloatLE();
  return result === 6;
});

test('writeFloatBE 二进制字符串 0b1111', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('0b1111');
  const result = buf.readFloatBE();
  return result === 15;
});

test('writeFloatLE 二进制字符串 0B10101', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('0B10101');
  const result = buf.readFloatLE();
  return result === 21;
});

// 八进制字符串
test('writeFloatBE 八进制字符串 0o', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('0o77');
  const result = buf.readFloatBE();
  return result === 63;
});

test('writeFloatLE 八进制字符串 0O', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('0O10');
  const result = buf.readFloatLE();
  return result === 8;
});

test('writeFloatBE 八进制字符串 0o123', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('0o123');
  const result = buf.readFloatBE();
  return result === 83;
});

test('writeFloatLE 八进制字符串 0O777', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('0O777');
  const result = buf.readFloatLE();
  return result === 511;
});

// 科学计数法大小写
test('writeFloatBE 科学计数法 e (小写)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('1.5e2');
  const result = buf.readFloatBE();
  return result === 150;
});

test('writeFloatLE 科学计数法 E (大写)', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('2.5E2');
  const result = buf.readFloatLE();
  return result === 250;
});

test('writeFloatBE 科学计数法负指数 e-', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('1.5e-2');
  const result = buf.readFloatBE();
  return Math.abs(result - 0.015) < 0.0001;
});

test('writeFloatLE 科学计数法正指数 E+', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('3.5E+1');
  const result = buf.readFloatLE();
  return result === 35;
});

// 制表符和换行符空白字符串
test('writeFloatBE 制表符字符串转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('\t\t');
  const result = buf.readFloatBE();
  return result === 0;
});

test('writeFloatLE 换行符字符串转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('\n\n');
  const result = buf.readFloatLE();
  return result === 0;
});

test('writeFloatBE 混合空白字符串转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(' \t\n\r ');
  const result = buf.readFloatBE();
  return result === 0;
});

test('writeFloatLE 回车符字符串转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('\r');
  const result = buf.readFloatLE();
  return result === 0;
});

// 部分数字字符串转换为 NaN
test('writeFloatBE 部分数字字符串 "123abc" 转换为 NaN', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('123abc');
  const result = buf.readFloatBE();
  return Number.isNaN(result);
});

test('writeFloatLE 部分数字字符串 "45.6xyz" 转换为 NaN', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('45.6xyz');
  const result = buf.readFloatLE();
  return Number.isNaN(result);
});

test('writeFloatBE 部分数字字符串 "789 extra" 转换为 NaN', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('789 extra');
  const result = buf.readFloatBE();
  return Number.isNaN(result);
});

test('writeFloatLE 部分数字字符串 "3.14abc" 转换为 NaN', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('3.14abc');
  const result = buf.readFloatLE();
  return Number.isNaN(result);
});

// 特殊非数字字符串
test('writeFloatBE 字符串 "NaN" 转换为 NaN', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('NaN');
  const result = buf.readFloatBE();
  return Number.isNaN(result);
});

test('writeFloatLE 字符串 "Infinity" 转换为 Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('Infinity');
  const result = buf.readFloatLE();
  return result === Infinity;
});

test('writeFloatBE 字符串 "-Infinity" 转换为 -Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('-Infinity');
  const result = buf.readFloatBE();
  return result === -Infinity;
});

test('writeFloatLE 字符串 "+Infinity" 转换为 Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('+Infinity');
  const result = buf.readFloatLE();
  return result === Infinity;
});

// 多余参数应被忽略
test('writeFloatBE 忽略多余参数', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeFloatBE(3.14, 0, 999, 'extra', {}, []);
  return ret === 4;
});

test('writeFloatLE 忽略多余参数', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeFloatLE(2.71, 0, 888, 'ignore', null, undefined);
  return ret === 4;
});

test('writeFloatBE 忽略多余参数且结果正确', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(5.5, 0, 'ignored');
  const result = buf.readFloatBE();
  return result === 5.5;
});

test('writeFloatLE 忽略多余参数且结果正确', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(7.7, 0, 'ignored');
  const result = buf.readFloatLE();
  return Math.abs(result - 7.7) < 0.01;
});

// 特殊数字格式
test('writeFloatBE 前导零数字字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('007');
  const result = buf.readFloatBE();
  return result === 7;
});

test('writeFloatLE 前导零小数字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('00.123');
  const result = buf.readFloatLE();
  return Math.abs(result - 0.123) < 0.001;
});

test('writeFloatBE 正号数字字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('+123.456');
  const result = buf.readFloatBE();
  return Math.abs(result - 123.456) < 0.001;
});

test('writeFloatLE 小数点开头字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE('.5');
  const result = buf.readFloatLE();
  return result === 0.5;
});

test('writeFloatBE 小数点结尾字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE('5.');
  const result = buf.readFloatBE();
  return result === 5;
});

// toString 方法返回非字符串
test('writeFloatBE toString 返回 null', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    toString() { return null; },
    valueOf() { return 100; }
  };
  buf.writeFloatBE(obj);
  const result = buf.readFloatBE();
  // valueOf 应该被调用
  return result === 100;
});

test('writeFloatLE toString 返回 undefined', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    toString() { return undefined; },
    valueOf() { return 200; }
  };
  buf.writeFloatLE(obj);
  const result = buf.readFloatLE();
  // valueOf 应该被调用
  return result === 200;
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
