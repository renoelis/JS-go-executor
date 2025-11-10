// 非常简单的测试，看看 goja 的 ToInteger 到底返回什么
const buf = Buffer.from([1, 2, 3, 4, 5]);

// 直接打印参数转换
const tests = ['9.99e99', Infinity];
tests.forEach(t => {
  console.log(`输入: ${t}, 类型: ${typeof t}`);
  const num = Number(t);
  console.log(`Number(): ${num}`);
  console.log(`Math.trunc(): ${Math.trunc(num)}`);
  
  const sub = buf.subarray(t);
  console.log(`subarray 长度: ${sub.length}`);
  console.log('---');
});

return { success: true };
