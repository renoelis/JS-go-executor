/**
 * Pinyin Options 选项测试
 * 测试 heteronym, group, compact 等选项
 */

const { pinyin } = require('pinyin');

console.log('=== Pinyin Options 选项测试 ===\n');

function checkResult(actual, expected, desc) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${desc}:`, JSON.stringify(actual), '预期:', JSON.stringify(expected), match ? '✅' : '❌');
  return match;
}

// ==================== heteronym 选项 ====================
console.log('【heteronym - 多音字】');

let r1 = pinyin('中心', { heteronym: false });
checkResult(r1, [['zhōng'], ['xīn']], 'heteronym: false');

let r2 = pinyin('中心', { heteronym: true });
const r2HasMulti = r2[0].length > 1;
console.log('  heteronym: true:', JSON.stringify(r2), '预期: "中"有多个读音', r2HasMulti ? '✅' : '❌');

let r3 = pinyin('银行', { heteronym: false });
checkResult(r3, [['yín'], ['háng']], '"银行" (false)');

let r4 = pinyin('银行', { heteronym: true });
const r4HasMulti = r4[1].length > 1;
console.log('  "银行" (true):', JSON.stringify(r4), '预期: "行"有多个读音', r4HasMulti ? '✅' : '❌');

let r5 = pinyin('重要', { heteronym: true });
console.log('  "重要" (true):', JSON.stringify(r5), '预期: 2个元素', r5.length === 2 ? '✅' : '❌');

let r6 = pinyin('长度', { heteronym: true });
console.log('  "长度" (true):', JSON.stringify(r6), '预期: 2个元素', r6.length === 2 ? '✅' : '❌');

let r7 = pinyin('还是', { heteronym: true });
console.log('  "还是" (true):', JSON.stringify(r7), '预期: 2个元素', r7.length === 2 ? '✅' : '❌');

// ==================== group 选项 ====================
console.log('\n【group - 分组】');

let r8 = pinyin('我喜欢你', { group: false });
checkResult(r8, [['wǒ'], ['xǐ'], ['huān'], ['nǐ']], 'group: false');

let r9 = pinyin('我喜欢你', { segment: true, group: true });
console.log('  segment + group: true:', JSON.stringify(r9), '预期: 数组', Array.isArray(r9) ? '✅' : '❌');

let r10 = pinyin('我喜欢你', { group: true });
checkResult(r10, [['wǒ'], ['xǐ'], ['huān'], ['nǐ']], '只有 group (无segment)');

let r11 = pinyin('中华人民共和国', { segment: true, group: true });
console.log('  "中华人民共和国":', JSON.stringify(r11), '预期: <=7个元素', r11.length <= 7 ? '✅' : '❌');

// ==================== compact 选项 ====================
console.log('\n【compact - 紧凑模式】');

let r12 = pinyin('中国', { compact: false });
checkResult(r12, [['zhōng'], ['guó']], 'compact: false');

let r13 = pinyin('中国', { compact: true });
console.log('  compact: true:', JSON.stringify(r13), '预期: 数组', Array.isArray(r13) ? '✅' : '❌');

let r14 = pinyin('中国', { compact: true, heteronym: true });
console.log('  compact + heteronym:', JSON.stringify(r14), '预期: 数组', Array.isArray(r14) ? '✅' : '❌');

let r15 = pinyin('你好', { compact: true, heteronym: false });
console.log('  "你好" (compact):', JSON.stringify(r15), '预期: 数组', Array.isArray(r15) ? '✅' : '❌');

let r16 = pinyin('中心', { compact: true, heteronym: true });
console.log('  "中心" (compact + heteronym):', JSON.stringify(r16), '预期: 数组', Array.isArray(r16) ? '✅' : '❌');

// ==================== 选项组合 ====================
console.log('\n【选项组合】');

let r17 = pinyin('中心', { heteronym: true, style: pinyin.STYLE_NORMAL });
console.log('  heteronym + STYLE_NORMAL:', JSON.stringify(r17), '预期: 2个元素', r17.length === 2 ? '✅' : '❌');

let r18 = pinyin('中心', { heteronym: true, style: pinyin.STYLE_TONE2 });
console.log('  heteronym + STYLE_TONE2:', JSON.stringify(r18), '预期: 2个元素', r18.length === 2 ? '✅' : '❌');

let r19 = pinyin('中心', { heteronym: true, style: pinyin.STYLE_INITIALS });
console.log('  heteronym + STYLE_INITIALS:', JSON.stringify(r19), '预期: 2个元素', r19.length === 2 ? '✅' : '❌');

let r20 = pinyin('华夫人', { heteronym: true, mode: pinyin.MODE_SURNAME });
console.log('  heteronym + MODE_SURNAME:', JSON.stringify(r20), '预期: 3个元素', r20.length === 3 ? '✅' : '❌');

let r21 = pinyin('我喜欢你', { segment: true, group: true, style: pinyin.STYLE_NORMAL });
console.log('  segment + group + STYLE_NORMAL:', JSON.stringify(r21), '预期: 数组', Array.isArray(r21) ? '✅' : '❌');

let r22 = pinyin('我喜欢你', { segment: true, group: true, heteronym: true });
console.log('  segment + group + heteronym:', JSON.stringify(r22), '预期: 数组', Array.isArray(r22) ? '✅' : '❌');

let r23 = pinyin('中国人', { 
  heteronym: true, 
  segment: true, 
  group: true, 
  style: pinyin.STYLE_TONE2,
  mode: pinyin.MODE_NORMAL,
  compact: false
});
console.log('  所有选项组合:', JSON.stringify(r23), '预期: 数组', Array.isArray(r23) ? '✅' : '❌');

// ==================== 边界情况 ====================
console.log('\n【边界情况】');

let r24 = pinyin('');
checkResult(r24, [], '空字符串');

let r25 = pinyin('hello');
console.log('  纯英文:', JSON.stringify(r25), '预期: 数组', Array.isArray(r25) ? '✅' : '❌');

let r26 = pinyin('12345');
console.log('  纯数字:', JSON.stringify(r26), '预期: 数组', Array.isArray(r26) ? '✅' : '❌');

let r27 = pinyin('hello世界');
console.log('  中英混合:', JSON.stringify(r27), '预期: 数组', Array.isArray(r27) ? '✅' : '❌');

let r28 = pinyin('你好，世界！');
console.log('  包含标点:', JSON.stringify(r28), '预期: 数组', Array.isArray(r28) ? '✅' : '❌');

let r29 = pinyin('中');
checkResult(r29, [['zhōng']], '单个汉字');

let r30 = pinyin('繁體中文');
console.log('  繁体字:', JSON.stringify(r30), '预期: 4个元素', r30.length === 4 ? '✅' : '❌');

let r31 = pinyin('龘');
console.log('  生僻字:', JSON.stringify(r31), '预期: 1个元素', r31.length === 1 ? '✅' : '❌');

console.log('\n=== 测试完成 ===');
