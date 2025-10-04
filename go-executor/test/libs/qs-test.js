// qs 模块功能测试
// 测试 query string 解析和序列化

const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

console.log("🚀 开始 qs 模块功能测试\n");
console.log("=" + "=".repeat(60) + "\n");

// 测试 1: 导入 qs 模块
console.log("=== 测试 1: 导入 qs 模块 ===");
try {
    const qs = require('qs');
    console.log("  ✅ qs 模块导入成功");
    console.log(`  qs 对象类型: ${typeof qs}`);
    console.log(`  qs.parse 存在: ${typeof qs.parse === 'function'}`);
    console.log(`  qs.stringify 存在: ${typeof qs.stringify === 'function'}`);
    
    testResults.passed++;
} catch (error) {
    console.error("  ❌ qs 模块导入失败:", error.message);
    testResults.failed++;
    testResults.errors.push("qs 导入: " + error.message);
}

// 测试 2: parse - 基础解析
console.log("\n=== 测试 2: parse - 基础解析 ===");
try {
    const qs = require('qs');
    
    const result = qs.parse('a=1&b=2&c=3');
    console.log("  查询字符串: 'a=1&b=2&c=3'");
    console.log(`  解析结果: ${JSON.stringify(result)}`);
    
    if (result.a === '1' && result.b === '2' && result.c === '3') {
        console.log("  ✅ 基础解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("解析结果不正确");
    }
} catch (error) {
    console.error("  ❌ 基础解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("parse 基础: " + error.message);
}

// 测试 3: parse - 数组解析
console.log("\n=== 测试 3: parse - 数组解析 ===");
try {
    const qs = require('qs');
    
    const result = qs.parse('a[]=1&a[]=2&a[]=3');
    console.log("  查询字符串: 'a[]=1&a[]=2&a[]=3'");
    console.log(`  解析结果: ${JSON.stringify(result)}`);
    
    if (Array.isArray(result.a) && result.a.length === 3) {
        console.log("  ✅ 数组解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("数组解析失败");
    }
} catch (error) {
    console.error("  ❌ 数组解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("parse 数组: " + error.message);
}

// 测试 4: parse - 嵌套对象
console.log("\n=== 测试 4: parse - 嵌套对象 ===");
try {
    const qs = require('qs');
    
    const result = qs.parse('user[name]=John&user[age]=30');
    console.log("  查询字符串: 'user[name]=John&user[age]=30'");
    console.log(`  解析结果: ${JSON.stringify(result)}`);
    
    if (result.user && result.user.name === 'John' && result.user.age === '30') {
        console.log("  ✅ 嵌套对象解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("嵌套对象解析失败");
    }
} catch (error) {
    console.error("  ❌ 嵌套对象解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("parse 嵌套对象: " + error.message);
}

// 测试 5: stringify - 基础序列化
console.log("\n=== 测试 5: stringify - 基础序列化 ===");
try {
    const qs = require('qs');
    
    const result = qs.stringify({ a: 1, b: 2, c: 3 });
    console.log("  对象: { a: 1, b: 2, c: 3 }");
    console.log(`  序列化结果: ${result}`);
    
    if (result.includes('a=1') && result.includes('b=2') && result.includes('c=3')) {
        console.log("  ✅ 基础序列化测试通过");
        testResults.passed++;
    } else {
        throw new Error("序列化结果不正确");
    }
} catch (error) {
    console.error("  ❌ 基础序列化测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("stringify 基础: " + error.message);
}

// 测试 6: stringify - 数组序列化
console.log("\n=== 测试 6: stringify - 数组序列化 ===");
try {
    const qs = require('qs');
    
    const result = qs.stringify({ a: [1, 2, 3] });
    console.log("  对象: { a: [1, 2, 3] }");
    console.log(`  序列化结果: ${result}`);
    
    // qs 会进行 URL 编码: [ 变成 %5B, ] 变成 %5D
    // 所以 a[0]=1 会变成 a%5B0%5D=1
    if (result.includes('a%5B') || result.includes('a[') || result.includes('a=')) {
        console.log("  ✅ 数组序列化测试通过");
        testResults.passed++;
    } else {
        throw new Error("数组序列化失败");
    }
} catch (error) {
    console.error("  ❌ 数组序列化测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("stringify 数组: " + error.message);
}

// 测试 7: stringify - 嵌套对象序列化
console.log("\n=== 测试 7: stringify - 嵌套对象序列化 ===");
try {
    const qs = require('qs');
    
    const result = qs.stringify({ user: { name: 'John', age: 30 } });
    console.log("  对象: { user: { name: 'John', age: 30 } }");
    console.log(`  序列化结果: ${result}`);
    
    // qs 会进行 URL 编码: user[name] 变成 user%5Bname%5D
    if ((result.includes('user%5B') || result.includes('user[')) && result.includes('name') && result.includes('age')) {
        console.log("  ✅ 嵌套对象序列化测试通过");
        testResults.passed++;
    } else {
        throw new Error("嵌套对象序列化失败");
    }
} catch (error) {
    console.error("  ❌ 嵌套对象序列化测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("stringify 嵌套对象: " + error.message);
}

// 测试 8: 往返转换 (parse -> stringify)
console.log("\n=== 测试 8: 往返转换测试 ===");
try {
    const qs = require('qs');
    
    const original = 'a=1&b=2&c=3';
    const parsed = qs.parse(original);
    const stringified = qs.stringify(parsed);
    
    console.log(`  原始: ${original}`);
    console.log(`  解析: ${JSON.stringify(parsed)}`);
    console.log(`  重新序列化: ${stringified}`);
    
    const reparsed = qs.parse(stringified);
    if (reparsed.a === '1' && reparsed.b === '2' && reparsed.c === '3') {
        console.log("  ✅ 往返转换测试通过");
        testResults.passed++;
    } else {
        throw new Error("往返转换结果不一致");
    }
} catch (error) {
    console.error("  ❌ 往返转换测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("往返转换: " + error.message);
}

// 输出测试结果
console.log("\n" + "=".repeat(60));
console.log("📊 测试结果汇总");
console.log("=".repeat(60));
console.log(`✅ 通过: ${testResults.passed}`);
console.log(`❌ 失败: ${testResults.failed}`);
console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);

if (testResults.errors.length > 0) {
    console.log("\n❌ 错误详情:");
    testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
    });
}

// 返回结果
testResults.success = testResults.failed === 0;
testResults.message = testResults.success ? "所有 qs 测试通过" : "部分测试失败";
return testResults;

