// 测试 goja 的 TypedArray 支持
console.log('========================================');
console.log('  测试 goja 的 TypedArray 支持');
console.log('========================================\n');

// 1. 测试 ArrayBuffer 是否存在
console.log('1. ArrayBuffer 支持:');
console.log('   typeof ArrayBuffer:', typeof ArrayBuffer);
console.log('   ArrayBuffer 可用:', typeof ArrayBuffer === 'function');

// 2. 测试 Uint8Array 是否存在
console.log('\n2. Uint8Array 支持:');
console.log('   typeof Uint8Array:', typeof Uint8Array);
console.log('   Uint8Array 可用:', typeof Uint8Array === 'function');

// 3. 创建 ArrayBuffer
console.log('\n3. 创建 ArrayBuffer:');
try {
    const ab = new ArrayBuffer(10);
    console.log('   ArrayBuffer 创建成功');
    console.log('   byteLength:', ab.byteLength);
} catch (e) {
    console.log('   ArrayBuffer 创建失败:', e.message);
}

// 4. 创建 Uint8Array
console.log('\n4. 创建 Uint8Array:');
try {
    const u8 = new Uint8Array(10);
    console.log('   Uint8Array 创建成功');
    console.log('   length:', u8.length);
    console.log('   byteLength:', u8.byteLength);
    console.log('   byteOffset:', u8.byteOffset);
    console.log('   buffer instanceof ArrayBuffer:', u8.buffer instanceof ArrayBuffer);
} catch (e) {
    console.log('   Uint8Array 创建失败:', e.message);
}

// 5. 测试共享内存视图
console.log('\n5. 测试共享内存视图:');
try {
    const ab = new ArrayBuffer(10);
    const view1 = new Uint8Array(ab, 0, 5);
    const view2 = new Uint8Array(ab, 5, 5);
    
    view1[0] = 99;
    view2[0] = 88;
    
    // 创建完整视图验证
    const fullView = new Uint8Array(ab);
    console.log('   view1[0] = 99, fullView[0] =', fullView[0]);
    console.log('   view2[0] = 88, fullView[5] =', fullView[5]);
    console.log('   共享内存:', fullView[0] === 99 && fullView[5] === 88);
} catch (e) {
    console.log('   共享内存测试失败:', e.message);
}

// 6. 测试当前 Buffer 的实现
console.log('\n6. 测试当前 Buffer 实现:');
const Buffer = require('buffer').Buffer;
const buf = Buffer.alloc(10);
console.log('   Buffer 创建成功');
console.log('   buf instanceof Uint8Array:', buf instanceof Uint8Array);
console.log('   typeof buf.buffer:', typeof buf.buffer);
console.log('   typeof buf.byteOffset:', typeof buf.byteOffset);
console.log('   typeof buf.byteLength:', typeof buf.byteLength);

if (buf.buffer instanceof ArrayBuffer) {
    console.log('   ✅ Buffer 基于 ArrayBuffer');
} else {
    console.log('   ❌ Buffer 不基于 ArrayBuffer');
}

// 7. 测试 Buffer.slice 是否共享内存
console.log('\n7. 测试 Buffer.slice 共享内存:');
const original = Buffer.from([1, 2, 3, 4, 5]);
const sliced = original.slice(1, 4);
sliced[0] = 99;
console.log('   original[1] =', original[1]);
console.log('   sliced[0] =', sliced[0]);
if (original[1] === 99) {
    console.log('   ✅ slice 返回共享视图');
} else {
    console.log('   ❌ slice 返回独立副本');
}

// 8. 如果 Buffer 有 buffer 属性，测试手动创建视图
console.log('\n8. 手动创建共享视图:');
if (buf.buffer instanceof ArrayBuffer) {
    try {
        const buf2 = Buffer.from([10, 20, 30, 40, 50]);
        const view = new Uint8Array(buf2.buffer, buf2.byteOffset + 1, 3);
        view[0] = 99;
        console.log('   buf2[1] =', buf2[1]);
        console.log('   view[0] =', view[0]);
        if (buf2[1] === 99) {
            console.log('   ✅ 手动创建共享视图成功');
        } else {
            console.log('   ❌ 手动创建共享视图失败');
        }
    } catch (e) {
        console.log('   手动创建视图失败:', e.message);
    }
} else {
    console.log('   Buffer 没有 buffer 属性，无法测试');
}

console.log('\n========================================');
console.log('  测试完成');
console.log('========================================');

// 返回测试结果
return {
    arrayBufferSupported: typeof ArrayBuffer === 'function',
    uint8ArraySupported: typeof Uint8Array === 'function',
    bufferBasedOnArrayBuffer: (function() {
        const buf = Buffer.alloc(10);
        return buf.buffer instanceof ArrayBuffer;
    })(),
    bufferIsUint8Array: (function() {
        const buf = Buffer.alloc(10);
        return buf instanceof Uint8Array;
    })(),
    sliceIsSharedView: (function() {
        const original = Buffer.from([1, 2, 3, 4, 5]);
        const sliced = original.slice(1, 4);
        sliced[0] = 99;
        return original[1] === 99;
    })(),
    manualSharedViewWorks: (function() {
        try {
            const buf = Buffer.from([10, 20, 30, 40, 50]);
            if (!(buf.buffer instanceof ArrayBuffer)) {
                return false;
            }
            const view = new Uint8Array(buf.buffer, buf.byteOffset + 1, 3);
            view[0] = 99;
            return buf[1] === 99;
        } catch (e) {
            return false;
        }
    })()
};
