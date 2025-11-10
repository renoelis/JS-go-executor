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
  return `${mark} ${testName}\n   期望: ${formatObj(expected)}\n   实际: ${formatObj(actual)}\n`;
}

// 辅助函数：对比字符串
function checkString(testName, actual, expected) {
  const passed = actual === expected;
  const mark = passed ? '✅' : '❌';
  return `${mark} ${testName}\n   期望: "${expected}"\n   实际: "${actual}"\n`;
}

// 固定输入／输出对照测试
let result = "\n=== 固定输入／输出对照测试 qs v6.14.0（CommonJS） ===\n";

// 固定解析测试
result += "\n========== 测试 1: parse 固定输入 ==========\n";
const fixedStr1 = "key1=value1&key2=value2";
const expectedObj1 = { key1: 'value1', key2: 'value2' };
result += checkResult('parse 固定字符串', qs.parse(fixedStr1), expectedObj1);

// 固定对象串行化测试
result += "\n========== 测试 2: stringify 固定输入 ==========\n";
const fixedObj2 = { alpha: 'a', beta: 'b' };
const expectedStr2 = "alpha=a&beta=b";
result += checkString('stringify 固定对象', qs.stringify(fixedObj2), expectedStr2);

// 嵌套对象测试
result += "\n========== 测试 3: 嵌套对象 固定测试 ==========\n";
const fixedStr3 = "outer[inner]=value";
const expectedObj3 = { outer: { inner: 'value' } };
result += checkResult('parse 嵌套对象', qs.parse(fixedStr3), expectedObj3);

// 数组 测试 固定输入
result += "\n========== 测试 4: 数组 固定测试 ==========\n";
const fixedStr4 = "arr[]=one&arr[]=two";
const expectedObj4 = { arr: ['one','two'] };
result += checkResult('parse 数组', qs.parse(fixedStr4), expectedObj4);

// stringify 数组 固定输入
result += "\n========== 测试 5: stringify 数组 固定测试 ==========\n";
const fixedObj5 = { arr: ['one','two'] };
const expectedStr5 = "arr%5B0%5D=one&arr%5B1%5D=two"; // 默认编码后的形式
result += checkString('stringify 数组', qs.stringify(fixedObj5), expectedStr5);

// 完成
result += "\n=== 固定输入／输出测试结束 ===";

// 返回测试结果
return result;
