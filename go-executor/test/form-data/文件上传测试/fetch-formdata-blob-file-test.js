/**
 * Fetch API - FormData with Blob/File API 测试
 * 
 * 测试场景：使用 Blob 和 File API 进行文件上传到 R2 存储
 * 
 * 功能特性:
 * 1. 使用标准 Blob API 包装文件数据
 * 2. 使用标准 File API 创建文件对象
 * 3. 测试 Blob 的各种方法（slice, arrayBuffer, text）
 * 4. 验证 FormData + Blob/File 集成
 * 5. 完整的错误处理和日志
 */

console.log('========================================');
console.log('FormData + Blob/File API 测试');
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
        object_key: 'blob-file-test/upload-' + Date.now() + '.png'
    }
};

// ==========================================
// 测试 1: 使用 Blob API
// ==========================================

function testBlobAPI() {
    console.log('【测试 1】使用 Blob API 上传文件\n');
    
    return downloadFile()
        .then(createBlobFromData)
        .then(testBlobMethods)
        .then(uploadWithBlob)
        .then(handleResponse)
        .catch(handleError);
}

// 下载文件
function downloadFile() {
    console.log('步骤 1: 下载文件数据...');
    
    return fetch(CONFIG.fileUrl)
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            
            if (!response.ok) {
                throw new Error('下载文件失败: HTTP ' + response.status);
            }
            
            var contentType = response.headers.get('content-type');
            console.log('  Content-Type:', contentType);
            console.log('  ✅ 文件下载成功\n');
            
            return response.arrayBuffer().then(function(arrayBuffer) {
                return {
                    arrayBuffer: arrayBuffer,
                    contentType: contentType || 'image/png'
                };
            });
        });
}

// 创建 Blob 对象
function createBlobFromData(fileData) {
    console.log('步骤 2: 使用 Blob API 创建 Blob 对象...');
    
    // 检查 Blob API 支持
    if (typeof Blob === 'undefined') {
        throw new Error('Blob API 不支持');
    }
    
    console.log('  ✅ Blob API 可用');
    
    // 创建 Blob
    var blob = new Blob([fileData.arrayBuffer], {
        type: fileData.contentType
    });
    
    console.log('  Blob 创建成功:');
    console.log('    - size:', blob.size, 'bytes');
    console.log('    - type:', blob.type);
    console.log('  ✅ Blob 对象创建完成\n');
    
    return {
        blob: blob,
        contentType: fileData.contentType
    };
}

// 测试 Blob 的各种方法
function testBlobMethods(blobData) {
    console.log('步骤 3: 测试 Blob API 方法...');
    
    var blob = blobData.blob;
    
    // 测试 1: slice 方法
    console.log('\n  测试 1: blob.slice() 方法');
    var slicedBlob = blob.slice(0, 100, 'image/png');
    console.log('    切片大小:', slicedBlob.size, 'bytes');
    console.log('    切片类型:', slicedBlob.type);
    console.log('    ✅ slice() 方法正常');
    
    // 测试 2: arrayBuffer 方法
    console.log('\n  测试 2: blob.arrayBuffer() 方法');
    return blob.arrayBuffer().then(function(buffer) {
        console.log('    ArrayBuffer 大小:', buffer.byteLength, 'bytes');
        console.log('    ✅ arrayBuffer() 方法正常');
        
        // 测试 3: text 方法（前100字节）
        console.log('\n  测试 3: blob.text() 方法');
        return slicedBlob.text().then(function(text) {
            console.log('    文本长度:', text.length, '字符');
            console.log('    ✅ text() 方法正常\n');
            
            return blobData;
        });
    });
}

// 使用 Blob 上传
function uploadWithBlob(blobData) {
    console.log('步骤 4: 使用 Blob 构建 FormData 并上传...');
    
    // 检查 FormData API
    if (typeof FormData === 'undefined') {
        throw new Error('FormData API 不支持');
    }
    
    console.log('  ✅ FormData API 可用');
    
    // 创建 FormData
    var formData = new FormData();
    
    // 添加 Blob（自动命名为 "blob"）
    console.log('  添加 Blob 到 FormData...');
    formData.append('file', blobData.blob, 'test-blob-upload.png');
    
    // 添加 R2 配置
    console.log('  添加 R2 配置参数...');
    for (var key in CONFIG.r2Config) {
        formData.append(key, CONFIG.r2Config[key]);
    }
    
    // 添加元数据
    formData.append('upload_type', 'blob');
    formData.append('content_type', blobData.contentType);
    
    console.log('  ✅ FormData 构建完成');
    console.log('  正在上传...\n');
    
    // 上传
    return fetch(CONFIG.uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': CONFIG.bearerToken
        },
        body: formData
    })
    .then(function(response) {
        console.log('  上传响应 Status:', response.status);
        console.log('  上传响应 OK:', response.ok);
        
        return response.text().then(function(text) {
            return {
                status: response.status,
                ok: response.ok,
                text: text
            };
        });
    });
}

// ==========================================
// 测试 2: 使用 File API
// ==========================================

