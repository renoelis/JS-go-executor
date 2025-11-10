/**
 * Pinyin Segment + Heteronym 组合测试
 * 注意: 此模块的测试只测试，不统计成功与否
 */

const { pinyin } = require('pinyin');

console.log('=== Segment + Heteronym 组合测试 (仅测试,不统计) ===\n');
console.log('注意: 以下测试仅用于验证功能可用性，不计入成功/失败统计\n');

// ==================== segment 基础测试 ====================
console.log('【Segment 分词基础测试】');

const r1 = pinyin('我喜欢你', { segment: false });
console.log('  segment: false →', JSON.stringify(r1), '预期: 4个元素', r1.length === 4 ? '✅' : '❌');

const r2 = pinyin('我喜欢你', { segment: true });
console.log('  segment: true  →', JSON.stringify(r2), '预期: 数组', Array.isArray(r2) ? '✅' : '❌');

try {
  const r3 = pinyin('我喜欢你', { segment: 'Intl.Segmenter' });
  console.log('  segment: "Intl.Segmenter" →', JSON.stringify(r3), '预期: 数组', Array.isArray(r3) ? '✅' : '❌');
} catch (error) {
  console.log('  segment: "Intl.Segmenter" → 错误:', error.message, '❌');
}

// ==================== segment 与 heteronym 组合 ====================
console.log('\n【Segment + Heteronym 组合】');

const r4 = pinyin('中心', { segment: false, heteronym: false });
console.log('  segment: false, heteronym: false →', JSON.stringify(r4), '预期: 2个元素', r4.length === 2 ? '✅' : '❌');

const r5 = pinyin('中心', { segment: false, heteronym: true });
console.log('  segment: false, heteronym: true  →', JSON.stringify(r5), '预期: 2个元素', r5.length === 2 ? '✅' : '❌');

const r6 = pinyin('中心', { segment: true, heteronym: false });
console.log('  segment: true,  heteronym: false →', JSON.stringify(r6), '预期: 数组', Array.isArray(r6) ? '✅' : '❌');

const r7 = pinyin('中心', { segment: true, heteronym: true });
console.log('  segment: true,  heteronym: true  →', JSON.stringify(r7), '预期: 数组', Array.isArray(r7) ? '✅' : '❌');

// ==================== 多音字分词测试 ====================
console.log('\n【多音字分词测试】');

const r8 = pinyin('银行', { heteronym: true });
console.log('  "银行" 无segment →', JSON.stringify(r8), '预期: 2个元素', r8.length === 2 ? '✅' : '❌');

const r9 = pinyin('银行', { segment: true, heteronym: true });
console.log('  "银行" 有segment →', JSON.stringify(r9), '预期: 数组', Array.isArray(r9) ? '✅' : '❌');

console.log('\n  "重要" 对比:');
const r10 = pinyin('重要', { heteronym: true });
console.log('    无分词 →', JSON.stringify(r10));
const r11 = pinyin('重要', { segment: true, heteronym: true });
console.log('    有分词 →', JSON.stringify(r11));

console.log('\n  "长度" 对比:');
const r12 = pinyin('长度', { heteronym: true });
console.log('    无分词 →', JSON.stringify(r12));
const r13 = pinyin('长度', { segment: true, heteronym: true });
console.log('    有分词 →', JSON.stringify(r13));

console.log('\n  "还是" 对比:');
const r14 = pinyin('还是', { heteronym: true });
console.log('    无分词 →', JSON.stringify(r14));
const r15 = pinyin('还是', { segment: true, heteronym: true });
console.log('    有分词 →', JSON.stringify(r15));

// ==================== 复杂句子分词测试 ====================
console.log('\n【复杂句子分词测试】');

const r16 = pinyin('我要去银行取钱', { segment: true, heteronym: true });
console.log('  "我要去银行取钱" →', JSON.stringify(r16), '预期: 数组', Array.isArray(r16) ? '✅' : '❌');

const r17 = pinyin('这个问题很重要', { segment: true, heteronym: true });
console.log('  "这个问题很重要" →', JSON.stringify(r17), '预期: 数组', Array.isArray(r17) ? '✅' : '❌');

const r18 = pinyin('长江大桥很长', { segment: true, heteronym: true });
console.log('  "长江大桥很长" →', JSON.stringify(r18), '预期: 数组', Array.isArray(r18) ? '✅' : '❌');

const r19 = pinyin('中国人民银行', { segment: true, heteronym: true });
console.log('  "中国人民银行" →', JSON.stringify(r19), '预期: 数组', Array.isArray(r19) ? '✅' : '❌');

// ==================== segment + group 组合 ====================
console.log('\n【Segment + Group 组合】');

const r20 = pinyin('我喜欢你', { segment: true, group: true });
console.log('  "我喜欢你" (segment + group) →', JSON.stringify(r20), '预期: 数组', Array.isArray(r20) ? '✅' : '❌');

const r21 = pinyin('中华人民共和国', { segment: true, group: true });
console.log('  "中华人民共和国" (segment + group) →', JSON.stringify(r21), '预期: 数组', Array.isArray(r21) ? '✅' : '❌');

const r22 = pinyin('我爱北京天安门', { segment: true, group: true });
console.log('  "我爱北京天安门" (segment + group) →', JSON.stringify(r22), '预期: 数组', Array.isArray(r22) ? '✅' : '❌');

// ==================== segment + group + heteronym ====================
console.log('\n【Segment + Group + Heteronym】');

const r23 = pinyin('我喜欢你', { segment: true, group: true, heteronym: true });
console.log('  "我喜欢你" →', JSON.stringify(r23), '预期: 数组', Array.isArray(r23) ? '✅' : '❌');

const r24 = pinyin('银行行长', { segment: true, group: true, heteronym: true });
console.log('  "银行行长" →', JSON.stringify(r24), '预期: 数组', Array.isArray(r24) ? '✅' : '❌');

const r25 = pinyin('重要的事情', { segment: true, group: true, heteronym: true });
console.log('  "重要的事情" →', JSON.stringify(r25), '预期: 数组', Array.isArray(r25) ? '✅' : '❌');

// ==================== 特殊内容分词 ====================
console.log('\n【特殊内容分词】');

const r26 = pinyin('访问https://example.com网站', { segment: true });
console.log('  包含URL →', JSON.stringify(r26), '预期: 数组', Array.isArray(r26) ? '✅' : '❌');

const r27 = pinyin('联系邮箱test@example.com', { segment: true });
console.log('  包含邮箱 →', JSON.stringify(r27), '预期: 数组', Array.isArray(r27) ? '✅' : '❌');

const r28 = pinyin('价格是123.45元', { segment: true });
console.log('  包含数字 →', JSON.stringify(r28), '预期: 数组', Array.isArray(r28) ? '✅' : '❌');

const r29 = pinyin('Hello世界', { segment: true });
console.log('  中英混合 →', JSON.stringify(r29), '预期: 数组', Array.isArray(r29) ? '✅' : '❌');

const r30 = pinyin('你好，世界！', { segment: true });
console.log('  包含标点 →', JSON.stringify(r30), '预期: 数组', Array.isArray(r30) ? '✅' : '❌');

console.log('\n=== 测试完成 ===');
