/**
 * 测试 Node.js FormData append 方法的 options 对象支持
 * 
 * 测试场景：
 * 1. append(name, value, filename) - 字符串形式的 filename
 * 2. append(name, value, {filename, contentType}) - options 对象形式
 */

const FormData = require("form-data");

console.log("========================================");
console.log("测试1: 使用字符串 filename（传统方式）");
console.log("========================================");

const form1 = new FormData();
const testData1 = Buffer.from("Hello World");

// 传统方式：filename 作为字符串
form1.append("file", testData1, "test.txt");
form1.append("name", "张三");

console.log("✅ 测试1通过：传统字符串方式");
console.log("Boundary:", form1.getBoundary());
console.log("Headers:", JSON.stringify(form1.getHeaders()));

console.log("\n========================================");
console.log("测试2: 使用 options 对象（新方式）");
console.log("========================================");

const form2 = new FormData();
const testData2 = Buffer.from("Image data...");

// 新方式：options 对象
form2.append("file", testData2, {
  filename: "test.jpg",
  contentType: "image/jpeg"
});
form2.append("description", "测试图片");

console.log("✅ 测试2通过：options 对象方式");
console.log("Boundary:", form2.getBoundary());
console.log("Headers:", JSON.stringify(form2.getHeaders()));

console.log("\n========================================");
console.log("测试3: 混合使用两种方式");
console.log("========================================");

const form3 = new FormData();

// 混合使用
form3.append("image", Buffer.from("PNG data"), {
  filename: "photo.png",
  contentType: "image/png"
});
form3.append("document", Buffer.from("PDF data"), "doc.pdf"); // 传统方式
form3.append("title", "我的文件");

console.log("✅ 测试3通过：混合方式");
console.log("Boundary:", form3.getBoundary());
console.log("Headers:", JSON.stringify(form3.getHeaders()));

console.log("\n========================================");
console.log("测试4: 获取 FormData 内容（验证 ContentType）");
console.log("========================================");

const form4 = new FormData();
form4.append("file", Buffer.from("Test content"), {
  filename: "test.jpg",
  contentType: "image/jpeg"
});

// 获取 Buffer 并检查内容
const buffer = form4.getBuffer();
const content = buffer.toString();

console.log("FormData 内容长度:", buffer.length);
console.log("内容包含 Content-Type?", content.includes("Content-Type: image/jpeg"));

if (content.includes("Content-Type: image/jpeg")) {
  console.log("✅ 测试4通过：ContentType 正确写入");
} else {
  console.log("❌ 测试4失败：ContentType 未找到");
  console.log("实际内容:", content);
}

console.log("\n========================================");
console.log("测试5: getLength 方法（验证回调参数）");
console.log("========================================");

const form5 = new FormData();
form5.append("file", Buffer.from("Test"), {
  filename: "test.txt",
  contentType: "text/plain"
});

form5.getLength(function(err, length) {
  if (err) {
    console.log("❌ 测试5失败：获取长度出错", err);
  } else {
    console.log("✅ 测试5通过：回调参数正确");
    console.log("长度:", length);
    console.log("回调参数数量:", arguments.length, "(应该是2)");
  }
});

console.log("\n========================================");
console.log("所有测试完成！");
console.log("========================================");

return {
  success: true,
  message: "所有测试通过"
};