function testFileAPI() {
    console.log('\n========================================');
    console.log('【测试 2】使用 File API 上传文件');
    console.log('========================================\n');
    
    return downloadFile()
        .then(createFileFromData)
        .then(testFileProperties)
        .then(uploadWithFile)
        .then(handleResponse)
        .catch(handleError);
}

// 创建 File 对象
function createFileFromData(fileData) {
    console.log('步骤 2: 使用 File API 创建 File 对象...');
    
    // 检查 File API 支持
    if (typeof File === 'undefined') {
        throw new Error('File API 不支持');
    }
    
    console.log('  ✅ File API 可用');
    
    // 创建 File
    var file = new File(
        [fileData.arrayBuffer],
        'downloaded-image.png',
        {
            type: fileData.contentType,
            lastModified: Date.now()
        }
    );
    
    console.log('  File 创建成功:');
    console.log('    - name:', file.name);
    console.log('    - size:', file.size, 'bytes');
    console.log('    - type:', file.type);
    console.log('    - lastModified:', new Date(file.lastModified).toISOString());
    console.log('  ✅ File 对象创建完成\n');
    
    return {
        file: file,
        contentType: fileData.contentType
    };
}

// 测试 File 属性和方法
function testFileProperties(fileData) {
    console.log('步骤 3: 测试 File API 属性和方法...');
    
    var file = fileData.file;
    
    // 测试属性
    console.log('\n  File 属性:');
    console.log('    name:', file.name);
    console.log('    size:', file.size);
    console.log('    type:', file.type);
    console.log('    lastModified:', file.lastModified);
    
    // File 继承自 Blob，测试 Blob 方法
    console.log('\n  测试继承的 Blob 方法:');
    
    // 测试 slice
    var sliced = file.slice(0, 100);
    console.log('    slice(0, 100).size:', sliced.size);
    
    // 测试 arrayBuffer
    return file.arrayBuffer().then(function(buffer) {
        console.log('    arrayBuffer().byteLength:', buffer.byteLength);
        console.log('    ✅ File API 测试完成\n');
        
        return fileData;
    });
}

// 使用 File 上传
function uploadWithFile(fileData) {
    console.log('步骤 4: 使用 File 构建 FormData 并上传...');
    
    // 检查 FormData API
    if (typeof FormData === 'undefined') {
        throw new Error('FormData API 不支持');
    }
    
    console.log('  ✅ FormData API 可用');
    
    // 创建 FormData
    var formData = new FormData();
    
    // 添加 File（保留原文件名）
    console.log('  添加 File 到 FormData...');
    console.log('    文件名:', fileData.file.name);
    formData.append('file', fileData.file);
    
    // 添加 R2 配置
    console.log('  添加 R2 配置参数...');
    for (var key in CONFIG.r2Config) {
        formData.append(key, CONFIG.r2Config[key]);
    }
    
    // 添加元数据
    formData.append('upload_type', 'file');
    formData.append('original_filename', fileData.file.name);
    formData.append('last_modified', fileData.file.lastModified.toString());
    
    console.log('  ✅ FormData 构建完成');
    console.log('  正在上传...\n');
    
    // 上传
    return fetch(CONFIG.uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': CONFIG.bearerToken
        },
        body: formData
    })
    .then(function(response) {
        console.log('  上传响应 Status:', response.status);
        console.log('  上传响应 OK:', response.ok);
        
        return response.text().then(function(text) {
            return {
                status: response.status,
                ok: response.ok,
                text: text
            };
        });
    });
}

// ==========================================
// 测试 3: 创建多种类型的 Blob
// ==========================================

function testMultipleBlobTypes() {
    console.log('\n========================================');
    console.log('【测试 3】创建和上传不同类型的 Blob');
    console.log('========================================\n');
    
    console.log('步骤 1: 创建不同类型的 Blob...\n');
    
    // 1. 文本 Blob
    console.log('  创建文本 Blob...');
    var textBlob = new Blob(['Hello, World! 这是一个测试文本。'], {
        type: 'text/plain; charset=utf-8'
    });
    console.log('    size:', textBlob.size, 'bytes');
    console.log('    type:', textBlob.type);
    
    // 2. JSON Blob
    console.log('\n  创建 JSON Blob...');
    var jsonData = { name: 'test', value: 123, timestamp: Date.now() };
    var jsonBlob = new Blob([JSON.stringify(jsonData)], {
        type: 'application/json'
    });
    console.log('    size:', jsonBlob.size, 'bytes');
    console.log('    type:', jsonBlob.type);
    
    // 3. 二进制 Blob
    console.log('\n  创建二进制 Blob...');
    var binaryData = new Uint8Array(1024);
    for (var i = 0; i < binaryData.length; i++) {
        binaryData[i] = i % 256;
    }
    var binaryBlob = new Blob([binaryData], {
        type: 'application/octet-stream'
    });
    console.log('    size:', binaryBlob.size, 'bytes');
    console.log('    type:', binaryBlob.type);
    
    // 4. 混合 Blob（多个部分）
    console.log('\n  创建混合 Blob（多个部分）...');
    var mixedBlob = new Blob([
        'Header: ',
        binaryData.slice(0, 100),
        '\nFooter: End'
    ], {
        type: 'application/mixed'
    });
    console.log('    size:', mixedBlob.size, 'bytes');
    console.log('    type:', mixedBlob.type);
    
    console.log('\n  ✅ 所有 Blob 创建成功');
    
    // 上传文本 Blob
    console.log('\n步骤 2: 上传文本 Blob...\n');
    
    return uploadBlob(textBlob, 'text-upload.txt', 'text')
        .then(handleResponse)
        .catch(handleError);
}

