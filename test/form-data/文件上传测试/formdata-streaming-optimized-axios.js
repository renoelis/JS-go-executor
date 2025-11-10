const axios = require("axios");
const FormData = require("form-data");

// 配置常量
var CONFIG = {
  uploadUrl: "https://api.renoelis.top/R2api/upload-direct",
  bearerToken:
    "Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi",
  r2Config: {
    bucket_name: "renoelis-bucket",
    endpoint:
      "https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com",
    access_key_id: "dbe49459ff0a510d1b01674c333c11fe",
    secret_access_key:
      "69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e",
    custom_domain: "https://bucket.renoelis.dpdns.org",
  },
};

// 文件生成函数（块填充优化）
function createOptimizedFile(sizeMB) {
  var fileSize = sizeMB * 1024 * 1024;
  var fileData = new Uint8Array(fileSize);

  var blockSize = 1024 * 1024; // 1MB
  var templateBlock = new Uint8Array(blockSize);
  for (var i = 0; i < blockSize; i++) {
    templateBlock[i] = i % 256;
  }

  var numBlocks = Math.floor(fileSize / blockSize);
  var remainder = fileSize % blockSize;

  for (var b = 0; b < numBlocks; b++) {
    fileData.set(templateBlock, b * blockSize);
  }

  if (remainder > 0) {
    var offset = numBlocks * blockSize;
    for (var j = 0; j < remainder; j++) {
      fileData[offset + j] = j % 256;
    }
  }

  return fileData;
}

// 上传函数
function testUpload(fileData, testName, sizeMB) {
  var formData = new FormData();
  var filename = "test-" + sizeMB + "mb-" + Date.now() + ".bin";
  var objectKey = "test-streaming/" + filename;
  
  // ⚠️ 重要：先添加所有文本字段，最后添加文件
  // 这样可以确保服务器先接收到必填参数（如 bucket_name）
  formData.append("bucket_name", CONFIG.r2Config.bucket_name);
  formData.append("endpoint", CONFIG.r2Config.endpoint);
  formData.append("access_key_id", CONFIG.r2Config.access_key_id);
  formData.append("secret_access_key", CONFIG.r2Config.secret_access_key);
  formData.append("custom_domain", CONFIG.r2Config.custom_domain);
  formData.append("object_key", objectKey);
  formData.append("file_size", fileData.length.toString());
  formData.append("test_type", "optimized_" + sizeMB + "mb");
  
  // 最后添加文件
  formData.append("file", Buffer.from(fileData), filename);

  var startTime = Date.now();

  return axios
    .post(CONFIG.uploadUrl, formData, {
      headers: {
        Authorization: CONFIG.bearerToken,
        ...formData.getHeaders(),
      },
      maxBodyLength: Infinity,
    })
    .then(function (res) {
      var duration = (Date.now() - startTime) / 1000;

      try {
        var data = res.data;
        var isSuccess =
          res.status >= 200 &&
          res.status < 300 &&
          (data.success === true ||
            data.status === "success" ||
            data.url ||
            (data.data && data.data.public_url));

        if (isSuccess) {
          var speedMBps = (
            (fileData.length / 1024 / 1024) /
            duration
          ).toFixed(2);
          return {
            success: true,
            test: testName,
            sizeMB: sizeMB,
            duration: parseFloat(duration.toFixed(2)),
            speed: speedMBps + " MB/s",
            speedValue: parseFloat(speedMBps),
          };
        } else {
          return {
            success: false,
            test: testName,
            status: res.status,
            error: data.error || data.message || "Unknown error",
          };
        }
      } catch (e) {
        return {
          success: false,
          test: testName,
          error: "响应解析失败",
        };
      }
    })
    .catch(function (error) {
      return {
        success: false,
        test: testName,
        error: error.message,
      };
    });
}

console.log("开始优化版测试...\n");

var file2MB = createOptimizedFile(2);

return testUpload(file2MB, "测试1", 2)
  .then(function (result1) {
    var file5MB = createOptimizedFile(5);
    return testUpload(file5MB, "测试2", 5).then(function (result2) {
      return { result1: result1, result2: result2 };
    });
  })
  .then(function (data) {
    var file10MB = createOptimizedFile(10);
    return testUpload(file10MB, "测试3", 10).then(function (result3) {
      return { result1: data.result1, result2: data.result2, result3: result3 };
    });
  })
  .then(function (allResults) {
    var allSuccess =
      allResults.result1 &&
      allResults.result1.success &&
      allResults.result2 &&
      allResults.result2.success &&
      allResults.result3 &&
      allResults.result3.success;

    var summary = {
      success: allSuccess,
      message: "FormData 流式处理优化版测试完成",
      results: [allResults.result1, allResults.result2, allResults.result3],
    };

    if (allSuccess) {
      var avgSpeed =
        (allResults.result1.speedValue +
          allResults.result2.speedValue +
          allResults.result3.speedValue) /
        3;
      summary.optimization = {
        blockSize: "1MB（最优化）",
        avgSpeed: avgSpeed.toFixed(2) + " MB/s",
        totalData: "17 MB",
        totalTime: (
          allResults.result1.duration +
          allResults.result2.duration +
          allResults.result3.duration
        ).toFixed(2) + "s",
      };
    }

    return summary;
  })
  .catch(function (error) {
    return {
      success: false,
      error: error.message,
    };
  });
