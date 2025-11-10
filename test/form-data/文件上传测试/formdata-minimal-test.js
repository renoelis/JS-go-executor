const axios = require("axios");
const FormData = require("form-data");

console.log("=== 最小化 FormData 测试 ===\n");

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

// 创建极小的测试文件
console.log("1. 创建测试文件 (100 bytes)...");
var fileSize = 100;
var fileData = new Uint8Array(fileSize);
for (var i = 0; i < fileSize; i++) {
  fileData[i] = 65 + (i % 26); // A-Z
}
var buffer = Buffer.from(fileData);
console.log("   Buffer 大小:", buffer.length, "bytes");

// 创建 FormData
console.log("\n2. 创建 FormData...");
var formData = new FormData();
var filename = "minimal-test-" + Date.now() + ".txt";
var objectKey = "test-minimal/" + filename;

// 按照正确顺序添加字段
console.log("\n3. 添加字段（正确顺序）...");

console.log("   添加: bucket_name =", CONFIG.r2Config.bucket_name);
formData.append("bucket_name", CONFIG.r2Config.bucket_name);

console.log("   添加: endpoint =", CONFIG.r2Config.endpoint);
formData.append("endpoint", CONFIG.r2Config.endpoint);

console.log("   添加: access_key_id =", CONFIG.r2Config.access_key_id);
formData.append("access_key_id", CONFIG.r2Config.access_key_id);

console.log("   添加: secret_access_key = [HIDDEN]");
formData.append("secret_access_key", CONFIG.r2Config.secret_access_key);

console.log("   添加: custom_domain =", CONFIG.r2Config.custom_domain);
formData.append("custom_domain", CONFIG.r2Config.custom_domain);

console.log("   添加: object_key =", objectKey);
formData.append("object_key", objectKey);

console.log("   添加: file_size =", buffer.length);
formData.append("file_size", buffer.length.toString());

console.log("   添加: file (最后添加)");
formData.append("file", buffer, {
  filename: filename,
  contentType: "text/plain"
});

// 获取 headers
console.log("\n4. 准备 Headers...");
var formHeaders = formData.getHeaders();
console.log("   Content-Type:", formHeaders["content-type"]);

var headers = {
  "Authorization": CONFIG.bearerToken,
  "Content-Type": formHeaders["content-type"]
};

// 打印请求信息
console.log("\n5. 发送请求...");
console.log("   URL:", CONFIG.uploadUrl);
console.log("   Method: POST");
console.log("   Headers:", JSON.stringify(headers, null, 2));

// 发送请求
return axios
  .post(CONFIG.uploadUrl, formData, {
    headers: headers,
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
      console.log("   状态文本:", error.response.statusText);
      console.log("   响应数据:", JSON.stringify(error.response.data, null, 2));
      
      result.status = error.response.status;
      result.statusText = error.response.statusText;
      result.responseData = error.response.data;
      
      // 检查是否还是 bucket_name 问题
      if (error.response.data && error.response.data.message) {
        console.log("\n⚠️  服务器消息:", error.response.data.message);
        
        if (error.response.data.message.indexOf("bucket_name") !== -1) {
          console.log("\n🔍 分析:");
          console.log("   - FormData 已按正确顺序添加字段");
          console.log("   - bucket_name 在文件之前添加");
          console.log("   - 可能是 FormData 序列化问题");
          console.log("   - 或者服务器端解析问题");
        }
      }
    }
    
    return result;
  });
