// 测试 Buffer 的共享视图语义
const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  测试 Buffer 共享视图语义');
console.log('========================================\n');

const results = {};

// 测试 1: slice() 共享视图
console.log('1. 测试 slice() 共享视图:');
const buf1 = Buffer.from([1, 2, 3, 4, 5]);
const slice1 = buf1.slice(1, 4);
console.log('   原始: [' + Array.from(buf1).join(', ') + ']');
console.log('   slice(1, 4): [' + Array.from(slice1).join(', ') + ']');

slice1[0] = 99;
console.log('   修改 slice1[0] = 99');
console.log('   buf1[1] =', buf1[1]);
console.log('   slice1[0] =', slice1[0]);

results.slice_shared = buf1[1] === 99;
console.log('   结果:', results.slice_shared ? '✅ 共享视图' : '❌ 独立副本');

// 测试 2: subarray() 共享视图
console.log('\n2. 测试 subarray() 共享视图:');
const buf2 = Buffer.from([10, 20, 30, 40, 50]);
const sub2 = buf2.subarray(2, 5);
console.log('   原始: [' + Array.from(buf2).join(', ') + ']');
console.log('   subarray(2, 5): [' + Array.from(sub2).join(', ') + ']');

sub2[1] = 88;
console.log('   修改 sub2[1] = 88');
console.log('   buf2[3] =', buf2[3]);
console.log('   sub2[1] =', sub2[1]);

results.subarray_shared = buf2[3] === 88;
console.log('   结果:', results.subarray_shared ? '✅ 共享视图' : '❌ 独立副本');

// 测试 3: 负索引 slice
console.log('\n3. 测试负索引 slice:');
const buf3 = Buffer.from([1, 2, 3, 4, 5]);
const slice3 = buf3.slice(-3, -1);
console.log('   原始: [' + Array.from(buf3).join(', ') + ']');
console.log('   slice(-3, -1): [' + Array.from(slice3).join(', ') + ']');

slice3[0] = 77;
console.log('   修改 slice3[0] = 77');
console.log('   buf3[2] =', buf3[2]);

results.slice_negative_shared = buf3[2] === 77;
console.log('   结果:', results.slice_negative_shared ? '✅ 共享视图' : '❌ 独立副本');

// 测试 4: 链式 slice
console.log('\n4. 测试链式 slice:');
const buf4 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
const slice4a = buf4.slice(2, 7);
const slice4b = slice4a.slice(1, 4);
console.log('   原始: [' + Array.from(buf4).join(', ') + ']');
console.log('   slice(2, 7): [' + Array.from(slice4a).join(', ') + ']');
console.log('   再 slice(1, 4): [' + Array.from(slice4b).join(', ') + ']');

slice4b[1] = 66;
console.log('   修改 slice4b[1] = 66');
console.log('   buf4[4] =', buf4[4]);
console.log('   slice4a[2] =', slice4a[2]);
console.log('   slice4b[1] =', slice4b[1]);

results.slice_chain_shared = buf4[4] === 66 && slice4a[2] === 66;
console.log('   结果:', results.slice_chain_shared ? '✅ 链式共享' : '❌ 链式失败');

// 测试 5: 空 slice
console.log('\n5. 测试空 slice:');
const buf5 = Buffer.from([1, 2, 3]);
const slice5 = buf5.slice(2, 2);
console.log('   slice(2, 2) length:', slice5.length);
results.empty_slice_length = slice5.length;
console.log('   结果:', slice5.length === 0 ? '✅ 正确' : '❌ 错误');

// 测试 6: 验证 ArrayBuffer 共享
console.log('\n6. 验证 ArrayBuffer 共享:');
const buf6 = Buffer.from([1, 2, 3, 4, 5]);
const slice6 = buf6.slice(1, 4);
console.log('   buf6.buffer === slice6.buffer:', buf6.buffer === slice6.buffer);
results.same_arraybuffer = buf6.buffer === slice6.buffer;
console.log('   结果:', results.same_arraybuffer ? '✅ 共享 ArrayBuffer' : '❌ 不同 ArrayBuffer');

// 测试 7: byteOffset 正确性
console.log('\n7. 验证 byteOffset:');
const buf7 = Buffer.from([10, 20, 30, 40, 50]);
const slice7 = buf7.slice(2, 5);
console.log('   buf7.byteOffset:', buf7.byteOffset);
console.log('   slice7.byteOffset:', slice7.byteOffset);
console.log('   预期 slice7.byteOffset:', buf7.byteOffset + 2);
results.byteoffset_correct = slice7.byteOffset === (buf7.byteOffset + 2);
console.log('   结果:', results.byteoffset_correct ? '✅ 正确' : '❌ 错误');

console.log('\n========================================');
console.log('  测试总结');
console.log('========================================');

const passCount = Object.values(results).filter(function(v) { return v === true; }).length;
const totalCount = Object.keys(results).length;

console.log('通过:', passCount + '/' + totalCount);
console.log('成功率:', ((passCount / totalCount) * 100).toFixed(1) + '%');

if (passCount === totalCount) {
    console.log('\n🎉 所有测试通过！Buffer 完全支持共享视图语义！');
} else {
    console.log('\n⚠️  部分测试失败，请检查实现。');
}

// 返回结果
return {
    passed: passCount,
    total: totalCount,
    successRate: ((passCount / totalCount) * 100).toFixed(1) + '%',
    details: results
};
