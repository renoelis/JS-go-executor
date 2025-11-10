/**
 * 测试 pinyin 模块的各种导入方式
 * 验证是否支持标准的 npm pinyin v4 解构导入
 */

console.log('=== Pinyin 模块导入方式测试 ===\n');

let allPassed = true;

// ==================== 测试 1: 直接导入 ====================
console.log('【测试 1】直接导入函数');
try {
    const pinyin1 = require('pinyin');
    const result = pinyin1('测试');
    console.log('  const pinyin = require("pinyin")');
    console.log('  pinyin("测试"):', JSON.stringify(result));
    console.log('  ✅ 成功\n');
} catch (e) {
    console.log('  ❌ 失败:', e.message, '\n');
    allPassed = false;
}

// ==================== 测试 2: 解构导入函数 ====================
console.log('【测试 2】解构导入函数');
try {
    const { pinyin } = require('pinyin');
    const result = pinyin('测试');
    console.log('  const { pinyin } = require("pinyin")');
    console.log('  pinyin("测试"):', JSON.stringify(result));
    console.log('  ✅ 成功\n');
} catch (e) {
    console.log('  ❌ 失败:', e.message, '\n');
    allPassed = false;
}

// ==================== 测试 3: 解构导入常量 ====================
console.log('【测试 3】解构导入常量');
try {
    const { STYLE_NORMAL, STYLE_TONE, STYLE_TONE2, STYLE_TO3NE, STYLE_INITIALS, STYLE_FIRST_LETTER } = require('pinyin');
    console.log('  const { STYLE_NORMAL, STYLE_TONE, ... } = require("pinyin")');
    console.log('  STYLE_NORMAL:', STYLE_NORMAL);
    console.log('  STYLE_TONE:', STYLE_TONE);
    console.log('  STYLE_TONE2:', STYLE_TONE2);
    console.log('  STYLE_TO3NE:', STYLE_TO3NE);
    console.log('  STYLE_INITIALS:', STYLE_INITIALS);
    console.log('  STYLE_FIRST_LETTER:', STYLE_FIRST_LETTER);
    
    if (typeof STYLE_NORMAL === 'number' && typeof STYLE_TONE === 'number') {
        console.log('  ✅ 成功\n');
    } else {
        console.log('  ❌ 失败: 常量类型不正确\n');
        allPassed = false;
    }
} catch (e) {
    console.log('  ❌ 失败:', e.message, '\n');
    allPassed = false;
}

// ==================== 测试 4: 同时解构函数和常量 ====================
console.log('【测试 4】同时解构函数和常量');
try {
    const { pinyin, STYLE_NORMAL, STYLE_INITIALS } = require('pinyin');
    const result = pinyin('测试', { style: STYLE_NORMAL });
    console.log('  const { pinyin, STYLE_NORMAL, STYLE_INITIALS } = require("pinyin")');
    console.log('  pinyin("测试", { style: STYLE_NORMAL }):', JSON.stringify(result));
    console.log('  STYLE_INITIALS:', STYLE_INITIALS);
    console.log('  ✅ 成功\n');
} catch (e) {
    console.log('  ❌ 失败:', e.message, '\n');
    allPassed = false;
}

// ==================== 测试 5: 解构导入方法 ====================
console.log('【测试 5】解构导入方法');
try {
    const { pinyin, compare, compact, segment } = require('pinyin');
    
    console.log('  const { pinyin, compare, compact, segment } = require("pinyin")');
    
    // 测试 compare
    const cmpResult = compare('啊', '波');
    console.log('  compare("啊", "波"):', cmpResult, cmpResult < 0 ? '✅' : '❌');
    
    // 测试 segment
    const segResult = segment('中国人');
    console.log('  segment("中国人"):', JSON.stringify(segResult));
    
    // 测试 compact
    const pys = pinyin('中', { heteronym: true });
    const compactResult = compact(pys);
    console.log('  compact(...):', JSON.stringify(compactResult));
    
    console.log('  ✅ 成功\n');
} catch (e) {
    console.log('  ❌ 失败:', e.message, '\n');
    allPassed = false;
}

// ==================== 测试 6: 解构导入模式常量 ====================
console.log('【测试 6】解构导入模式常量');
try {
    const { MODE_NORMAL, MODE_SURNAME } = require('pinyin');
    console.log('  const { MODE_NORMAL, MODE_SURNAME } = require("pinyin")');
    console.log('  MODE_NORMAL:', MODE_NORMAL);
    console.log('  MODE_SURNAME:', MODE_SURNAME);
    
    if (typeof MODE_NORMAL === 'number' && typeof MODE_SURNAME === 'number') {
        console.log('  ✅ 成功\n');
    } else {
        console.log('  ❌ 失败: 常量类型不正确\n');
        allPassed = false;
    }
} catch (e) {
    console.log('  ❌ 失败:', e.message, '\n');
    allPassed = false;
}

// ==================== 测试 7: 通过对象属性访问 ====================
console.log('【测试 7】通过对象属性访问');
try {
    const pinyinModule = require('pinyin');
    
    console.log('  const pinyinModule = require("pinyin")');
    console.log('  pinyinModule.STYLE_NORMAL:', pinyinModule.STYLE_NORMAL);
    console.log('  pinyinModule.compare:', typeof pinyinModule.compare);
    console.log('  pinyinModule.pinyin:', typeof pinyinModule.pinyin);
    
    // 测试通过属性调用
    const result1 = pinyinModule('测试');
    const result2 = pinyinModule.pinyin('测试');
    console.log('  pinyinModule("测试"):', JSON.stringify(result1));
    console.log('  pinyinModule.pinyin("测试"):', JSON.stringify(result2));
    
    console.log('  ✅ 成功\n');
} catch (e) {
    console.log('  ❌ 失败:', e.message, '\n');
    allPassed = false;
}

// ==================== 总结 ====================
console.log('=== 测试总结 ===');
if (allPassed) {
    console.log('✅ 所有导入方式测试通过！');
    console.log('\n支持的导入方式：');
    console.log('1. const pinyin = require("pinyin")');
    console.log('2. const { pinyin } = require("pinyin")');
    console.log('3. const { STYLE_NORMAL, STYLE_TONE } = require("pinyin")');
    console.log('4. const { pinyin, STYLE_NORMAL } = require("pinyin")');
    console.log('5. const { compare, compact, segment } = require("pinyin")');
    console.log('6. const { MODE_NORMAL, MODE_SURNAME } = require("pinyin")');
} else {
    console.log('❌ 部分测试失败，请检查上面的错误信息');
}
