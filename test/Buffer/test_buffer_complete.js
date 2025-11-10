const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  Buffer 模块完整功能测试');
console.log('  输出固定值以便与 Node.js 对比');
console.log('========================================\n');

const results = {};

// ============ 1. Buffer 创建方法 ============
console.log('--- 1. Buffer 创建方法 ---');

// 1.1 Buffer.alloc
const buf1 = Buffer.alloc(10);
results['1.1_alloc_length'] = buf1.length;
results['1.1_alloc_content'] = Array.from(buf1).join(',');
console.log('1.1 Buffer.alloc(10):', results['1.1_alloc_content']);

// 1.2 Buffer.alloc with fill
const buf2 = Buffer.alloc(5, 0xAB);
results['1.2_alloc_fill'] = Array.from(buf2).join(',');
console.log('1.2 Buffer.alloc(5, 0xAB):', results['1.2_alloc_fill']);

// 1.3 Buffer.allocUnsafe
const buf3 = Buffer.allocUnsafe(10);
results['1.3_allocUnsafe_length'] = buf3.length;
console.log('1.3 Buffer.allocUnsafe(10) length:', results['1.3_allocUnsafe_length']);

// 1.4 Buffer.allocUnsafeSlow
const buf4 = Buffer.allocUnsafeSlow(10);
results['1.4_allocUnsafeSlow_length'] = buf4.length;
console.log('1.4 Buffer.allocUnsafeSlow(10) length:', results['1.4_allocUnsafeSlow_length']);

// 1.5 Buffer.from - array
const buf5 = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
results['1.5_from_array'] = buf5.toString();
console.log('1.5 Buffer.from([0x62,0x75,0x66,0x66,0x65,0x72]):', results['1.5_from_array']);

// 1.6 Buffer.from - string
const buf6 = Buffer.from('hello', 'utf8');
results['1.6_from_string'] = Array.from(buf6).join(',');
console.log('1.6 Buffer.from("hello", "utf8"):', results['1.6_from_string']);

// 1.7 Buffer.from - Buffer
const buf7 = Buffer.from(buf6);
results['1.7_from_buffer'] = Array.from(buf7).join(',');
console.log('1.7 Buffer.from(buf6):', results['1.7_from_buffer']);

// ============ 2. 编码支持 ============
console.log('\n--- 2. 编码支持 ---');

// 2.1 UTF-8
const buf_utf8 = Buffer.from('你好世界', 'utf8');
results['2.1_utf8'] = buf_utf8.toString('utf8');
console.log('2.1 UTF-8 "你好世界":', results['2.1_utf8']);

// 2.2 Latin1
const buf_latin1 = Buffer.from('ABC', 'latin1');
results['2.2_latin1'] = Array.from(buf_latin1).join(',');
console.log('2.2 Latin1 "ABC":', results['2.2_latin1']);

// 2.3 ASCII
const buf_ascii = Buffer.from('Hello', 'ascii');
results['2.3_ascii'] = Array.from(buf_ascii).join(',');
console.log('2.3 ASCII "Hello":', results['2.3_ascii']);

// 2.4 Hex
const buf_hex = Buffer.from('48656c6c6f', 'hex');
results['2.4_hex'] = buf_hex.toString();
console.log('2.4 Hex "48656c6c6f":', results['2.4_hex']);

// 2.5 Base64
const buf_base64 = Buffer.from('SGVsbG8=', 'base64');
results['2.5_base64'] = buf_base64.toString();
console.log('2.5 Base64 "SGVsbG8=":', results['2.5_base64']);

// 2.6 UTF-16LE
const buf_utf16 = Buffer.from('Hello', 'utf16le');
results['2.6_utf16le'] = Array.from(buf_utf16).join(',');
console.log('2.6 UTF-16LE "Hello":', results['2.6_utf16le']);

