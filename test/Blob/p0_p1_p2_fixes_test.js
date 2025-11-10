/**
 * P0-P1-P2 修复验证测试
 * 测试 int64 索引修复、Uint8Array 构造、byteLength 防御等
 */

console.log('========================================');
console.log('  P0-P1-P2 修复验证测试');
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
// P0-1: int64 切片索引修复
// ============================================
log('\n--- P0-1: int64 切片索引修复 ---');

test('大 Blob 的 slice 应该正常工作', () => {
    // 创建一个较大的 Blob
    const size = 100000; // 100KB
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        data[i] = i % 256;
    }
    
    const blob = new Blob([data]);
    
    if (blob.size !== size) {
        throw new Error(`期望 size=${size}，实际 ${blob.size}`);
    }
    
    // 测试 slice
    const sliced = blob.slice(1000, 2000);
    
    if (sliced.size !== 1000) {
        throw new Error(`期望 sliced.size=1000，实际 ${sliced.size}`);
    }
});

test('DataView 的大偏移应该正常工作', () => {
    const buffer = new ArrayBuffer(50000);
    const view = new Uint8Array(buffer);
    
    // 填充数据
    for (let i = 0; i < 50000; i++) {
        view[i] = (i % 256);
    }
    
    // 创建 DataView，从大偏移开始
    const dataView = new DataView(buffer, 10000, 5000);
    const blob = new Blob([dataView]);
    
    if (blob.size !== 5000) {
        throw new Error(`期望 size=5000，实际 ${blob.size}`);
    }
});

test('TypedArray 的大偏移应该正常工作', () => {
    const buffer = new ArrayBuffer(80000);
    const fullView = new Uint8Array(buffer);
    
    // 填充数据
    for (let i = 0; i < 80000; i++) {
        fullView[i] = (i % 256);
    }
    
    // 创建子数组，从大偏移开始
    const subArray = new Uint8Array(buffer, 20000, 10000);
    const blob = new Blob([subArray]);
    
    if (blob.size !== 10000) {
        throw new Error(`期望 size=10000，实际 ${blob.size}`);
    }
});

test('slice 负索引应该正常工作', () => {
    const blob = new Blob(['0123456789']);
    
    // 从倒数第5个开始
    const sliced = blob.slice(-5);
    
    if (sliced.size !== 5) {
        throw new Error(`期望 size=5，实际 ${sliced.size}`);
    }
});

test('slice 边界情况', () => {
    const blob = new Blob(['test']);
    
    // start > end
    const sliced1 = blob.slice(3, 1);
    if (sliced1.size !== 0) {
        throw new Error(`start > end 应该返回空 Blob`);
    }
    
    // start 超出范围
    const sliced2 = blob.slice(100, 200);
    if (sliced2.size !== 0) {
        throw new Error(`start 超出范围应该返回空 Blob`);
    }
    
    // 正常情况
    const sliced3 = blob.slice(1, 3);
    if (sliced3.size !== 2) {
        throw new Error(`期望 size=2，实际 ${sliced3.size}`);
    }
});

// ============================================
// P1-1: bytes() 构造 Uint8Array
// ============================================
log('\n--- P1-1: bytes() 构造 Uint8Array ---');

test('bytes() 应该返回 Uint8Array 或 ArrayBuffer', async () => {
    const blob = new Blob(['test']);
    const bytes = await blob.bytes();
    
    // 应该是 Uint8Array 或 ArrayBuffer
    const isUint8Array = bytes instanceof Uint8Array;
    const isArrayBuffer = bytes instanceof ArrayBuffer;
    
    if (!isUint8Array && !isArrayBuffer) {
        throw new Error(`bytes() 应该返回 Uint8Array 或 ArrayBuffer，实际: ${typeof bytes}`);
    }
    
    // 检查长度
    const length = isUint8Array ? bytes.length : bytes.byteLength;
    if (length !== 4) {
        throw new Error(`期望长度 4，实际 ${length}`);
    }
});

test('bytes() 返回的数据应该正确', async () => {
    const data = new Uint8Array([65, 66, 67, 68]); // ABCD
    const blob = new Blob([data]);
    const bytes = await blob.bytes();
    
    // 转换为 Uint8Array（如果是 ArrayBuffer）
    let uint8Array;
    if (bytes instanceof ArrayBuffer) {
        uint8Array = new Uint8Array(bytes);
    } else {
        uint8Array = bytes;
    }
    
    // 检查数据
    if (uint8Array[0] !== 65 || uint8Array[1] !== 66 || 
        uint8Array[2] !== 67 || uint8Array[3] !== 68) {
        throw new Error(`数据不正确`);
    }
});

test('空 Blob 的 bytes() 应该正常工作', async () => {
    const blob = new Blob([]);
    const bytes = await blob.bytes();
    
    const length = bytes instanceof Uint8Array ? bytes.length : bytes.byteLength;
    if (length !== 0) {
        throw new Error(`空 Blob 应该返回长度 0，实际 ${length}`);
    }
});

test('大 Blob 的 bytes() 应该正常工作', async () => {
    const size = 50000;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        data[i] = i % 256;
    }
    
    const blob = new Blob([data]);
    const bytes = await blob.bytes();
    
    const length = bytes instanceof Uint8Array ? bytes.length : bytes.byteLength;
    if (length !== size) {
        throw new Error(`期望长度 ${size}，实际 ${length}`);
    }
});

