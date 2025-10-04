// uuid 模块测试
const uuid = require('uuid');

console.log("🚀 uuid 模块测试\n");

try {
    console.log("=== 测试 uuid.v4 ===");
    const id = uuid.v4();
    console.log(`  生成的 UUID: ${id}`);
    console.log(`  长度: ${id.length}`);
    console.log(`  格式正确: ${/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)}`);
    
    return {
        success: true,
        uuid: id,
        message: "uuid 模块工作正常"
    };
} catch (error) {
    console.error("❌ 错误:", error.message);
    return {
        success: false,
        error: error.message
    };
}

