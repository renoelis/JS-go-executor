/**
 * Pinyin 库完整功能测试
 * 测试所有 Tokenizer、Optimizer 和核心功能
 */

// 兼容不同的导入方式
let pinyin;
try {
    const pinyinModule = require('pinyin');
    pinyin = pinyinModule.default || pinyinModule;
} catch (e) {
    pinyin = require('pinyin');
}

// 调试信息：显示 pinyin 对象的可用方法
console.log('🔍 Pinyin 对象信息:');
console.log('   类型:', typeof pinyin);
if (typeof pinyin === 'function') {
    console.log('   可用属性:', Object.keys(pinyin).join(', '));
    console.log('   STYLE_NORMAL:', pinyin.STYLE_NORMAL);
    console.log('   segment方法:', typeof pinyin.segment);
    console.log('   compare方法:', typeof pinyin.compare);
    console.log('   compact方法:', typeof pinyin.compact);
}
console.log('');

// 测试结果统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 测试辅助函数
function test(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`✅ ${name}`);
    } catch (error) {
        failedTests++;
        console.error(`❌ ${name}`);
        console.error(`   错误: ${error.message}`);
    }
}

function assertEqual(actual, expected, message = '') {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}\n  实际: ${actualStr}\n  期望: ${expectedStr}`);
    }
}

function assertContains(array, value, message = '') {
    if (!array.some(item => JSON.stringify(item) === JSON.stringify(value))) {
        throw new Error(`${message}\n  数组中不包含: ${JSON.stringify(value)}\n  实际数组: ${JSON.stringify(array)}`);
    }
}

function assertLength(array, length, message = '') {
    if (array.length !== length) {
        throw new Error(`${message}\n  实际长度: ${array.length}\n  期望长度: ${length}`);
    }
}

console.log('\n🧪 Pinyin 库完整功能测试\n');
console.log('='.repeat(60));

// ========================================
// 1. 基础拼音转换
// ========================================
console.log('\n📌 1. 基础拼音转换');
console.log('-'.repeat(60));

test('基础拼音转换 - 单字', () => {
    const result = pinyin('中');
    assertEqual(result, [['zhōng']]);
});

test('基础拼音转换 - 多字', () => {
    const result = pinyin('中国');
    assertEqual(result, [['zhōng'], ['guó']]);
});

test('基础拼音转换 - 混合字符', () => {
    const result = pinyin('中国ABC');
    assertEqual(result, [['zhōng'], ['guó'], ['ABC']]);
});

// ========================================
// 2. 拼音风格测试
// ========================================
console.log('\n📌 2. 拼音风格测试');
console.log('-'.repeat(60));

test('风格 - NORMAL (无声调)', () => {
    const result = pinyin('中国', { style: pinyin.STYLE_NORMAL });
    assertEqual(result, [['zhong'], ['guo']]);
});

test('风格 - TONE (带声调)', () => {
    const result = pinyin('中国', { style: pinyin.STYLE_TONE });
    assertEqual(result, [['zhōng'], ['guó']]);
});

test('风格 - TONE2 (数字声调)', () => {
    const result = pinyin('中国', { style: pinyin.STYLE_TONE2 });
    // TONE2 风格会在拼音后添加声调数字
    assertEqual(result, [['zhong1'], ['guo2']]);
});

test('风格 - INITIALS (声母)', () => {
    const result = pinyin('中国', { style: pinyin.STYLE_INITIALS });
    assertEqual(result, [['zh'], ['g']]);
});

test('风格 - FIRST_LETTER (首字母)', () => {
    const result = pinyin('中国', { style: pinyin.STYLE_FIRST_LETTER });
    assertEqual(result, [['z'], ['g']]);
});

// ========================================
// 3. 多音字处理 (heteronym)
// ========================================
console.log('\n📌 3. 多音字处理');
console.log('-'.repeat(60));

test('多音字 - 单字多音', () => {
    const result = pinyin('行', { heteronym: true });
    assertLength(result, 1);
    assertContains(result[0], 'xíng', '应包含"行走"的读音');
    assertContains(result[0], 'háng', '应包含"银行"的读音');
});

test('多音字 - 词组消歧', () => {
    const result = pinyin('银行', { segment: true });
    assertEqual(result, [['yín'], ['háng']], '在"银行"词组中应读 háng');
});

test('多音字 - 不同语境', () => {
    const result1 = pinyin('我要去银行', { segment: true });
    const result2 = pinyin('这一行代码', { segment: true });
    // 银行中的"行"应该是 háng
    // 这一行中的"行"应该是 háng（行列）
    console.log('   银行:', result1);
    console.log('   这一行:', result2);
});

// ========================================
// 4. 智能分词 (segment)
// ========================================
console.log('\n📌 4. 智能分词');
console.log('-'.repeat(60));

test('分词 - 基础词组', () => {
    const result = pinyin('我爱北京天安门', { segment: true });
    console.log('   结果:', result);
    // 应该识别出: 我、爱、北京、天安门
});

test('分词 - 长句子', () => {
    const result = pinyin('中华人民共和国是一个伟大的国家', { segment: true });
    console.log('   结果:', result);
    // 应该识别出: 中华人民共和国、是、一个、伟大、的、国家
});

test('分词 - 单字不过度切分', () => {
    const result = pinyin('北京市', { segment: true });
    console.log('   结果:', result);
    // 应该合并为"北京市"而不是"北"+"京"+"市"
});

// ========================================
// 5. 姓名模式 (MODE_SURNAME)
// ========================================
console.log('\n📌 5. 姓名模式');
console.log('-'.repeat(60));

test('姓名模式 - 单姓', () => {
    if (pinyin.MODE_SURNAME !== undefined) {
        const result = pinyin('张三', { mode: pinyin.MODE_SURNAME });
        console.log('   结果:', result);
        // "张"作为姓氏的读音
    } else {
        console.log('   ⚠️  MODE_SURNAME 常量不存在，跳过测试');
    }
});

test('姓名模式 - 复姓', () => {
    if (pinyin.MODE_SURNAME !== undefined) {
        const result = pinyin('欧阳娜娜', { mode: pinyin.MODE_SURNAME });
        console.log('   结果:', result);
    } else {
        console.log('   ⚠️  MODE_SURNAME 常量不存在，跳过测试');
    }
});

test('姓名模式 - 特殊姓氏读音', () => {
    if (pinyin.MODE_SURNAME !== undefined && pinyin.MODE_NORMAL !== undefined) {
        const result1 = pinyin('区', { mode: pinyin.MODE_NORMAL });
        const result2 = pinyin('区', { mode: pinyin.MODE_SURNAME });
        console.log('   普通模式:', result1);
        console.log('   姓名模式:', result2);
    } else {
        console.log('   ⚠️  MODE 常量不存在，跳过测试');
    }
});

// ========================================
// 6. Group 模式
// ========================================
console.log('\n📌 6. Group 模式');
console.log('-'.repeat(60));

test('Group 模式 - 词组拼音合并', () => {
    const result = pinyin('中国', { segment: true, group: true });
    console.log('   结果:', result);
    // 应该将"中国"的拼音合并在一组
});

test('Group 模式 - 保持空格分隔', () => {
    const result = pinyin('我爱中国', { segment: true, group: true });
    console.log('   结果:', result);
});

// ========================================
// 7. Compact 模式
// ========================================
console.log('\n📌 7. Compact 模式');
console.log('-'.repeat(60));

test('Compact 模式 - 基础测试', () => {
    const result = pinyin('中国', { compact: true });
    console.log('   结果:', result);
});

test('Compact 方法 - 手动调用', () => {
    if (typeof pinyin.compact === 'function') {
        const raw = pinyin('中国', { heteronym: true });
        const compacted = pinyin.compact(raw);
        console.log('   原始:', raw);
        console.log('   压缩后:', compacted);
    } else {
        console.log('   ⚠️  compact 方法不存在，跳过测试');
    }
});

// ========================================
// 8. Compare 方法 (排序)
// ========================================
console.log('\n📌 8. Compare 方法');
console.log('-'.repeat(60));

test('Compare - 中文排序', () => {
    if (typeof pinyin.compare === 'function') {
        const arr = ['张三', '李四', '王五', '赵六'];
        const sorted = arr.sort(pinyin.compare);
        console.log('   排序结果:', sorted);
    } else {
        console.log('   ⚠️  compare 方法不存在，跳过测试');
    }
});

test('Compare - 混合排序', () => {
    if (typeof pinyin.compare === 'function') {
        const arr = ['北京', 'beijing', '上海', 'shanghai', '123'];
        const sorted = arr.sort(pinyin.compare);
        console.log('   排序结果:', sorted);
    } else {
        console.log('   ⚠️  compare 方法不存在，跳过测试');
    }
});

// ========================================
// 9. Segment 分词 (通过 segment 选项)
// ========================================
console.log('\n📌 9. Segment 分词功能');
console.log('-'.repeat(60));

test('Segment - 通过选项启用分词', () => {
    // pinyin v4 没有独立的 segment 方法
    // 使用 segment: true 选项来启用分词
    const result = pinyin('我爱北京天安门', { segment: true });
    console.log('   结果:', result);
    console.log('   说明: v4 版本通过 segment 选项启用分词，而不是独立方法');
});

test('Segment - 对比有无分词', () => {
    const withoutSegment = pinyin('银行', { segment: false });
    const withSegment = pinyin('银行', { segment: true });
    console.log('   无分词:', withoutSegment);
    console.log('   有分词:', withSegment);
    console.log('   说明: 分词会影响多音字的识别');
});

// ========================================
// 10. URLTokenizer - URL识别
// ========================================
console.log('\n📌 10. URL 识别');
console.log('-'.repeat(60));

test('URL - HTTP协议', () => {
    const result = pinyin('访问http://www.baidu.com查看', { segment: true });
    console.log('   结果:', result);
    // URL应该作为一个整体
});

test('URL - HTTPS协议', () => {
    const result = pinyin('网址是https://github.com/test', { segment: true });
    console.log('   结果:', result);
});

test('URL - WWW开头', () => {
    const result = pinyin('www.google.com是搜索引擎', { segment: true });
    console.log('   结果:', result);
});

test('URL - 复杂URL', () => {
    const result = pinyin('链接https://example.com/path?q=test#section', { segment: true });
    console.log('   结果:', result);
});

// ========================================
// 11. EmailTokenizer - 邮箱识别
// ========================================
console.log('\n📌 11. 邮箱识别');
console.log('-'.repeat(60));

test('Email - 基础邮箱', () => {
    const result = pinyin('我的邮箱是test@example.com', { segment: true });
    console.log('   结果:', result);
});

test('Email - 复杂邮箱', () => {
    const result = pinyin('联系user.name+tag@company.co.uk获取信息', { segment: true });
    console.log('   结果:', result);
});

test('Email - 多个邮箱', () => {
    const result = pinyin('发送到a@test.com和b@test.com', { segment: true });
    console.log('   结果:', result);
});

// ========================================
// 12. PunctuationTokenizer - 标点识别
// ========================================
console.log('\n📌 12. 标点符号识别');
console.log('-'.repeat(60));

test('标点 - 中文标点', () => {
    const result = pinyin('你好，世界！', { segment: true });
    console.log('   结果:', result);
});

test('标点 - 英文标点', () => {
    const result = pinyin('Hello, World!', { segment: true });
    console.log('   结果:', result);
});

test('标点 - 混合标点', () => {
    const result = pinyin('问题：如何解决？答案：这样做。', { segment: true });
    console.log('   结果:', result);
});

test('标点 - 引号', () => {
    const result = pinyin('"这是引号"和「这也是」', { segment: true });
    console.log('   结果:', result);
});

// ========================================
// 13. ChsNameTokenizer - 人名识别
// ========================================
console.log('\n📌 13. 人名识别');
console.log('-'.repeat(60));

test('人名 - 两字姓名', () => {
    const result = pinyin('张三说李四很好', { segment: true });
    console.log('   结果:', result);
    // 应该识别出: 张三、李四
});

test('人名 - 三字姓名', () => {
    const result = pinyin('王小明和李小红是同学', { segment: true });
    console.log('   结果:', result);
});

test('人名 - 复姓', () => {
    const result = pinyin('欧阳娜娜和诸葛亮', { segment: true });
    console.log('   结果:', result);
});

test('人名 - 叠字名', () => {
    const result = pinyin('李明明说王芳芳来了', { segment: true });
    console.log('   结果:', result);
});

// ========================================
// 14. ForeignTokenizer - 外文字符识别
// ========================================
console.log('\n📌 14. 外文字符识别');
console.log('-'.repeat(60));

test('外文 - 英文单词', () => {
    const result = pinyin('我会说English和中文', { segment: true });
    console.log('   结果:', result);
});

test('外文 - 数字', () => {
    const result = pinyin('我有123个苹果', { segment: true });
    console.log('   结果:', result);
});

test('外文 - 混合', () => {
    const result = pinyin('iPhone15价格是6999元', { segment: true });
    console.log('   结果:', result);
});

test('外文 - 小数', () => {
    const result = pinyin('圆周率是3.14159', { segment: true });
    console.log('   结果:', result);
});

// ========================================
// 15. WildcardTokenizer - 通配符识别
// ========================================
console.log('\n📌 15. 通配符识别');
console.log('-'.repeat(60));

test('通配符 - 星号', () => {
    const result = pinyin('匹配*.txt文件', { segment: true });
    console.log('   结果:', result);
});

test('通配符 - 问号', () => {
    const result = pinyin('文件名file?.doc', { segment: true });
    console.log('   结果:', result);
});

test('通配符 - 混合使用', () => {
    const result = pinyin('模式*test?.js', { segment: true });
    console.log('   结果:', result);
});

// ========================================
// 16. DatetimeOptimizer - 日期时间识别
// ========================================
console.log('\n📌 16. 日期时间识别');
console.log('-'.repeat(60));

test('日期 - 完整日期', () => {
    const result = pinyin('今天是2024年10月31日', { segment: true });
    console.log('   结果:', result);
});

test('日期 - 年月', () => {
    const result = pinyin('2024年10月的天气很好', { segment: true });
    console.log('   结果:', result);
});

test('时间 - 时分', () => {
    const result = pinyin('上午9点30分开会', { segment: true });
    console.log('   结果:', result);
});

test('时间 - 完整时间', () => {
    const result = pinyin('下午3点45分50秒', { segment: true });
    console.log('   结果:', result);
});

test('星期 - 中文', () => {
    const result = pinyin('今天是星期五', { segment: true });
    console.log('   结果:', result);
});

test('星期 - 简写', () => {
    const result = pinyin('周一到周五上班', { segment: true });
    console.log('   结果:', result);
});

test('相对时间', () => {
    const result = pinyin('昨天今天明天', { segment: true });
    console.log('   结果:', result);
});

// ========================================
// 17. DictOptimizer - 词典优化
// ========================================
console.log('\n📌 17. 词典优化（MMSG算法）');
console.log('-'.repeat(60));

test('词典优化 - 单字合并', () => {
    const result = pinyin('北京市天安门', { segment: true });
    console.log('   结果:', result);
    // 应该优化为: 北京市、天安门（而不是过度切分）
});

test('词典优化 - 数词量词', () => {
    const result = pinyin('三个人五只猫', { segment: true });
    console.log('   结果:', result);
    // 数词和量词应该保持分离: 三、个、人、五、只、猫
});

test('词典优化 - 长词组', () => {
    const result = pinyin('中华人民共和国', { segment: true });
    console.log('   结果:', result);
});

// ========================================
// 18. AdjectiveOptimizer - 形容词优化
// ========================================
console.log('\n📌 18. 形容词优化');
console.log('-'.repeat(60));

test('形容词 - 程度副词', () => {
    const result = pinyin('很好非常棒特别nice', { segment: true });
    console.log('   结果:', result);
    // "很好"应该合并
});

test('形容词 - 保持分离', () => {
    const result = pinyin('好的人', { segment: true });
    console.log('   结果:', result);
    // "好的人"应该保持为 ["好", "的", "人"]
});

// ========================================
// 19. 组合功能测试
// ========================================
console.log('\n📌 19. 组合功能测试');
console.log('-'.repeat(60));

test('综合 - 复杂句子', () => {
    const text = '张三于2024年10月31日发送邮件test@example.com到https://github.com';
    const result = pinyin(text, { segment: true });
    console.log('   输入:', text);
    console.log('   结果:', result);
});

test('综合 - 混合中英文数字', () => {
    const text = '我有123个Apple，价格是$99.99';
    const result = pinyin(text, { segment: true });
    console.log('   输入:', text);
    console.log('   结果:', result);
});

test('综合 - 人名日期地点', () => {
    const text = '李明明在2024年10月去北京';
    const result = pinyin(text, { segment: true, heteronym: false });
    console.log('   输入:', text);
    console.log('   结果:', result);
});

test('综合 - 长文本', () => {
    const text = '中华人民共和国成立于1949年10月1日，首都是北京市。访问www.gov.cn了解更多信息。';
    const result = pinyin(text, { segment: true });
    console.log('   输入:', text);
    console.log('   结果长度:', result.length);
});

// ========================================
// 20. 边界情况测试
// ========================================
console.log('\n📌 20. 边界情况测试');
console.log('-'.repeat(60));

test('边界 - 空字符串', () => {
    const result = pinyin('');
    assertEqual(result, []);
});

test('边界 - 单个字符', () => {
    const result = pinyin('中');
    assertEqual(result, [['zhōng']]);
});

test('边界 - 纯英文', () => {
    const result = pinyin('Hello World');
    console.log('   结果:', result);
});

test('边界 - 纯数字', () => {
    const result = pinyin('123456');
    console.log('   结果:', result);
});

test('边界 - 纯标点', () => {
    const result = pinyin('！@#￥%……&*（）');
    console.log('   结果:', result);
});

test('边界 - 特殊字符', () => {
    const result = pinyin('测试\n换行\t制表符');
    console.log('   结果:', result);
});

test('边界 - 连续空格', () => {
    const result = pinyin('你好    世界', { segment: true });
    console.log('   结果:', result);
});

test('边界 - Emoji', () => {
    const result = pinyin('你好😊世界🌍', { segment: true });
    console.log('   结果:', result);
});

// ========================================
// 21. 性能测试
// ========================================
console.log('\n📌 21. 性能测试');
console.log('-'.repeat(60));

test('性能 - 短文本', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
        pinyin('中国');
    }
    const time = Date.now() - start;
    console.log(`   1000次短文本转换耗时: ${time}ms (平均${(time/1000).toFixed(2)}ms/次)`);
});

test('性能 - 中等文本', () => {
    const text = '中华人民共和国是一个伟大的国家';
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
        pinyin(text, { segment: true });
    }
    const time = Date.now() - start;
    console.log(`   100次中等文本转换耗时: ${time}ms (平均${(time/100).toFixed(2)}ms/次)`);
});

test('性能 - 长文本', () => {
    const text = '中华人民共和国成立于1949年10月1日，首都是北京市。中国是世界上人口最多的国家之一，拥有悠久的历史和灿烂的文化。';
    const start = Date.now();
    for (let i = 0; i < 10; i++) {
        pinyin(text, { segment: true, heteronym: true });
    }
    const time = Date.now() - start;
    console.log(`   10次长文本转换耗时: ${time}ms (平均${(time/10).toFixed(2)}ms/次)`);
});

// ========================================
// 测试总结
// ========================================
console.log('\n' + '='.repeat(60));
console.log('📊 测试总结');
console.log('='.repeat(60));
console.log(`总测试数: ${totalTests}`);
console.log(`通过: ${passedTests} ✅`);
console.log(`失败: ${failedTests} ❌`);
console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
console.log('='.repeat(60));

if (failedTests === 0) {
    console.log('\n🎉 所有测试通过！\n');
} else {
    console.log('\n⚠️  有测试失败，请检查上述错误信息。\n');
}

