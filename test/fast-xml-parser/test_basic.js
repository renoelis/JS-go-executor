// 测试 fast-xml-parser 基本功能
const { XMLParser } = require('fast-xml-parser');

const xmlData = `
<note>
  <to>Alice</to>
  <from>Bob</from>
  <heading>Reminder</heading>
  <body>Don't forget the meeting at 10AM!</body>
</note>
`;

const parser = new XMLParser();
const result = parser.parse(xmlData);

console.log('解析结果:', JSON.stringify(result, null, 2));
console.log('测试通过 ✅');
