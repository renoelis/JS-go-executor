/**
 * FormData基础功能测试
 * 验证FormData API是否正常工作
 */

console.log('========================================');
console.log('FormData 基础功能测试');
console.log('========================================\n');

// 测试1: FormData API存在性
console.log('【测试1】检查 FormData API');
if (typeof FormData !== 'undefined') {
    console.log('  ✅ FormData API 可用');
} else {
    console.log('  ❌ FormData API 不可用');
    return { success: false, message: 'FormData API不可用' };
}

// 测试2: 创建FormData实例
console.log('\n【测试2】创建 FormData 实例');
try {
    var formData = new FormData();
    console.log('  ✅ FormData 实例创建成功');
} catch (e) {
    console.log('  ❌ 创建失败: ' + e.message);
    return { success: false, message: '无法创建FormData实例' };
}

// 测试3: 添加文本字段
console.log('\n【测试3】添加文本字段');
try {
    formData.append('name', 'test');
    formData.append('type', 'basic');
    console.log('  ✅ 文本字段添加成功');
} catch (e) {
    console.log('  ❌ 添加失败: ' + e.message);
    return { success: false, message: '无法添加文本字段' };
}

// 测试4: 添加小文件
console.log('\n【测试4】添加小文件（1KB）');
try {
    var smallFile = new Uint8Array(1024); // 1KB
    for (var i = 0; i < 1024; i++) {
        smallFile[i] = i % 256;
    }
    formData.append('file', smallFile, 'test.bin');
    console.log('  ✅ 文件添加成功');
} catch (e) {
    console.log('  ❌ 添加失败: ' + e.message);
    return { success: false, message: '无法添加文件' };
}

// 测试5: 发送到测试端点（httpbin.org）
console.log('\n【测试5】发送请求到测试端点');
console.log('  目标: https://httpbin.org/post');

var startTime = Date.now();

return fetch('https://httpbin.org/post', {
    method: 'POST',
    body: formData
})
.then(function(response) {
    var duration = (Date.now() - startTime) / 1000;
    console.log('  响应状态: ' + response.status);
    console.log('  耗时: ' + duration.toFixed(2) + '秒');

    if (!response.ok) {
        throw new Error('HTTP错误! 状态: ' + response.status);
    }

    return response.json();
})
.then(function(data) {
    console.log('  ✅ 请求成功');

    // 检查返回的数据
    if (data.form && data.form.name === 'test') {
        console.log('  ✅ 文本字段验证通过');
    } else {
        console.log('  ⚠️ 文本字段未正确接收');
    }

    if (data.files && data.files.file) {
        console.log('  ✅ 文件字段验证通过');
        console.log('  文件大小: ' + data.files.file.length + ' 字符');
    } else {
        console.log('  ⚠️ 文件字段未正确接收');
    }

    console.log('\n========================================');
    console.log('测试完成');
    console.log('========================================');
    console.log('✅ FormData 基础功能正常');

    return {
        success: true,
        message: 'FormData基础功能测试通过',
        details: {
            formFields: data.form,
            files: Object.keys(data.files || {})
        }
    };
})
.catch(function(error) {
    console.log('  ❌ 请求失败: ' + error.message);

    console.log('\n========================================');
    console.log('测试完成');
    console.log('========================================');
    console.log('❌ FormData 功能异常');

    return {
        success: false,
        message: 'FormData功能测试失败',
        error: error.message
    };
});