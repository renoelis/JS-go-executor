// 测试 lodash 加载问题排查
console.log("=== 测试全局对象 ===");
console.log("typeof global:", typeof global);
console.log("typeof globalThis:", typeof globalThis);
console.log("typeof window:", typeof window);
console.log("typeof self:", typeof self);

try {
    console.log("\n=== 测试 Function('return this')() ===");
    var testThis = Function('return this')();
    console.log("✅ Function('return this')() 可用:", typeof testThis);
} catch (e) {
    console.error("❌ Function('return this')() 失败:", e.message);
}

try {
    console.log("\n=== 尝试加载 lodash ===");
    const _ = require('lodash');
    console.log("✅ lodash 已加载");
    console.log("typeof _:", typeof _);
    console.log("typeof _.chunk:", typeof _.chunk);
    
    return {
        success: true,
        message: "lodash 加载成功"
    };
} catch (error) {
    console.error("❌ lodash 加载失败:", error.message);
    return {
        success: false,
        error: error.message
    };
}