// 2.7 UTF-16LE 非 BMP 字符
const buf_emoji = Buffer.from('𠮷', 'utf16le');
results['2.7_utf16le_emoji'] = Array.from(buf_emoji).join(',');
console.log('2.7 UTF-16LE "𠮷":', results['2.7_utf16le_emoji']);

// 2.8 Latin1 非 BMP 字符（UTF-16 码元）
const buf_latin1_emoji = Buffer.from('𠮷', 'latin1');
results['2.8_latin1_emoji'] = Array.from(buf_latin1_emoji).join(',');
console.log('2.8 Latin1 "𠮷":', results['2.8_latin1_emoji']);

// ============ 3. Buffer 静态方法 ============
console.log('\n--- 3. Buffer 静态方法 ---');

// 3.1 Buffer.byteLength
results['3.1_byteLength_utf8'] = Buffer.byteLength('你好', 'utf8');
results['3.2_byteLength_latin1'] = Buffer.byteLength('ABC', 'latin1');
results['3.3_byteLength_emoji'] = Buffer.byteLength('𠮷', 'latin1');
console.log('3.1 byteLength("你好", "utf8"):', results['3.1_byteLength_utf8']);
console.log('3.2 byteLength("ABC", "latin1"):', results['3.2_byteLength_latin1']);
console.log('3.3 byteLength("𠮷", "latin1"):', results['3.3_byteLength_emoji']);

// 3.4 Buffer.concat
const buf_concat1 = Buffer.from([1, 2, 3]);
const buf_concat2 = Buffer.from([4, 5, 6]);
const buf_concat = Buffer.concat([buf_concat1, buf_concat2]);
results['3.4_concat'] = Array.from(buf_concat).join(',');
console.log('3.4 concat([1,2,3], [4,5,6]):', results['3.4_concat']);

// 3.5 Buffer.concat with totalLength
const buf_concat_len = Buffer.concat([buf_concat1, buf_concat2], 4);
results['3.5_concat_length'] = Array.from(buf_concat_len).join(',');
console.log('3.5 concat with length 4:', results['3.5_concat_length']);

// 3.6 Buffer.compare
const cmp1 = Buffer.from([1, 2, 3]);
const cmp2 = Buffer.from([1, 2, 4]);
results['3.6_compare'] = Buffer.compare(cmp1, cmp2);
console.log('3.6 compare([1,2,3], [1,2,4]):', results['3.6_compare']);

// 3.7 Buffer.isBuffer
results['3.7_isBuffer_true'] = Buffer.isBuffer(buf1);
results['3.8_isBuffer_false'] = Buffer.isBuffer({});
console.log('3.7 isBuffer(buf):', results['3.7_isBuffer_true']);
console.log('3.8 isBuffer({}):', results['3.8_isBuffer_false']);

// 3.9 Buffer.isEncoding
results['3.9_isEncoding_utf8'] = Buffer.isEncoding('utf8');
results['3.10_isEncoding_UTF8'] = Buffer.isEncoding('UTF8');
results['3.11_isEncoding_invalid'] = Buffer.isEncoding('invalid');
console.log('3.9 isEncoding("utf8"):', results['3.9_isEncoding_utf8']);
console.log('3.10 isEncoding("UTF8"):', results['3.10_isEncoding_UTF8']);
console.log('3.11 isEncoding("invalid"):', results['3.11_isEncoding_invalid']);

// 3.12 Buffer.poolSize
results['3.12_poolSize'] = Buffer.poolSize;
console.log('3.12 poolSize:', results['3.12_poolSize']);

// ============ 4. 读写整数方法 ============
console.log('\n--- 4. 读写整数方法 ---');

const buf_int = Buffer.alloc(20);

// 4.1 writeInt8 / readInt8
buf_int.writeInt8(-42, 0);
results['4.1_readInt8'] = buf_int.readInt8(0);
console.log('4.1 writeInt8(-42) -> readInt8():', results['4.1_readInt8']);

