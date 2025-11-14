// 测试 Runtime 隔离性 - 第 2 个请求
// 尝试访问第 1 个请求创建的 Blob URL (应该失败)

const { Buffer } = require('buffer');

// 从 input 中获取第 1 个请求创建的 URL
const targetUrl = input.targetUrl;

try {
    console.log('Request 2: Attempting to access Blob URL from Request 1:', targetUrl);

    // 尝试解析第 1 个请求的 Blob URL
    const resolved = require('buffer').resolveObjectURL(targetUrl);

    if (resolved !== undefined) {
        // 如果能访问到，说明隔离失败
        throw new Error('SECURITY ISSUE: Request 2 can access Request 1 Blob URL! Isolation failed!');
    }

    console.log('Request 2: Cannot access Request 1 Blob URL (expected behavior)');

    // 创建自己的 Blob URL 验证功能正常
    const ownBlob = new Blob(['Request 2 data'], { type: 'text/plain' });
    const ownUrl = URL.createObjectURL(ownBlob);
    const ownResolved = require('buffer').resolveObjectURL(ownUrl);

    if (!ownResolved) {
        throw new Error('Request 2 cannot create/access its own Blob URL');
    }

    console.log('Request 2: Can access own Blob URL (normal functionality)');

    const testResults = {
        success: true,
        message: 'Runtime isolation verified: Request 2 cannot access Request 1 Blob URL',
        canAccessRequest1Blob: false,
        canAccessOwnBlob: true,
        securityStatus: 'PASS - Isolation working correctly'
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
