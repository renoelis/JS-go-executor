/**
 * Fetch API - FormData (multipart/form-data) 测试
 * 
 * 测试场景：文件上传到 R2 存储
 * 
 * 改进点:
 * 1. 使用 Promise 链式调用
 * 2. 正确处理 ArrayBuffer 和 Blob
 * 3. 添加详细的错误处理
 * 4. 返回标准化的结果对象
 */

console.log('========================================');
console.log('FormData (multipart/form-data) 测试');
console.log('========================================\n');

// 配置常量
var CONFIG = {
    fileUrl: 'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/27288222-7e5c-4bfd-ab52-ba564ac911b5.jpg',
    uploadUrl: 'https://api.renoelis.top/R2api/upload-direct',
    bearerToken: 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi',
    r2Config: {
        bucket_name: 'renoelis-bucket',
        endpoint: 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com',
        access_key_id: 'dbe49459ff0a510d1b01674c333c11fe',
        secret_access_key: '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e',
        custom_domain: 'https://bucket.renoelis.dpdns.org',
        object_key: 'custom-folder/test-upload-' + Date.now() + '.png'
    }
};

// 主测试流程
function runFormDataTest() {
    console.log('【测试场景】FormData 文件上传');
    console.log('目标接口:', CONFIG.uploadUrl);
    console.log('文件 URL:', CONFIG.fileUrl);
    
    return downloadFile()
        .then(processFileData)
        .then(uploadFile)
        .then(handleResponse)
        .catch(handleError);
}

// 步骤 1: 下载文件
function downloadFile() {
    console.log('\n步骤 1: 下载文件数据...');
    
    return fetch(CONFIG.fileUrl)
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            
            if (!response.ok) {
                throw new Error('下载文件失败: HTTP ' + response.status);
            }
            
            var contentType = response.headers.get('content-type');
            console.log('  Content-Type:', contentType);
            console.log('  ✅ 文件下载成功');
            
            return response.arrayBuffer().then(function(arrayBuffer) {
                return {
                    arrayBuffer: arrayBuffer,
                    contentType: contentType || 'image/png'
                };
            });
        });
}

// 步骤 2: 处理文件数据并构建 FormData
function processFileData(fileData) {
    console.log('\n步骤 2: 构建 FormData...');
    
    // 计算文件大小
    var fileSize = 0;
    try {
        if (fileData.arrayBuffer.byteLength !== undefined) {
            fileSize = fileData.arrayBuffer.byteLength;
        } else if (fileData.arrayBuffer.length !== undefined) {
            fileSize = fileData.arrayBuffer.length;
        }
    } catch (e) {
        fileSize = 'unknown';
    }
    
    console.log('  文件大小:', fileSize, 'bytes');
    
    // 检查 FormData 和 Blob 支持
    if (typeof FormData === 'undefined') {
        console.log('  ❌ FormData API 不支持');
        throw new Error('FormData API 不支持，无法上传文件');
    }
    
    console.log('  ✅ FormData API 可用');
    
    var formData = new FormData();
    
    // 处理文件数据
    // 注意: Goja 环境中可能不支持 Blob，我们直接使用 ArrayBuffer
    try {
        if (typeof Blob !== 'undefined') {
            console.log('  使用 Blob 包装文件数据');
            var blob = new Blob([fileData.arrayBuffer], { 
                type: fileData.contentType 
            });
            formData.append('file', blob, 'test-image.png');
        } else {
            console.log('    Blob 不支持，直接使用 ArrayBuffer');
            // Goja 的 FormData 实现可能直接支持 ArrayBuffer
            formData.append('file', fileData.arrayBuffer);
        }
    } catch (error) {
        console.log('    文件添加失败:', error.message);
        throw new Error('无法添加文件到 FormData: ' + error.message);
    }
    
    // 添加其他表单字段
    console.log('  添加 R2 配置参数...');
    for (var key in CONFIG.r2Config) {
        formData.append(key, CONFIG.r2Config[key]);
    }
    
    console.log('  ✅ FormData 构建完成');
    
    return formData;
}