// 通用 Blob 上传函数
function uploadBlob(blob, filename, uploadType) {
    var formData = new FormData();
    
    // 添加 Blob
    formData.append('file', blob, filename);
    
    // 添加 R2 配置
    var objectKey = 'blob-file-test/' + uploadType + '-' + Date.now() + '-' + filename;
    formData.append('bucket_name', CONFIG.r2Config.bucket_name);
    formData.append('endpoint', CONFIG.r2Config.endpoint);
    formData.append('access_key_id', CONFIG.r2Config.access_key_id);
    formData.append('secret_access_key', CONFIG.r2Config.secret_access_key);
    formData.append('custom_domain', CONFIG.r2Config.custom_domain);
    formData.append('object_key', objectKey);
    
    // 添加元数据
    formData.append('upload_type', uploadType);
    
    console.log('  上传文件:', filename);
    console.log('  Object Key:', objectKey);
    
    return fetch(CONFIG.uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': CONFIG.bearerToken
        },
        body: formData
    })
    .then(function(response) {
        console.log('  响应 Status:', response.status);
        
        return response.text().then(function(text) {
            return {
                status: response.status,
                ok: response.ok,
                text: text
            };
        });
    });
}

// ==========================================
// 通用响应处理
// ==========================================

function handleResponse(result) {
    console.log('\n响应处理...');
    
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
    
    try {
        var data = JSON.parse(result.text);
        console.log('  响应 JSON:', JSON.stringify(data, null, 2));
        
        var isSuccess = data.success === true || 
                        data.status === 'success' || 
                        data.url || 
                        (data.data && data.data.public_url);
        
        if (isSuccess) {
            console.log('\n✅ 文件上传成功！');
            
            var fileUrl = data.url || 
                         data.public_url || 
                         (data.data && data.data.public_url);
            
            if (fileUrl) {
                console.log('  文件 URL:', fileUrl);
            }
            
            if (data.data && data.data.size) {
                console.log('  文件大小:', data.data.size, 'bytes');
            }
            
            return {
                success: true,
                status: result.status,
                data: data,
                url: fileUrl
            };
        } else {
            return {
                success: false,
                status: result.status,
                data: data
            };
        }
        
    } catch (parseError) {
        if (result.status >= 200 && result.status < 300) {
            console.log('  ✅ 上传成功（非 JSON 响应）');
            return {
                success: true,
                status: result.status,
                text: result.text
            };
        }
        
        return {
            success: false,
            status: result.status,
            error: '响应格式错误',
            parseError: parseError.message
        };
    }
}

// 错误处理
function handleError(error) {
    console.log('\n❌ 测试失败');
    console.log('  错误类型:', error.name || 'Error');
    console.log('  错误信息:', error.message || String(error));
    
    return {
        success: false,
        error: error.message || String(error),
        errorType: error.name || 'Error'
    };
}

// ==========================================
// 执行所有测试
// ==========================================

console.log('开始 Blob/File API 测试...\n');

// 按顺序执行测试
return testBlobAPI()
    .then(function(result1) {
        console.log('\n测试 1 结果:', JSON.stringify(result1, null, 2));
        
        return testFileAPI().then(function(result2) {
            console.log('\n测试 2 结果:', JSON.stringify(result2, null, 2));
            
            return testMultipleBlobTypes().then(function(result3) {
                console.log('\n测试 3 结果:', JSON.stringify(result3, null, 2));
                
                // 总结
                console.log('\n========================================');
                console.log('测试总结');
                console.log('========================================');
                
                var allSuccess = result1.success && result2.success && result3.success;
                
                if (allSuccess) {
                    console.log('✅ 所有测试通过！\n');
                    console.log('验证项:');
                    console.log('  ✓ Blob API 创建和上传');
                    console.log('  ✓ Blob 方法（slice, arrayBuffer, text）');
                    console.log('  ✓ File API 创建和上传');
                    console.log('  ✓ File 属性和继承方法');
                    console.log('  ✓ 多种类型的 Blob');
                    console.log('  ✓ FormData + Blob/File 集成');
                    console.log('  ✓ R2 存储集成');
                } else {
                    console.log('⚠️  部分测试失败');
                    if (!result1.success) console.log('  × Blob API 测试失败');
                    if (!result2.success) console.log('  × File API 测试失败');
                    if (!result3.success) console.log('  × 多类型 Blob 测试失败');
                }
                
                return {
                    success: allSuccess,
                    results: {
                        blobAPI: result1,
                        fileAPI: result2,
                        multipleTypes: result3
                    }
                };
            });
        });
    })
    .catch(handleError);




