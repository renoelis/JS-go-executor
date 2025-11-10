#!/usr/bin/env node

/**
 * HTML/CSS 压缩工具 - 安全模式（保护Go模板语法）
 * 只压缩HTML结构和CSS，不压缩JavaScript
 */

const fs = require('fs');
const path = require('path');
const { minify: minifyHTML } = require('html-minifier-terser');

// 文件路径
const INPUT_FILE = path.join(__dirname, '../templates/test-tool.html');
const OUTPUT_FILE = path.join(__dirname, '../templates/test-tool.min.html');
const BACKUP_FILE = path.join(__dirname, '../templates/test-tool.html.backup');

console.log('🚀 开始压缩 test-tool.html（安全模式 - 保护Go模板）...\n');

// 读取原始文件
const htmlContent = fs.readFileSync(INPUT_FILE, 'utf-8');
const originalSize = Buffer.byteLength(htmlContent, 'utf-8');

console.log(`📄 原始文件大小: ${(originalSize / 1024).toFixed(2)} KB`);

// HTML 压缩配置（安全模式）
const htmlMinifyOptions = {
    collapseWhitespace: true,  // 移除空白
    removeComments: true,       // 移除注释
    minifyCSS: true,            // 压缩CSS
    minifyJS: false,            // 不压缩JavaScript（避免破坏Go模板和代码）
    removeRedundantAttributes: false,  // 不删除冗余属性
    removeAttributeQuotes: false,      // 保留属性引号（保护Go模板）
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    html5: true,
    conservativeCollapse: true,        // 保守的空白处理
    preserveLineBreaks: false,
    removeEmptyElements: false,
    processConditionalComments: false,  // 不处理条件注释
    minifyURLs: false,                  // 不压缩URL
    sortAttributes: false,              // 不排序属性
    sortClassName: false,               // 不排序class名
    collapseBooleanAttributes: false,   // 不折叠布尔属性
    removeOptionalTags: false,
    removeEmptyAttributes: false,
    decodeEntities: false               // 不解码实体（保护模板语法）
};

// 执行压缩
(async () => {
    try {
        // 备份原文件
        if (!fs.existsSync(BACKUP_FILE)) {
            fs.copyFileSync(INPUT_FILE, BACKUP_FILE);
            console.log('✅ 已创建备份文件: test-tool.html.backup');
        }

        // 压缩 HTML
        console.log('⏳ 正在压缩（安全模式）...');
        console.log('   ✅ HTML 结构压缩');
        console.log('   ✅ CSS 样式压缩');  
        console.log('   ⏭️  JavaScript 保持原样');
        console.log('   🛡️  Go 模板语法受保护');
        
        const minified = await minifyHTML(htmlContent, htmlMinifyOptions);
        
        // 写入压缩后的文件
        fs.writeFileSync(OUTPUT_FILE, minified, 'utf-8');
        
        const minifiedSize = Buffer.byteLength(minified, 'utf-8');
        const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(2);
        
        console.log(`\n✨ 压缩完成！`);
        console.log(`📦 压缩后大小: ${(minifiedSize / 1024).toFixed(2)} KB`);
        console.log(`📉 减少: ${reduction}% (节省 ${((originalSize - minifiedSize) / 1024).toFixed(2)} KB)`);
        console.log(`💾 输出文件: templates/test-tool.min.html\n`);
        
        console.log('✅ 完成！请使用以下命令应用压缩版本:');
        console.log('   ./scripts/build-minified.sh --apply');
        console.log('   或手动执行:');
        console.log('   cp templates/test-tool.min.html templates/test-tool.html');
        console.log('   go generate ./assets');
        
    } catch (error) {
        console.error('❌ 压缩失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
})();
