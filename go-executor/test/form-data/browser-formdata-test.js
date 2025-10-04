/**
 * 浏览器 FormData 单独测试
 * 用于调试浏览器 FormData 的问题
 */

console.log('=== 浏览器 FormData 测试 ===\n');

console.log('步骤1: 创建 FormData');
try {
    var formData = new FormData();
    console.log('✅ 创建成功');
} catch (e) {
    console.log('❌ 创建失败: ' + e.message);
    return { error: '创建失败', message: e.message };
}

console.log('\n步骤2: 检查类型');
try {
    console.log('  typeof formData: ' + typeof formData);
    console.log('  formData.constructor: ' + (formData.constructor ? 'exists' : 'undefined'));
} catch (e) {
    console.log('❌ 检查类型失败: ' + e.message);
}

console.log('\n步骤3: 检查 append 方法');
try {
    console.log('  typeof append: ' + typeof formData.append);
    if (typeof formData.append !== 'function') {
        throw new Error('append 不是函数');
    }
    console.log('✅ append 方法存在');
} catch (e) {
    console.log('❌ append 方法检查失败: ' + e.message);
    return { error: 'append方法不存在', message: e.message };
}

console.log('\n步骤4: 调用 append');
try {
    console.log('  调用 append("name", "John")...');
    formData.append('name', 'John');
    console.log('✅ append 调用成功');
} catch (e) {
    console.log('❌ append 调用失败: ' + e.message);
    console.log('  Stack: ' + e.stack);
    return { error: 'append调用失败', message: e.message, stack: e.stack };
}

console.log('\n步骤5: 检查属性');
try {
    var isFormData = formData.__isFormData;
    var isNodeFormData = formData.__isNodeFormData;
    var typeValue = formData.__type;
    
    console.log('  __isFormData: ' + isFormData);
    console.log('  __isNodeFormData: ' + isNodeFormData);
    console.log('  __type: ' + typeValue);
    console.log('✅ 属性检查成功');
} catch (e) {
    console.log('❌ 属性检查失败: ' + e.message);
}

console.log('\n步骤6: 检查方法');
try {
    console.log('  has getHeaders: ' + (typeof formData.getHeaders === 'function'));
    console.log('  has getBoundary: ' + (typeof formData.getBoundary === 'function'));
    console.log('  has get: ' + (typeof formData.get === 'function'));
    console.log('  has set: ' + (typeof formData.set === 'function'));
    console.log('✅ 方法检查成功');
} catch (e) {
    console.log('❌ 方法检查失败: ' + e.message);
}

console.log('\n=== 测试完成 ===');
return { success: true, message: '浏览器 FormData 工作正常' };

