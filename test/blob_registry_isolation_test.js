// 测试 Blob Registry 的 Runtime 隔离性和自动清理
// 🔥 v2.4.4: 验证从全局 registry 改为 Runtime 级别后的行为

const { Buffer } = require('buffer');

try {
    // ============================================
    // 测试 1: 基本功能 - Blob URL 创建和解析
    // ============================================
    const blob1 = new Blob(['test data 1'], { type: 'text/plain' });
    const url1 = URL.createObjectURL(blob1);

    console.log('Test 1: Blob URL created:', url1);

    // 验证 URL 格式
    if (!url1.startsWith('blob:nodedata:')) {
        throw new Error('Invalid Blob URL format');
    }

    // 使用 buffer.resolveObjectURL 解析
    const resolved1 = require('buffer').resolveObjectURL(url1);
    if (!resolved1) {
        throw new Error('Failed to resolve Blob URL');
    }

    console.log('Test 1: Blob resolved successfully');
    console.log('Blob size:', resolved1.size);
    console.log('Blob type:', resolved1.type);

    // ============================================
    // 测试 2: URL.revokeObjectURL 功能
    // ============================================
    URL.revokeObjectURL(url1);
    const resolvedAfterRevoke = require('buffer').resolveObjectURL(url1);

    if (resolvedAfterRevoke !== undefined) {
        throw new Error('Blob URL should be undefined after revoke');
    }

    console.log('Test 2: URL.revokeObjectURL works correctly');

    // ============================================
    // 测试 3: 多个 Blob URL 管理
    // ============================================
    const urls = [];
    for (let i = 0; i < 5; i++) {
        const blob = new Blob([`data ${i}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        urls.push(url);
    }

    console.log('Test 3: Created', urls.length, 'Blob URLs');

    // 验证所有 URL 都可以解析
    let resolvedCount = 0;
    for (const url of urls) {
        const resolved = require('buffer').resolveObjectURL(url);
        if (resolved) {
            resolvedCount++;
        }
    }

    if (resolvedCount !== urls.length) {
        throw new Error(`Expected ${urls.length} resolved URLs, got ${resolvedCount}`);
    }

    console.log('Test 3: All Blob URLs resolved successfully');

    // ============================================
    // 测试 4: 不同 Blob 类型
    // ============================================
    const textBlob = new Blob(['text'], { type: 'text/plain' });
    const jsonBlob = new Blob(['{"key":"value"}'], { type: 'application/json' });
    const binaryBlob = new Blob([Buffer.from([0x01, 0x02, 0x03])], { type: 'application/octet-stream' });

    const textUrl = URL.createObjectURL(textBlob);
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const binaryUrl = URL.createObjectURL(binaryBlob);

    console.log('Test 4: Created URLs for different Blob types');
    console.log('Text URL:', textUrl);
    console.log('JSON URL:', jsonUrl);
    console.log('Binary URL:', binaryUrl);

    // 验证类型保留
    const resolvedText = require('buffer').resolveObjectURL(textUrl);
    const resolvedJson = require('buffer').resolveObjectURL(jsonUrl);
    const resolvedBinary = require('buffer').resolveObjectURL(binaryUrl);

    if (resolvedText.type !== 'text/plain') {
        throw new Error('Text Blob type not preserved');
    }
    if (resolvedJson.type !== 'application/json') {
        throw new Error('JSON Blob type not preserved');
    }
    if (resolvedBinary.type !== 'application/octet-stream') {
        throw new Error('Binary Blob type not preserved');
    }

    console.log('Test 4: Blob types preserved correctly');

    // ============================================
    // 测试 5: 无效 URL 处理
    // ============================================
    const invalidUrls = [
        'blob:invalid',
        'blob:nodedata:not-a-valid-uuid',
        'http://example.com',
        '',
        'blob:nodedata:00000000-0000-0000-0000-000000000000' // 不存在的 UUID
    ];

    for (const invalidUrl of invalidUrls) {
        const resolved = require('buffer').resolveObjectURL(invalidUrl);
        if (resolved !== undefined) {
            throw new Error(`Invalid URL "${invalidUrl}" should return undefined`);
        }
    }

    console.log('Test 5: Invalid URLs handled correctly');

    // ============================================
    // 最终结果
    // ============================================
    const testResults = {
        success: true,
        message: 'All Blob Registry tests passed',
        tests: {
            basicFunctionality: 'PASS',
            revokeObjectURL: 'PASS',
            multipleBlobs: 'PASS',
            differentTypes: 'PASS',
            invalidURLs: 'PASS'
        },
        note: 'Runtime isolation will be tested by running this script multiple times and verifying no cross-runtime access'
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
