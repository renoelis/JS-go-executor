// 检查 url 模块实际提供的内容
const url = require('url');

console.log("=== 检查 url 模块 ===");
console.log("typeof url:", typeof url);

if (typeof url === 'object') {
    console.log("\nurl 对象的属性:");
    for (var key in url) {
        console.log(`  ${key}: ${typeof url[key]}`);
    }
    
    // 检查是否有 URL 类
    if (url.URL) {
        console.log("\nurl.URL 构造函数存在");
        try {
            const testURL = new url.URL('https://example.com/path?query=1');
            console.log("  可以创建 URL 实例");
            console.log("  testURL.href:", testURL.href);
            console.log("  testURL.hostname:", testURL.hostname);
        } catch (e) {
            console.log("  创建 URL 实例失败:", e.message);
        }
    }
    
    // 检查是否有 URLSearchParams 类
    if (url.URLSearchParams) {
        console.log("\nurl.URLSearchParams 构造函数存在");
    }
}

return {
    type: typeof url,
    hasURL: !!url.URL,
    hasURLSearchParams: !!url.URLSearchParams,
    hasParse: !!url.parse,
    hasFormat: !!url.format,
    hasResolve: !!url.resolve
};

