/**
 * 追踪 heteronym 选项在不同调用中的行为
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== Heteronym 选项追踪测试 ===\n');

// 基础测试：单字
console.log('1. 单字 "行"');
console.log('   segment: false, heteronym: true');
const r1 = pinyin('行', { segment: false, heteronym: true });
console.log('   结果:', JSON.stringify(r1));
console.log('   期望: [["háng","xíng",...]]');
console.log('   状态:', r1[0] && r1[0].length > 1 ? '✅ 多音' : '❌ 单音');
console.log('');

console.log('2. 单字 "行"');
console.log('   segment: true, heteronym: true');
const r2 = pinyin('行', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r2));
console.log('   期望: [["háng","xíng",...]]');
console.log('   状态:', r2[0] && r2[0].length > 1 ? '✅ 多音' : '❌ 单音');
console.log('');

// 关键测试：双字（可能被拆分）
console.log('3. 双字 "银行"');
console.log('   segment: false, heteronym: true');
const r3 = pinyin('银行', { segment: false, heteronym: true });
console.log('   结果:', JSON.stringify(r3));
console.log('   银:', r3[0]);
console.log('   行:', r3[1], '(长度:', r3[1] ? r3[1].length : 0, ')');
console.log('   状态:', r3[1] && r3[1].length > 1 ? '✅ 多音' : '❌ 单音');
console.log('');

console.log('4. 双字 "银行" ⭐ 问题场景');
console.log('   segment: true, heteronym: true');
const r4 = pinyin('银行', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r4));
console.log('   银:', r4[0]);
console.log('   行:', r4[1], '(长度:', r4[1] ? r4[1].length : 0, ')');
console.log('   期望: 行应该有 ["háng","xíng"]');
console.log('   状态:', r4[1] && r4[1].length > 1 ? '✅ 多音' : '❌ 单音 (BUG!)');
console.log('');

// 对比：词组在字典中的情况
console.log('5. 双字 "中国"（词组在字典中）');
console.log('   segment: false, heteronym: true');
const r5 = pinyin('中国', { segment: false, heteronym: true });
console.log('   结果:', JSON.stringify(r5));
console.log('   中:', r5[0], '(长度:', r5[0] ? r5[0].length : 0, ')');
console.log('');

console.log('6. 双字 "中国"（词组在字典中）');
console.log('   segment: true, heteronym: true');
const r6 = pinyin('中国', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r6));
console.log('   中:', r6[0], '(长度:', r6[0] ? r6[0].length : 0, ')');
console.log('   分析: "中国"在词典中，被识别为词组，词组消歧后只有一个读音');
console.log('');

// 分词结果
if (typeof pinyin.segment === 'function') {
    console.log('7. 分词结果');
    const seg1 = pinyin.segment('银行');
    const seg2 = pinyin.segment('中国');
    console.log('   银行 →', JSON.stringify(seg1));
    console.log('   中国 →', JSON.stringify(seg2));
    console.log('');
}

console.log('=== 结论 ===');
console.log('如果单字"行"在 segment: true 时也丢失多音，说明问题在 Convert 函数');
console.log('如果只有"银行"丢失，说明问题在 ConvertPhrase 或分词逻辑');
