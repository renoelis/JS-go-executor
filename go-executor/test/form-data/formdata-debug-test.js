/**
 * 调试测试 - 最小化版本
 */

try {
  console.log("=== 测试开始 ===");
  
  console.log("步骤1: 导入 FormData");
  const FormData = require("form-data");
  console.log("✅ 导入成功");
  
  console.log("\n步骤2: 创建实例");
  const form = new FormData();
  console.log("✅ 实例创建成功");
  console.log("form 类型:", typeof form);
  console.log("form 是否为 null:", form === null);
  console.log("form 是否为 undefined:", form === undefined);
  
  console.log("\n步骤3: 检查方法是否存在");
  console.log("append 方法存在?", typeof form.append === "function");
  console.log("getBoundary 方法存在?", typeof form.getBoundary === "function");
  console.log("getHeaders 方法存在?", typeof form.getHeaders === "function");
  console.log("getBuffer 方法存在?", typeof form.getBuffer === "function");
  
  console.log("\n步骤4: 调用 getBoundary");
  const boundary = form.getBoundary();
  console.log("✅ Boundary:", boundary);
  
  console.log("\n步骤5: 添加字符串字段");
  form.append("name", "test");
  console.log("✅ 字符串字段添加成功");
  
  console.log("\n步骤6: 创建 Buffer");
  const testBuffer = Buffer.from("Hello");
  console.log("✅ Buffer 创建成功");
  console.log("Buffer 长度:", testBuffer.length);
  console.log("Buffer 类型:", typeof testBuffer);
  console.log("Buffer constructor:", testBuffer.constructor.name);
  
  console.log("\n步骤7: 添加 Buffer（字符串 filename）");
  try {
    form.append("file", testBuffer, "test.txt");
    console.log("✅ Buffer 添加成功");
  } catch (e) {
    console.log("❌ Buffer 添加失败");
    console.log("错误:", e.message);
    console.log("堆栈:", e.stack);
    return { error: "Buffer 添加失败", detail: e.message };
  }
  
  console.log("\n步骤8: 获取长度");
  try {
    const length = form.getLengthSync();
    console.log("✅ 长度:", length);
  } catch (e) {
    console.log("❌ 获取长度失败");
    console.log("错误:", e.message);
    return { error: "获取长度失败", detail: e.message };
  }
  
  console.log("\n步骤9: 获取 Buffer");
  try {
    const buffer = form.getBuffer();
    console.log("✅ Buffer 获取成功");
    console.log("Buffer 长度:", buffer.length);
  } catch (e) {
    console.log("❌ 获取 Buffer 失败");
    console.log("错误:", e.message);
    console.log("堆栈:", e.stack);
    return { error: "获取 Buffer 失败", detail: e.message };
  }
  
  console.log("\n=== 所有测试通过 ===");
  return { success: true };
  
} catch (e) {
  console.log("\n❌ 顶层异常");
  console.log("错误:", e.message);
  console.log("堆栈:", e.stack);
  return { error: "顶层异常", detail: e.message, stack: e.stack };
}

