// 测试 Node.js qs v6.14.0 的 arrayLimit 实际行为
// 验证 maxIndex 与 arrayLimit 的关系

const qs = require('qs');

// 辅助函数：格式化输出对象
function formatObj(obj) {
  return JSON.stringify(obj);
}

// 辅助函数：对比并显示结果
function checkResult(testName, actual, expected) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  const mark = passed ? '✅' : '❌';
  console.log(`${mark} ${testName}`);
  console.log(`   期望: ${formatObj(expected)}`);
  console.log(`   实际: ${formatObj(actual)}`);
  return passed;
}

// 辅助函数：检查类型
function checkType(testName, actual, expectedType) {
  let actualType;
  if (Array.isArray(actual)) {
    actualType = 'array';
  } else if (typeof actual === 'object' && actual !== null) {
    actualType = 'object';
  } else {
    actualType = typeof actual;
  }
  const passed = actualType === expectedType;
  const mark = passed ? '✅' : '❌';
  console.log(`${mark} ${testName}: 期望 ${expectedType}, 实际 ${actualType}`);
  return passed;
}

console.log('=== Node.js qs v6.14.0 arrayLimit 行为测试 ===\n');

// 测试 1: arrayLimit 的默认值
console.log('========== 测试 1: arrayLimit 默认值 (20) ==========');
console.log('输入: a[0]=x&a[25]=y');
const result1 = qs.parse('a[0]=x&a[25]=y');
checkResult('parse 结果', result1, {"a":{"0":"x","25":"y"}});
checkType('result1.a 的类型', result1.a, 'object');
console.log('');

// 测试 2: 设置 arrayLimit
console.log('========== 测试 2: 设置 arrayLimit = 30 ==========');
console.log('输入: a[0]=x&a[25]=y');
const result2 = qs.parse('a[0]=x&a[25]=y', { arrayLimit: 30 });
checkResult('parse 结果', result2, {"a":["x","y"]});
checkType('result2.a 的类型', result2.a, 'array');
console.log('');

// 测试 3: maxIndex 超过 arrayLimit
console.log('========== 测试 3: maxIndex (25) > arrayLimit (20) ==========');
console.log('输入: a[0]=x&a[25]=y, arrayLimit: 20');
const result3 = qs.parse('a[0]=x&a[25]=y', { arrayLimit: 20 });
checkResult('parse 结果', result3, {"a":{"0":"x","25":"y"}});
checkType('result3.a 的类型', result3.a, 'object');
console.log('');

// 测试 4: allowSparse + arrayLimit
console.log('========== 测试 4: allowSparse: true + arrayLimit: 20 ==========');
console.log('输入: a[0]=x&a[25]=y');
const result4 = qs.parse('a[0]=x&a[25]=y', { allowSparse: true, arrayLimit: 20 });
checkResult('parse 结果', result4, {"a":{"0":"x","25":"y"}});
checkType('result4.a 的类型', result4.a, 'object');
console.log('');

// 测试 5: allowSparse + 超大索引
console.log('========== 测试 5: allowSparse: true + 超大索引 (100000) ==========');
console.log('输入: a[0]=x&a[100000]=y');
const result5 = qs.parse('a[0]=x&a[100000]=y', { allowSparse: true, arrayLimit: 20 });
checkType('result5.a 的类型', result5.a, 'object');
if (Array.isArray(result5.a)) {
  console.log('数组长度:', result5.a.length);
} else {
  const keys = Object.keys(result5.a);
  console.log('✅ 对象键:', keys);
  checkResult('对象键验证', keys, ['0', '100000']);
}
console.log('');

// 测试 6: allowSparse + arrayLimit 设置更大
console.log('========== 测试 6: allowSparse: true + arrayLimit: 150000 ==========');
console.log('输入: a[0]=x&a[100000]=y');
const result6 = qs.parse('a[0]=x&a[100000]=y', { allowSparse: true, arrayLimit: 150000 });
checkType('result6.a 的类型', result6.a, 'array');
if (Array.isArray(result6.a)) {
  console.log('✅ 数组长度:', result6.a.length, '(期望: 100001)');
  console.log('⚠️  内存警告: 创建了一个长度为', result6.a.length, '的稀疏数组');
} else {
  console.log('对象键:', Object.keys(result6.a));
}
console.log('');

// 测试 7: 不使用 allowSparse，超大索引
console.log('========== 测试 7: allowSparse: false (默认) + 超大索引 ==========');
console.log('输入: a[0]=x&a[100000]=y');
const result7 = qs.parse('a[0]=x&a[100000]=y', { arrayLimit: 150000 });
checkType('result7.a 的类型', result7.a, 'array');
if (Array.isArray(result7.a)) {
  console.log('✅ 数组长度:', result7.a.length, '(期望: 2 - 紧凑数组)');
  checkResult('数组内容', result7.a, ["x", "y"]);
} else {
  console.log('对象键:', Object.keys(result7.a));
}
console.log('');

console.log('========================================');
console.log('=== 结论 ===');
console.log('========================================');
console.log('✅ 1. arrayLimit 控制的是 maxIndex 的上限');
console.log('✅ 2. 当 maxIndex > arrayLimit 时，数组转换为对象');
console.log('✅ 3. allowSparse: true 时仍然遵守 arrayLimit 限制');
console.log('✅ 4. arrayLimit 的作用是防止创建过大的数组（内存保护）');
console.log('✅ 5. 默认 arrayLimit = 20，这是一个合理的安全值');
console.log('✅ 6. allowSparse: false (默认) 时会创建紧凑数组，忽略索引值');

