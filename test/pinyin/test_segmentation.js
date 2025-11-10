/**
 * 测试分词行为
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== 分词行为测试 ===\n');

// 如果有 segment 方法
if (typeof pinyin.segment === 'function') {
    console.log('1. pinyin.segment() 方法可用\n');
    
    const words = ['银行', '行长', '中国', '中心'];
    words.forEach(word => {
        const seg = pinyin.segment(word);
        console.log(`   "${word}" → ${JSON.stringify(seg)}`);
    });
    console.log('');
} else {
    console.log('1. pinyin.segment() 方法不可用\n');
}

// 测试分词对拼音的影响
console.log('2. segment 对拼音的影响\n');

const testWord = '银行';
console.log(`测试词: "${testWord}"`);
console.log('');

// segment: false, heteronym: false
const r1 = pinyin(testWord, { segment: false, heteronym: false });
console.log('segment: false, heteronym: false');
console.log(`  结果: ${JSON.stringify(r1)}`);
console.log('');

// segment: false, heteronym: true
const r2 = pinyin(testWord, { segment: false, heteronym: true });
console.log('segment: false, heteronym: true');
console.log(`  结果: ${JSON.stringify(r2)}`);
console.log('');

// segment: true, heteronym: false
const r3 = pinyin(testWord, { segment: true, heteronym: false });
console.log('segment: true, heteronym: false');
console.log(`  结果: ${JSON.stringify(r3)}`);
console.log('');

// segment: true, heteronym: true
const r4 = pinyin(testWord, { segment: true, heteronym: true });
console.log('segment: true, heteronym: true');
console.log(`  结果: ${JSON.stringify(r4)}`);
console.log(`  期望: [["yín"],["háng","xíng"]]`);
console.log(`  状态: ${JSON.stringify(r4) === JSON.stringify([["yín"],["háng","xíng"]]) ? '✅' : '❌'}`);
console.log('');

console.log('=== 结论 ===');
console.log('如果 segment: true 时丢失多音字，说明问题在分词或分词后的处理环节。');