// 4.2 writeUInt8 / readUInt8
buf_int.writeUInt8(255, 1);
results['4.2_readUInt8'] = buf_int.readUInt8(1);
console.log('4.2 writeUInt8(255) -> readUInt8():', results['4.2_readUInt8']);

// 4.3 writeInt16BE / readInt16BE
buf_int.writeInt16BE(-1234, 2);
results['4.3_readInt16BE'] = buf_int.readInt16BE(2);
console.log('4.3 writeInt16BE(-1234) -> readInt16BE():', results['4.3_readInt16BE']);

// 4.4 writeInt16LE / readInt16LE
buf_int.writeInt16LE(5678, 4);
results['4.4_readInt16LE'] = buf_int.readInt16LE(4);
console.log('4.4 writeInt16LE(5678) -> readInt16LE():', results['4.4_readInt16LE']);

// 4.5 writeInt32BE / readInt32BE
buf_int.writeInt32BE(-123456789, 6);
results['4.5_readInt32BE'] = buf_int.readInt32BE(6);
console.log('4.5 writeInt32BE(-123456789) -> readInt32BE():', results['4.5_readInt32BE']);

// 4.6 writeInt32LE / readInt32LE
buf_int.writeInt32LE(987654321, 10);
results['4.6_readInt32LE'] = buf_int.readInt32LE(10);
console.log('4.6 writeInt32LE(987654321) -> readInt32LE():', results['4.6_readInt32LE']);

// 4.7 writeUInt16BE / readUInt16BE
buf_int.writeUInt16BE(65535, 14);
results['4.7_readUInt16BE'] = buf_int.readUInt16BE(14);
console.log('4.7 writeUInt16BE(65535) -> readUInt16BE():', results['4.7_readUInt16BE']);

// 4.8 writeUInt32LE / readUInt32LE
buf_int.writeUInt32LE(4294967295, 16);
results['4.8_readUInt32LE'] = buf_int.readUInt32LE(16);
console.log('4.8 writeUInt32LE(4294967295) -> readUInt32LE():', results['4.8_readUInt32LE']);

// ============ 5. 读写浮点数方法 ============
console.log('\n--- 5. 读写浮点数方法 ---');

const buf_float = Buffer.alloc(16);

// 5.1 writeFloatBE / readFloatBE
buf_float.writeFloatBE(3.14, 0);
results['5.1_readFloatBE'] = buf_float.readFloatBE(0).toFixed(2);
console.log('5.1 writeFloatBE(3.14) -> readFloatBE():', results['5.1_readFloatBE']);

// 5.2 writeFloatLE / readFloatLE
buf_float.writeFloatLE(2.718, 4);
results['5.2_readFloatLE'] = buf_float.readFloatLE(4).toFixed(3);
console.log('5.2 writeFloatLE(2.718) -> readFloatLE():', results['5.2_readFloatLE']);

// 5.3 writeDoubleBE / readDoubleBE
buf_float.writeDoubleBE(Math.PI, 8);
results['5.3_readDoubleBE'] = buf_float.readDoubleBE(8).toFixed(10);
console.log('5.3 writeDoubleBE(PI) -> readDoubleBE():', results['5.3_readDoubleBE']);

// ============ 6. 可变长度整数 ============
console.log('\n--- 6. 可变长度整数 ---');

const buf_var = Buffer.alloc(10);

// 6.1 writeIntBE / readIntBE (3 bytes)
buf_var.writeIntBE(0x123456, 0, 3);
results['6.1_readIntBE_3'] = buf_var.readIntBE(0, 3).toString(16);
console.log('6.1 writeIntBE(0x123456, 3) -> readIntBE():', results['6.1_readIntBE_3']);

// 6.2 writeUIntLE / readUIntLE (4 bytes)
buf_var.writeUIntLE(0xABCDEF12, 3, 4);
results['6.2_readUIntLE_4'] = buf_var.readUIntLE(3, 4).toString(16);
console.log('6.2 writeUIntLE(0xABCDEF12, 4) -> readUIntLE():', results['6.2_readUIntLE_4']);

