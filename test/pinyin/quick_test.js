/**
 * Pinyin 快速测试示例
 * 用于快速验证基本功能
 */

const pinyin = require('pinyin');

console.log('🧪 Pinyin 快速测试\n');

// 1. 基础转换
console.log('1️⃣ 基础转换:');
console.log('   pinyin("中国"):', pinyin('中国'));
console.log('   pinyin("中国", {style: 0}):', pinyin('中国', {style: 0}));

// 2. 多音字
console.log('\n2️⃣ 多音字:');
console.log('   pinyin("行", {heteronym: true}):', pinyin('行', {heteronym: true}));
console.log('   pinyin("银行", {segment: true}):', pinyin('银行', {segment: true}));

// 3. 智能分词
console.log('\n3️⃣ 智能分词:');
console.log('   pinyin("我爱北京天安门", {segment: true}):', pinyin('我爱北京天安门', {segment: true}));

// 4. 人名识别
console.log('\n4️⃣ 人名识别:');
console.log('   pinyin("张三说李四", {segment: true}):', pinyin('张三说李四', {segment: true}));

// 5. URL识别
console.log('\n5️⃣ URL识别:');
console.log('   pinyin("访问http://www.baidu.com", {segment: true}):', pinyin('访问http://www.baidu.com', {segment: true}));

// 6. 邮箱识别
console.log('\n6️⃣ 邮箱识别:');
console.log('   pinyin("邮箱test@example.com", {segment: true}):', pinyin('邮箱test@example.com', {segment: true}));

// 7. 日期时间
console.log('\n7️⃣ 日期时间:');
console.log('   pinyin("2024年10月31日", {segment: true}):', pinyin('2024年10月31日', {segment: true}));

// 8. 外文字符
console.log('\n8️⃣ 外文字符:');
console.log('   pinyin("我有123个Apple", {segment: true}):', pinyin('我有123个Apple', {segment: true}));

// 9. 综合测试
console.log('\n9️⃣ 综合测试:');
const text = '张三于2024年10月31日发送邮件test@example.com';
console.log('   文本:', text);
console.log('   结果:', pinyin(text, {segment: true}));

// 10. Compare排序
console.log('\n🔟 Compare排序:');
const names = ['张三', '李四', '王五', '赵六'];
console.log('   原始:', names);
console.log('   排序:', names.sort(pinyin.compare));

console.log('\n✅ 快速测试完成！');


