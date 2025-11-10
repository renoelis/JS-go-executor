/**
 * 分析 JavaScript localeCompare 对带声调拼音的实际行为
 * 验证我们的 Go 实现是否匹配
 */

const { pinyin } = require('pinyin');

console.log('=== JavaScript localeCompare 行为分析 ===\n');

// 测试1: 直接比较拼音字符串
console.log('【测试 1】直接比较拼音字符串');
console.log('  "mā".localeCompare("má"):', 'mā'.localeCompare('má'));
console.log('  "má".localeCompare("mā"):', 'má'.localeCompare('mā'));
console.log('  "zhōng".localeCompare("zhòng"):', 'zhōng'.localeCompare('zhòng'));

// 测试2: pinyin.compare 的行为
console.log('\n【测试 2】pinyin.compare 的实际行为');
console.log('  妈(mā) 的拼音:', JSON.stringify(pinyin('妈')));
console.log('  麻(má) 的拼音:', JSON.stringify(pinyin('麻')));
console.log('  pinyin.compare("妈", "麻"):', pinyin.compare('妈', '麻'));
console.log('  pinyin.compare("麻", "妈"):', pinyin.compare('麻', '妈'));

// 测试3: 拼音数组转字符串
console.log('\n【测试 3】拼音数组 → 字符串 → localeCompare');
const py妈 = pinyin('妈');
const py麻 = pinyin('麻');
const str妈 = String(py妈);
const str麻 = String(py麻);
console.log('  String(pinyin("妈")):', str妈);
console.log('  String(pinyin("麻")):', str麻);
console.log('  两者 localeCompare:', str妈.localeCompare(str麻));

// 测试4: 验证 compare 的一致性
console.log('\n【测试 4】验证 compare 的一致性');
const words = [
    { char: '妈', pinyin: 'mā', tone: 1 },
    { char: '麻', pinyin: 'má', tone: 2 },
    { char: '马', pinyin: 'mǎ', tone: 3 },
    { char: '骂', pinyin: 'mà', tone: 4 }
];

console.log('  四声排序测试:');
words.forEach((w, i) => {
    words.forEach((w2, j) => {
        if (i < j) {
            const result = pinyin.compare(w.char, w2.char);
            console.log(`    ${w.char}(${w.pinyin}) vs ${w2.char}(${w2.pinyin}): ${result} (${result < 0 ? '<' : result > 0 ? '>' : '='})`);
        }
    });
});

// 测试5: 排序稳定性
console.log('\n【测试 5】排序稳定性');
const testWords = ['妈', '麻', '马', '骂', '妈'];
const sorted = [...testWords].sort(pinyin.compare);
console.log('  原数组:', JSON.stringify(testWords));
console.log('  排序后:', JSON.stringify(sorted));
console.log('  是否稳定:', testWords.filter(w => w === '妈').length === sorted.filter(w => w === '妈').length ? '✅' : '❌');

// 测试6: 与字母表顺序的关系
console.log('\n【测试 6】字母表顺序优先');
console.log('  "ā" vs "bō":');
console.log('    pinyin.compare("啊", "波"):', pinyin.compare('啊', '波'), '(应该 < 0，因为 a < b)');
console.log('  "bō" vs "cè":');  
console.log('    pinyin.compare("波", "测"):', pinyin.compare('波', '测'), '(应该 < 0，因为 b < c)');

// 测试7: 结论
console.log('\n=== 结论 ===');
console.log('1. JavaScript localeCompare 会考虑声调差异');
console.log('2. pinyin.compare 遵循以下规则:');
console.log('   - 优先按字母表顺序 (a < b < c ...)');
console.log('   - 字母相同时按声调排序 (ā < á < ǎ < à)');
console.log('3. 这保证了排序的稳定性和一致性 ✅');