// ============ 7. Buffer 实例方法 ============
console.log('\n--- 7. Buffer 实例方法 ---');

// 7.1 write
const buf_write = Buffer.alloc(20);
const written = buf_write.write('Hello World', 0, 'utf8');
results['7.1_write_bytes'] = written;
results['7.2_write_content'] = buf_write.toString('utf8', 0, written);
console.log('7.1 write("Hello World") bytes:', results['7.1_write_bytes']);
console.log('7.2 write content:', results['7.2_write_content']);

// 7.3 write with offset
buf_write.write('!', 11);
results['7.3_write_offset'] = buf_write.toString('utf8', 0, 12);
console.log('7.3 write with offset:', results['7.3_write_offset']);

// 7.4 toString
const buf_str = Buffer.from([72, 101, 108, 108, 111]);
results['7.4_toString'] = buf_str.toString();
console.log('7.4 toString():', results['7.4_toString']);

// 7.5 toString with encoding
results['7.5_toString_hex'] = buf_str.toString('hex');
console.log('7.5 toString("hex"):', results['7.5_toString_hex']);

// 7.6 toString with range
results['7.6_toString_range'] = buf_str.toString('utf8', 1, 4);
console.log('7.6 toString("utf8", 1, 4):', results['7.6_toString_range']);

// 7.7 slice
const buf_slice = Buffer.from([1, 2, 3, 4, 5]);
const sliced = buf_slice.slice(1, 4);
results['7.7_slice'] = Array.from(sliced).join(',');
console.log('7.7 slice(1, 4):', results['7.7_slice']);

// 7.8 slice with negative
const sliced_neg = buf_slice.slice(-3, -1);
results['7.8_slice_negative'] = Array.from(sliced_neg).join(',');
console.log('7.8 slice(-3, -1):', results['7.8_slice_negative']);

// 7.9 copy
const buf_copy_src = Buffer.from([1, 2, 3, 4, 5]);
const buf_copy_dst = Buffer.alloc(5);
buf_copy_src.copy(buf_copy_dst, 0, 0, 5);
results['7.9_copy'] = Array.from(buf_copy_dst).join(',');
console.log('7.9 copy():', results['7.9_copy']);

// 7.10 copy with overlap
const buf_overlap = Buffer.from([1, 2, 3, 4, 5]);
buf_overlap.copy(buf_overlap, 2, 0, 3);
results['7.10_copy_overlap'] = Array.from(buf_overlap).join(',');
console.log('7.10 copy overlap:', results['7.10_copy_overlap']);

// 7.11 fill
const buf_fill = Buffer.alloc(10);
buf_fill.fill(0xAB);
results['7.11_fill'] = Array.from(buf_fill).join(',');
console.log('7.11 fill(0xAB):', results['7.11_fill']);

// 7.12 fill with string
const buf_fill_str = Buffer.alloc(10);
buf_fill_str.fill('abc');
results['7.12_fill_string'] = buf_fill_str.toString('utf8', 0, 9);
console.log('7.12 fill("abc"):', results['7.12_fill_string']);

// 7.13 equals
const eq1 = Buffer.from([1, 2, 3]);
const eq2 = Buffer.from([1, 2, 3]);
const eq3 = Buffer.from([1, 2, 4]);
results['7.13_equals_true'] = eq1.equals(eq2);
results['7.14_equals_false'] = eq1.equals(eq3);
console.log('7.13 equals (same):', results['7.13_equals_true']);
console.log('7.14 equals (diff):', results['7.14_equals_false']);

// 7.15 compare
const cmp_a = Buffer.from([1, 2, 3]);
const cmp_b = Buffer.from([1, 2, 4]);
results['7.15_compare'] = cmp_a.compare(cmp_b);
console.log('7.15 compare([1,2,3], [1,2,4]):', results['7.15_compare']);

