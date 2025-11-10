/**
 * 调试 FormData 字段传递问题
 * 检查所有字段是否正确添加到 FormData
 */

const FormData = require("form-data");

console.log("=== FormData 字段调试 ===\n");

// 创建 FormData
const formData = new FormData();

// 添加测试字段
console.log("1. 添加字段到 FormData...");
formData.append("bucket_name", "renoelis-bucket");
formData.append("endpoint", "https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com");
formData.append("access_key_id", "dbe49459ff0a510d1b01674c333c11fe");
formData.append("test_field", "test_value");

// 添加一个小文件
const smallBuffer = Buffer.from("Hello World");
formData.append("file", smallBuffer, {
  filename: "test.txt",
  contentType: "text/plain"
});

console.log("   ✅ 字段添加完成\n");

// 检查 FormData 对象
console.log("2. 检查 FormData 对象...");
console.log("   类型检查:");
console.log("   - __isNodeFormData:", formData.__isNodeFormData);
console.log("   - __isFormData:", formData.__isFormData);
console.log("   - __type:", formData.__type);

// 检查是否有 __getGoStreamingFormData
console.log("\n   底层对象检查:");
console.log("   - 有 __getGoStreamingFormData:", typeof formData.__getGoStreamingFormData !== 'undefined');
console.log("   - 有 getBuffer:", typeof formData.getBuffer === 'function');
console.log("   - 有 getHeaders:", typeof formData.getHeaders === 'function');
console.log("   - 有 getBoundary:", typeof formData.getBoundary === 'function');
console.log("   - 有 getLengthSync:", typeof formData.getLengthSync === 'function');

// 获取 boundary
if (typeof formData.getBoundary === 'function') {
  const boundary = formData.getBoundary();
  console.log("\n   Boundary:", boundary);
}

// 获取长度
if (typeof formData.getLengthSync === 'function') {
  const length = formData.getLengthSync();
  console.log("   总长度:", length, "bytes");
}

// 获取 headers
if (typeof formData.getHeaders === 'function') {
  const headers = formData.getHeaders();
  console.log("   Headers:", JSON.stringify(headers, null, 2));
}

// 尝试获取底层的 Go 对象
console.log("\n3. 检查底层 StreamingFormData...");
if (formData.__getGoStreamingFormData) {
  const goObj = formData.__getGoStreamingFormData;
  console.log("   Go 对象类型:", typeof goObj);
  console.log("   Go 对象:", goObj);
  
  // 检查 entries
  if (goObj.entries) {
    console.log("   Entries 数量:", goObj.entries ? goObj.entries.length : 'N/A');
  }
}

// 尝试读取 Buffer（这会触发实际的序列化）
console.log("\n4. 尝试序列化 FormData...");
try {
  if (typeof formData.getBuffer === 'function') {
    const buffer = formData.getBuffer();
    console.log("   Buffer 大小:", buffer.length, "bytes");
    
    // 转换为字符串检查内容
    const content = buffer.toString('utf8');
    console.log("\n   Buffer 内容（前 500 字符）:");
    console.log(content.substring(0, 500));
    
    // 检查是否包含关键字段
    console.log("\n   字段检查:");
    console.log("   - 包含 'bucket_name':", content.includes('bucket_name'));
    console.log("   - 包含 'renoelis-bucket':", content.includes('renoelis-bucket'));
    console.log("   - 包含 'endpoint':", content.includes('endpoint'));
    console.log("   - 包含 'access_key_id':", content.includes('access_key_id'));
    console.log("   - 包含 'test_field':", content.includes('test_field'));
  }
} catch (err) {
  console.log("   ❌ 序列化失败:", err.message);
}

return {
  success: true,
  message: "FormData 调试完成"
};