// ============================================
// P1-2: byteLength 防御
// ============================================
log('\n--- P1-2: byteLength 防御 ---');

test('正常的 TypedArray 应该正常工作', () => {
    const buffer = new ArrayBuffer(100);
    const view = new Uint8Array(buffer, 10, 50);
    
    const blob = new Blob([view]);
    
    if (blob.size !== 50) {
        throw new Error(`期望 size=50，实际 ${blob.size}`);
    }
});

test('DataView 应该正常工作', () => {
    const buffer = new ArrayBuffer(100);
    const dataView = new DataView(buffer, 20, 30);
    
    const blob = new Blob([dataView]);
    
    if (blob.size !== 30) {
        throw new Error(`期望 size=30，实际 ${blob.size}`);
    }
});

test('零长度的 TypedArray 应该正常工作', () => {
    const buffer = new ArrayBuffer(100);
    const view = new Uint8Array(buffer, 50, 0);
    
    const blob = new Blob([view]);
    
    if (blob.size !== 0) {
        throw new Error(`期望 size=0，实际 ${blob.size}`);
    }
});

// ============================================
// 综合测试
// ============================================
log('\n--- 综合测试 ---');

test('混合大小的 parts 应该正常工作', () => {
    const parts = [
        'small',
        new Uint8Array(10000),
        new Blob(['medium']),
        new Uint8Array(50000)
    ];
    
    const blob = new Blob(parts);
    
    // 5 + 10000 + 6 + 50000 = 60011
    if (blob.size !== 60011) {
        throw new Error(`期望 size=60011，实际 ${blob.size}`);
    }
});

test('slice 后的 bytes() 应该正常工作', async () => {
    const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const blob = new Blob([data]);
    
    const sliced = blob.slice(2, 7); // [2, 3, 4, 5, 6]
    const bytes = await sliced.bytes();
    
    const uint8Array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    
    if (uint8Array.length !== 5) {
        throw new Error(`期望长度 5，实际 ${uint8Array.length}`);
    }
    
    if (uint8Array[0] !== 2 || uint8Array[4] !== 6) {
        throw new Error(`数据不正确`);
    }
});

test('File 也应该支持这些修复', async () => {
    const data = new Uint8Array(10000);
    for (let i = 0; i < 10000; i++) {
        data[i] = i % 256;
    }
    
    const file = new File([data], 'test.bin');
    
    // 测试 slice
    const sliced = file.slice(1000, 2000);
    if (sliced.size !== 1000) {
        throw new Error(`File.slice 失败`);
    }
    
    // 测试 bytes
    const bytes = await file.bytes();
    const length = bytes instanceof Uint8Array ? bytes.length : bytes.byteLength;
    if (length !== 10000) {
        throw new Error(`File.bytes 失败`);
    }
});

test('多次 slice 应该正常工作', () => {
    const blob = new Blob(['0123456789']);
    
    const sliced1 = blob.slice(2, 8);    // "234567"
    const sliced2 = sliced1.slice(1, 4); // "345"
    
    if (sliced2.size !== 3) {
        throw new Error(`期望 size=3，实际 ${sliced2.size}`);
    }
});

test('BigInt64Array 应该正常工作', () => {
    const buffer = new ArrayBuffer(32);
    const view = new BigInt64Array(buffer);
    view[0] = 1n;
    view[1] = 2n;
    view[2] = 3n;
    view[3] = 4n;
    
    const blob = new Blob([view]);
    
    if (blob.size !== 32) {
        throw new Error(`期望 size=32，实际 ${blob.size}`);
    }
});

test('BigUint64Array 应该正常工作', () => {
    const buffer = new ArrayBuffer(40);
    const view = new BigUint64Array(buffer);
    view[0] = 1n;
    view[1] = 2n;
    view[2] = 3n;
    view[3] = 4n;
    view[4] = 5n;
    
    const blob = new Blob([view]);
    
    if (blob.size !== 40) {
        throw new Error(`期望 size=40，实际 ${blob.size}`);
    }
});

// ============================================
// 性能测试
// ============================================
log('\n--- 性能测试 ---');

test('大 Blob slice 性能应该可接受', () => {
    const size = 1000000; // 1MB
    const data = new Uint8Array(size);
    
    const blob = new Blob([data]);
    
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
        blob.slice(i * 1000, (i + 1) * 1000);
    }
    const elapsed = Date.now() - start;
    
    // 100次 slice 应该在合理时间内完成（< 100ms）
    if (elapsed > 100) {
        throw new Error(`slice 性能较差: ${elapsed}ms`);
    }
});

test('bytes() 性能应该可接受', async () => {
    const size = 100000; // 100KB
    const data = new Uint8Array(size);
    
    const blob = new Blob([data]);
    
    const start = Date.now();
    await blob.bytes();
    const elapsed = Date.now() - start;
    
    // bytes() 应该在合理时间内完成（< 50ms）
    if (elapsed > 50) {
        throw new Error(`bytes() 性能较差: ${elapsed}ms`);
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
    log('\n🎉 所有 P0-P1-P2 修复测试通过！');
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
