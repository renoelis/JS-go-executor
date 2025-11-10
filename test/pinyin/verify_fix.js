const pinyin = require('pinyin');

console.log('🔍 验证关键修复\n');

// 测试 1: Group 模式（应该已经修复）
console.log('1. Group 模式（无空格）:');
const g1 = pinyin('中国', { segment: true, group: true });
console.log('   pinyin("中国", {segment: true, group: true})');
console.log('   结果:', JSON.stringify(g1));
console.log('   期望: [["zhōngguó"]] ← 无空格');
console.log('   状态:', g1[0] && g1[0][0] === 'zhōngguó' ? '✅ 已修复' : '❌ 仍有问题');

// 测试 2: 非中文完整性
console.log('\n2. 非中文完整性:');

console.log('\n   A) URL:');
const url = pinyin('访问http://www.baidu.com查看', { segment: true });
console.log('   输入: 访问http://www.baidu.com查看');
console.log('   结果:', JSON.stringify(url));
const urlOk = url.some(item => item[0] === 'http://www.baidu.com');
console.log('   期望: URL应该完整');
console.log('   状态:', urlOk ? '✅ 已修复' : '❌ 仍被拆分');

console.log('\n   B) Email:');
const email = pinyin('邮箱test@example.com地址', { segment: true });
console.log('   输入: 邮箱test@example.com地址');
console.log('   结果:', JSON.stringify(email));
const emailOk = email.some(item => item[0] === 'test@example.com');
console.log('   期望: Email应该完整');
console.log('   状态:', emailOk ? '✅ 已修复' : '❌ 仍被拆分');

console.log('\n   C) 英文:');
const eng = pinyin('Hello World');
console.log('   输入: Hello World');
console.log('   结果:', JSON.stringify(eng));
const engOk = eng.length === 1 && eng[0][0] === 'Hello World';
console.log('   期望: [["Hello World"]]');
console.log('   状态:', engOk ? '✅ 已修复' : '❌ 仍被拆分');

console.log('\n   D) 数字:');
const num = pinyin('我有123个', { segment: true });
console.log('   输入: 我有123个');
console.log('   结果:', JSON.stringify(num));
const numOk = num.some(item => item[0] === '123');
console.log('   期望: 123应该完整');
console.log('   状态:', numOk ? '✅ 已修复' : '❌ 仍被拆分');

console.log('\n' + '='.repeat(60));
console.log('总结:');
console.log('  Group模式:', g1[0] && g1[0][0] === 'zhōngguó' ? '✅' : '❌');
console.log('  URL:', urlOk ? '✅' : '❌');
console.log('  Email:', emailOk ? '✅' : '❌');
console.log('  英文:', engOk ? '✅' : '❌');
console.log('  数字:', numOk ? '✅' : '❌');

