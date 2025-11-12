// Buffer.constants - 深度补漏：类型转换与强制转换（第9轮）
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

// === 数值类型转换测试 ===

// 1. 常量转字符串
test('String(MAX_LENGTH) 正确转换', () => {
  const str = String(constants.MAX_LENGTH);
  return str === '9007199254740991';
});

// 2. 常量 + 空字符串
test('MAX_LENGTH + "" 得到字符串', () => {
  const str = constants.MAX_LENGTH + '';
  return typeof str === 'string' && str === '9007199254740991';
});

// 3. 模板字符串插值
test('模板字符串中的常量', () => {
  const str = `${constants.MAX_STRING_LENGTH}`;
  return str === '536870888';
});

// 4. Number() 包装
test('Number(MAX_LENGTH) 返回原值', () => {
  return Number(constants.MAX_LENGTH) === constants.MAX_LENGTH;
});

// 5. parseInt 转换
test('parseInt(MAX_LENGTH) 保持精度', () => {
  return parseInt(constants.MAX_LENGTH) === constants.MAX_LENGTH;
});

// 6. parseFloat 转换
test('parseFloat(MAX_LENGTH) 保持精度', () => {
  return parseFloat(constants.MAX_LENGTH) === constants.MAX_LENGTH;
});

// 7. 布尔值转换
test('Boolean(MAX_LENGTH) 为 true', () => {
  return Boolean(constants.MAX_LENGTH) === true;
});

// 8. 双重否定
test('!!MAX_LENGTH 为 true', () => {
  return !!constants.MAX_LENGTH === true;
});

// 9. 一元加号
test('+MAX_LENGTH 保持值', () => {
  return +constants.MAX_LENGTH === constants.MAX_LENGTH;
});

// 10. 一元减号
test('-MAX_LENGTH 为负数', () => {
  return -constants.MAX_LENGTH === -9007199254740991;
});

// === toXXX 方法测试 ===

// 11. toFixed 方法
test('MAX_LENGTH.toFixed(0) 正确', () => {
  return constants.MAX_LENGTH.toFixed(0) === '9007199254740991';
});

// 12. toExponential 方法
test('MAX_LENGTH.toExponential() 可用', () => {
  const result = constants.MAX_LENGTH.toExponential();
  return typeof result === 'string' && result.includes('e+');
});

// 13. toPrecision 方法
test('MAX_LENGTH.toPrecision(5) 可用', () => {
  const result = constants.MAX_LENGTH.toPrecision(5);
  return typeof result === 'string';
});

// 14. toString 进制转换
test('MAX_LENGTH.toString(16) 为十六进制', () => {
  return constants.MAX_LENGTH.toString(16) === '1fffffffffffff';
});

// 15. toString(2) 二进制
test('MAX_LENGTH.toString(2) 是 53 个 1', () => {
  const binary = constants.MAX_LENGTH.toString(2);
  return binary === '1'.repeat(53);
});

// 16. toString(8) 八进制
test('MAX_LENGTH.toString(8) 正确', () => {
  const octal = constants.MAX_LENGTH.toString(8);
  return typeof octal === 'string' && octal.length > 0;
});

// 17. toString(36) 最大进制
test('MAX_LENGTH.toString(36) 可用', () => {
  const base36 = constants.MAX_LENGTH.toString(36);
  return typeof base36 === 'string';
});

// === 比较运算符强制转换 ===

// 18. 与字符串比较
test('MAX_LENGTH == "9007199254740991" 为 true', () => {
  return constants.MAX_LENGTH == '9007199254740991';
});

// 19. 严格不等于字符串
test('MAX_LENGTH !== "9007199254740991" 为 true', () => {
  return constants.MAX_LENGTH !== '9007199254740991';
});

// 20. 与布尔值比较
test('MAX_LENGTH > 0 为 true', () => {
  return constants.MAX_LENGTH > 0;
});

// 21. 与 true 比较
test('MAX_LENGTH > true 为 true', () => {
  return constants.MAX_LENGTH > true;
});

// 22. 与 false 比较
test('MAX_LENGTH > false 为 true', () => {
  return constants.MAX_LENGTH > false;
});

// === 算术运算中的转换 ===

// 23. 与字符串数字相加
test('MAX_STRING_LENGTH + "0" 字符串拼接', () => {
  const result = constants.MAX_STRING_LENGTH + '0';
  return result === '5368708880';
});

// 24. 与字符串数字相减
test('MAX_STRING_LENGTH - "100" 数值运算', () => {
  const result = constants.MAX_STRING_LENGTH - '100';
  return result === 536870788;
});

// 25. 与布尔值运算
test('MAX_STRING_LENGTH + true 为数值', () => {
  const result = constants.MAX_STRING_LENGTH + true;
  return result === 536870889;
});

// === 对象转换测试 ===

// 26. 使用 Object() 包装
test('Object(MAX_LENGTH) 创建 Number 对象', () => {
  const obj = Object(constants.MAX_LENGTH);
  return typeof obj === 'object' && obj.valueOf() === constants.MAX_LENGTH;
});

// 27. 使用 new Number() 包装
test('new Number(MAX_LENGTH) 正确', () => {
  const num = new Number(constants.MAX_LENGTH);
  return num.valueOf() === constants.MAX_LENGTH;
});

// 28. JSON.parse 往返
test('JSON.parse(JSON.stringify(MAX_LENGTH)) 保持精度', () => {
  const str = JSON.stringify(constants.MAX_LENGTH);
  const parsed = JSON.parse(str);
  return parsed === constants.MAX_LENGTH;
});

// 29. 数组包含
test('[MAX_LENGTH].includes(MAX_LENGTH) 为 true', () => {
  const arr = [constants.MAX_LENGTH];
  return arr.includes(constants.MAX_LENGTH);
});

// 30. Set 查找
test('new Set([MAX_LENGTH]).has(MAX_LENGTH) 为 true', () => {
  const set = new Set([constants.MAX_LENGTH]);
  return set.has(constants.MAX_LENGTH);
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
