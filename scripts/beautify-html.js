#!/usr/bin/env node

/**
 * HTML 格式化工具
 * 将压缩的 HTML 文件格式化为可读格式
 */

const fs = require('fs');
const path = require('path');
const beautify = require('js-beautify').html;

const INPUT_FILE = path.join(__dirname, '../templates/test-tool.html');
const BACKUP_FILE = path.join(__dirname, '../templates/test-tool.html.compressed.backup');
const OUTPUT_FILE = INPUT_FILE; // 直接覆盖原文件

console.log('🚀 开始格式化 test-tool.html...\n');

// 读取原始文件
const htmlContent = fs.readFileSync(INPUT_FILE, 'utf-8');
const originalSize = Buffer.byteLength(htmlContent, 'utf-8');

console.log(`📄 原始文件大小: ${(originalSize / 1024).toFixed(2)} KB`);

// 先备份压缩版本
fs.writeFileSync(BACKUP_FILE, htmlContent);
console.log(`💾 已备份压缩版本到: ${BACKUP_FILE}`);

// HTML 格式化配置
const beautifyOptions = {
    indent_size: 4,
    indent_char: ' ',
    max_preserve_newlines: 2,
    preserve_newlines: true,
    keep_array_indentation: false,
    break_chained_methods: false,
    indent_scripts: 'keep',
    brace_style: 'collapse',
    space_before_conditional: true,
    unescape_strings: false,
    jslint_happy: false,
    end_with_newline: true,
    wrap_line_length: 120,
    indent_inner_html: true,
    comma_first: false,
    e4x: false,
    indent_empty_lines: false,
    wrap_attributes: 'auto',
    wrap_attributes_indent_size: 4,
    unformatted: ['code', 'pre', 'textarea'],
    content_unformatted: ['pre', 'textarea'],
    extra_liners: ['head', 'body', '/html']
};

// 执行格式化
const beautifiedHTML = beautify(htmlContent, beautifyOptions);
const beautifiedSize = Buffer.byteLength(beautifiedHTML, 'utf-8');

// 写入格式化后的文件
fs.writeFileSync(OUTPUT_FILE, beautifiedHTML);

console.log(`\n✅ 格式化完成！`);
console.log(`📊 格式化后大小: ${(beautifiedSize / 1024).toFixed(2)} KB`);
console.log(`📈 增加: ${((beautifiedSize - originalSize) / 1024).toFixed(2)} KB\n`);
console.log(`📁 输出文件: ${OUTPUT_FILE}`);
console.log(`💾 备份文件: ${BACKUP_FILE}\n`);
console.log(`💡 提示: 如需恢复压缩版本，请运行:`);
console.log(`   cp ${BACKUP_FILE} ${OUTPUT_FILE}\n`);



