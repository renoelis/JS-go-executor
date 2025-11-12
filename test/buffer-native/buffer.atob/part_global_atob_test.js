// 全局 atob/btoa 函数测试 - Node.js v25 兼容性
// 测试全局作用域中的 atob 和 btoa 函数

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// === 全局函数存在性测试 ===

test('全局 atob 函数存在', () => {
  return typeof atob === 'function';
});

test('全局 btoa 函数存在', () => {
  return typeof btoa === 'function';
});

// === 基本功能测试 ===

test('全局 atob: 基本解码', () => {
  const result = atob('SGVsbG8=');
  return result === 'Hello';
});

test('全局 btoa: 基本编码', () => {
  const result = btoa('Hello');
  return result === 'SGVsbG8=';
});

// === 往返测试 ===

test('全局函数往返: ASCII 字符', () => {
  const original = 'Hello World';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('全局函数往返: 特殊字符', () => {
  const original = '!@#$%^&*()';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('全局函数往返: 高位字节', () => {
  const original = 'ÿÿÿ'; // 255, 255, 255
  const encoded = btoa(original);
  const decoded = atob(encoded);
  
  if (decoded !== original) {
    throw new Error(`往返失败: "${original}" -> "${encoded}" -> "${decoded}"`);
  }
  
  return true;
});

// === 错误处理测试 ===

test('全局 atob: 无效字符错误', () => {
  try {
    atob('invalid!@#');
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.name === 'InvalidCharacterError';
  }
});

test('全局 atob: 参数数量错误', () => {
  try {
    atob();
    return false;
  } catch (e) {
    return e.message.includes('required') || e.name === 'TypeError';
  }
});

// === Symbol 类型测试 ===

test('全局 atob: Symbol 参数错误', () => {
  try {
    atob(Symbol('test'));
    return false;
  } catch (e) {
    return e.message.includes('Symbol') && e.name === 'TypeError';
  }
});

// === 与模块版本的一致性测试 ===

test('全局版本与模块版本一致性: 基本测试', () => {
  const { atob: moduleAtob } = require('buffer');
  
  const input = 'SGVsbG8gV29ybGQ=';
  const globalResult = atob(input);
  const moduleResult = moduleAtob(input);
  
  return globalResult === moduleResult;
});

test('全局版本与模块版本一致性: 高位字节', () => {
  const { atob: moduleAtob, btoa: moduleBtoa } = require('buffer');
  
  const original = String.fromCharCode(255, 128, 0);
  const globalEncoded = btoa(original);
  const moduleEncoded = moduleBtoa(original);
  
  if (globalEncoded !== moduleEncoded) {
    throw new Error(`编码不一致: global="${globalEncoded}", module="${moduleEncoded}"`);
  }
  
  const globalDecoded = atob(globalEncoded);
  const moduleDecoded = moduleAtob(moduleEncoded);
  
  return globalDecoded === moduleDecoded;
});

// === 边界条件测试 ===

test('全局 atob: 空字符串', () => {
  const result = atob('');
  return result === '';
});

test('全局 atob: 只有填充', () => {
  try {
    atob('====');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Invalid') || e.name === 'InvalidCharacterError';
  }
});

test('全局 atob: 长字符串处理', () => {
  const longString = 'A'.repeat(1000);
  const encoded = btoa(longString);
  const decoded = atob(encoded);
  return decoded === longString;
});

// === 函数属性测试 ===

test('全局 atob 函数长度属性', () => {
  return atob.length === 1;
});

test('全局 btoa 函数长度属性', () => {
  return btoa.length === 1;
});

// === 输出结果 ===

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

const testResults = {
  success: failed === 0,
  summary: {
    total: tests.length,
    passed: passed,
    failed: failed,
    successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
  },
  tests: tests
};

console.log(JSON.stringify(testResults, null, 2));
return testResults;