// 步骤 3: 上传文件
function uploadFile(formData) {
    console.log('\n步骤 3: 上传文件到 R2...');
    
    // 重要: 不要手动设置 Content-Type
    // FormData 会自动设置正确的 Content-Type 和 boundary
    return fetch(CONFIG.uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': CONFIG.bearerToken
            //  不设置 Content-Type，让 FormData 自动处理
        },
        body: formData
    })
    .then(function(response) {
        console.log('  上传响应 Status:', response.status);
        console.log('  上传响应 OK:', response.ok);
        
        // 保存状态码供后续使用
        return response.text().then(function(text) {
            return {
                status: response.status,
                ok: response.ok,
                text: text
            };
        });
    });
}

// 步骤 4: 处理响应
function handleResponse(result) {
    console.log('\n步骤 4: 解析响应...');
    
    // 先检查 HTTP 状态码
    if (!result.ok) {
        console.log('  ❌ 上传失败，HTTP 状态码:', result.status);
        console.log('  响应内容:', result.text.substring(0, 300));
        
        return {
            success: false,
            error: 'HTTP ' + result.status,
            status: result.status,
            response: result.text
        };
    }
    
    // 尝试解析 JSON
    try {
        var data = JSON.parse(result.text);
        console.log('  响应 JSON:', JSON.stringify(data, null, 2));
        
        // 检查业务逻辑是否成功
        // 支持多种成功标记: success=true, status="success", 或有 url/public_url 字段
        var isSuccess = data.success === true || 
                        data.status === 'success' || 
                        data.url || 
                        (data.data && data.data.public_url);
        
        if (isSuccess) {
            console.log('\n✅ 文件上传成功！');
            
            // 尝试获取文件 URL (可能在不同字段)
            var fileUrl = data.url || 
                         data.public_url || 
                         (data.data && data.data.public_url);
            
            if (fileUrl) {
                console.log('  文件访问 URL:', fileUrl);
            }
            
            if (data.object_key) {
                console.log('  对象 Key:', data.object_key);
            }
            
            if (data.data && data.data.size) {
                console.log('  文件大小:', data.data.size, 'bytes');
            }
            
            return {
                success: true,
                status: result.status,
                data: data,
                url: fileUrl,
                message: data.message || '文件上传成功'
            };
        } else {
            console.log('\n⚠️  上传可能失败');
            console.log('  服务器响应:', JSON.stringify(data, null, 2));
            
            return {
                success: false,
                status: result.status,
                data: data,
                message: data.message || data.error || '上传失败'
            };
        }
        
    } catch (parseError) {
        // 响应不是 JSON
        console.log('    响应不是 JSON 格式');
        console.log('  原始响应:', result.text.substring(0, 500));
        
        // 如果状态码是 2xx，可能是纯文本成功响应
        if (result.status >= 200 && result.status < 300) {
            console.log('   状态码表示成功，但响应格式非标准 JSON');
            return {
                success: true,
                status: result.status,
                text: result.text,
                message: '上传成功（非 JSON 响应）'
            };
        }
        
        return {
            success: false,
            status: result.status,
            error: '响应格式错误',
            text: result.text,
            parseError: parseError.message
        };
    }
}

// 错误处理
function handleError(error) {
    console.log('\n❌ 测试失败');
    console.log('  错误类型:', error.name || 'Error');
    console.log('  错误信息:', error.message || String(error));
    
    // 提供详细的错误信息
    var errorResult = {
        success: false,
        error: error.message || String(error),
        errorType: error.name || 'Error'
    };
    
    // 如果是网络错误
    if (error.message && error.message.indexOf('fetch') !== -1) {
        errorResult.hint = '网络请求失败，请检查 URL 是否正确';
    }
    
    // 如果是 FormData 错误
    if (error.message && error.message.indexOf('FormData') !== -1) {
        errorResult.hint = 'FormData 构建失败，可能是环境不支持某些 API';
    }
    
    return errorResult;
}

// ==========================================
// 执行测试
// ==========================================

// 返回 Promise，确保异步操作完成
return runFormDataTest();
