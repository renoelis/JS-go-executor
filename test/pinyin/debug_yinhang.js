/**
 * 调试 "银行" 在 segment: true 时丢失多音字的问题
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== 调试 "银行" 多音字丢失问题 ===\n');

// 测试1: segment: false（baseline）
console.log('1. "银行" segment: false, heteronym: true');
const r1 = pinyin('银行', { segment: false, heteronym: true });
console.log('   结果:', JSON.stringify(r1));
console.log('   期望: [["yín"],["háng","xíng"]] ✅');
console.log('');

// 测试2: segment: true（问题场景）
console.log('2. "银行" segment: true, heteronym: true');
const r2 = pinyin('银行', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r2));
console.log('   期望: [["yín"],["háng","xíng"]] ✅');
console.log('   实际 Goja: [["yín"],["háng"]] ❌');
console.log('');

// 测试3: 查看分词结果
if (typeof pinyin.segment === 'function') {
    console.log('3. 分词结果');
    const seg = pinyin.segment('银行');
    console.log('   分词:', JSON.stringify(seg));
    console.log('');
}

// 测试4: 单字 "行"
console.log('4. 单字 "行" heteronym: true');
const r4 = pinyin('行', { heteronym: true });
console.log('   结果:', JSON.stringify(r4));
console.log('   期望: [["háng","xíng",...]] ✅');
console.log('');

// 测试5: "行" segment: true
console.log('5. 单字 "行" segment: true, heteronym: true');
const r5 = pinyin('行', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r5));
console.log('   期望: [["háng","xíng",...]] ✅');
console.log('');

// 测试6: "中国"（对比，这个是正确的）
console.log('6. "中国" segment: true, heteronym: true');
const r6 = pinyin('中国', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r6));
console.log('   Node.js: [["zhōng"],["guó"]] - 词组消歧');
console.log('   Goja: [["zhōng"],["guó"]] ✅');
console.log('');

// 测试7: "中心"（对比，这个保留多音）
console.log('7. "中心" segment: true, heteronym: true');
const r7 = pinyin('中心', { segment: true, heteronym: true });
console.log('   结果:', JSON.stringify(r7));
console.log('   Node.js: [["zhōng","zhòng"],["xīn"]] ✅');
console.log('   Goja: [["zhōng","zhòng"],["xīn"]] ✅');
console.log('');

console.log('=== 分析 ===');
console.log('如果 "银行" 被分词为 ["银行"]（整词）:');
console.log('  → 查词组字典 → 应该有完整拼音');
console.log('如果 "银行" 被分词为 ["银", "行"]（拆分）:');
console.log('  → 逐字查字典 → heteronym: true 应该返回所有读音');
console.log('');
console.log('可能的问题：');
console.log('1. "银行" 没有被识别为词组，被拆成 ["银", "行"]');
console.log('2. 拆分后，heteronym 选项在某个环节被忽略');
console.log('3. 或者 dict.GetPinyin("行") 返回的数据有问题');
