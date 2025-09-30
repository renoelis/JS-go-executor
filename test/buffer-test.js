/**
 * 单独测试 Buffer.alloc / Buffer.allocUnsafe / Buffer.write
 */
function main() {
    try {
        const results = {};

        // 1. 创建 Buffer
        const bufFromString = Buffer.from("Hello Buffer", "utf8");
        results.create_from_string = bufFromString.toString("utf8");
    
        const bufAlloc = Buffer.alloc(10); // 自动填充 0
        results.create_alloc = bufAlloc.toString("hex"); // 转为 hex 以避免输出不可见字符
    
        const bufAllocUnsafe = Buffer.allocUnsafe(10); // 不会初始化（内容不可预测）
        results.create_allocUnsafe = bufAllocUnsafe.toString("hex");
    
        const bufFromArray = Buffer.from([72, 101, 108, 108, 111]);
        results.create_from_array = bufFromArray.toString();
    
        // 2. 写入数据
        bufAlloc.write("Hi", "utf8");
        results.write = bufAlloc.toString("utf8");
    
        // 3. 读取数据
        results.read = bufFromString.toString("utf8", 0, 5); // Hello
    
        // 4. 编码转换
        results.base64 = bufFromString.toString("base64");
        results.hex = bufFromString.toString("hex");
    
        // 5. 拼接
        const bufConcat = Buffer.concat([bufFromArray, Buffer.from(" World")]);
        results.concat = bufConcat.toString();
    
        // 6. 切片
        const bufSlice = bufConcat.slice(0, 5);
        results.slice = bufSlice.toString();
    
        // 7. 拷贝
        const bufCopy = Buffer.alloc(5);
        bufFromArray.copy(bufCopy, 0, 0, 5);
        results.copy = bufCopy.toString();
    
        // 8. 比较
        const bufA = Buffer.from("abc");
        const bufB = Buffer.from("abd");
        results.compare = bufA.compare(bufB); // -1 表示 bufA < bufB
    
        // 9. JSON 转换
        results.json = JSON.stringify(bufFromArray);
    
        // 10. 填充
        const bufFill = Buffer.alloc(5);
        bufFill.fill("a");
        results.fill = bufFill.toString();
    
        // 11. 长度
        results.length = bufConcat.length;
    
        // 12. 等长检查
        results.equals = bufFromArray.equals(Buffer.from("Hello"));
    
        return { success: true, data: results };
    } catch (err) {
      return { success: false, error: err.message || "Buffer 测试出错" };
    }
  }
  
  // 直接执行 main，并打印结果
  const result = main();
  console.log(result);