// 7.16 compare with range
const cmp_c = Buffer.from([1, 2, 3, 4, 5]);
const cmp_d = Buffer.from([3, 4]);
results['7.16_compare_range'] = cmp_c.compare(cmp_d, 0, 2, 2, 4);
console.log('7.16 compare with range:', results['7.16_compare_range']);

// ============ 8. indexOf / lastIndexOf ============
console.log('\n--- 8. indexOf / lastIndexOf ---');

const buf_search = Buffer.from('hello world hello');

// 8.1 indexOf - string
results['8.1_indexOf_string'] = buf_search.indexOf('world');
console.log('8.1 indexOf("world"):', results['8.1_indexOf_string']);

// 8.2 indexOf - number
const buf_num = Buffer.from([1, 2, 3, 4, 5, 3, 7]);
results['8.2_indexOf_number'] = buf_num.indexOf(3);
console.log('8.2 indexOf(3):', results['8.2_indexOf_number']);

// 8.3 indexOf - Buffer
const search_buf = Buffer.from('world');
results['8.3_indexOf_buffer'] = buf_search.indexOf(search_buf);
console.log('8.3 indexOf(Buffer):', results['8.3_indexOf_buffer']);

// 8.4 indexOf - with offset
results['8.4_indexOf_offset'] = buf_search.indexOf('hello', 6);
console.log('8.4 indexOf("hello", 6):', results['8.4_indexOf_offset']);

// 8.5 indexOf - negative offset
results['8.5_indexOf_negative'] = buf_search.indexOf('hello', -6);
console.log('8.5 indexOf("hello", -6):', results['8.5_indexOf_negative']);

// 8.6 indexOf - hex encoding
const buf_hex_search = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
results['8.6_indexOf_hex'] = buf_hex_search.indexOf('68656c', 0, 'hex');
console.log('8.6 indexOf("68656c", hex):', results['8.6_indexOf_hex']);

// 8.7 lastIndexOf - string
results['8.7_lastIndexOf_string'] = buf_search.lastIndexOf('hello');
console.log('8.7 lastIndexOf("hello"):', results['8.7_lastIndexOf_string']);

// 8.8 lastIndexOf - with offset
results['8.8_lastIndexOf_offset'] = buf_search.lastIndexOf('hello', 10);
console.log('8.8 lastIndexOf("hello", 10):', results['8.8_lastIndexOf_offset']);

// 8.9 lastIndexOf - negative offset
results['8.9_lastIndexOf_negative'] = buf_search.lastIndexOf('hello', -6);
console.log('8.9 lastIndexOf("hello", -6):', results['8.9_lastIndexOf_negative']);

// 8.10 includes
results['8.10_includes_true'] = buf_search.includes('world');
results['8.11_includes_false'] = buf_search.includes('xyz');
console.log('8.10 includes("world"):', results['8.10_includes_true']);
console.log('8.11 includes("xyz"):', results['8.11_includes_false']);

// ============ 9. swap 方法 ============
console.log('\n--- 9. swap 方法 ---');

// 9.1 swap16
const buf_swap16 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
buf_swap16.swap16();
results['9.1_swap16'] = Array.from(buf_swap16).join(',');
console.log('9.1 swap16:', results['9.1_swap16']);

// 9.2 swap32
const buf_swap32 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
buf_swap32.swap32();
results['9.2_swap32'] = Array.from(buf_swap32).join(',');
console.log('9.2 swap32:', results['9.2_swap32']);

// 9.3 swap64
const buf_swap64 = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
buf_swap64.swap64();
results['9.3_swap64'] = Array.from(buf_swap64).join(',');
console.log('9.3 swap64:', results['9.3_swap64']);

// ============ 10. 迭代器方法 ============
console.log('\n--- 10. 迭代器方法 ---');

const buf_iter = Buffer.from([10, 20, 30]);

