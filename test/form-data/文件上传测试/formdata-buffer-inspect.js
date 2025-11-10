const FormData = require("form-data");

console.log("=== FormData Buffer 检查 ===\n");

// 创建 FormData
var formData = new FormData();

// 按照正确顺序添加字段
console.log("1. 添加字段...");
formData.append("bucket_name", "test-bucket");
formData.append("endpoint", "https://example.com");
formData.append("access_key_id", "test-key");
formData.append("secret_access_key", "test-secret");

// 添加小文件
var fileData = Buffer.from("Hello World");
formData.append("file", fileData, {
  filename: "test.txt",
  contentType: "text/plain"
});

console.log("2. 获取 Headers...");
var headers = formData.getHeaders();
console.log("   Headers:", JSON.stringify(headers, null, 2));

console.log("\n3. 获取 Buffer...");
var buffer = formData.getBuffer();
console.log("   Buffer 类型:", typeof buffer);
console.log("   Buffer 大小:", buffer.length, "bytes");
console.log("   是否为 Buffer:", Buffer.isBuffer(buffer));

console.log("\n4. 检查 Buffer 内容...");
var content = buffer.toString("utf8");
console.log("   内容长度:", content.length);

// 检查是否包含所有字段
console.log("\n5. 验证字段存在...");
var checks = {
  "bucket_name": content.indexOf("bucket_name") !== -1,
  "test-bucket": content.indexOf("test-bucket") !== -1,
  "endpoint": content.indexOf("endpoint") !== -1,
  "access_key_id": content.indexOf("access_key_id") !== -1,
  "secret_access_key": content.indexOf("secret_access_key") !== -1,
  "file": content.indexOf("file") !== -1,
  "test.txt": content.indexOf("test.txt") !== -1,
  "Hello World": content.indexOf("Hello World") !== -1
};

for (var key in checks) {
  console.log("   " + key + ":", checks[key] ? "✅" : "❌");
}

// 显示部分内容
console.log("\n6. Buffer 内容预览（前 500 字符）:");
console.log(content.substring(0, 500));

// 检查字段顺序
console.log("\n7. 检查字段顺序...");
var bucketIndex = content.indexOf("bucket_name");
var fileIndex = content.indexOf('Content-Disposition: form-data; name="file"');

console.log("   bucket_name 位置:", bucketIndex);
console.log("   file 位置:", fileIndex);
console.log("   顺序正确:", bucketIndex < fileIndex ? "✅" : "❌");

return {
  success: true,
  bufferSize: buffer.length,
  contentLength: content.length,
  fieldsPresent: checks,
  fieldOrderCorrect: bucketIndex < fileIndex
};
