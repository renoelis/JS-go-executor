// 调试TypedArray的offset问题
const ab = new ArrayBuffer(10);
console.log('=== ArrayBuffer创建完成 ===');

// 填充整个ArrayBuffer
const fullView = new Uint8Array(ab);
for (let i = 0; i < 10; i++) {
    fullView[i] = i + 1; // 1,2,3,4,5,6,7,8,9,10
}
console.log('完整ArrayBuffer:', Array.from(fullView));

// 创建带offset的view
const view1 = new Uint8Array(ab, 0, 3); // 应该看到 [1,2,3]
const view2 = new Uint8Array(ab, 5, 3); // 应该看到 [6,7,8]

console.log('view1 (offset=0, length=3):', Array.from(view1));
console.log('view2 (offset=5, length=3):', Array.from(view2));

const testResult = {
    success: Array.from(view1).toString() === '1,2,3' && Array.from(view2).toString() === '6,7,8',
    view1: Array.from(view1),
    view2: Array.from(view2),
    expected1: [1,2,3],
    expected2: [6,7,8]
};

return testResult;
