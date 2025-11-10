/**
 * P0-P1 修复验证测试
 * 测试 UTF-8 解码容错和其他改进
 */

console.log('========================================');
console.log('  P0-P1 修复验证测试');
console.log('========================================\n');

const results = {};
const logs = [];

function log(msg) {
    console.log(msg);
    logs.push(msg);
}

function test(name, fn) {
    try {
        fn();
        results[name] = true;
        log(`✅ ${name}`);
    } catch (e) {
        results[name] = false;
        log(`❌ ${name}`);
        log(`   错误: ${e.message}`);
        if (e.stack) {
            log(`   堆栈: ${e.stack.split('\n')[0]}`);
        }
    }
}

// ============================================
// P0: UTF-8 解码容错
// ============================================
log('\n--- P0: UTF-8 解码容错 ---');

test('非法 UTF-8 应该使用 U+FFFD 替换', async () => {
    // 创建包含非法 UTF-8 序列的 Blob
    const invalidUtf8 = new Uint8Array([0xFF, 0xFE, 0xFD]);
    const blob = new Blob([invalidUtf8]);
    
    const text = await blob.text();
    
    // 应该包含替换字符 U+FFFD (�)
    if (!text.includes('\uFFFD')) {
        throw new Error(`期望包含 U+FFFD，实际: ${JSON.stringify(text)}`);
    }
    
    // 应该有3个替换字符
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    if (replacementCount !== 3) {
        throw new Error(`期望3个替换字符，实际: ${replacementCount}`);
    }
});

test('合法 UTF-8 应该正常解码', async () => {
    const validUtf8 = new Uint8Array([
        0xE4, 0xB8, 0xAD, // 中
        0xE6, 0x96, 0x87  // 文
    ]);
    const blob = new Blob([validUtf8]);
    
    const text = await blob.text();
    
    if (text !== '中文') {
        throw new Error(`期望 "中文"，实际: "${text}"`);
    }
});

test('混合合法和非法 UTF-8', async () => {
    const mixed = new Uint8Array([
        0x48, 0x65, 0x6C, 0x6C, 0x6F, // Hello
        0xFF,                          // 非法字节
        0xE4, 0xB8, 0xAD              // 中
    ]);
    const blob = new Blob([mixed]);
    
    const text = await blob.text();
    
    // 应该是 "Hello�中"
    if (!text.startsWith('Hello')) {
        throw new Error(`应该以 "Hello" 开头，实际: "${text}"`);
    }
    if (!text.includes('\uFFFD')) {
        throw new Error(`应该包含替换字符`);
    }
    if (!text.endsWith('中')) {
        throw new Error(`应该以 "中" 结尾，实际: "${text}"`);
    }
});

test('空 Blob 的 text() 应该返回空字符串', async () => {
    const blob = new Blob([]);
    const text = await blob.text();
    
    if (text !== '') {
        throw new Error(`期望空字符串，实际: "${text}"`);
    }
});

test('只包含非法字节的 Blob', async () => {
    const allInvalid = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
    const blob = new Blob([allInvalid]);
    
    const text = await blob.text();
    
    // 应该全是替换字符
    if (text !== '\uFFFD\uFFFD\uFFFD\uFFFD') {
        throw new Error(`期望4个替换字符，实际: "${text}"`);
    }
});

// ============================================
// P1: DataView/TypedArray 窗口测试
// ============================================
log('\n--- P1: BufferSource 窗口测试 ---');

test('DataView 应该使用 byteOffset 和 byteLength', () => {
    const buffer = new ArrayBuffer(10);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < 10; i++) {
        view[i] = i;
    }
    
    // 创建 DataView，从偏移1开始，长度3
    const dataView = new DataView(buffer, 1, 3);
    const blob = new Blob([dataView]);
    
    // 应该只包含 [1, 2, 3]
    if (blob.size !== 3) {
        throw new Error(`期望 size=3，实际 ${blob.size}`);
    }
});

test('TypedArray 应该使用 byteOffset 和 byteLength', () => {
    const buffer = new ArrayBuffer(10);
    const fullView = new Uint8Array(buffer);
    for (let i = 0; i < 10; i++) {
        fullView[i] = i + 65; // A, B, C, ...
    }
    
    // 创建子数组，从偏移2开始，长度3
    const subArray = new Uint8Array(buffer, 2, 3);
    const blob = new Blob([subArray]);
    
    // 应该只包含 [67, 68, 69] (C, D, E)
    if (blob.size !== 3) {
        throw new Error(`期望 size=3，实际 ${blob.size}`);
    }
});

test('BigInt64Array 应该正确处理', () => {
    const buffer = new ArrayBuffer(16);
    const view = new BigInt64Array(buffer);
    view[0] = 1n;
    view[1] = 2n;
    
    const blob = new Blob([view]);
    
    // 16 字节
    if (blob.size !== 16) {
        throw new Error(`期望 size=16，实际 ${blob.size}`);
    }
});

test('BigUint64Array 应该正确处理', () => {
    const buffer = new ArrayBuffer(24);
    const view = new BigUint64Array(buffer);
    view[0] = 1n;
    view[1] = 2n;
    view[2] = 3n;
    
    const blob = new Blob([view]);
    
    // 24 字节
    if (blob.size !== 24) {
        throw new Error(`期望 size=24，实际 ${blob.size}`);
    }
});

// ============================================
// 综合测试
// ============================================
log('\n--- 综合测试 ---');

test('File 也应该支持 UTF-8 解码容错', async () => {
    const invalidUtf8 = new Uint8Array([0xFF]);
    const file = new File([invalidUtf8], 'test.txt');
    
    const text = await file.text();
    
    if (text !== '\uFFFD') {
        throw new Error(`期望替换字符，实际: "${text}"`);
    }
});

test('slice() 后的 text() 也应该容错', async () => {
    const data = new Uint8Array([0x48, 0xFF, 0x49]); // H, 非法, I
    const blob = new Blob([data]);
    const sliced = blob.slice(1, 2); // 只取非法字节
    
    const text = await sliced.text();
    
    if (text !== '\uFFFD') {
        throw new Error(`期望替换字符，实际: "${text}"`);
    }
});

test('混合 BufferSource 和字符串', () => {
    const buffer = new ArrayBuffer(3);
    const view = new Uint8Array(buffer);
    view[0] = 65; // A
    view[1] = 66; // B
    view[2] = 67; // C
    
    const blob = new Blob([view, "DEF"]);
    
    if (blob.size !== 6) {
        throw new Error(`期望 size=6，实际 ${blob.size}`);
    }
});

// ============================================
// 测试总结
// ============================================
log('\n========================================');
log('  测试总结');
log('========================================');

const passed = Object.values(results).filter(r => r).length;
const failed = Object.values(results).filter(r => !r).length;
const total = Object.keys(results).length;
const successRate = ((passed / total) * 100).toFixed(1);

log(`通过: ${passed}`);
log(`失败: ${failed}`);
log(`总计: ${total}`);
log(`成功率: ${successRate}%`);

if (failed > 0) {
    log(`\n⚠️  有 ${failed} 个测试失败`);
    log('\n失败的测试:');
    Object.entries(results).forEach(([name, passed]) => {
        if (!passed) {
            log(`  - ${name}`);
        }
    });
} else {
    log('\n🎉 所有 P0-P1 修复测试通过！');
}

// 返回结果供外部使用
return {
    passed,
    failed,
    total,
    successRate,
    details: results,
    logs
};
