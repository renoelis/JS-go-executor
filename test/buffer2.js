function testBufferFeatures() {
    try {
      const results = {};
  
      // 1. 整数读写测试
      const buf1 = Buffer.alloc(6);
      buf1.writeInt16BE(12345, 0);   // 0~1
      buf1.writeInt32LE(67890, 2);   // 2~5
      results.int16BE = buf1.readInt16BE(0);
      results.int32LE = buf1.readInt32LE(2);
  
      // 2. 浮点数读写测试（分开存放，避免越界）
      const bufFloat = Buffer.alloc(4);
      bufFloat.writeFloatBE(3.14, 0);
      results.floatBE = bufFloat.readFloatBE(0).toFixed(2);
  
      const bufDouble = Buffer.alloc(8);
      bufDouble.writeDoubleLE(2.71828, 0);
      results.doubleLE = bufDouble.readDoubleLE(0).toFixed(5);
  
      // 3. 字符串查找测试（用 indexOf 兼容旧版本）
      const buf3 = Buffer.from("hello world");
      results.includesHello = buf3.indexOf("hello") !== -1;
      results.lastIndexOfO = buf3.lastIndexOf("o".charCodeAt(0));
  
      // 4. 字节交换测试
      const buf4 = Buffer.from([0x11, 0x22, 0x33, 0x44]);
      buf4.swap16();
      results.swap16 = buf4.toString("hex");
      buf4.swap32();
      results.swap32 = buf4.toString("hex");
  
      // 5. 特殊编码测试
      const buf5 = Buffer.from("ñ", "latin1");
      results.latin1Encoding = buf5.toString("latin1");
      const buf6 = Buffer.from("abc", "ascii");
      results.asciiEncoding = buf6.toString("ascii");
  
      return results;
    } catch (err) {
      console.error("Buffer 测试出错:", err);
      return { error: err.message };
    }
  }
  
  // 主函数调用并输出
  const result = testBufferFeatures();
  console.log(result);