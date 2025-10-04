/**
 * FormData 安全性测试
 * 
 * 测试目标：
 * 1. 原型链设置 - instanceof 检查
 * 2. 引号转义 - 防止 HTTP header 注入
 */

const FormData = require('form-data');

console.log('=== FormData 安全性测试 ===\n');

// ========================================
// 测试 1: 原型链设置（instanceof 检查）
// ========================================
console.log('📋 测试 1: instanceof 检查');
console.log('----------------------------------------');

const form1 = new FormData();
console.log('创建 FormData 实例:', form1 !== null);

// 检查 instanceof（需要原型链正确设置）
const isFormData = form1 instanceof FormData;
console.log('instanceof FormData:', isFormData);

if (isFormData) {
    console.log('✅ 原型链设置正确\n');
} else {
    console.log('❌ 原型链设置失败 - 可能影响类型判断\n');
}

// ========================================
// 测试 2: 引号转义（安全性）
// ========================================
console.log('📋 测试 2: 文件名引号转义');
console.log('----------------------------------------');

const form2 = new FormData();

// 测试场景 1: 正常文件名
form2.append('file1', Buffer.from('content1'), 'normal.txt');
console.log('场景 1: 正常文件名');
console.log('  文件名: normal.txt');
console.log('  ✅ 应该正常工作\n');

// 测试场景 2: 包含双引号的文件名（潜在安全风险）
const maliciousFilename = 'test"file.txt';
form2.append('file2', Buffer.from('content2'), maliciousFilename);
console.log('场景 2: 包含双引号的文件名');
console.log('  原始文件名:', maliciousFilename);
console.log('  预期转义后: test\\"file.txt');
console.log('  ✅ 引号应该被转义，防止 header 注入\n');

// 测试场景 3: 多个引号
const multiQuotes = 'test"file"name.txt';
form2.append('file3', Buffer.from('content3'), multiQuotes);
console.log('场景 3: 多个引号');
console.log('  原始文件名:', multiQuotes);
console.log('  预期转义后: test\\"file\\"name.txt');
console.log('  ✅ 所有引号都应该被转义\n');

// 测试场景 4: options 对象中的文件名
form2.append('file4', Buffer.from('content4'), {
    filename: 'test"with"quotes.jpg',
    contentType: 'image/jpeg'
});
console.log('场景 4: options 对象中的文件名');
console.log('  原始文件名: test"with"quotes.jpg');
console.log('  预期转义后: test\\"with\\"quotes.jpg');
console.log('  ✅ options 对象中的文件名也应该被转义\n');

// 获取 Buffer 并检查
console.log('📦 生成 multipart/form-data Buffer');
console.log('----------------------------------------');

const buffer = form2.getBuffer();
const bufferStr = buffer.toString('utf-8');

console.log('Buffer 大小:', buffer.length, 'bytes');
console.log('Buffer 内容预览（前 500 字符）:');
console.log(bufferStr.substring(0, 500));
console.log('...\n');

// 验证引号转义
console.log('🔍 验证引号转义');
console.log('----------------------------------------');

// 检查是否包含未转义的引号（这会破坏 header）
const hasUnescapedQuotes = bufferStr.includes('filename="test"file.txt"');
const hasEscapedQuotes = bufferStr.includes('filename="test\\"file.txt"');

console.log('包含未转义引号（危险）:', hasUnescapedQuotes ? '❌ 是（安全风险！）' : '✅ 否');
console.log('包含转义后引号（安全）:', hasEscapedQuotes ? '✅ 是' : '❌ 否');

// ========================================
// 测试 3: 实际上传测试（可选）
// ========================================
console.log('\n📋 测试 3: 实际上传验证');
console.log('----------------------------------------');

const testForm = new FormData();
testForm.append('normalField', 'value1');
testForm.append('dangerousFile', Buffer.from('test content'), 'dangerous"filename.txt');

console.log('创建测试表单:');
console.log('- normalField: value1');
console.log('- dangerousFile: dangerous"filename.txt (包含引号)');

const headers = testForm.getHeaders();
console.log('\nFormData Headers:');
console.log('  Content-Type:', headers['content-type']);
console.log('  包含 boundary:', headers['content-type'].includes('boundary=') ? '✅ 是' : '❌ 否');

// ========================================
// 安全性总结
// ========================================
console.log('\n🛡️ 安全性总结');
console.log('========================================');

const securityChecks = {
    'instanceof 检查正常': isFormData,
    '引号被正确转义': hasEscapedQuotes && !hasUnescapedQuotes,
    'Headers 正确生成': headers['content-type'].includes('multipart/form-data')
};

let allSecure = true;
for (const [check, passed] of Object.entries(securityChecks)) {
    console.log(`${passed ? '✅' : '❌'} ${check}`);
    if (!passed) allSecure = false;
}

if (allSecure) {
    console.log('\n🎉 所有安全检查通过！');
} else {
    console.log('\n⚠️ 存在安全风险，需要修复！');
}

// ========================================
// 攻击场景演示（教育目的）
// ========================================
console.log('\n⚠️ 潜在攻击场景演示');
console.log('========================================');

console.log('如果引号没有被转义，攻击者可以构造恶意文件名：');
console.log('');
console.log('攻击文件名: test"; malicious-header: evil-value; x="file.txt');
console.log('');
console.log('未转义的 header（危险）:');
console.log('  Content-Disposition: form-data; name="file"; filename="test"; malicious-header: evil-value; x="file.txt"');
console.log('  ❌ 注入了恶意 header！');
console.log('');
console.log('正确转义后的 header（安全）:');
console.log('  Content-Disposition: form-data; name="file"; filename="test\\"; malicious-header: evil-value; x=\\"file.txt"');
console.log('  ✅ 引号被转义，攻击失败');

console.log('\n========================================');
console.log('测试完成');

// 返回测试结果
return {
    instanceofWorks: isFormData,
    quotesEscaped: hasEscapedQuotes && !hasUnescapedQuotes,
    headersValid: headers['content-type'].includes('multipart/form-data'),
    allSecure: allSecure
};

