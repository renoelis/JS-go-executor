/**
 * 调试 compare 函数在不同调用方式下的行为
 */

console.log('=== Compare 函数调试 ===\n');

// 方式 1: 通过 module.pinyin.compare 调用
const { pinyin } = require('pinyin');
const result1 = pinyin.compare('啊', '波');
console.log('1. pinyin.compare("啊", "波"):', result1, '预期: < 0', result1 < 0 ? '✅' : '❌');

// 方式 2: 解构获取 compare
const { compare } = require('pinyin');
const result2 = compare('啊', '波');
console.log('2. compare("啊", "波"):', result2, '预期: < 0', result2 < 0 ? '✅' : '❌');

// 方式 3: 先获取 module，再解构
const pinyinModule = require('pinyin');
const { compare: compare3 } = pinyinModule;
const result3 = compare3('啊', '波');
console.log('3. compare3("啊", "波"):', result3, '预期: < 0', result3 < 0 ? '✅' : '❌');

// 方式 4: 检查函数是否相同
console.log('\n函数引用检查:');
console.log('  pinyin.compare === compare:', pinyin.compare === compare);
console.log('  pinyin.compare === pinyinModule.compare:', pinyin.compare === pinyinModule.compare);

// 方式 5: 测试反向参数
const result4 = pinyin.compare('波', '啊');
const result5 = compare('波', '啊');
console.log('\n反向参数测试:');
console.log('  pinyin.compare("波", "啊"):', result4, '预期: > 0', result4 > 0 ? '✅' : '❌');
console.log('  compare("波", "啊"):', result5, '预期: > 0', result5 > 0 ? '✅' : '❌');

// 方式 6: 测试其他字符
console.log('\n其他字符测试:');
const r6 = pinyin.compare('中', '国');
const r7 = compare('中', '国');
console.log('  pinyin.compare("中", "国"):', r6);
console.log('  compare("中", "国"):', r7);
console.log('  结果相同:', r6 === r7 ? '✅' : '❌');
