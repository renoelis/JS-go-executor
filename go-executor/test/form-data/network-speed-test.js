/**
 * 网络速度测试
 * 证明瓶颈在网络而不是代码
 */

console.log('========================================');
console.log('网络速度 vs 文件创建速度测试');
console.log('========================================\n');

var CONFIG = {
    uploadUrl: 'https://api.renoelis.top/R2api/upload-direct',
    bearerToken: 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi',
    r2Config: {
        bucket_name: 'renoelis-bucket',
        endpoint: 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com',
        access_key_id: 'dbe49459ff0a510d1b01674c333c11fe',
        secret_access_key: '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e',
        custom_domain: 'https://bucket.renoelis.dpdns.org'
    }
};

// 创建 10MB 文件并计时
console.log('🧪 测试 1: 文件创建速度\n');

var createStart = Date.now();
var fileSize = 10 * 1024 * 1024;
var fileData = new Uint8Array(fileSize);

// 1MB 块填充
var blockSize = 1024 * 1024;
var templateBlock = new Uint8Array(blockSize);
for (var i = 0; i < blockSize; i++) {
    templateBlock[i] = i % 256;
}

var numBlocks = 10;
for (var b = 0; b < numBlocks; b++) {
    fileData.set(templateBlock, b * blockSize);
}

var createTime = (Date.now() - createStart) / 1000;
console.log('✅ 10MB 文件创建完成');
console.log('   耗时: ' + createTime.toFixed(3) + ' 秒');
console.log('   速度: ' + (10 / createTime).toFixed(2) + ' MB/s');
console.log('');

// 上传并计时
console.log('🧪 测试 2: 网络上传速度\n');

var formData = new FormData();
formData.append('file', fileData, 'speed-test-' + Date.now() + '.bin');
formData.append('bucket_name', CONFIG.r2Config.bucket_name);
formData.append('endpoint', CONFIG.r2Config.endpoint);
formData.append('access_key_id', CONFIG.r2Config.access_key_id);
formData.append('secret_access_key', CONFIG.r2Config.secret_access_key);
formData.append('custom_domain', CONFIG.r2Config.custom_domain);
formData.append('object_key', 'test-speed/speed-test-' + Date.now() + '.bin');

var uploadStart = Date.now();

return fetch(CONFIG.uploadUrl, {
    method: 'POST',
    headers: {
        'Authorization': CONFIG.bearerToken
    },
    body: formData
})
.then(function(response) {
    var uploadTime = (Date.now() - uploadStart) / 1000;
    
    console.log('✅ 10MB 文件上传完成');
    console.log('   耗时: ' + uploadTime.toFixed(2) + ' 秒');
    console.log('   速度: ' + (10 / uploadTime).toFixed(2) + ' MB/s');
    console.log('');
    
    // 分析
    console.log('========================================');
    console.log('性能分析');
    console.log('========================================\n');
    
    var createPercent = (createTime / uploadTime * 100).toFixed(1);
    var networkPercent = (100 - createPercent).toFixed(1);
    
    console.log('📊 时间分布:');
    console.log('   文件创建: ' + createTime.toFixed(3) + 's (' + createPercent + '%)');
    console.log('   网络传输: ' + (uploadTime - createTime).toFixed(2) + 's (' + networkPercent + '%)');
    console.log('');
    
    console.log('🎯 结论:');
    if (parseFloat(networkPercent) > 90) {
        console.log('   ⚠️ 瓶颈在网络传输！');
        console.log('   文件创建已经非常快（占比 < 10%）');
        console.log('   进一步优化代码不会显著提升总速度');
    } else {
        console.log('   ✅ 代码性能良好，网络速度也不错');
    }
    
    return {
        success: true,
        createTime: createTime,
        uploadTime: uploadTime,
        networkPercent: parseFloat(networkPercent),
        bottleneck: parseFloat(networkPercent) > 90 ? 'network' : 'balanced'
    };
})
.catch(function(error) {
    console.log('❌ 测试失败: ' + error.message);
    return {
        success: false,
        error: error.message
    };
});