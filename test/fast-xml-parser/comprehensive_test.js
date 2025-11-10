// fast-xml-parser 综合测试
const { XMLParser, XMLBuilder, XMLValidator } = require('fast-xml-parser');

console.log('🧪 测试 1: 基本 XML 解析');
const xmlData1 = `
<note>
  <to>Alice</to>
  <from>Bob</from>
  <heading>Reminder</heading>
  <body>Don't forget the meeting at 10AM!</body>
</note>
`;

const parser = new XMLParser();
const result1 = parser.parse(xmlData1);
console.log('解析结果:', JSON.stringify(result1, null, 2));

if (result1.note.to === 'Alice' && result1.note.from === 'Bob') {
    console.log('✅ 测试 1 通过');
} else {
    throw new Error('❌ 测试 1 失败');
}

console.log('\n🧪 测试 2: 带属性的 XML 解析');
const xmlData2 = `
<root>
  <person id="123" name="John">
    <age>30</age>
    <city>New York</city>
  </person>
</root>
`;

const parser2 = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
});
const result2 = parser2.parse(xmlData2);
console.log('解析结果:', JSON.stringify(result2, null, 2));

if (result2.root.person['@_id'] === '123' && result2.root.person['@_name'] === 'John') {
    console.log('✅ 测试 2 通过');
} else {
    throw new Error('❌ 测试 2 失败');
}

console.log('\n🧪 测试 3: XML 验证');
const validXml = '<root><item>value</item></root>';
const invalidXml = '<root><item>value</root>';

const validResult = XMLValidator.validate(validXml);
const invalidResult = XMLValidator.validate(invalidXml);

console.log('有效 XML 验证:', validResult);
console.log('无效 XML 验证:', invalidResult);

if (validResult === true && invalidResult.err) {
    console.log('✅ 测试 3 通过');
} else {
    throw new Error('❌ 测试 3 失败');
}

console.log('\n🧪 测试 4: JSON 转 XML (XMLBuilder)');
const jsonData = {
    note: {
        to: 'Alice',
        from: 'Bob',
        heading: 'Reminder',
        body: "Don't forget the meeting!"
    }
};

const builder = new XMLBuilder();
const xmlOutput = builder.build(jsonData);
console.log('生成的 XML:', xmlOutput);

if (xmlOutput.includes('<to>Alice</to>') && xmlOutput.includes('<from>Bob</from>')) {
    console.log('✅ 测试 4 通过');
} else {
    throw new Error('❌ 测试 4 失败');
}

console.log('\n🎉 所有测试通过！');

return {
    test1: result1,
    test2: result2,
    test3: { valid: validResult, invalid: invalidResult },
    test4: xmlOutput
};
