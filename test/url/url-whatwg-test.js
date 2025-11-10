// Node.js url 模块测试 (WHATWG URL API)
// 测试 goja_nodejs 实现的 URL 和 URLSearchParams 类

const url = require('url');

console.log("🧪 Node.js url 模块测试 (WHATWG URL API)\n");
console.log("============================================================");

const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

// ============================================================
// 测试 1: URL 构造函数 - 基础解析
// ============================================================
console.log("\n=== 测试 1: URL 构造函数 - 基础解析 ===");
try {
    const testUrl = 'https://user:pass@sub.example.com:8080/path/name?page=2&sort=desc#hash';
    const parsed = new url.URL(testUrl);
    
    console.log("  URL:", testUrl);
    console.log("  解析结果:");
    console.log("    protocol:", parsed.protocol);
    console.log("    hostname:", parsed.hostname);
    console.log("    port:", parsed.port);
    console.log("    pathname:", parsed.pathname);
    console.log("    search:", parsed.search);
    console.log("    hash:", parsed.hash);
    console.log("    href:", parsed.href);
    
    if (parsed.protocol === 'https:' &&
        parsed.hostname === 'sub.example.com' &&
        parsed.port === '8080' &&
        parsed.pathname === '/path/name') {
        console.log("  ✅ URL 基础解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("解析结果不匹配");
    }
} catch (error) {
    console.error("  ❌ URL 基础解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URL 基础解析: " + error.message);
}

// ============================================================
// 测试 2: URL 属性 - 用户名和密码
// ============================================================
console.log("\n=== 测试 2: URL 属性 - 用户名和密码 ===");
try {
    const testUrl = 'https://user:pass@example.com/path';
    const parsed = new url.URL(testUrl);
    
    console.log("  username:", parsed.username);
    console.log("  password:", parsed.password);
    console.log("  origin:", parsed.origin);
    
    if (parsed.username === 'user' && parsed.password === 'pass') {
        console.log("  ✅ 用户名密码解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("用户名密码解析失败");
    }
} catch (error) {
    console.error("  ❌ 用户名密码解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URL 用户密码: " + error.message);
}

// ============================================================
// 测试 3: URL.searchParams - 查询参数访问
// ============================================================
console.log("\n=== 测试 3: URL.searchParams - 查询参数访问 ===");
try {
    const testUrl = 'https://example.com/search?q=test&category=books&page=1';
    const parsed = new url.URL(testUrl);
    
    console.log("  查询字符串:", parsed.search);
    console.log("  searchParams.get('q'):", parsed.searchParams.get('q'));
    console.log("  searchParams.get('category'):", parsed.searchParams.get('category'));
    console.log("  searchParams.get('page'):", parsed.searchParams.get('page'));
    
    if (parsed.searchParams.get('q') === 'test' &&
        parsed.searchParams.get('category') === 'books' &&
        parsed.searchParams.get('page') === '1') {
        console.log("  ✅ searchParams 访问测试通过");
        testResults.passed++;
    } else {
        throw new Error("searchParams 访问失败");
    }
} catch (error) {
    console.error("  ❌ searchParams 访问测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URL searchParams: " + error.message);
}

// ============================================================
// 测试 4: URL 修改 - 动态构建
// ============================================================
console.log("\n=== 测试 4: URL 修改 - 动态构建 ===");
try {
    const myUrl = new url.URL('https://example.com/');
    
    console.log("  初始 URL:", myUrl.href);
    
    myUrl.pathname = '/api/users';
    myUrl.searchParams.set('id', '123');
    myUrl.searchParams.set('format', 'json');
    myUrl.hash = '#results';
    
    console.log("  修改后 URL:", myUrl.href);
    console.log("    pathname:", myUrl.pathname);
    console.log("    search:", myUrl.search);
    console.log("    hash:", myUrl.hash);
    
    if (myUrl.pathname === '/api/users' &&
        myUrl.searchParams.get('id') === '123' &&
        myUrl.hash === '#results') {
        console.log("  ✅ URL 修改测试通过");
        testResults.passed++;
    } else {
        throw new Error("URL 修改失败");
    }
} catch (error) {
    console.error("  ❌ URL 修改测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URL 修改: " + error.message);
}

// ============================================================
// 测试 5: URL 相对路径解析
// ============================================================
console.log("\n=== 测试 5: URL 相对路径解析 ===");
try {
    const base = 'https://example.com/path/to/page.html';
    const relative1 = new url.URL('../other.html', base);
    const relative2 = new url.URL('./same.html', base);
    const absolute = new url.URL('/root.html', base);
    
    console.log("  基础 URL:", base);
    console.log("  '../other.html' =>", relative1.href);
    console.log("  './same.html' =>", relative2.href);
    console.log("  '/root.html' =>", absolute.href);
    
    if (relative1.pathname.includes('/path/other.html') &&
        relative2.pathname.includes('/path/to/same.html') &&
        absolute.pathname === '/root.html') {
        console.log("  ✅ 相对路径解析测试通过");
        testResults.passed++;
    } else {
        throw new Error("相对路径解析失败");
    }
} catch (error) {
    console.error("  ❌ 相对路径解析测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URL 相对路径: " + error.message);
}

// ============================================================
// 测试 6: URLSearchParams - 独立使用
// ============================================================
console.log("\n=== 测试 6: URLSearchParams - 独立使用 ===");
try {
    const params = new url.URLSearchParams('foo=1&bar=2&foo=3');
    
    console.log("  输入字符串: 'foo=1&bar=2&foo=3'");
    console.log("  params.get('foo'):", params.get('foo'));
    console.log("  params.getAll('foo'):", JSON.stringify(params.getAll('foo')));
    console.log("  params.get('bar'):", params.get('bar'));
    console.log("  params.toString():", params.toString());
    
    if (params.get('foo') === '1' &&
        params.getAll('foo').length === 2 &&
        params.get('bar') === '2') {
        console.log("  ✅ URLSearchParams 独立使用测试通过");
        testResults.passed++;
    } else {
        throw new Error("URLSearchParams 使用失败");
    }
} catch (error) {
    console.error("  ❌ URLSearchParams 独立使用测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URLSearchParams 独立: " + error.message);
}

// ============================================================
// 测试 7: URLSearchParams - 动态操作
// ============================================================
console.log("\n=== 测试 7: URLSearchParams - 动态操作 ===");
try {
    const params = new url.URLSearchParams();
    
    params.set('name', 'John');
    params.set('age', '30');
    params.append('hobby', 'reading');
    params.append('hobby', 'coding');
    
    console.log("  设置参数后:");
    console.log("    name:", params.get('name'));
    console.log("    age:", params.get('age'));
    console.log("    hobby (all):", JSON.stringify(params.getAll('hobby')));
    console.log("    toString():", params.toString());
    
    if (params.get('name') === 'John' &&
        params.getAll('hobby').length === 2 &&
        params.toString().includes('name=John')) {
        console.log("  ✅ URLSearchParams 动态操作测试通过");
        testResults.passed++;
    } else {
        throw new Error("URLSearchParams 动态操作失败");
    }
} catch (error) {
    console.error("  ❌ URLSearchParams 动态操作测试失败:", error.message);
    testResults.failed++;
    testResults.errors.push("URLSearchParams 动态: " + error.message);
}

// ============================================================
// 测试 8: URL 各种协议
// ============================================================
console.log("\n=== 测试 8: URL 各种协议 ===");
try {
    const urls = [
        'http://example.com',
        'https://example.com',
        'ftp://ftp.example.com',
        'file:///path/to/file'
    ];
    
    let allPassed = true;
    urls.forEach(function(testUrl) {
        try {
            const parsed = new url.URL(testUrl);
            console.log(`  ${testUrl} => protocol: ${parsed.protocol}`);
            if (!parsed.protocol) {
                allPassed = false;
            }
        } catch (e) {
            console.log(`  ${testUrl} => 错误: ${e.message}`);
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
    testResults.errors.push("URL 多协议: " + error.message);
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

