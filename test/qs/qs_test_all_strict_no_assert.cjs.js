// qs_test_all_strict_no_assert.cjs.js
const qs = require('qs');

// 辅助函数：格式化输出对象
function formatObj(obj) {
  return JSON.stringify(obj);
}

// 辅助函数：对比并显示结果
function checkResult(testName, actual, expected, showValues = true) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  const mark = passed ? '✅' : '❌';
  if (showValues) {
    console.log(`${mark} ${testName}`);
    console.log(`   期望: ${formatObj(expected)}`);
    console.log(`   实际: ${formatObj(actual)}`);
  } else {
    console.log(`${mark} ${testName}: ${passed ? '通过' : '失败'}`);
  }
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

console.log("=== 最严格版测试 qs v6.14.0（CommonJS） ===");

// 工具函数：来回一致性（round-trip）测试
function roundTrip(inputStr, expected, optionsParse = {}, optionsStringify = {}) {
  console.log(`\n--- Round-trip 测试: "${inputStr}"`);
  const parsed = qs.parse(inputStr, optionsParse);
  console.log("  解析后对象:", formatObj(parsed));
  const reStr = qs.stringify(parsed, optionsStringify);
  console.log("  再序列化为字符串:", reStr);
  const same = (reStr === expected);
  const mark = same ? '✅' : '❌';
  console.log(`${mark} 来回一致性: 期望 "${expected}", 实际 "${reStr}"`);
  return same;
}

// 1. 基础 parse/stringify + round-trip
console.log("\n========== 测试 1: 基础 parse/stringify ==========");
const str1 = "foo=bar&baz=qux";
console.log("输入字符串:", str1);
checkResult("parse 基础字符串", qs.parse(str1), {"foo":"bar","baz":"qux"});
checkString("stringify 基础对象", qs.stringify({ foo: "bar", baz: "qux" }), "foo=bar&baz=qux");
roundTrip(str1, "foo=bar&baz=qux");

// 2. 嵌套对象 + round-trip
console.log("\n========== 测试 2: 嵌套对象 ==========");
const str2 = "outer[inner]=value&outer[inn2]=val2";
console.log("输入字符串:", str2);
checkResult("parse 嵌套对象", qs.parse(str2), {"outer":{"inner":"value","inn2":"val2"}});
const obj2 = { outer: { inner: "value", inn2: "val2" } };
checkString("stringify 嵌套对象", qs.stringify(obj2), "outer%5Binner%5D=value&outer%5Binn2%5D=val2");
roundTrip(str2, "outer%5Binner%5D=value&outer%5Binn2%5D=val2");

// 3. 数组 + round-trip
console.log("\n========== 测试 3: 数组 ==========");
const str3 = "arr[]=1&arr[]=2&arr[]=3";
console.log("输入字符串:", str3);
checkResult("parse 数组", qs.parse(str3), {"arr":["1","2","3"]});
const obj3 = { arr: ["1","2","3"] };
checkString("stringify 数组", qs.stringify(obj3), "arr%5B0%5D=1&arr%5B1%5D=2&arr%5B2%5D=3");
roundTrip(str3, "arr%5B0%5D=1&arr%5B1%5D=2&arr%5B2%5D=3");

// 4. stringify 含选项 + round-trip
console.log("\n========== 测试 4: stringify 含选项 ==========");
const obj4 = { a:"x", b:null, c:undefined, d:["m","n"] };
const opts4 = { skipNulls:true, arrayFormat:"repeat", delimiter:";" };
const str4 = qs.stringify(obj4, opts4);
checkString("stringify 使用选项", str4, "a=x;d=m;d=n");
checkResult("parse 后对象", qs.parse(str4), {"a":"x;d=m;d=n"});
const re4 = qs.stringify(qs.parse(str4), opts4);
checkString("再序列化一致性", re4, "a=x%3Bd%3Dm%3Bd%3Dn");
roundTrip(str4, "a=x%3Bd%3Dm%3Bd%3Dn", {}, {});

