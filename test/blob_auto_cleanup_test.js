// 测试 Blob Registry 自动清理机制
// 验证用户忘记调用 revokeObjectURL 时，Runtime 归还池时会自动清理

const { Buffer } = require('buffer');

try {
    console.log('=== Testing Automatic Cleanup ===');

    // 创建多个 Blob URL 但故意不 revoke
    const urls = [];
    for (let i = 0; i < 10; i++) {
        const blob = new Blob([`unrevoked data ${i}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        urls.push(url);
    }

    console.log(`Created ${urls.length} Blob URLs without revoking`);

    // 验证当前请求可以访问所有 URL
    let accessibleCount = 0;
    for (const url of urls) {
        const resolved = require('buffer').resolveObjectURL(url);
        if (resolved) {
            accessibleCount++;
        }
    }

    console.log(`Current request can access ${accessibleCount}/${urls.length} Blob URLs`);

    if (accessibleCount !== urls.length) {
        throw new Error(`Expected to access all ${urls.length} URLs, but only accessed ${accessibleCount}`);
    }

    const testResults = {
        success: true,
        createdUrls: urls.length,
        accessibleInCurrentRequest: accessibleCount,
        revokedCount: 0,
        message: 'Created Blob URLs without revoking',
        note: [
            'These URLs are accessible within current request',
            'After Runtime cleanup, these URLs will be automatically cleared',
            'Next request should NOT be able to access these URLs',
            'This prevents memory leaks when users forget to call revokeObjectURL'
        ],
        sampleUrls: urls.slice(0, 3)
    };

    console.log(JSON.stringify(testResults, null, 2));
    return testResults;

} catch (error) {
    const testResults = {
        success: false,
        error: error.message,
        stack: error.stack
    };
    console.log(JSON.stringify(testResults, null, 2));
    return testResults;
}
