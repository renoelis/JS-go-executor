#!/usr/bin/env node
/**
 * 测试 fast-xml-parser 模块的各种功能
 * 通过调用部署的 httpbin 接口获取 XML 数据，然后使用 fast-xml-parser 进行解析
 */

const { XMLParser, XMLBuilder, XMLValidator } = require('fast-xml-parser');

// 配置基础 URL
const BASE_URL = process.env.HTTPBIN_BASE || 'https://httpbin.qingflow.dpdns.org/';

console.log('🚀 开始测试 fast-xml-parser 功能...\n');
console.log(`📍 测试服务器: ${BASE_URL}\n`);

// ============================================
// 测试 1: XMLValidator - XML 验证
// ============================================
async function testXMLValidator() {
  console.log('📋 测试 1: XMLValidator - XML 验证');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml`);
  const xmlData = await response.text();
  
  console.log('获取的 XML 数据:');
  console.log(xmlData);
  console.log();
  
  // 验证 XML 是否有效
  const validationResult = XMLValidator.validate(xmlData);
  
  if (validationResult === true) {
    console.log('✅ XML 验证通过');
  } else {
    console.log('❌ XML 验证失败:', validationResult);
  }
  
  // 测试无效的 XML
  const invalidXML = '<root><unclosed>';
  const invalidResult = XMLValidator.validate(invalidXML);
  console.log('\n测试无效 XML:', invalidXML);
  console.log('验证结果:', invalidResult);
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 2: XMLParser - 基础解析
// ============================================
async function testBasicParsing() {
  console.log('📋 测试 2: XMLParser - 基础解析');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml`);
  const xmlData = await response.text();
  
  const parser = new XMLParser();
  const result = parser.parse(xmlData);
  
  console.log('解析结果 (JSON):');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 3: 解析带属性的 XML
// ============================================
async function testParsingWithAttributes() {
  console.log('📋 测试 3: 解析带属性的 XML');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml-attributes`);
  const xmlData = await response.text();
  
  console.log('原始 XML:');
  console.log(xmlData);
  console.log();
  
  // 默认忽略属性
  const parser1 = new XMLParser();
  const result1 = parser1.parse(xmlData);
  console.log('默认解析 (忽略属性):');
  console.log(JSON.stringify(result1, null, 2));
  console.log();
  
  // 保留属性
  const parser2 = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });
  const result2 = parser2.parse(xmlData);
  console.log('保留属性 (前缀 @_):');
  console.log(JSON.stringify(result2, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 4: 解析 CDATA
// ============================================
async function testCDATA() {
  console.log('📋 测试 4: 解析 CDATA');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml-cdata`);
  const xmlData = await response.text();
  
  console.log('原始 XML:');
  console.log(xmlData);
  console.log();
  
  // 不设置 cdataPropName，CDATA 会合并到文本
  const parser1 = new XMLParser();
  const result1 = parser1.parse(xmlData);
  console.log('CDATA 合并到文本:');
  console.log(JSON.stringify(result1, null, 2));
  console.log();
  
  // 设置 cdataPropName，CDATA 单独保存
  const parser2 = new XMLParser({
    cdataPropName: '__cdata'
  });
  const result2 = parser2.parse(xmlData);
  console.log('CDATA 单独保存:');
  console.log(JSON.stringify(result2, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 5: 解析数组
// ============================================
async function testArrays() {
  console.log('📋 测试 5: 解析数组');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml-array`);
  const xmlData = await response.text();
  
  console.log('原始 XML:');
  console.log(xmlData);
  console.log();
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });
  const result = parser.parse(xmlData);
  
  console.log('解析结果:');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 6: 解析嵌套结构
// ============================================
async function testNestedStructure() {
  console.log('📋 测试 6: 解析嵌套结构');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml-nested`);
  const xmlData = await response.text();
  
  console.log('原始 XML:');
  console.log(xmlData);
  console.log();
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });
  const result = parser.parse(xmlData);
  
  console.log('解析结果:');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 7: 数字和布尔值解析
// ============================================
async function testNumbersAndBooleans() {
  console.log('📋 测试 7: 数字和布尔值解析');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml-types`);
  const xmlData = await response.text();
  
  console.log('原始 XML:');
  console.log(xmlData);
  console.log();
  
  // 默认会自动转换数字
  const parser1 = new XMLParser();
  const result1 = parser1.parse(xmlData);
  console.log('自动类型转换:');
  console.log(JSON.stringify(result1, null, 2));
  console.log();
  
  // 禁用数字解析
  const parser2 = new XMLParser({
    parseTagValue: false
  });
  const result2 = parser2.parse(xmlData);
  console.log('保持字符串类型:');
  console.log(JSON.stringify(result2, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 8: XMLBuilder - 构建 XML
// ============================================
async function testXMLBuilder() {
  console.log('📋 测试 8: XMLBuilder - 构建 XML');
  console.log('─'.repeat(50));
  
  const jsObject = {
    root: {
      person: [
        {
          '@_id': '1',
          name: '张三',
          age: 25,
          email: 'zhangsan@example.com'
        },
        {
          '@_id': '2',
          name: '李四',
          age: 30,
          email: 'lisi@example.com'
        }
      ]
    }
  };
  
  console.log('JavaScript 对象:');
  console.log(JSON.stringify(jsObject, null, 2));
  console.log();
  
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: '  '
  });
  
  const xmlOutput = builder.build(jsObject);
  console.log('生成的 XML:');
  console.log(xmlOutput);
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 9: 高级选项 - preserveOrder
// ============================================
async function testPreserveOrder() {
  console.log('📋 测试 9: 高级选项 - preserveOrder');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml-mixed`);
  const xmlData = await response.text();
  
  console.log('原始 XML:');
  console.log(xmlData);
  console.log();
  
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false
  });
  const result = parser.parse(xmlData);
  
  console.log('保持顺序的解析结果:');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 10: 命名空间处理