// 10.1 values()
const iter_values = buf_iter.values();
const val1 = iter_values.next();
const val2 = iter_values.next();
results['10.1_values_1'] = val1.value;
results['10.2_values_2'] = val2.value;
results['10.3_values_done'] = val1.done;
console.log('10.1 values().next():', val1.value, 'done:', val1.done);
console.log('10.2 values().next():', val2.value, 'done:', val2.done);

// 10.4 keys()
const iter_keys = buf_iter.keys();
const key1 = iter_keys.next();
const key2 = iter_keys.next();
results['10.4_keys_1'] = key1.value;
results['10.5_keys_2'] = key2.value;
console.log('10.4 keys().next():', key1.value);
console.log('10.5 keys().next():', key2.value);

// 10.6 entries()
const iter_entries = buf_iter.entries();
const entry1 = iter_entries.next();
results['10.6_entries_1'] = entry1.value[0] + ',' + entry1.value[1];
console.log('10.6 entries().next():', '[' + entry1.value[0] + ',' + entry1.value[1] + ']');

// ============ 11. 边界情况测试 ============
console.log('\n--- 11. 边界情况测试 ---');

// 11.1 空 Buffer
const buf_empty = Buffer.alloc(0);
results['11.1_empty_length'] = buf_empty.length;
console.log('11.1 empty buffer length:', results['11.1_empty_length']);

// 11.2 大 Buffer
const buf_large = Buffer.alloc(1024);
results['11.2_large_length'] = buf_large.length;
console.log('11.2 large buffer (1024) length:', results['11.2_large_length']);

// 11.3 负数索引 slice
const buf_neg = Buffer.from([1, 2, 3, 4, 5]);
const neg_slice = buf_neg.slice(-2);
results['11.3_negative_slice'] = Array.from(neg_slice).join(',');
console.log('11.3 slice(-2):', results['11.3_negative_slice']);

// 11.4 fill 到末尾
const buf_fill_range = Buffer.alloc(10);
buf_fill_range.fill(0xFF, 5);
results['11.4_fill_to_end'] = Array.from(buf_fill_range).join(',');
console.log('11.4 fill to end:', results['11.4_fill_to_end']);

// 11.5 fill 超出范围（应该抛出错误）
try {
  const buf_fill_err = Buffer.alloc(10);
  buf_fill_err.fill(0xFF, 5, 20);
  results['11.5_fill_overflow_error'] = 'no error';
} catch (e) {
  results['11.5_fill_overflow_error'] = 'error caught';
}
console.log('11.5 fill overflow error:', results['11.5_fill_overflow_error']);

// ============ 12. 错误处理测试 ============
console.log('\n--- 12. 错误处理测试 ---');

// 12.1 writeInt16BE 边界检查
try {
  const buf_err = Buffer.alloc(4);
  buf_err.writeInt16BE(0x1234, 3);
  results['12.1_boundary_error'] = 'no error';
} catch (e) {
  results['12.1_boundary_error'] = 'error caught';
}
console.log('12.1 writeInt16BE boundary:', results['12.1_boundary_error']);

// 12.2 swap16 长度检查
try {
  const buf_swap_err = Buffer.alloc(3);
  buf_swap_err.swap16();
  results['12.2_swap16_error'] = 'no error';
} catch (e) {
  results['12.2_swap16_error'] = 'error caught';
}
console.log('12.2 swap16 length check:', results['12.2_swap16_error']);

// 12.3 writeUIntBE 范围检查
try {
  const buf_range = Buffer.alloc(10);
  buf_range.writeUIntBE(256, 0, 1);
  results['12.3_range_error'] = 'no error';
} catch (e) {
  results['12.3_range_error'] = 'error caught';
}
console.log('12.3 writeUIntBE range:', results['12.3_range_error']);

// ============ 输出完整结果 ============
console.log('\n========================================');
console.log('完整测试结果（JSON 格式）:');
console.log('========================================');
console.log(JSON.stringify(results, null, 2));

// 返回结果供对比
return results;
