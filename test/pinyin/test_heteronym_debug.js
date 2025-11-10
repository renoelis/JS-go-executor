/**
 * 调试 heteronym 选项在不同场景下的行为
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== Heteronym 调试测试 ===\n');

// 测试1: 单字 "行"
console.log('1. 单字 "行" (heteronym: true)');
const r1 = pinyin('行', { heteronym: true });
console.log('   结果:', JSON.stringify(r1));
console.log('   期望: [["háng", "xíng", ...]]（多个读音）');
console.log('');

// 测试2: 单字 "长"
console.log('2. 单字 "长" (heteronym: true)');
const r2 = pinyin('长', { heteronym: true });
console.log('   结果:', JSON.stringify(r2));
console.log('   期望: [["cháng", "zhǎng", ...]]（多个读音）');
console.log('');

// 测试3: "银行" 不分词
console.log('3. "银行" (segment: false, heteronym: true)');
const r3 = pinyin('银行', { segment: false, heteronym: true });
console.log('   结果:', JSON.stringify(r3));
console.log('');

// 测试4: "银行" 分词
console.log('4. "银行" (segment: true, heteronym: true)');
const r4 = pinyin('银行', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r4));
console.log('');

// 测试5: "行长" 不分词
console.log('5. "行长" (segment: false, heteronym: true)');
const r5 = pinyin('行长', { segment: false, heteronym: true });
console.log('   结果:', JSON.stringify(r5));
console.log('');

// 测试6: "行长" 分词
console.log('6. "行长" (segment: true, heteronym: true)');
const r6 = pinyin('行长', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r6));
console.log('');

// 测试7: 完整句子 segment: true
console.log('7. "中国银行行长在中心" (segment: true, heteronym: true)');
const r7 = pinyin('中国银行行长在中心', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r7));
console.log('');

// 测试8: 如果有 segment 方法，查看分词结果
if (typeof pinyin.segment === 'function') {
    console.log('8. 分词结果 - "中国银行行长在中心"');
    const seg = pinyin.segment('中国银行行长在中心');
    console.log('   分词:', JSON.stringify(seg));
    console.log('');
}

console.log('=== 完成 ===');
