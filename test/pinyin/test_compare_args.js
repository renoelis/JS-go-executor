/**
 * 测试 compare 函数参数传递
 */

console.log('=== 测试 compare 参数传递 ===\n');

const { pinyin, compare } = require('pinyin');

// 测试明确的不同参数
console.log('测试 1: "啊" vs "波"');
console.log('  pinyin("啊"):', JSON.stringify(pinyin('啊')));
console.log('  pinyin("波"):', JSON.stringify(pinyin('波')));
console.log('  pinyin.compare("啊", "波"):', pinyin.compare('啊', '波'));
console.log('  compare("啊", "波"):', compare('啊', '波'));

console.log('\n测试 2: "a" vs "b" (纯英文)');
console.log('  pinyin.compare("a", "b"):', pinyin.compare('a', 'b'));
console.log('  compare("a", "b"):', compare('a', 'b'));

console.log('\n测试 3: "z" vs "a" (反向)');
console.log('  pinyin.compare("z", "a"):', pinyin.compare('z', 'a'));
console.log('  compare("z", "a"):', compare('z', 'a'));

console.log('\n测试 4: 相同字符');
console.log('  pinyin.compare("a", "a"):', pinyin.compare('a', 'a'));
console.log('  compare("a", "a"):', compare('a', 'a'));

// 直接测试字符串比较
console.log('\n原始字符串比较（JS）:');
console.log('  "啊" < "波":', '啊' < '波');
console.log('  "啊" > "波":', '啊' > '波');
console.log('  "啊".localeCompare("波"):', '啊'.localeCompare('波'));

// 测试拼音字符串比较
console.log('\n拼音字符串比较:');
const py1 = pinyin('啊', { heteronym: false })[0][0]; // "ā"
const py2 = pinyin('波', { heteronym: false })[0][0]; // "bō"  
console.log('  "啊" 的拼音:', py1);
console.log('  "波" 的拼音:', py2);
console.log('  拼音比较:', py1.localeCompare(py2));
