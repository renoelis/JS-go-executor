// 简单的 TypedArray 测试
console.log("=== 测试 TypedArray 创建 ===");

const uint8 = new Uint8Array([72, 101, 108, 108, 111]);
console.log("✅ Uint8Array 创建成功");
console.log("长度:", uint8.length);
console.log("类型:", uint8.constructor.name);
console.log("第一个元素:", uint8[0]);

console.log("\n=== 测试 URLSearchParams 创建 ===");
const params = new URLSearchParams();
params.append("name", "test");
console.log("✅ URLSearchParams 创建成功");
console.log("toString:", params.toString());

// 返回结果
return {
    success: true,
    message: "TypedArray 和 URLSearchParams 基本功能正常"
};








