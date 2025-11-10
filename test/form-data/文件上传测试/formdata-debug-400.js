const axios = require("axios");
const FormData = require("form-data");

console.log("=== FormData 400 错误调试 ===\n");

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

// 创建小文件测试
console.log("1. 创建测试文件...");
var fileSize = 1*1024*1024; // 2MB 小文件
var fileData = new Uint8Array(fileSize);
for (var i = 0; i < fileSize; i++) {
  fileData[i] = i % 256;
}

console.log("   文件大小:", fileSize, "bytes");
console.log("   文件类型:", typeof fileData);
console.log("   是否为 Uint8Array:", fileData instanceof Uint8Array);

// 转换为 Buffer
console.log("\n2. 转换为 Buffer...");
var buffer = Buffer.from(fileData);
console.log("   Buffer 大小:", buffer.length, "bytes");
console.log("   Buffer 类型:", typeof buffer);
console.log("   是否为 Buffer:", Buffer.isBuffer(buffer));

// 创建 FormData
console.log("\n3. 创建 FormData...");
var formData = new FormData();
var filename = "debug-test-" + Date.now() + ".bin";
var objectKey = "test-debug/" + filename;

// 添加文件
formData.append("file", buffer, {
  filename: filename,
  contentType: "application/octet-stream"
});

// 添加其他字段
formData.append("bucket_name", CONFIG.r2Config.bucket_name);
formData.append("endpoint", CONFIG.r2Config.endpoint);
formData.append("access_key_id", CONFIG.r2Config.access_key_id);
formData.append("secret_access_key", CONFIG.r2Config.secret_access_key);
formData.append("custom_domain", CONFIG.r2Config.custom_domain);
formData.append("object_key", objectKey);
formData.append("file_size", buffer.length.toString());

console.log("   FormData 创建完成");

// 获取 headers
console.log("\n4. 获取 Headers...");
var formHeaders = formData.getHeaders();
console.log("   FormData Headers:", JSON.stringify(formHeaders, null, 2));

var headers = {
  Authorization: CONFIG.bearerToken,
};

// 合并 headers
for (var key in formHeaders) {
  headers[key] = formHeaders[key];
}

console.log("   最终 Headers:", JSON.stringify(headers, null, 2));

// 发送请求
console.log("\n5. 发送请求...");
console.log("   URL:", CONFIG.uploadUrl);

return axios
  .post(CONFIG.uploadUrl, formData, {
    headers: headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })
  .then(function (response) {
    console.log("\n✅ 请求成功!");
    console.log("   状态码:", response.status);
    console.log("   响应数据:", JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  })
  .catch(function (error) {
    console.log("\n❌ 请求失败!");
    console.log("   错误消息:", error.message);
    
    var result = {
      success: false,
      error: error.message,
    };
    
    if (error.response) {
      console.log("   状态码:", error.response.status);
      console.log("   状态文本:", error.response.statusText);
      console.log("   响应 Headers:", JSON.stringify(error.response.headers, null, 2));
      console.log("   响应数据:", JSON.stringify(error.response.data, null, 2));
      
      result.status = error.response.status;
      result.statusText = error.response.statusText;
      result.responseData = error.response.data;
      result.responseHeaders = error.response.headers;
    } else if (error.request) {
      console.log("   无响应，请求已发送");
      result.noResponse = true;
    } else {
      console.log("   请求配置错误");
      result.configError = true;
    }
    
    return result;
  });
