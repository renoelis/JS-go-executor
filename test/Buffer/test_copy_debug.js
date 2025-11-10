const Buffer = require('buffer').Buffer;

console.log('=== copy() 重叠调试 ===\n');

const a = Buffer.from([1, 2, 3, 4, 5, 6]);
console.log('初始 a:', [...a]);

const s = a.subarray(1, 5);
console.log('s = a.subarray(1, 5):', [...s]);
console.log('s.length:', s.length);
console.log('s.byteOffset:', s.byteOffset);

console.log('\n调用 s.copy(a, 2, 0, 10):');
const copied = s.copy(a, 2, 0, 10);
console.log('返回值 (复制的字节数):', copied);

console.log('\n结果 a:', [...a]);
console.log('预期 a: [1, 2, 2, 3, 4, 6]');

// 详细分析
console.log('\n详细分析:');
console.log('- targetStart = 2');
console.log('- sourceStart = 0');
console.log('- sourceEnd = 10 (应夹到', s.length, ')');
console.log('- copyLength = sourceEnd - sourceStart =', s.length - 0);
console.log('- 目标可用空间 = a.length - targetStart =', a.length - 2);
console.log('- 实际复制 = min(copyLength, 目标空间) =', Math.min(s.length, a.length - 2));

return {
    initial_a: [1, 2, 3, 4, 5, 6],
    subarray_s: [2, 3, 4, 5],
    s_length: s.length,
    s_byteOffset: s.byteOffset,
    copied_bytes: copied,
    result_a: [...a],
    wrong_expected: [1, 2, 2, 3, 4, 6],
    correct_expected: [1, 2, 2, 3, 4, 5],
    test_passed: JSON.stringify([...a]) === JSON.stringify([1, 2, 2, 3, 4, 5]),
    analysis: {
        targetStart: 2,
        sourceStart: 0,
        sourceEnd_param: 10,
        sourceEnd_clamped: s.length,
        copyLength: s.length - 0,
        target_available_space: a.length - 2,
        actual_copied: Math.min(s.length, a.length - 2)
    },
    conclusion: '我们的实现是正确的，原测试预期值有误'
};
