# Rollup 打包快速指南

## 🎯 适用场景

当你需要为 Goja runtime 集成新的 JavaScript 库时,**优先使用 Rollup**。

---

## ✅ 成功案例: pinyin

### 步骤 1: 安装依赖

```bash
cd /tmp/js-libs-bundle
npm install pinyin rollup @rollup/plugin-commonjs @rollup/plugin-node-resolve
```

### 步骤 2: 创建 Rollup 配置 (`.mjs` 后缀!)

```bash
cat > rollup.config.pinyin.mjs << 'EOF'
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'rollup-pinyin-entry.js',
  output: {
    file: 'pinyin-rollup.min.js',
    format: 'umd',
    name: 'pinyin',
    exports: 'default'
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs()
  ]
};
EOF
```

### 步骤 3: 创建入口文件

```bash
cat > rollup-pinyin-entry.js << 'EOF'
import pinyin from 'pinyin';
export default pinyin;
EOF
```

### 步骤 4: 打包

```bash
npx rollup -c rollup.config.pinyin.mjs
```

### 步骤 5: 复制到项目

```bash
cp pinyin-rollup.min.js /path/to/go-executor/assets/external-libs/pinyin.min.js
```

---

## 📋 通用模板

对于任何库 `<library>`:

### 1. 配置文件: `rollup.config.<library>.mjs`

```javascript
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'rollup-<library>-entry.js',
  output: {
    file: '<library>-rollup.min.js',
    format: 'umd',
    name: '<LibraryGlobalName>',  // 例如: 'pinyin', 'Qs', '_'
    exports: 'default'
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs()
  ]
};
```

### 2. 入口文件: `rollup-<library>-entry.js`

```javascript
import <library> from '<library>';
export default <library>;
```

### 3. 打包命令

```bash
npx rollup -c rollup.config.<library>.mjs
```

---

## 🔧 常见问题

### Q1: 为什么配置文件必须是 `.mjs` 后缀?

**A**: Rollup 配置使用 ES6 `import/export` 语法,Node.js 需要 `.mjs` 后缀来识别 ES 模块。

**错误示例**:
```
SyntaxError: Cannot use import statement outside a module
```

**解决**:
```bash
mv rollup.config.js rollup.config.mjs
```

---

### Q2: 如何指定全局变量名?

**A**: 使用 `output.name` 字段:

```javascript
output: {
  name: '_',        // lodash -> window._ 或 global._
  name: 'Qs',       // qs -> window.Qs
  name: 'pinyin',   // pinyin -> window.pinyin
}
```

---

### Q3: 打包后文件很大怎么办?

**A**: Rollup 默认不压缩。如需压缩:

```bash
npm install --save-dev @rollup/plugin-terser
```

```javascript
import terser from '@rollup/plugin-terser';

export default {
  plugins: [
    resolve(),
    commonjs(),
    terser()  // 添加压缩
  ]
};
```

---

### Q4: Rollup vs Browserify vs Webpack?

| 工具 | 适用场景 | 优势 | 劣势 |
|------|---------|------|------|
| **Rollup** | ES6 模块库 | Tree-shaking,输出小,ES6优先 | 配置稍复杂 |
| **Browserify** | CommonJS 简单库 | 简单易用,稳定 | 输出较大,无tree-shaking |
| **Webpack** | 复杂依赖,多入口 | 功能强大,生态好 | 配置复杂,输出大 |

**推荐**: 
1. **优先 Rollup** (pinyin 成功案例)
2. 简单库用 Browserify (uuid 成功案例)
3. 复杂依赖用 Webpack (date-fns 成功案例)

---

## ⚠️ Goja 兼容性注意事项

### ❌ 避免的代码模式

1. **`Function(` 构造器**
   ```javascript
   // ❌ 会被安全检查阻止
   var getGlobal = Function('return this');
   ```

2. **`Function.prototype` 访问**
   ```javascript
   // ❌ Goja 中可能不完整
   var toString = Function.prototype.toString;
   ```

3. **ES6+ 特性**
   ```javascript
   // ❌ Goja 只支持 ES5
   const [a, b] = arr;  // 解构
   async/await         // 异步函数
   class MyClass {}    // 类
   ```

### ✅ 安全的代码模式

1. **全局对象访问**
   ```javascript
   // ✅ 使用条件检查
   var root = typeof global !== 'undefined' ? global : this;
   ```

2. **Polyfills**
   ```javascript
   // ✅ 提供降级方案
   if (typeof Array.prototype.find === 'undefined') {
       Array.prototype.find = function(predicate) { /* ... */ };
   }
   ```

---

## 📊 成功率统计

基于当前测试:

| 库 | Browserify | Rollup | 最终状态 |
|------|-----------|--------|---------|
| uuid | ✅ | - | ✅ 可用 |
| pinyin | ⚠️ API问题 | ✅ | ✅ 可用 (Rollup修复!) |
| lodash | ❌ | ❌ | ❌ 被安全检查阻止 |
| qs | ❌ | ❌ | ❌ Goja 限制 |
| date-fns | - | ⚠️ | ✅ 可用 (Webpack修复) |

**结论**: Rollup 成功率更高,应作为首选!

---

## 🚀 完整示例

### 示例: 打包 uuid

```bash
# 1. 准备工作目录
mkdir -p /tmp/rollup-build && cd /tmp/rollup-build

# 2. 初始化项目
npm init -y
npm install uuid rollup @rollup/plugin-commonjs @rollup/plugin-node-resolve

# 3. 创建配置
cat > rollup.config.uuid.mjs << 'EOF'
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'entry.js',
  output: {
    file: 'uuid.min.js',
    format: 'umd',
    name: 'uuid',
    exports: 'default'
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs()
  ]
};
EOF

# 4. 创建入口
cat > entry.js << 'EOF'
import { v4, v1, v3, v5 } from 'uuid';
export default { v1, v3, v4, v5 };
EOF

# 5. 打包
npx rollup -c rollup.config.uuid.mjs

# 6. 验证
ls -lh uuid.min.js

# 7. 复制
cp uuid.min.js /path/to/project/assets/external-libs/
```

---

## 💡 最佳实践

### 1. **使用专用构建目录**
```bash
/tmp/rollup-build/
├── rollup.config.uuid.mjs
├── rollup.config.pinyin.mjs
├── entry-uuid.js
├── entry-pinyin.js
└── package.json
```

### 2. **保存配置到版本控制**
```bash
# 在项目根目录
mkdir -p build/rollup-configs
cp /tmp/rollup-build/*.mjs build/rollup-configs/
```

### 3. **文档化打包步骤**
在每个库的增强器文件中添加注释:
```go
// pinyin_enhancement.go
// Build: npx rollup -c rollup.config.pinyin.mjs
// Source: pinyin@2.11.2 from npm
// Output: 7.3 MB (includes dictionary)
```

### 4. **测试打包结果**
```bash
# 快速测试
node -e "const p = require('./pinyin.min.js'); console.log(p('你好'));"
```

---

## 📚 相关资源

- [Rollup 官方文档](https://rollupjs.org/)
- [Rollup 插件列表](https://github.com/rollup/awesome)
- [UMD 格式说明](https://github.com/umdjs/umd)
- [Goja ECMAScript 5 文档](https://github.com/dop251/goja)

---

**最后更新**: 2025-10-03  
**成功案例**: uuid (Browserify), pinyin (Rollup), date-fns (Webpack)








