/**
 * Token查询验证码功能模块
 * 依赖：需要在 test-tool.html 中引入
 */

(function() {
    'use strict';
    
    // ==================== 全局变量 ====================
    const VERIFY_CODE_ENABLED = typeof window.verifyCodeEnabled !== 'undefined' ? window.verifyCodeEnabled : false;
    const HAS_SESSION = typeof window.hasSession !== 'undefined' ? window.hasSession : false;
    
    // ==================== 页面加载检查 ====================
    document.addEventListener('DOMContentLoaded', function() {
        // 如果启用验证码功能，初始化UI
        if (VERIFY_CODE_ENABLED) {
            initVerifyCodeUI();
        }
    });
    
    // ==================== 初始化验证码UI ====================
    function initVerifyCodeUI() {
        const verifyCodeInput = document.getElementById('verifyCodeInput');
        if (!verifyCodeInput) return;
        
        // 🔥 添加回车键支持 - 按Enter键等同于点击"查询Token"按钮
        verifyCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const queryBtn = document.getElementById('queryBtn');
                if (queryBtn && !queryBtn.disabled) {
                    queryBtn.click();
                }
            }
        });
        
        // 🔥 只允许输入数字（0-9）
        verifyCodeInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
    
})();
