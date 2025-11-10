/**
 * 最简单的 FormData 测试
 * 用于快速定位问题
 */

console.log("步骤1: 导入 FormData 模块");
const FormData = require("form-data");
console.log("✅ FormData 导入成功");

console.log("\n步骤2: 创建 FormData 实例");
const form = new FormData();
console.log("✅ FormData 实例创建成功");

console.log("\n步骤3: 添加简单字符串字段");
form.append("name", "张三");
console.log("✅ 字符串字段添加成功");

console.log("\n步骤4: 获取 boundary");
const boundary = form.getBoundary();
console.log("✅ Boundary:", boundary);

console.log("\n步骤5: 获取 headers");
const headers = form.getHeaders();
console.log("✅ Headers:", JSON.stringify(headers));

console.log("\n步骤6: 获取长度（同步）");
const length = form.getLengthSync();
console.log("✅ Length:", length);

console.log("\n步骤7: 添加 Buffer 字段（字符串形式 filename）");
try {
  const testBuffer = Buffer.from("Hello World");
  form.append("file", testBuffer, "test.txt");
  console.log("✅ Buffer 字段添加成功（字符串 filename）");
} catch (e) {
  console.log("❌ 添加 Buffer 失败:", e.message);
  return { error: e.message };
}

console.log("\n步骤8: 获取 Buffer");
try {
  const buffer = form.getBuffer();
  console.log("✅ Buffer 获取成功，长度:", buffer.length);
} catch (e) {
  console.log("❌ 获取 Buffer 失败:", e.message);
  return { error: e.message };
}

console.log("\n步骤9: 添加 Buffer 字段（options 对象）");
try {
  const form2 = new FormData();
  const testBuffer2 = Buffer.from("Test Image Data");
  
  form2.append("image", testBuffer2, {
    filename: "photo.jpg",
    contentType: "image/jpeg"
  });
  console.log("✅ Buffer 字段添加成功（options 对象）");
  
  const buffer2 = form2.getBuffer();
  console.log("✅ Buffer2 获取成功，长度:", buffer2.length);
  
  // 检查内容
  const content = buffer2.toString();
  if (content.includes("Content-Type: image/jpeg")) {
    console.log("✅ ContentType 正确写入");
  } else {
    console.log("⚠️ 未找到 ContentType");
  }
} catch (e) {
  console.log("❌ Options 对象方式失败:", e.message);
  console.log("错误堆栈:", e.stack);
  return { error: e.message, stack: e.stack };
}

console.log("\n========================================");
console.log("所有测试通过！");
console.log("========================================");

return {
  success: true,
  message: "所有测试通过"
};

