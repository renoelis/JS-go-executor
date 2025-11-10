/**
 * Pinyin 缺失功能补充测试
 * 测试 STYLE_PASSPORT、compact() 函数、Pinyin.segment() 方法
 */

const { pinyin, compact, Pinyin } = require('pinyin');

console.log('=== Pinyin 缺失功能补充测试 ===\n');

function checkResult(actual, expected, desc) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${desc}:`, JSON.stringify(actual), '预期:', JSON.stringify(expected), match ? '✅' : '❌');
  return match;
}

// ==================== STYLE_PASSPORT 测试 ====================
console.log('【STYLE_PASSPORT - 护照风格】');

let r1 = pinyin('吕', { style: 'passport' });
checkResult(r1, [['LYU']], 'passport - 字符串 "passport"');

let r2 = pinyin('吕', { style: 'PASSPORT' });
checkResult(r2, [['LYU']], 'passport - 字符串 "PASSPORT"');

let r3 = pinyin('吕', { style: pinyin.STYLE_PASSPORT });
checkResult(r3, [['LYU']], 'passport - 常量 STYLE_PASSPORT');

let r4 = pinyin('吕', { style: 6 });
checkResult(r4, [['LYU']], 'passport - 数字 6');

// ==================== ü 转换规则 ====================
console.log('\n【ü 转换规则】');

let r5 = pinyin('吕', { style: 'passport' });
checkResult(r5, [['LYU']], '吕(Lü) → LYU');

let r6 = pinyin('女', { style: 'passport' });
checkResult(r6, [['NYU']], '女(Nü) → NYU');

let r7 = pinyin('绿', { style: 'passport' });
checkResult(r7, [['LYU']], '绿(Lü) → LYU');

let r8 = pinyin('略', { style: 'passport' });
checkResult(r8, [['LYUE']], '略(Lüe) → LYUE');

let r9 = pinyin('虐', { style: 'passport' });
checkResult(r9, [['NYUE']], '虐(Nüe) → NYUE');

// ==================== 姓名场景 ====================
console.log('\n【姓名场景】');

let r10 = pinyin('吕布', { style: 'passport' });
checkResult(r10, [['LYU'], ['BU']], '吕布');

let r11 = pinyin('吕蒙', { style: 'passport' });
checkResult(r11, [['LYU'], ['MENG']], '吕蒙');

let r12 = pinyin('女娲', { style: 'passport' });
checkResult(r12, [['NYU'], ['WA']], '女娲');

// ==================== 大写验证 ====================
console.log('\n【大写验证】');

let r13 = pinyin('中国', { style: 'passport' });
const allUpper1 = r13.every(arr => arr.every(py => py === py.toUpperCase()));
console.log('  普通字符:', JSON.stringify(r13), '全部大写:', allUpper1 ? '✅' : '❌');

let r14 = pinyin('绿色', { style: 'passport' });
const allUpper2 = r14.every(arr => arr.every(py => py === py.toUpperCase()));
console.log('  含ü字符:', JSON.stringify(r14), '全部大写:', allUpper2 ? '✅' : '❌');

// ==================== passport + surname ====================
console.log('\n【passport + surname】');

let r15 = pinyin('吕布', { style: 'passport', mode: 'surname' });
checkResult(r15, [['LYU'], ['BU']], 'passport + surname');

// ==================== passport + heteronym ====================
console.log('\n【passport + heteronym】');

let r16 = pinyin('女', { style: 'passport', heteronym: true });
const allUpper3 = Array.isArray(r16[0]) && r16[0].every(py => py === py.toUpperCase());
console.log('  多音字:', JSON.stringify(r16), '全部大写:', allUpper3 ? '✅' : '❌');

// ==================== 常见含ü的字 ====================
console.log('\n【常见含ü的字】');

let r17 = pinyin('律', { style: 'passport' });
console.log('  律:', JSON.stringify(r17), r17[0][0] === r17[0][0].toUpperCase() ? '✅' : '❌');

let r18 = pinyin('驴', { style: 'passport' });
console.log('  驴:', JSON.stringify(r18), r18[0][0] === r18[0][0].toUpperCase() ? '✅' : '❌');

let r19 = pinyin('旅', { style: 'passport' });
console.log('  旅:', JSON.stringify(r19), r19[0][0] === r19[0][0].toUpperCase() ? '✅' : '❌');

// ==================== compact() 函数测试 ====================
console.log('\n【compact() 函数】');

console.log('  导入验证:', typeof compact === 'function' ? '✅' : '❌');

let c1 = pinyin('中国', { heteronym: false });
let comp1 = compact(c1);
checkResult(comp1, [['zhōng', 'guó']], '单音字（无变化）');

let c2 = pinyin('中心', { heteronym: true });
let comp2 = compact(c2);
console.log('  两字多音字:', JSON.stringify(comp2), '组合数 ≥ 1:', comp2.length >= 1 ? '✅' : '❌');
console.log('  每组长度为2:', comp2.every(arr => arr.length === 2) ? '✅' : '❌');

let c3 = pinyin('你好吗', { heteronym: true });
let comp3 = compact(c3);
console.log('  三字多音字:', JSON.stringify(comp3), '组合数 > 1:', comp3.length > 1 ? '✅' : '❌');
console.log('  每组长度为3:', comp3.every(arr => arr.length === 3) ? '✅' : '❌');

// ==================== compact() vs options.compact ====================
console.log('\n【compact() vs options.compact】');

let text1 = '中心';
let method1 = compact(pinyin(text1, { heteronym: true }));
let method2 = pinyin(text1, { heteronym: true, compact: true });
checkResult(method1, method2, '两种方法结果一致');

let text2 = '你好吗';
let method3 = compact(pinyin(text2, { heteronym: true }));
let method4 = pinyin(text2, { heteronym: true, compact: true });
checkResult(method3, method4, '三字对比');

// ==================== compact() 不同 style ====================
console.log('\n【compact() 不同 style】');

let cs1 = compact(pinyin('中心', { style: 'normal', heteronym: true }));
console.log('  STYLE_NORMAL:', JSON.stringify(cs1), cs1.length > 0 ? '✅' : '❌');

let cs2 = compact(pinyin('中心', { style: 'tone2', heteronym: true }));
console.log('  STYLE_TONE2:', JSON.stringify(cs2), cs2.length > 0 ? '✅' : '❌');

let cs3 = compact(pinyin('中心', { style: 'first_letter', heteronym: true }));
console.log('  STYLE_FIRST_LETTER:', JSON.stringify(cs3), cs3.length > 0 ? '✅' : '❌');

// ==================== compact() 边界情况 ====================
console.log('\n【compact() 边界情况】');

let ce1 = compact([]);
checkResult(ce1, [], '空数组');

let ce2 = compact(pinyin('中', { heteronym: false }));
console.log('  单字单音:', JSON.stringify(ce2), ce2.length === 1 ? '✅' : '❌');

// ==================== compact() 实际场景 ====================
console.log('\n【compact() 实际场景】');

let ca1 = compact(pinyin('单于', { heteronym: true }));
console.log('  姓名多音字:', JSON.stringify(ca1), ca1.length > 0 ? '✅' : '❌');

let ca2 = compact(pinyin('银行', { heteronym: true }));
console.log('  词语多音字:', JSON.stringify(ca2), ca2.length > 0 ? '✅' : '❌');

// ==================== Pinyin.segment() 方法测试 ====================
console.log('\n【Pinyin.segment() 方法】');

console.log('  Pinyin 类导入:', typeof Pinyin === 'function' ? '✅' : '❌');

const pinyinInstance = new Pinyin();
console.log('  实例创建:', pinyinInstance instanceof Object ? '✅' : '❌');
console.log('  segment 方法存在:', typeof pinyinInstance.segment === 'function' ? '✅' : '❌');

// ==================== segment() 基础分词 ====================
console.log('\n【segment() 基础分词】');

let s1 = pinyinInstance.segment('我喜欢你');
console.log('  基础分词:', JSON.stringify(s1), Array.isArray(s1) && s1.length > 0 ? '✅' : '❌');

let s2 = pinyinInstance.segment('中国人');
console.log('  短句分词:', JSON.stringify(s2), Array.isArray(s2) && s2.length > 0 ? '✅' : '❌');

let s3 = pinyinInstance.segment('今天天气很好，我们去公园玩吧');
console.log('  长句分词:', JSON.stringify(s3), Array.isArray(s3) && s3.length > 0 ? '✅' : '❌');

// ==================== segment() 不同文本类型 ====================
console.log('\n【segment() 不同文本类型】');

let s4 = pinyinInstance.segment('中华人民共和国');
console.log('  纯中文:', JSON.stringify(s4), Array.isArray(s4) && s4.length > 0 ? '✅' : '❌');

let s5 = pinyinInstance.segment('我爱China');
console.log('  中英混合:', JSON.stringify(s5), Array.isArray(s5) && s5.length > 0 ? '✅' : '❌');

let s6 = pinyinInstance.segment('你好，世界！');
console.log('  含标点:', JSON.stringify(s6), Array.isArray(s6) && s6.length > 0 ? '✅' : '❌');

// ==================== segment() 边界情况 ====================
console.log('\n【segment() 边界情况】');

let s7 = pinyinInstance.segment('');
console.log('  空字符串:', JSON.stringify(s7), Array.isArray(s7) ? '✅' : '❌');

let s8 = pinyinInstance.segment('中');
console.log('  单字:', JSON.stringify(s8), Array.isArray(s8) && s8.length > 0 ? '✅' : '❌');

// ==================== segment() vs options.segment ====================
console.log('\n【segment() 方法 vs options.segment】');

let segText = '我喜欢你';
let segMethod = pinyinInstance.segment(segText);
let segOption = pinyin(segText, { segment: true });

console.log('  segment() 结果:', JSON.stringify(segMethod));
console.log('  pinyin() 结果:', JSON.stringify(segOption));
console.log('  segment() 返回字符串数组:', Array.isArray(segMethod) ? '✅' : '❌');
console.log('  pinyin() 返回二维数组:', Array.isArray(segOption) && Array.isArray(segOption[0]) ? '✅' : '❌');

// ==================== segment() 实际场景 ====================
console.log('\n【segment() 实际场景】');

let s9 = pinyinInstance.segment('北京冬奥会圆满成功');
console.log('  新闻标题:', JSON.stringify(s9), Array.isArray(s9) && s9.length > 0 ? '✅' : '❌');

let s10 = pinyinInstance.segment('床前明月光，疑是地上霜');
console.log('  诗句:', JSON.stringify(s10), Array.isArray(s10) && s10.length > 0 ? '✅' : '❌');

// ==================== 综合功能测试 ====================
console.log('\n【综合功能测试】');

let i1 = compact(pinyin('吕布', { style: 'passport', heteronym: true }));
const allUpper4 = i1.every(arr => arr.every(py => py === py.toUpperCase()));
console.log('  PASSPORT + compact:', JSON.stringify(i1), '全部大写:', allUpper4 ? '✅' : '❌');

let i2Text = '我喜欢你';
let i2Seg = pinyinInstance.segment(i2Text);
let i2Results = i2Seg.map(seg => pinyin(seg));
console.log('  segment + pinyin:', JSON.stringify(i2Results), Array.isArray(i2Results) && i2Results.length > 0 ? '✅' : '❌');

let i3 = pinyin('吕布', { 
  style: 'passport', 
  heteronym: true,
  segment: true,
  compact: true 
});
console.log('  PASSPORT + segment + compact:', JSON.stringify(i3), Array.isArray(i3) && i3.length > 0 ? '✅' : '❌');

console.log('\n=== 测试完成 ===');
