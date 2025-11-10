/**
 * 测试 npm pinyin v4 对同音不同调字符的实际行为
 * 需要在 Node.js 环境中运行（安装了 npm pinyin）
 */

// 如果在真实的 Node.js 环境，使用 npm pinyin
// 如果在我们的 Go 环境，使用我们的实现
let pinyin;
try {
    // 尝试加载真实的 npm pinyin（如果在 Node.js 环境）
    pinyin = require('pinyin');
    console.log('使用 npm pinyin 库');
} catch (e) {
    // 如果失败，使用我们的实现
    pinyin = require('pinyin');
    console.log('使用 Go 实现的 pinyin');
}

console.log('\n=== 测试同音不同调字符的比较行为 ===\n');

// 测试1: 妈(mā) vs 麻(má)
console.log('【测试 1】妈 vs 麻');
console.log('  妈的拼音:', JSON.stringify(pinyin('妈')));
console.log('  麻的拼音:', JSON.stringify(pinyin('麻')));
const result1 = pinyin.compare('妈', '麻');
console.log('  pinyin.compare("妈", "麻"):', result1);
console.log('  说明:', result1 < 0 ? '妈 < 麻' : result1 > 0 ? '妈 > 麻' : '妈 = 麻');

// 测试2: 中(zhōng) vs 重(zhòng)
console.log('\n【测试 2】中 vs 重');
console.log('  中的拼音:', JSON.stringify(pinyin('中')));
console.log('  重的拼音:', JSON.stringify(pinyin('重')));
const result2 = pinyin.compare('中', '重');
console.log('  pinyin.compare("中", "重"):', result2);
console.log('  说明:', result2 < 0 ? '中 < 重' : result2 > 0 ? '中 > 重' : '中 = 重');

// 测试3: JavaScript localeCompare 的行为
console.log('\n【测试 3】JavaScript localeCompare 直接比较拼音字符串');
console.log('  "mā".localeCompare("má"):', 'mā'.localeCompare('má'));
console.log('  "zhōng".localeCompare("zhòng"):', 'zhōng'.localeCompare('zhòng'));

// 测试4: 拼音字符串的数组表示
console.log('\n【测试 4】拼音数组转字符串后的比较');
const py1 = pinyin('妈');
const py2 = pinyin('麻');
const str1 = String(py1);
const str2 = String(py2);
console.log('  String(pinyin("妈")):', str1);
console.log('  String(pinyin("麻")):', str2);
console.log('  str1.localeCompare(str2):', str1.localeCompare(str2));

// 测试5: 声调差异对排序的影响
console.log('\n【测试 5】相同拼音不同声调的排序');
const words = ['妈', '麻', '马', '骂'];
const sorted = words.sort(pinyin.compare);
console.log('  原数组: ["妈", "麻", "马", "骂"]');
console.log('  排序后:', JSON.stringify(sorted));
console.log('  说明: 声调是否影响排序?', sorted[0] === '妈' && sorted[1] === '麻' ? '是' : '否');

console.log('\n=== 结论 ===');
console.log('如果 pinyin.compare() 返回非0值，说明它会考虑声调差异');
console.log('如果返回0，说明它忽略声调差异');
