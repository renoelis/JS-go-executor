const axios = require("axios");
const FormData = require("form-data");

console.log("=== FormData Headers 调试 ===\n");

// 配置
var CONFIG = {
  uploadUrl: "https://api.renoelis.top/R2api/upload-direct",
  bearerToken: "Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi",
  r2Config: {
    bucket_name: "renoelis-bucket",
    endpoint: "https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com",
    access_key_id: "dbe49459ff0a510d1b01674c333c11fe",
    secret_access_key: "69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e",
    custom_domain: "https://bucket.renoelis.dpdns.org",
  },
};

// 创建 1MB 文件
console.log("1. 创建 1MB 文件...");
var fileSize = 1 * 1024 * 1024;
var fileData = new Uint8Array(fileSize);
for (var i = 0; i < fileSize; i++) {
  fileData[i] = i % 256;
}
var buffer = Buffer.from(fileData);

// 创建 FormData
console.log("\n2. 创建 FormData...");
var formData = new FormData();
var filename = "headers-debug-" + Date.now() + ".bin";
var objectKey = "test-debug/" + filename;

// 添加字段
formData.append("bucket_name", CONFIG.r2Config.bucket_name);
formData.append("endpoint", CONFIG.r2Config.endpoint);
formData.append("access_key_id", CONFIG.r2Config.access_key_id);
formData.append("secret_access_key", CONFIG.r2Config.secret_access_key);
formData.append("custom_domain", CONFIG.r2Config.custom_domain);
formData.append("object_key", objectKey);
formData.append("file_size", buffer.length.toString());
formData.append("file", buffer, {
  filename: filename,
  contentType: "application/octet-stream"
});

// 获取 headers
console.log("\n3. 获取 FormData Headers...");
var formHeaders = formData.getHeaders();
console.log("   FormData Headers:", JSON.stringify(formHeaders, null, 2));

// 准备最终 headers
var finalHeaders = {
  Authorization: CONFIG.bearerToken
};

// 合并 headers
for (var key in formHeaders) {
  finalHeaders[key] = formHeaders[key];
}

console.log("\n4. 最终 Headers:");
console.log(JSON.stringify(finalHeaders, null, 2));

// 检查 Content-Type
console.log("\n5. Content-Type 检查:");
var contentType = finalHeaders["content-type"] || finalHeaders["Content-Type"];
console.log("   Content-Type:", contentType);
console.log("   包含 boundary:", contentType && contentType.indexOf("boundary=") !== -1 ? "✅" : "❌");

if (contentType && contentType.indexOf("boundary=") !== -1) {
  var boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
  if (boundaryMatch) {
    console.log("   Boundary:", boundaryMatch[1]);
  }
}

// 尝试发送请求（使用 FormData 直接）
console.log("\n6. 发送请求（直接传 FormData）...");
console.log("   URL:", CONFIG.uploadUrl);

return axios
  .post(CONFIG.uploadUrl, formData, {
    headers: finalHeaders,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })
  .then(function (response) {
    console.log("\n✅ 请求成功!");
    console.log("   状态码:", response.status);
    console.log("   响应:", JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      status: response.status,
      data: response.data,
      uploadMode: "检测中..."
    };
  })
  .catch(function (error) {
    console.log("\n❌ 请求失败!");
    console.log("   错误:", error.message);
    
    var result = {
      success: false,
      error: error.message,
    };
    
    if (error.response) {
      console.log("   状态码:", error.response.status);
      console.log("   响应:", JSON.stringify(error.response.data, null, 2));
      
      result.status = error.response.status;
      result.responseData = error.response.data;
    }
    
    return result;
  });
