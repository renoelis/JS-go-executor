/**
 * Pinyin Compare 比较函数测试
 * 测试 pinyin.compare() 排序功能
 */

const { pinyin } = require('pinyin');

console.log('=== Pinyin Compare 比较函数测试 ===\n');

// ==================== 基础比较测试 ====================
console.log('【基础比较】');

const result1 = pinyin.compare('啊', '波');
console.log('  "啊" < "波":', result1, '预期: < 0', result1 < 0 ? '✅' : '❌');

const result2 = pinyin.compare('波', '啊');
console.log('  "波" > "啊":', result2, '预期: > 0', result2 > 0 ? '✅' : '❌');

const result3 = pinyin.compare('中', '中');
console.log('  "中" === "中":', result3, '预期: === 0', result3 === 0 ? '✅' : '❌');

// ==================== 多字比较测试 ====================
console.log('\n【多字比较】');

const result4 = pinyin.compare('北京', '上海');
console.log('  "北京" < "上海":', result4, '预期: < 0', result4 < 0 ? '✅' : '❌');

const result5 = pinyin.compare('上海', '深圳');
console.log('  "上海" < "深圳":', result5, '预期: < 0', result5 < 0 ? '✅' : '❌');

const result6 = pinyin.compare('广州', '深圳');
console.log('  "广州" < "深圳":', result6, '预期: < 0', result6 < 0 ? '✅' : '❌');

// ==================== 声调比较测试 ====================
console.log('\n【声调比较】');

const result7 = pinyin.compare('妈', '麻');
console.log('  "妈" vs "麻":', result7, '预期: number', typeof result7 === 'number' ? '✅' : '❌');

const result8 = pinyin.compare('麻', '马');
console.log('  "麻" vs "马":', result8, '预期: number', typeof result8 === 'number' ? '✅' : '❌');

const result9 = pinyin.compare('马', '骂');
console.log('  "马" vs "骂":', result9, '预期: number', typeof result9 === 'number' ? '✅' : '❌');

// ==================== 数组排序测试 ====================
console.log('\n【数组排序】');

const cities = ['上海', '北京', '深圳', '广州', '杭州'];
const sorted1 = cities.sort(pinyin.compare);
const isValid1 = sorted1.length === 5 && sorted1.every((v, i, arr) => i === 0 || pinyin.compare(arr[i-1], v) <= 0);
console.log('  城市排序:', JSON.stringify(sorted1), '预期: 按拼音排序', isValid1 ? '✅' : '❌');

const names = ['张三', '李四', '王五', '赵六', '陈七'];
const sorted2 = names.sort(pinyin.compare);
const isValid2 = sorted2.length === 5 && sorted2.every((v, i, arr) => i === 0 || pinyin.compare(arr[i-1], v) <= 0);
console.log('  姓名排序:', JSON.stringify(sorted2), '预期: 按拼音排序', isValid2 ? '✅' : '❌');

const words = ['中国', '重要', '银行', '长度', '还是'];
const sorted3 = words.sort(pinyin.compare);
console.log('  多音字排序:', JSON.stringify(sorted3), '预期: 5个元素', sorted3.length === 5 ? '✅' : '❌');

// ==================== 特殊字符测试 ====================
console.log('\n【特殊字符】');

const r10 = pinyin.compare('A公司', 'B公司');
console.log('  包含英文:', r10, '预期: number', typeof r10 === 'number' ? '✅' : '❌');

const r11 = pinyin.compare('1号', '2号');
console.log('  包含数字:', r11, '预期: number', typeof r11 === 'number' ? '✅' : '❌');

const r12 = pinyin.compare('你好！', '你好？');
console.log('  包含标点:', r12, '预期: number', typeof r12 === 'number' ? '✅' : '❌');

// ==================== 长度比较测试 ====================
console.log('\n【长度比较】');

const r13 = pinyin.compare('中', '中国');
console.log('  "中" < "中国":', r13, '预期: < 0', r13 < 0 ? '✅' : '❌');

const r14 = pinyin.compare('中国', '中');
console.log('  "中国" > "中":', r14, '预期: > 0', r14 > 0 ? '✅' : '❌');

const r15 = pinyin.compare('北京市', '北京');
console.log('  "北京市" > "北京":', r15, '预期: > 0', r15 > 0 ? '✅' : '❌');

// ==================== 边界情况测试 ====================
console.log('\n【边界情况】');

const r16 = pinyin.compare('', '中国');
console.log('  空字符串 vs 非空:', r16, '预期: number', typeof r16 === 'number' ? '✅' : '❌');

const r17 = pinyin.compare('', '');
console.log('  两个空字符串:', r17, '预期: === 0', r17 === 0 ? '✅' : '❌');

const r18 = pinyin.compare('hello', 'world');
console.log('  纯英文:', r18, '预期: number', typeof r18 === 'number' ? '✅' : '❌');

const r19 = pinyin.compare('hello世界', 'world世界');
console.log('  中英混合:', r19, '预期: number', typeof r19 === 'number' ? '✅' : '❌');

console.log('\n=== 测试完成 ===');
