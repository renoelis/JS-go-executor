// Node.js url 模块测试
// 测试 goja_nodejs 实现的 url 模块功能

const url = require('url');

console.log("🧪 Node.js url 模块测试\n");
console.log("============================================================");

const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

// 测试 URL 字符串
const testUrl = 'https://user:pass@sub.example.com:8080/path/name?page=2&sort=desc#hash';

// ============================================================
// 测试 1: url.parse() - 基础解析
// ============================================================
console.log("\n=== 测试 1: url.parse() - 基础解析 ===");
try {
    const parsed = url.parse(testUrl);
    
    console.log("  URL:", testUrl);
    console.log("  解析结果:");
    console.log("    protocol:", parsed.protocol);
    console.log("    host:", parsed.host);
    console.log("    hostname:", parsed.hostname);
    console.log("    port:", parsed.port);
    console.log("    pathname:", parsed.pathname);
    console.log("    search:", parsed.search);
    console.log("    query:", parsed.query);
    console.log("    hash:", parsed.hash);
    
    if (parsed.protocol === 'https:' &&
        parsed.hostname === 'sub.example.com' &&
        parsed.port === '8080' &&
        parsed.pathname === '/path/name') {
        console.log("  ✅ 基础解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("解析结果不匹配");
    }
} catch (error) {
    console.error("  ❌ 基础解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("parse 基础: " + error.message);
}

// ============================================================
// 测试 2: url.parse() - 带查询字符串解析
// ============================================================
console.log("\n=== 测试 2: url.parse() - 带查询字符串解析 ===");
try {
    const parsed = url.parse(testUrl, true); // parseQueryString = true
    
    console.log("  查询字符串解析:");
    console.log("    query (对象):", JSON.stringify(parsed.query));
    console.log("    page:", parsed.query.page);
    console.log("    sort:", parsed.query.sort);
    
    if (typeof parsed.query === 'object' &&
        parsed.query.page === '2' &&
        parsed.query.sort === 'desc') {
        console.log("  ✅ 查询字符串解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("查询字符串解析失败");
    }
} catch (error) {
    console.error("  ❌ 查询字符串解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("parse 查询字符串: " + error.message);
}

// ============================================================
// 测试 3: url.parse() - 带认证信息
// ============================================================
console.log("\n=== 测试 3: url.parse() - 带认证信息 ===");
try {
    const parsed = url.parse(testUrl);
    
    console.log("  认证信息:");
    console.log("    auth:", parsed.auth);
    console.log("    href:", parsed.href);
    
    if (parsed.auth === 'user:pass') {
        console.log("  ✅ 认证信息解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("认证信息解析失败");
    }
} catch (error) {
    console.error("  ❌ 认证信息解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("parse 认证: " + error.message);
}

// ============================================================
// 测试 4: url.format() - URL 格式化
// ============================================================
console.log("\n=== 测试 4: url.format() - URL 格式化 ===");
try {
    const urlObject = {
        protocol: 'https:',
        hostname: 'example.com',
        port: '8080',
        pathname: '/test',
        search: '?key=value',
        hash: '#section'
    };
    
    const formatted = url.format(urlObject);
    console.log("  输入对象:", JSON.stringify(urlObject));
    console.log("  格式化结果:", formatted);
    
    if (formatted.includes('https://') &&
        formatted.includes('example.com') &&
        formatted.includes('8080') &&
        formatted.includes('/test')) {
        console.log("  ✅ URL 格式化测试通过");
        testResults.passed++;
    } else {
        throw new Error("格式化结果不正确");
    }
} catch (error) {
    console.error("  ❌ URL 格式化测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("format: " + error.message);
}

// ============================================================
// 测试 5: url.resolve() - URL 解析
// ============================================================
console.log("\n=== 测试 5: url.resolve() - URL 解析 ===");
try {
    const base = 'https://example.com/path/to/page.html';
    const relative1 = '../other.html';
    const relative2 = './same.html';
    const absolute = '/root.html';
    
    const resolved1 = url.resolve(base, relative1);
    const resolved2 = url.resolve(base, relative2);
    const resolved3 = url.resolve(base, absolute);
    
    console.log("  基础 URL:", base);
    console.log("  相对路径 '../other.html' =>", resolved1);
    console.log("  相对路径 './same.html' =>", resolved2);
    console.log("  绝对路径 '/root.html' =>", resolved3);
    
    if (resolved1.includes('/path/other.html') &&
        resolved2.includes('/path/to/same.html') &&
        resolved3.includes('/root.html')) {
        console.log("  ✅ URL 解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("URL 解析结果不正确");
    }
} catch (error) {
    console.error("  ❌ URL 解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("resolve: " + error.message);
}

// ============================================================
// 测试 6: url.parse() - 各种协议
// ============================================================
console.log("\n=== 测试 6: url.parse() - 各种协议 ===");
try {
    const urls = [
        'http://example.com',
        'https://example.com',
        'ftp://ftp.example.com',
        'file:///path/to/file'
    ];
    
    let allPassed = true;
    urls.forEach(function(testUrl) {
        const parsed = url.parse(testUrl);
        console.log(`  ${testUrl} => protocol: ${parsed.protocol}`);
        if (!parsed.protocol) {
            allPassed = false;
        }
    });
    
    if (allPassed) {
        console.log("  ✅ 多协议解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("某些协议解析失败");
    }
} catch (error) {
    console.error("  ❌ 多协议解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("parse 多协议: " + error.message);
}

// ============================================================
// 测试 7: url.parse() - 边缘情况
// ============================================================
console.log("\n=== 测试 7: url.parse() - 边缘情况 ===");
try {
    // 只有路径
    const pathOnly = url.parse('/path/to/resource');
    console.log("  只有路径 '/path/to/resource':");
    console.log("    pathname:", pathOnly.pathname);
    
    // 只有查询字符串
    const queryOnly = url.parse('?key=value');
    console.log("  只有查询 '?key=value':");
    console.log("    search:", queryOnly.search);
    
    // 只有哈希
    const hashOnly = url.parse('#section');
    console.log("  只有哈希 '#section':");
    console.log("    hash:", hashOnly.hash);
    
    if (pathOnly.pathname === '/path/to/resource' &&
        queryOnly.search === '?key=value' &&
        hashOnly.hash === '#section') {
        console.log("  ✅ 边缘情况测试通过");
        testResults.passed++;
    } else {
        throw new Error("边缘情况处理不正确");
    }
} catch (error) {
    console.error("  ❌ 边缘情况测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("parse 边缘情况: " + error.message);
}

// ============================================================
// 测试 8: url.format() - 往返转换
// ============================================================
console.log("\n=== 测试 8: url.format() - 往返转换 ===");
try {
    const original = 'https://example.com:8080/path?key=value#hash';
    const parsed = url.parse(original);
    const formatted = url.format(parsed);
    
    console.log("  原始 URL:", original);
    console.log("  解析后重新格式化:", formatted);
    
    // 重新解析格式化后的 URL
    const reparsed = url.parse(formatted);
    
    if (reparsed.protocol === parsed.protocol &&
        reparsed.hostname === parsed.hostname &&
        reparsed.pathname === parsed.pathname) {
        console.log("  ✅ 往返转换测试通过");
        testResults.passed++;
    } else {
        throw new Error("往返转换不一致");
    }
} catch (error) {
    console.error("  ❌ 往返转换测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("format 往返: " + error.message);
}

// ============================================================
// 测试结果汇总
// ============================================================
console.log("\n============================================================");
console.log("📊 测试结果汇总");
console.log("============================================================");
console.log("✅ 通过:", testResults.passed);
console.log("❌ 失败:", testResults.failed);
console.log("📈 成功率:", ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2) + "%");

if (testResults.errors.length > 0) {
    console.log("\n❌ 错误详情:");
    testResults.errors.forEach(function(error, index) {
        console.log(`  ${index + 1}. ${error}`);
    });
}

// 返回结果
return {
    success: testResults.failed === 0,
    passed: testResults.passed,
    failed: testResults.failed,
    errors: testResults.errors,
    message: testResults.failed === 0 ? "所有 url 模块测试通过" : "部分测试失败"
};








