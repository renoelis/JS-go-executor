// qs_test_fixes_verification.cjs.js
// 验证已修复的高优先级问题
const qs = require('qs');

function formatObj(obj) {
  return JSON.stringify(obj);
}

console.log("=== 验证已修复的高优先级问题 ===\n");

// 1. sort 自定义排序
console.log("-- 测试 1: sort 自定义排序 --");
const sortObj = { b:'2', a:'1', c:'3' };
const sortResult = qs.stringify(sortObj, { sort: (a,b)=> a.localeCompare(b) });
console.log("输入:", formatObj(sortObj));
console.log("sort 结果:", sortResult);
console.log("预期: a=1&b=2&c=3");
console.log("是否正确:", sortResult === "a=1&b=2&c=3" ? "✅" : "❌");

// 2. serializeDate 自定义日期序列化
console.log("\n-- 测试 2: serializeDate --");
const dateObj = { d: new Date('2020-01-01T00:00:00Z'), e: 'val' };
const dateResult = qs.stringify(dateObj, {
  serializeDate: d => d.getTime().toString()
});
console.log("输入: { d: Date(2020-01-01), e: 'val' }");
console.log("serializeDate 结果:", dateResult);
console.log("预期包含: d=1577836800000");
console.log("是否正确:", dateResult.includes("d=1577836800000") && dateResult.includes("e=val") ? "✅" : "❌");

// 3. RFC 格式和 + 编码
console.log("\n-- 测试 3: RFC 格式和 + 编码 --");
const plusObj = { a: 'b c', d: 'd+e' };
const rfc3986Result = qs.stringify(plusObj);
const rfc1738Result = qs.stringify(plusObj, { format: 'RFC1738' });
console.log("输入:", formatObj(plusObj));
console.log("RFC3986 (默认):", rfc3986Result);
console.log("RFC1738:", rfc1738Result);
console.log("RFC3986 预期: a=b%20c&d=d%2Be");
console.log("RFC1738 预期: a=b+c&d=d%2Be");
console.log("RFC3986 正确:", rfc3986Result === "a=b%20c&d=d%2Be" ? "✅" : "❌");
console.log("RFC1738 正确:", rfc1738Result === "a=b+c&d=d%2Be" ? "✅" : "❌");

// 4. depth=false
console.log("\n-- 测试 4: depth=false --");
const depthStr = "a[b][c][d][e][f]=value";
const depthFalseResult = qs.parse(depthStr, { depth: false });
console.log("输入:", depthStr);
console.log("depth=false 结果:", formatObj(depthFalseResult));
console.log("预期:", formatObj({"a[b][c][d][e][f]":"value"}));
console.log("是否正确:", JSON.stringify(depthFalseResult) === JSON.stringify({"a[b][c][d][e][f]":"value"}) ? "✅" : "❌");

// 5. parse non-string (边界情况)
console.log("\n-- 测试 5: parse non-string --");
const nonStringResult = qs.parse(123);
console.log("parse(123):", formatObj(nonStringResult));
console.log("预期: {}");
console.log("是否正确:", JSON.stringify(nonStringResult) === "{}" ? "✅" : "❌");

console.log("\n=== 验证测试结束 ===");




