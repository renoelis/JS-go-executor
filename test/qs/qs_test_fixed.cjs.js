// qs_test_fixed.cjs.js
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

// 辅助函数：对比字符串
function checkString(testName, actual, expected) {
  const passed = actual === expected;
  const mark = passed ? '✅' : '❌';
  console.log(`${mark} ${testName}`);
  console.log(`   期望: "${expected}"`);
  console.log(`   实际: "${actual}"`);
  return passed;
}

console.log("=== 固定输入／输出对照测试 qs v6.14.0（CommonJS） ===");

// 固定解析测试
console.log("\n========== 测试 1: parse 固定输入 ==========");
const fixedStr1 = "key1=value1&key2=value2";
const expectedObj1 = { key1: 'value1', key2: 'value2' };
console.log("输入:", fixedStr1);
const parsed1 = qs.parse(fixedStr1);
checkResult('parse 固定字符串', parsed1, expectedObj1);

// 固定对象串行化测试
console.log("\n========== 测试 2: stringify 固定输入 ==========");
const fixedObj2 = { alpha: 'a', beta: 'b' };
const expectedStr2 = "alpha=a&beta=b";
console.log("输入对象:", formatObj(fixedObj2));
const str2 = qs.stringify(fixedObj2);
checkString('stringify 固定对象', str2, expectedStr2);

// 嵌套对象测试
console.log("\n========== 测试 3: 嵌套对象 固定测试 ==========");
const fixedStr3 = "outer[inner]=value";
const expectedObj3 = { outer: { inner: 'value' } };
console.log("输入:", fixedStr3);
const parsed3 = qs.parse(fixedStr3);
checkResult('parse 嵌套对象', parsed3, expectedObj3);

// 数组 测试 固定输入
console.log("\n========== 测试 4: 数组 固定测试 ==========");
const fixedStr4 = "arr[]=one&arr[]=two";
const expectedObj4 = { arr: ['one','two'] };
console.log("输入:", fixedStr4);
const parsed4 = qs.parse(fixedStr4);
checkResult('parse 数组', parsed4, expectedObj4);

// stringify 数组 固定输入
console.log("\n========== 测试 5: stringify 数组 固定测试 ==========");
const fixedObj5 = { arr: ['one','two'] };
const expectedStr5 = "arr%5B0%5D=one&arr%5B1%5D=two"; // 默认编码后的形式
const str5 = qs.stringify(fixedObj5);
console.log("输入对象:", formatObj(fixedObj5));
checkString('stringify 数组', str5, expectedStr5);

// 完成
console.log("\n=== 固定输入／输出测试结束 ===");