// 5. parse 选项测试 + round-trip
console.log("\n========== 测试 5: parse 选项测试 ==========");

console.log("\n5.1 allowDots 选项:");
const str5a = "a.b=c&a.d=e";
console.log("输入:", str5a);
checkResult("allowDots:true", qs.parse(str5a, { allowDots:true }), {"a":{"b":"c","d":"e"}});
roundTrip(str5a, "a%5Bb%5D=c&a%5Bd%5D=e", { allowDots:true }, {});

console.log("\n5.2 depth 选项:");
const str5b = "a[b][c][d][e]=v";
console.log("输入:", str5b);
checkResult("depth=2", qs.parse(str5b, { depth:2 }), {"a":{"b":{"c":{"[d][e]":"v"}}}});
roundTrip(str5b, "a%5Bb%5D%5Bc%5D%5B%5Bd%5D%5Be%5D%5D=v", { depth:2 }, {});

console.log("\n5.3 comma 选项:");
const str5c = "x=1,2,3";
console.log("输入:", str5c);
checkResult("comma:true", qs.parse(str5c, { comma:true }), {"x":["1","2","3"]});
roundTrip(str5c, "x%5B0%5D=1&x%5B1%5D=2&x%5B2%5D=3", { comma:true }, {});

console.log("\n5.4 delimiter 选项:");
const str5d = "p=1;q=2,r=3";
console.log("输入:", str5d);
checkResult("delimiter=/[;,]/", qs.parse(str5d, { delimiter:/[;,]/ }), {"p":"1","q":"2","r":"3"});
roundTrip(str5d, "p=1&q=2&r=3", { delimiter:/[;,]/ }, {});

// 6. parameterLimit & throwOnLimitExceeded 测试
console.log("\n========== 测试 6: parameterLimit & throwOnLimitExceeded ==========");
const manyParams = Array.from({ length: 50 }, (_, i) => `k${i}=v${i}`).join("&");
console.log("生成参数数量:", manyParams.split("&").length);
const parsedKeys = Object.keys(qs.parse(manyParams)).length;
checkResult("默认解析 50 个参数", parsedKeys, 50, false);
try {
  console.log("\n测试 parameterLimit=10, throwOnLimitExceeded=true:");
  qs.parse(manyParams, { parameterLimit:10, throwOnLimitExceeded:true });
  console.log("❌ 未抛异常（期望抛出）");
} catch(e) {
  console.log("✅ 捕获异常:", e.message);
}

// 7. 边界／错误输入 + round-trip
console.log("\n========== 测试 7: 边界/错误输入 ==========");
try {
  const nullResult = qs.parse(null);
  checkResult("parse(null)", nullResult, {}, false);
  console.log("❌ 未抛异常（这里不报错也正常，qs 允许 null）");
} catch(e) {
  console.log("✅ parse(null) 抛异常:", e.message);
}
const emptyStr = "";
checkResult("parse 空字符串", qs.parse(emptyStr, { plainObjects:true }), {}, false);
checkString("stringify 空对象", qs.stringify({}), "");

roundTrip("", "", {}, {});  // test empty string -> object -> string

// 8. 来回一致性广泛测试
console.log("\n========== 测试 8: 来回一致性广泛测试 ==========");
const testInputs = [
  { input: "a=1", expected: "a=1" },
  { input: "nested[one]=first&nested[two]=second", expected: "nested%5Bone%5D=first&nested%5Btwo%5D=second" },
  { input: "list[]=x&list[]=y&list[]=z", expected: "list%5B0%5D=x&list%5B1%5D=y&list%5B2%5D=z" },
  { input: "filter=true&arr[]=5&arr[]=6", expected: "filter=true&arr%5B0%5D=5&arr%5B1%5D=6" },
  { input: "deep[a][b][c]=d", expected: "deep%5Ba%5D%5Bb%5D%5Bc%5D=d" }
];
for (const test of testInputs) {
  const ok = roundTrip(test.input, test.expected);
}

console.log("\n=== 最严格版测试结束 ===");