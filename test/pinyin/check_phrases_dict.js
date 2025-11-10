/**
 * 检查词组字典中的数据格式
 */

// 这个测试需要访问内部的 phrases_dict
// 在 npm pinyin v4 中可能没有直接暴露，但我们可以通过行为推断

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== 词组字典数据格式推断 ===\n');

// 测试策略：
// 如果词组在字典中，无论 heteronym 是否为 true，都会使用字典数据
// 如果词组不在字典中，heteronym: true 时会返回所有读音

const testCases = [
    { word: '银行', desc: '银行（可能在字典中）' },
    { word: '行长', desc: '行长（可能在字典中）' },
    { word: '中国', desc: '中国（肯定在字典中）' },
    { word: '银饼', desc: '银饼（可能不在字典中）' },  // 随机造词
];

testCases.forEach(tc => {
    console.log(`测试: "${tc.word}" (${tc.desc})`);
    
    // heteronym: false（消歧）
    const r1 = pinyin(tc.word, { segment: false, heteronym: false });
    console.log('  heteronym: false →', JSON.stringify(r1));
    
    // heteronym: true（所有读音）
    const r2 = pinyin(tc.word, { segment: false, heteronym: true });
    console.log('  heteronym: true  →', JSON.stringify(r2));
    
    // segment: true, heteronym: true（分词+所有读音）
    const r3 = pinyin(tc.word, { segment: true, heteronym: true });
    console.log('  segment + hetero →', JSON.stringify(r3));
    
    // 分析
    const r2HasMulti = r2.some(arr => arr.length > 1);
    const r3HasMulti = r3.some(arr => arr.length > 1);
    
    console.log('  分析:');
    console.log(`    segment: false 有多音: ${r2HasMulti ? '是' : '否'}`);
    console.log(`    segment: true  有多音: ${r3HasMulti ? '是' : '否'}`);
    
    if (r2HasMulti && !r3HasMulti) {
        console.log('    ⚠️ segment: true 丢失了多音字！');
    } else if (!r2HasMulti && !r3HasMulti) {
        console.log('    💡 可能在词组字典中（已消歧）');
    } else if (r2HasMulti && r3HasMulti) {
        console.log('    ✅ 多音字正常');
    }
    
    console.log('');
});

console.log('=== 结论 ===');
console.log('如果某个词在 segment: false 时有多音，segment: true 时没有多音，');
console.log('说明该词在词组字典中，且字典数据是消歧后的单一读音。');
console.log('');
console.log('JS 原版的处理方式：');
console.log('1. 如果词在 phrases_dict，使用字典数据（可能包含多音）');
console.log('2. heteronym: true 时，返回字典中的所有读音');
console.log('3. heteronym: false 时，只返回第一个读音');
