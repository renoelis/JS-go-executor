// pinyin 模块测试
const pinyin = require('pinyin');

console.log("🚀 pinyin 模块测试\n");

try {
    console.log("=== 测试 1: 基础转换 ===");
    const result1 = pinyin('中国');
    console.log(`  '中国' => ${JSON.stringify(result1)}`);
    
    console.log("\n=== 测试 2: 无音调模式 ===");
    const result2 = pinyin('中国', { style: pinyin.STYLE_NORMAL });
    console.log(`  '中国' (NORMAL) => ${JSON.stringify(result2)}`);
    
    console.log("\n=== 测试 3: 首字母 ===");
    const result3 = pinyin('中国', { style: pinyin.STYLE_FIRST_LETTER });
    console.log(`  '中国' (FIRST_LETTER) => ${JSON.stringify(result3)}`);
    
    return {
        success: true,
        result1,
        result2,
        result3,
        message: "pinyin 模块工作正常"
    };
} catch (error) {
    console.error("❌ 错误:", error.message);
    return {
        success: false,
        error: error.message
    };
}

