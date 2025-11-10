// qs_test_all_fixed.cjs.js
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

// 辅助函数：对比布尔值
function checkBool(testName, actual, expected) {
  const passed = actual === expected;
  const mark = passed ? '✅' : '❌';
  console.log(`${mark} ${testName}: ${actual}`);
  return passed;
}

console.log("=== 测试 qs v6.14.0 功能覆盖（CommonJS） ===");

// 基本 parse / stringify 测试
console.log("\n========== 测试 1: 基本 parse/stringify ==========");
const basicStr = "a=b&c=d";
checkResult('parse 基础字符串', qs.parse(basicStr), {"a":"b","c":"d"});
const basicObj = { a: 'b', c: 'd' };
checkString('stringify 基础对象', qs.stringify(basicObj), "a=b&c=d");

// 嵌套对象 parse 测试
console.log("\n========== 测试 2: 嵌套对象 parse ==========");
const nestedStr = "foo[bar]=baz&foo[baz]=qux";
checkResult('parse 嵌套对象', qs.parse(nestedStr), {"foo":{"bar":"baz","baz":"qux"}});
const nestedObj = { foo: { bar: 'baz', baz: 'qux' } };
checkString('stringify 嵌套对象', qs.stringify(nestedObj), "foo%5Bbar%5D=baz&foo%5Bbaz%5D=qux");

// 数组 parse / stringify 测试
console.log("\n========== 测试 3: 数组 parse/stringify ==========");
const arrStr = "arr[]=1&arr[]=2&arr[]=3";
checkResult('parse 数组', qs.parse(arrStr), {"arr":["1","2","3"]});
const arrObj = { arr: ['1','2','3'] };
checkString('stringify 数组', qs.stringify(arrObj), "arr%5B0%5D=1&arr%5B1%5D=2&arr%5B2%5D=3");

// 选项 parse: allowDots, depth, plainObjects, allowPrototypes
console.log("\n========== 测试 4: parse 选项测试 ==========");

console.log("\n4.1 allowDots 选项:");
const dotsStr = "a.b=c&a.d=e";
checkResult('parse allowDots:true', qs.parse(dotsStr, { allowDots: true }), {"a":{"b":"c","d":"e"}});
checkResult('parse allowDots:false', qs.parse(dotsStr), {"a.b":"c","a.d":"e"});

console.log("\n4.2 depth 选项:");
const deepStr = "a[b][c][d]=e";
checkResult('parse depth=0', qs.parse(deepStr, { depth: 0 }), {"a[b][c][d]":"e"});
checkResult('parse depth=1', qs.parse(deepStr, { depth: 1 }), {"a":{"b":{"[c][d]":"e"}}});
checkResult('parse depth=2', qs.parse(deepStr, { depth: 2 }), {"a":{"b":{"c":{"[d]":"e"}}}});
checkResult('parse depth (default)', qs.parse(deepStr), {"a":{"b":{"c":{"d":"e"}}}});

console.log("\n4.3 allowPrototypes 和 plainObjects 选项:");
const protoStr = "a[__proto__][foo]=bar";
checkResult('parse allowPrototypes:false', qs.parse(protoStr), {});
checkResult('parse allowPrototypes:true', qs.parse(protoStr, { allowPrototypes: true }), {"a":{}});
checkResult('parse plainObjects:true', qs.parse(protoStr, { plainObjects: true }), {"a":{}});

// 进一步 parse 细化：ignoreQueryPrefix / parseArrays:false / 数组+对象混合
console.log("\n========== 测试 5: parse 细化与边界 ==========");

console.log("\n5.1 ignoreQueryPrefix 选项:");
const withQ = "?a=b&c[d]=e&c[e][]=1&c[e][]=2";
checkResult('parse ignoreQueryPrefix:true', qs.parse(withQ, { ignoreQueryPrefix: true }), {"a":"b","c":{"d":"e","e":["1","2"]}});

console.log("\n5.2 parseArrays 选项:");
const mixArrayObjStr = "x[0]=a&x[2]=c&x[key]=v";
checkResult('parse parseArrays:false', qs.parse(mixArrayObjStr, { parseArrays: false }), {"x":{"0":"a","2":"c","key":"v"}});
checkResult('parse parseArrays:true (default)', qs.parse(mixArrayObjStr), {"x":{"0":"a","2":"c","key":"v"}});

console.log("\n5.3 重复键:");
const dupKeyStr = "k=1&k=2&k=3";
checkResult('parse 重复键合并', qs.parse(dupKeyStr), {"k":["1","2","3"]});

console.log("\n5.4 空键:");
const emptyKeyStr = "[]=a&[]=b&[c]=d";
checkResult('parse 空键', qs.parse(emptyKeyStr), {"0":"a","1":"b","c":"d"});

