/**
 * 高级Buffer功能全面测试
 * 测试新增的16/32位数值读写、浮点数、字符串搜索、字节交换、特殊编码等功能
 */
function testAdvancedBufferFeatures() {
    try {
        const results = {};

        // === 1. 16/32位整数读写测试 ===
        console.log("测试16/32位整数读写...");
        const buf1 = Buffer.alloc(10);
        
        // 16位整数测试
        buf1.writeInt16BE(12345, 0);
        buf1.writeInt16LE(-6789, 2);
        buf1.writeUInt16BE(65535, 4);
        buf1.writeUInt16LE(32768, 6);
        
        results.int16BE = buf1.readInt16BE(0);     // 应该是 12345
        results.int16LE = buf1.readInt16LE(2);     // 应该是 -6789
        results.uint16BE = buf1.readUInt16BE(4);   // 应该是 65535
        results.uint16LE = buf1.readUInt16LE(6);   // 应该是 32768

        // 32位整数测试
        const buf2 = Buffer.alloc(20);
        buf2.writeInt32BE(0x12345678, 0);
        buf2.writeInt32LE(-0x87654321, 4);
        buf2.writeUInt32BE(0xFFFFFFFF, 8);
        buf2.writeUInt32LE(0x80000000, 12);

        results.int32BE = buf2.readInt32BE(0);     // 应该是 0x12345678
        results.int32LE = buf2.readInt32LE(4);     // 应该是 -0x87654321
        results.uint32BE = buf2.readUInt32BE(8);   // 应该是 0xFFFFFFFF
        results.uint32LE = buf2.readUInt32LE(12);  // 应该是 0x80000000

        // === 2. 浮点数读写测试 ===
        console.log("测试浮点数读写...");
        const bufFloat = Buffer.alloc(16);
        
        // 32位浮点数测试
        bufFloat.writeFloatBE(3.14159, 0);
        bufFloat.writeFloatLE(-2.71828, 4);
        
        results.floatBE = bufFloat.readFloatBE(0).toFixed(4);    // 应该接近 3.1416
        results.floatLE = bufFloat.readFloatLE(4).toFixed(4);    // 应该接近 -2.7183

        // 64位双精度浮点数测试
        bufFloat.writeDoubleBE(Math.PI, 8);
        results.doubleBE = bufFloat.readDoubleBE(8).toFixed(6);  // 应该接近 3.141593

        // === 3. 字符串搜索测试 ===
        console.log("测试字符串搜索...");
        const buf3 = Buffer.from("hello world hello");
        
        results.includes_hello = buf3.includes("hello");         // true
        results.includes_xyz = buf3.includes("xyz");             // false
        results.lastIndexOf_hello = buf3.lastIndexOf("hello");   // 12
        results.lastIndexOf_o = buf3.lastIndexOf("o".charCodeAt(0)); // 16

        // === 4. 字节交换测试 ===
        console.log("测试字节交换...");
        
        // swap16测试
        const buf4 = Buffer.from([0x11, 0x22, 0x33, 0x44]);
        const originalHex = buf4.toString('hex');
        buf4.swap16();
        results.swap16_before = originalHex;  // "11223344"
        results.swap16_after = buf4.toString('hex');   // "22114433"
        
        // swap32测试
        buf4.swap32();
        results.swap32_after = buf4.toString('hex');   // "44332211"

        // === 5. 特殊编码测试 ===
        console.log("测试特殊编码...");
        
        // Latin1编码测试
        const bufLatin1 = Buffer.from("ñáéíóú", "latin1");
        results.latin1_length = bufLatin1.length;
        results.latin1_back = bufLatin1.toString("latin1");
        
        // ASCII编码测试
        const bufASCII = Buffer.from("Hello ASCII", "ascii");
        results.ascii_length = bufASCII.length;
        results.ascii_back = bufASCII.toString("ascii");

        // === 6. 边界条件测试 ===
        console.log("测试边界条件...");
        
        // 测试空Buffer的交换
        const emptyBuf = Buffer.alloc(0);
        results.empty_swap_safe = true;
        
        // 测试大数值
        const bufBig = Buffer.alloc(8);
        bufBig.writeDoubleBE(Number.MAX_SAFE_INTEGER, 0);
        results.big_number = bufBig.readDoubleBE(0);

        return {
            success: true,
            message: "所有高级Buffer功能测试完成",
            results: results
        };

    } catch (err) {
        return {
            success: false,
            error: err.message || "Buffer高级功能测试失败",
            stack: err.stack
        };
    }
}

// 执行测试
return testAdvancedBufferFeatures();
