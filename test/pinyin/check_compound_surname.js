/**
 * 检查复姓字典的内容
 * 特别是"诸葛"的拼音是否正确
 */

const { pinyin } = require('pinyin');

console.log('=== 检查复姓字典 ===\n');

// 测试诸葛亮
console.log('【测试"诸葛亮"】');
console.log('  普通模式:', JSON.stringify(pinyin('诸葛亮', { mode: pinyin.MODE_NORMAL })));
console.log('  姓氏模式:', JSON.stringify(pinyin('诸葛亮', { mode: pinyin.MODE_SURNAME })));
console.log('  姓氏模式 + heteronym:', JSON.stringify(pinyin('诸葛亮', { mode: pinyin.MODE_SURNAME, heteronym: true })));

// 单独测试"葛"字
console.log('\n【单独测试"葛"字】');
console.log('  普通模式:', JSON.stringify(pinyin('葛', { mode: pinyin.MODE_NORMAL })));
console.log('  姓氏模式:', JSON.stringify(pinyin('葛', { mode: pinyin.MODE_SURNAME })));
console.log('  heteronym:', JSON.stringify(pinyin('葛', { heteronym: true })));

// 测试其他包含"葛"的词
console.log('\n【其他包含"葛"的词】');
console.log('  葛根:', JSON.stringify(pinyin('葛根', { mode: pinyin.MODE_NORMAL })));
console.log('  葛藤:', JSON.stringify(pinyin('葛藤', { mode: pinyin.MODE_NORMAL })));

// 测试其他复姓
console.log('\n【其他复姓】');
console.log('  欧阳修:', JSON.stringify(pinyin('欧阳修', { mode: pinyin.MODE_SURNAME })));
console.log('  司马光:', JSON.stringify(pinyin('司马光', { mode: pinyin.MODE_SURNAME })));
console.log('  上官婉儿:', JSON.stringify(pinyin('上官婉儿', { mode: pinyin.MODE_SURNAME })));

console.log('\n=== 分析 ===');
console.log('葛字的标准读音是 gé（如：葛根、诸葛亮）');
console.log('如果姓氏模式下输出 gě，说明复姓字典配置错误');