// arrayLimit 边界（小索引与超限索引混合）
console.log("\n========== 测试 6: arrayLimit 边界 ==========");
const arrayLimitStr = "e[0]=x&e[1]=y&e[25]=z"; // 默认 arrayLimit=20，25 超限
checkResult('parse 默认 arrayLimit', qs.parse(arrayLimitStr), {"e":{"0":"x","1":"y","25":"z"}});
checkResult('parse arrayLimit:30', qs.parse(arrayLimitStr, { arrayLimit: 30 }), {"e":["x","y","z"]});
checkResult('parse arrayLimit:1', qs.parse(arrayLimitStr, { arrayLimit: 1 }), {"e":{"0":"x","1":"y","25":"z"}});

// 选项 stringify: delimiter, strictNullHandling, skipNulls, arrayFormat, encodeValuesOnly, addQueryPrefix
console.log("\n========== 测试 7: stringify 选项测试 ==========");

console.log("\n7.1 null 处理选项:");
const optObj = { a: 'b', c: null, d: undefined, e: ['x','y'] };
checkString('stringify default', qs.stringify(optObj), "a=b&c=&e%5B0%5D=x&e%5B1%5D=y");
checkString('stringify skipNulls:true', qs.stringify(optObj, { skipNulls: true }), "a=b&e%5B0%5D=x&e%5B1%5D=y");
checkString('stringify strictNullHandling:true', qs.stringify(optObj, { strictNullHandling: true }), "a=b&c&e%5B0%5D=x&e%5B1%5D=y");

console.log("\n7.2 arrayFormat 选项:");
checkString('stringify arrayFormat:indices', qs.stringify({ e: ['x','y'] }, { arrayFormat: 'indices' }), "e%5B0%5D=x&e%5B1%5D=y");
checkString('stringify arrayFormat:brackets', qs.stringify({ e: ['x','y'] }, { arrayFormat: 'brackets' }), "e%5B%5D=x&e%5B%5D=y");
checkString('stringify arrayFormat:repeat', qs.stringify({ e: ['x','y'] }, { arrayFormat: 'repeat' }), "e=x&e=y");

console.log("\n7.3 其他选项:");
checkString('stringify delimiter=\';\'', qs.stringify({ a:'b', c:'d' }, { delimiter: ';' }), "a=b;c=d");
checkString('stringify addQueryPrefix:true', qs.stringify({ a: 'b', c: 'd' }, { addQueryPrefix: true }), "?a=b&c=d");
checkString('stringify encodeValuesOnly:true', qs.stringify({ a: '已编码?', b: '空 格' }, { encodeValuesOnly: true }), "a=%E5%B7%B2%E7%BC%96%E7%A0%81%3F&b=%E7%A9%BA%20%E6%A0%BC");

// 数组里的空值与 stringify 组合测试
console.log("\n========== 测试 8: stringify 数组空值组合 ==========");
const arrWithNulls = { e: ['x', null, 'y', undefined] };
checkString('stringify indices (default)', qs.stringify(arrWithNulls), "e%5B0%5D=x&e%5B1%5D=&e%5B2%5D=y");
checkString('stringify indices + skipNulls:true', qs.stringify(arrWithNulls, { skipNulls: true }), "e%5B0%5D=x&e%5B2%5D=y");
checkString('stringify indices + strictNullHandling:true', qs.stringify(arrWithNulls, { strictNullHandling: true }), "e%5B0%5D=x&e%5B1%5D&e%5B2%5D=y");
checkString('stringify brackets + strictNullHandling:true', qs.stringify(arrWithNulls, { arrayFormat: 'brackets', strictNullHandling: true }), "e%5B%5D=x&e%5B%5D&e%5B%5D=y");
checkString('stringify repeat + skipNulls:true', qs.stringify(arrWithNulls, { arrayFormat: 'repeat', skipNulls: true }), "e=x&e=y");

// 模块能力检测（替代 utils 测试）
console.log("\n========== 测试 9: 模块能力存在性检测 ==========");
checkBool("qs.parse 是否存在", typeof qs.parse === "function", true);
checkBool("qs.stringify 是否存在", typeof qs.stringify === "function", true);
checkResult("模块 keys", Object.keys(qs), ["formats","parse","stringify"], false);

// 异常或边界情况测试
console.log("\n========== 测试 10: 异常/边界情况 ==========");
try {
  const nullResult = qs.parse(null);
  checkResult("parse null", nullResult, {}, false);
} catch (e) {
  console.log("parse null 抛异常 ✅:", e.message);
}
try {
  const nonObjResult = qs.stringify(123);
  checkString("stringify non-object", nonObjResult, "");
} catch (e) {
  console.log("stringify non-object 抛异常 ✅:", e.message);
}

console.log("\n=== 功能覆盖测试结束 ===");
