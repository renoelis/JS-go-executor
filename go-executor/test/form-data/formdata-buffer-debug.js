/**
 * Buffer 处理调试
 */

console.log("=== Buffer 调试测试 ===");

const FormData = require("form-data");
console.log("✅ FormData 导入成功");

const form = new FormData();
console.log("✅ FormData 实例创建成功");

// 创建 Buffer
const buffer = Buffer.from("Hello World");
console.log("\nBuffer 信息:");
console.log("- 类型:", typeof buffer);
console.log("- 长度:", buffer.length);
console.log("- Constructor:", buffer.constructor.name);
console.log("- 是数组?", Array.isArray(buffer));
console.log("- 是 Uint8Array?", buffer instanceof Uint8Array);

// 尝试访问 Buffer 的属性和方法
console.log("\nBuffer 的方法:");
console.log("- toString 存在?", typeof buffer.toString === "function");
console.log("- toJSON 存在?", typeof buffer.toJSON === "function");
console.log("- slice 存在?", typeof buffer.slice === "function");

// 尝试读取 Buffer 内容
console.log("\nBuffer 内容:");
try {
  const str = buffer.toString();
  console.log("- toString():", str);
} catch (e) {
  console.log("- toString() 失败:", e.message);
}

try {
  const json = buffer.toJSON();
  console.log("- toJSON():", JSON.stringify(json));
} catch (e) {
  console.log("- toJSON() 失败:", e.message);
}

// 尝试逐字节读取
console.log("\n尝试逐字节读取:");
try {
  const bytes = [];
  for (let i = 0; i < Math.min(5, buffer.length); i++) {
    bytes.push(buffer[i]);
  }
  console.log("- 前5字节:", bytes);
} catch (e) {
  console.log("- 读取失败:", e.message);
}

// 现在尝试 append
console.log("\n=== 尝试 append ===");
try {
  form.append("test", "string value");
  console.log("✅ 字符串 append 成功");
} catch (e) {
  console.log("❌ 字符串 append 失败:", e.message);
  return { error: "字符串 append 失败", detail: e.message };
}

try {
  console.log("\n准备 append Buffer...");
  form.append("file", buffer, "test.txt");
  console.log("✅ Buffer append 成功");
} catch (e) {
  console.log("❌ Buffer append 失败");
  console.log("错误:", e.message);
  console.log("堆栈:", e.stack);
  return { error: "Buffer append 失败", detail: e.message, stack: e.stack };
}

console.log("\n=== 测试完成 ===");
return { success: true };

