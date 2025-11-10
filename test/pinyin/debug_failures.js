/**
 * 调试失败的测试用例
 * 输出详细的实际结果与期望结果对比
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== 调试失败的测试 ===\n');

// 失败1: segment + group - 我喜欢你
console.log('1️⃣ segment + group - 我喜欢你');
const result1 = pinyin('我喜欢你', { segment: true, group: true });
console.log('   实际结果:', JSON.stringify(result1));
console.log('   期望结果:', JSON.stringify([['wǒ'], ['xǐhuān'], ['nǐ']]));
console.log('   分析:');
console.log('   - 长度:', result1.length);
if (result1.length >= 2) {
    console.log('   - 第2项:', JSON.stringify(result1[1]));
    console.log('   - 第2项是否为数组:', Array.isArray(result1[1]));
    console.log('   - 第2项内容:', result1[1]);
}
console.log('');

// 失败2: ForeignTokenizer - 我有123个
console.log('2️⃣ ForeignTokenizer - 我有123个');
const result2 = pinyin('我有123个', { segment: true });
console.log('   实际结果:', JSON.stringify(result2));
console.log('   期望: 应该包含 "123"');
console.log('   分析:');
console.log('   - 是否包含123:', result2.some(r => r[0] === '123'));
console.log('   - 各项内容:', result2.map(r => r[0]).join(', '));
console.log('');

// 失败3: URLTokenizer - 访问http://baidu.com
console.log('3️⃣ URLTokenizer - 访问http://baidu.com');
const result3 = pinyin('访问http://baidu.com', { segment: true });
console.log('   实际结果:', JSON.stringify(result3));
console.log('   期望: 应该包含 "http://"');
console.log('   分析:');
console.log('   - 是否包含http:', result3.some(r => r[0].includes('http://')));
console.log('   - 各项内容:', result3.map(r => r[0]).join(', '));
console.log('');

// 失败4: 只有标点 - ，。！
console.log('4️⃣ 只有标点 - ，。！');
const result4 = pinyin('，。！', { segment: true });
console.log('   实际结果:', JSON.stringify(result4));
console.log('   期望结果:', JSON.stringify([['，。！']]));
console.log('   分析:');
console.log('   - 长度:', result4.length);
console.log('   - 第1项:', result4[0] ? JSON.stringify(result4[0]) : 'undefined');
console.log('   - 是否为 "，。！":', result4.length === 1 && result4[0][0] === '，。！');
console.log('');

// 额外测试：分词行为
console.log('📋 额外分词行为测试:');
console.log('\n5️⃣ 分词结果 - 我喜欢你');
const seg1 = pinyin.segment ? pinyin.segment('我喜欢你') : '【segment方法不存在】';
console.log('   segment()结果:', JSON.stringify(seg1));
console.log('');

console.log('6️⃣ 不启用group - 我喜欢你');
const result6 = pinyin('我喜欢你', { segment: true, group: false });
console.log('   实际结果:', JSON.stringify(result6));
console.log('');

console.log('=== 调试完成 ===');