// ============================================
async function testNamespaces() {
  console.log('📋 测试 10: 命名空间处理');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml-namespace`);
  const xmlData = await response.text();
  
  console.log('原始 XML:');
  console.log(xmlData);
  console.log();
  
  // 保留命名空间
  const parser1 = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: false
  });
  const result1 = parser1.parse(xmlData);
  console.log('保留命名空间前缀:');
  console.log(JSON.stringify(result1, null, 2));
  console.log();
  
  // 移除命名空间前缀
  const parser2 = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true
  });
  const result2 = parser2.parse(xmlData);
  console.log('移除命名空间前缀:');
  console.log(JSON.stringify(result2, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 11: 注释和处理指令
// ============================================
async function testCommentsAndPI() {
  console.log('📋 测试 11: 注释和处理指令');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml-comments`);
  const xmlData = await response.text();
  
  console.log('原始 XML:');
  console.log(xmlData);
  console.log();
  
  const parser = new XMLParser({
    commentPropName: '__comment',
    ignoreDeclaration: false,
    ignorePiTags: false
  });
  const result = parser.parse(xmlData);
  
  console.log('解析结果 (包含注释):');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 测试 12: 自定义处理器
// ============================================
async function testCustomProcessors() {
  console.log('📋 测试 12: 自定义处理器');
  console.log('─'.repeat(50));
  
  const response = await fetch(`${BASE_URL}xml-attributes`);
  const xmlData = await response.text();
  
  console.log('原始 XML:');
  console.log(xmlData);
  console.log();
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // 自定义标签值处理器 - 转换为大写
    tagValueProcessor: (tagName, tagValue, jPath) => {
      if (typeof tagValue === 'string') {
        return tagValue.toUpperCase();
      }
      return tagValue;
    },
    // 自定义属性值处理器 - 添加前缀
    attributeValueProcessor: (attrName, attrValue, jPath) => {
      return `[${attrValue}]`;
    }
  });
  
  const result = parser.parse(xmlData);
  console.log('使用自定义处理器的解析结果:');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n' + '='.repeat(50) + '\n');
}

// ============================================
// 主测试函数
// ============================================
async function runAllTests() {
  const results = {
    total: 12,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    await testXMLValidator();
    results.tests.push({ name: 'XMLValidator', status: 'passed' });
    results.passed++;
    
    await testBasicParsing();
    results.tests.push({ name: 'BasicParsing', status: 'passed' });
    results.passed++;
    
    await testParsingWithAttributes();
    results.tests.push({ name: 'ParsingWithAttributes', status: 'passed' });
    results.passed++;
    
    await testCDATA();
    results.tests.push({ name: 'CDATA', status: 'passed' });
    results.passed++;
    
    await testArrays();
    results.tests.push({ name: 'Arrays', status: 'passed' });
    results.passed++;
    
    await testNestedStructure();
    results.tests.push({ name: 'NestedStructure', status: 'passed' });
    results.passed++;
    
    await testNumbersAndBooleans();
    results.tests.push({ name: 'NumbersAndBooleans', status: 'passed' });
    results.passed++;
    
    await testXMLBuilder();
    results.tests.push({ name: 'XMLBuilder', status: 'passed' });
    results.passed++;
    
    await testPreserveOrder();
    results.tests.push({ name: 'PreserveOrder', status: 'passed' });
    results.passed++;
    
    await testNamespaces();
    results.tests.push({ name: 'Namespaces', status: 'passed' });
    results.passed++;
    
    await testCommentsAndPI();
    results.tests.push({ name: 'CommentsAndPI', status: 'passed' });
    results.passed++;
    
    await testCustomProcessors();
    results.tests.push({ name: 'CustomProcessors', status: 'passed' });
    results.passed++;
    
    console.log('🎉 所有测试完成！');
    console.log(`✅ 通过: ${results.passed}/${results.total}`);
    
    return results;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error);
    results.failed++;
    results.tests.push({ 
      name: 'Unknown', 
      status: 'failed', 
      error: error.message 
    });
    return results;
  }
}

// 运行测试并返回结果
return runAllTests();
