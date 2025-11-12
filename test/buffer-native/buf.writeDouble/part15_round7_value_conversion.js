// buf.writeDoubleBE/LE - Round 7-1: Value Conversion Edge Cases
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

// valueOf 和 toString 同时存在时的优先级
test('writeDoubleBE 同时有valueOf和toString优先valueOf', () => {
  const obj = {
    valueOf: () => 10,
    toString: () => "20"
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(obj);
  return buf.readDoubleBE() === 10;
});

test('writeDoubleLE 同时有valueOf和toString优先valueOf', () => {
  const obj = {
    valueOf: () => 10,
    toString: () => "20"
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(obj);
  return buf.readDoubleLE() === 10;
});

// valueOf 返回非数字
test('writeDoubleBE valueOf返回字符串转NaN', () => {
  const obj = {
    valueOf: () => "not a number"
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(obj);
  return Number.isNaN(buf.readDoubleBE());
});

test('writeDoubleLE valueOf返回字符串转NaN', () => {
  const obj = {
    valueOf: () => "not a number"
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(obj);
  return Number.isNaN(buf.readDoubleLE());
});

// toString 返回非数字字符串
test('writeDoubleBE toString返回非数字转NaN', () => {
  const obj = {
    toString: () => "not a number"
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(obj);
  return Number.isNaN(buf.readDoubleBE());
});

test('writeDoubleLE toString返回非数字转NaN', () => {
  const obj = {
    toString: () => "not a number"
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(obj);
  return Number.isNaN(buf.readDoubleLE());
});

// 循环引用对象
test('writeDoubleBE 循环引用对象转NaN', () => {
  const obj = {};
  obj.self = obj;
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(obj);
  return Number.isNaN(buf.readDoubleBE());
});

test('writeDoubleLE 循环引用对象转NaN', () => {
  const obj = {};
  obj.self = obj;
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(obj);
  return Number.isNaN(buf.readDoubleLE());
});

// valueOf 返回对象
test('writeDoubleBE valueOf返回对象转NaN', () => {
  const obj = {
    valueOf: () => ({})
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(obj);
  return Number.isNaN(buf.readDoubleBE());
});

test('writeDoubleLE valueOf返回对象转NaN', () => {
  const obj = {
    valueOf: () => ({})
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(obj);
  return Number.isNaN(buf.readDoubleLE());
});

// toString 返回数字字符串
test('writeDoubleBE toString返回数字字符串', () => {
  const obj = {
    toString: () => "42.5"
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(obj);
  return Math.abs(buf.readDoubleBE() - 42.5) < 0.0001;
});

test('writeDoubleLE toString返回数字字符串', () => {
  const obj = {
    toString: () => "42.5"
  };
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(obj);
  return Math.abs(buf.readDoubleLE() - 42.5) < 0.0001;
});

// 特殊字符串格式
test('writeDoubleBE value为单点字符串转NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(".");
  return Number.isNaN(buf.readDoubleBE());
});

test('writeDoubleLE value为单点字符串转NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(".");
  return Number.isNaN(buf.readDoubleLE());
});

test('writeDoubleBE value为前导点0.5', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(".5");
  return buf.readDoubleBE() === 0.5;
});

test('writeDoubleLE value为前导点0.5', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(".5");
  return buf.readDoubleLE() === 0.5;
});

test('writeDoubleBE value为尾随点5.0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE("5.");
  return buf.readDoubleBE() === 5;
});

test('writeDoubleLE value为尾随点5.0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE("5.");
  return buf.readDoubleLE() === 5;
});

test('writeDoubleBE value为多个点转NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE("1.2.3");
  return Number.isNaN(buf.readDoubleBE());
});

test('writeDoubleLE value为多个点转NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE("1.2.3");
  return Number.isNaN(buf.readDoubleLE());
});

test('writeDoubleBE value为NaN字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE("NaN");
  return Number.isNaN(buf.readDoubleBE());
});

test('writeDoubleLE value为NaN字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE("NaN");
  return Number.isNaN(buf.readDoubleLE());
});

test('writeDoubleBE value为带正号字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE("+123");
  return buf.readDoubleBE() === 123;
});

test('writeDoubleLE value为带正号字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE("+123");
  return buf.readDoubleLE() === 123;
});

test('writeDoubleBE value为带正号和空格', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE("  +123  ");
  return buf.readDoubleBE() === 123;
});

test('writeDoubleLE value为带正号和空格', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE("  +123  ");
  return buf.readDoubleLE() === 123;
});

// Number.EPSILON 相关
test('writeDoubleBE 写入Number.EPSILON', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.EPSILON);
  return buf.readDoubleBE() === Number.EPSILON;
});

test('writeDoubleLE 写入Number.EPSILON', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.EPSILON);
  return buf.readDoubleLE() === Number.EPSILON;
});

test('writeDoubleBE 写入1+EPSILON', () => {
  const buf = Buffer.alloc(8);
  const val = 1 + Number.EPSILON;
  buf.writeDoubleBE(val);
  return buf.readDoubleBE() === val;
});

test('writeDoubleLE 写入1+EPSILON', () => {
  const buf = Buffer.alloc(8);
  const val = 1 + Number.EPSILON;
  buf.writeDoubleLE(val);
  return buf.readDoubleLE() === val;
});

test('writeDoubleBE 写入2-EPSILON', () => {
  const buf = Buffer.alloc(8);
  const val = 2 - Number.EPSILON;
  buf.writeDoubleBE(val);
  return buf.readDoubleBE() === val;
});

test('writeDoubleLE 写入2-EPSILON', () => {
  const buf = Buffer.alloc(8);
  const val = 2 - Number.EPSILON;
  buf.writeDoubleLE(val);
  return buf.readDoubleLE() === val;
});

test('writeDoubleBE 接近1的最大小数', () => {
  const buf = Buffer.alloc(8);
  const val = 0.9999999999999999;
  buf.writeDoubleBE(val);
  return buf.readDoubleBE() === val;
});

test('writeDoubleLE 接近1的最大小数', () => {
  const buf = Buffer.alloc(8);
  const val = 0.9999999999999999;
  buf.writeDoubleLE(val);
  return buf.readDoubleLE() === val;
});

test('writeDoubleBE 大于1的最小数', () => {
  const buf = Buffer.alloc(8);
  const val = 1.0000000000000002;
  buf.writeDoubleBE(val);
  return buf.readDoubleBE() === val;
});

test('writeDoubleLE 大于1的最小数', () => {
  const buf = Buffer.alloc(8);
  const val = 1.0000000000000002;
  buf.writeDoubleLE(val);
  return buf.readDoubleLE() === val;
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
