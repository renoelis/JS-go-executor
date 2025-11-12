// 调试TypedArray.set方法的问题
const ab = new ArrayBuffer(10);
console.log('=== ArrayBuffer创建完成 ===');

// 创建带offset的view
const view1 = new Uint8Array(ab, 0, 3); 
const view2 = new Uint8Array(ab, 5, 3); 

console.log('初始状态:');
console.log('view1:', Array.from(view1));
console.log('view2:', Array.from(view2));

// 使用set方法设置数据
view1.set([1, 2, 3]);
view2.set([4, 5, 6]);

console.log('set后:');
console.log('view1:', Array.from(view1));
console.log('view2:', Array.from(view2));

// 检查整个ArrayBuffer
const fullView = new Uint8Array(ab);
console.log('完整ArrayBuffer:', Array.from(fullView));

const testResult = {
    success: Array.from(fullView).toString() === '1,2,3,0,0,4,5,6,0,0',
    fullBuffer: Array.from(fullView),
    expected: [1,2,3,0,0,4,5,6,0,0]
};

return testResult;
