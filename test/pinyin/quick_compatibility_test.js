/**
 * 快速兼容性测试
 * 测试关键的兼容性问题是否已修复
 */

const pinyin = require('pinyin');

console.log('🔍 快速兼容性测试\n');
console.log('='.repeat(60));

// 1. URL 完整性测试
console.log('\n1️⃣ URL 完整性:');
const url1 = pinyin('访问http://www.baidu.com查看', { segment: true });
console.log('   输入: 访问http://www.baidu.com查看');
console.log('   结果:', JSON.stringify(url1));
console.log('   期望: URL应该保持完整，不被拆分');

// 2. Email 完整性测试  
console.log('\n2️⃣ Email 完整性:');
const email1 = pinyin('邮箱test@example.com地址', { segment: true });
console.log('   输入: 邮箱test@example.com地址');
console.log('   结果:', JSON.stringify(email1));
console.log('   期望: 邮箱应该保持完整，不被拆分');

// 3. 英文完整性测试
console.log('\n3️⃣ 英文完整性:');
const eng1 = pinyin('Hello World');
console.log('   输入: Hello World');
console.log('   结果:', JSON.stringify(eng1));
console.log('   期望: 英文应该保持完整 [["Hello World"]]');

const eng2 = pinyin('我有Apple手机', { segment: true });
console.log('   输入: 我有Apple手机');
console.log('   结果:', JSON.stringify(eng2));
console.log('   期望: Apple应该保持完整');

// 4. 数字完整性测试
console.log('\n4️⃣ 数字完整性:');
const num1 = pinyin('我有123个苹果', { segment: true });
console.log('   输入: 我有123个苹果');
console.log('   结果:', JSON.stringify(num1));
console.log('   期望: 123应该保持完整 [["wǒ"],["yǒu"],["123"],["gè"],...]');

const num2 = pinyin('价格3.14元');
console.log('   输入: 价格3.14元');
console.log('   结果:', JSON.stringify(num2));
console.log('   期望: 3.14应该保持完整');

// 5. Group 模式空格测试
console.log('\n5️⃣ Group 模式（无空格）:');
const group1 = pinyin('中国', { segment: true, group: true });
console.log('   输入: 中国');
console.log('   结果:', JSON.stringify(group1));
console.log('   期望: [["zhōngguó"]] （无空格）');

const group2 = pinyin('我爱中国', { segment: true, group: true });
console.log('   输入: 我爱中国');
console.log('   结果:', JSON.stringify(group2));
console.log('   期望: 词内无空格');

// 6. 混合标点测试
console.log('\n6️⃣ 标点处理:');
const punc1 = pinyin('Hello, World!');
console.log('   输入: Hello, World!');
console.log('   结果:', JSON.stringify(punc1));
console.log('   期望: 标点应该随英文保留 [["Hello, World!"]]');

const punc2 = pinyin('你好，世界！', { segment: true });
console.log('   输入: 你好，世界！');
console.log('   结果:', JSON.stringify(punc2));
console.log('   期望: 中文标点应该独立');

// 7. 通配符测试
console.log('\n7️⃣ 通配符处理:');
const wild1 = pinyin('*.txt');
console.log('   输入: *.txt');
console.log('   结果:', JSON.stringify(wild1));
console.log('   期望: 通配符应该保持完整 [["*.txt"]]');

// 8. 综合测试
console.log('\n8️⃣ 综合测试:');
const complex = pinyin('张三于2024年10月31日发送test@example.com到https://github.com', { segment: true });
console.log('   输入: 张三于2024年10月31日发送test@example.com到https://github.com');
console.log('   结果:', JSON.stringify(complex));
console.log('   期望: URL和邮箱保持完整');

console.log('\n' + '='.repeat(60));
console.log('✅ 测试完成！\n');
console.log('对比说明：');
console.log('  - URL/Email 应该作为一个整体出现');
console.log('  - 英文/数字/标点应该连续保留，不被拆散');
console.log('  - Group 模式下词内不应该有空格');
console.log('  - 只有中文才会被分词和转换为拼音');

