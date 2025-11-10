console.log('========================================');
console.log('File 对象调试测试');
console.log('========================================\n');

var result = {};

try {
    console.log('步骤 1: 导入 FormData');
    var FormData = require('form-data');
    console.log('  ✅ FormData 导入成功\n');

    console.log('步骤 2: 检查 File 构造函数');
    if (typeof File === 'undefined') {
        console.log('  ❌ File 构造函数不存在！');
        throw new Error('File is not defined');
    }
    console.log('  ✅ File 构造函数存在\n');

    console.log('步骤 3: 创建 File 对象');
    console.log('  调用: new File(["File content here"], "myfile.txt", {type: "text/plain"})');
    
    var file = new File(['File content here'], 'myfile.txt', { type: 'text/plain' });
    
    console.log('  ✅ File 对象创建成功');
    console.log('  File.name =', file.name);
    console.log('  File.type =', file.type);
    console.log('  File.size =', file.size);
    console.log('');

    console.log('步骤 4: 创建 FormData');
    var form = new FormData();
    console.log('  ✅ FormData 创建成功\n');

    console.log('步骤 5: append File 到 FormData');
    console.log('  调用: form.append("filefield", file)');
    
    form.append('filefield', file);
    
    console.log('  ✅ append 成功\n');

    console.log('步骤 6: 获取 Buffer');
    var buffer = form.getBuffer();
    console.log('  ✅ getBuffer 成功');
    console.log('  Buffer size:', buffer.length, 'bytes\n');

    console.log('步骤 7: 验证内容');
    var content = buffer.toString('utf8');
    
    if (content.includes('File content here')) {
        console.log('  ✅ 文件内容正确');
    } else {
        console.log('  ❌ 文件内容缺失');
    }
    
    if (content.includes('myfile.txt')) {
        console.log('  ✅ 文件名正确');
    } else {
        console.log('  ❌ 文件名缺失');
    }

    console.log('\n========================================');
    console.log('✅ 所有步骤成功！');
    console.log('========================================');
    
    result.success = true;

} catch (e) {
    console.log('\n========================================');
    console.log('❌ 测试失败！');
    console.log('错误信息:', e.message);
    console.log('错误堆栈:', e.stack);
    console.log('========================================');
    
    result.success = false;
    result.error = e.message;
}

return result;
