(function(global) {
  function encodeWithTextEncoder(code) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(code || '');
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function decodeBase64ToString(b64) {
    if (!b64) return '';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  class ScriptManager {
    constructor(options = {}) {
      this.api = options.api;
      this.ui = options.ui;
      this.getCurrentCode = options.getCurrentCode || (() => '');
      this.onScriptApplied = options.onScriptApplied || (() => {});
      this.onScriptSelected = options.onScriptSelected || (() => {});
      this.pagination = { page: 1, size: 20, totalPages: 1 };
      this.keyword = '';
    }

    init() {
      if (this.ui) {
        this.ui.init();
      }
    }

    async loadScripts(page = 1, extra = {}) {
      if (!this.api) return;
      this.ui?.hideMessage();
      if (extra.keyword !== undefined) this.keyword = extra.keyword;
      this.pagination.page = page;
      const params = {
        page,
        size: this.pagination.size || 20,
        keyword: this.keyword || undefined,
        sort: 'updated_at',
        order: 'desc',
      };

      const res = await this.api.listScripts(params);
      if (res && res.success) {
        const payload = res.data || res;
        const scripts = payload.scripts || [];
        this.pagination.totalPages = payload.total_pages || 1;
        this.pagination.total = payload.total || scripts.length;
        this.ui?.renderScriptList(scripts, payload);
      } else {
        this.ui?.showMessage(res?.message || res?.error?.message || '查询脚本列表失败', 'error');
      }
    }

    updatePageSize(size) {
      if (!size || size < 1) return;
      this.pagination.size = size;
      this.loadScripts(1);
    }

    changePage(delta) {
      const next = (this.pagination.page || 1) + delta;
      const totalPages = this.pagination.totalPages || 1;
      if (next < 1 || next > totalPages) return;
      this.loadScripts(next);
    }

    async uploadCurrentCode() {
      const code = this.getCurrentCode();
      if (!code || !code.trim()) {
        this.ui?.showMessage('当前代码为空，无法上传', 'error');
        return;
      }
      this.ui?.openDescriptionDialog({
        onConfirm: async ({ description, ipWhitelist }) => {
          const body = {
            code_base64: encodeWithTextEncoder(code),
            description: description || '',
            ip_whitelist: ipWhitelist || [],
          };
          const res = await this.api.createScript(body);
          if (res && res.success) {
            const scriptId = res.data?.script_id || res.script_id;
            this.ui?.showMessage(`脚本上传成功，ID：${scriptId}`, 'success');
            this.onScriptSelected(scriptId);
            this.loadScripts(1);
          } else {
            this.ui?.showMessage(res?.message || res?.error?.message || '上传失败', 'error');
          }
        },
      });
    }

    async prepareUpdate(scriptId) {
      const detail = await this.api.getScript(scriptId);
      let description = '';
      let ipWhitelist = [];
      let currentCode = '';
      if (detail && detail.success) {
        const payload = detail.data || {};
        const currentVersion = payload.current_version;
        const versions = payload.data || [];
        const current = versions.find(v => v.version === currentVersion) || versions[0];
        description = current?.description || '';
        ipWhitelist = current?.ip_whitelist || [];
        if (current?.code_base64 || current?.code) {
          currentCode = current.code_base64 ? decodeBase64ToString(current.code_base64) : current.code;
        }
      }
      if (!currentCode) {
        currentCode = this.getCurrentCode();
      }
      this.ui?.openDescriptionDialog({
        title: '更新代码',
        mode: 'update',
        description,
        ip_whitelist: ipWhitelist,
        enableCodeSource: true,
        codeSource: { value: 'editor', customCode: currentCode },
        onConfirm: async ({ description: desc, ipWhitelist: whitelist, codeSource, customCode }) => {
          await this.updateScript(scriptId, {
            description: desc,
            ipWhitelist: whitelist,
            codeSource,
            customCode,
          });
        },
      });
    }

    async updateScript(scriptId, options = {}) {
      const description = options.description || '';
      const ipWhitelist = options.ipWhitelist;
      const source = options.codeSource || 'editor';
      const customCode = options.customCode;
      const skipCodeUpdate = source === 'meta';
      const body = { description: description || '' };
      if (!skipCodeUpdate) {
        const code = source === 'custom' ? (customCode || '') : this.getCurrentCode();
        if (!code || !code.trim()) {
          this.ui?.showMessage('代码内容为空，无法更新脚本', 'error');
          return;
        }
        body.code_base64 = encodeWithTextEncoder(code);
      }
      if (Array.isArray(ipWhitelist)) {
        body.ip_whitelist = ipWhitelist;
      }
      const res = await this.api.updateScript(scriptId, body);
      if (res && res.success) {
        const payload = res.data || res;
        const codeChanged = payload.code_changed ?? payload.codeChanged;
        const successMsg = '脚本更新成功';
        if (!skipCodeUpdate && codeChanged === false) {
          this.ui?.showMessage(`${successMsg}；检测到代码未变更，如仅调整描述/IP，建议选择“仅改描述/IP”。`, 'info');
          if (this.ui?.confirmDialog) {
            this.ui.confirmDialog('检测到代码与当前版本一致。如只需更新描述或 IP，请选择“仅改描述/IP”重试。', {
              title: '代码未变更提示',
              okText: '知道了',
              cancelText: '关闭',
              danger: false,
            }).catch(() => {});
          }
        } else {
          this.ui?.showMessage(successMsg, 'success');
        }
        this.loadScripts(this.pagination.page || 1);
      } else {
        this.ui?.showMessage(res?.message || res?.error?.message || '脚本更新失败', 'error');
      }
    }

    async deleteScript(scriptId) {
      const ok = this.ui?.confirmDialog
        ? await this.ui.confirmDialog(`确定要删除脚本 ${scriptId} 吗？`, { title: '删除确认', danger: true })
        : confirm(`确定要删除脚本 ${scriptId} 吗？`);
      if (!ok) return;
      const res = await this.api.deleteScript(scriptId);
      if (res && res.success) {
        this.ui?.showMessage('脚本已删除', 'success');
        this.loadScripts(1);
      } else {
        this.ui?.showMessage(res?.message || res?.error?.message || '删除失败', 'error');
      }
    }

    async loadVersions(scriptId) {
      const res = await this.api.getScript(scriptId);
      if (res && res.success) {
        const payload = res.data || {};
        const versions = payload.data || [];
        const currentVersion = payload.current_version;
        this.ui?.renderVersionList(versions, currentVersion, scriptId);
        const defaultVersion = versions.find(v => v.version === currentVersion) || versions[0];
        if (defaultVersion) {
          if (defaultVersion.code_base64 || defaultVersion.code) {
            const codeRaw = defaultVersion.code_base64
              ? decodeBase64ToString(defaultVersion.code_base64)
              : defaultVersion.code;
            this.ui?.showVersionPreview({
              scriptId,
              version: defaultVersion.version,
              code: codeRaw,
              updated_at: defaultVersion.updated_at || defaultVersion.created_at || '',
            });
          } else {
            this.viewVersionCode(scriptId, defaultVersion.version, { silent: true });
          }
        } else {
          this.ui?.showVersionPreview(null);
        }
      } else {
        this.ui?.showMessage(res?.message || res?.error?.message || '获取版本失败', 'error');
      }
    }

    async rollbackToVersion(scriptId, version) {
      const ok = this.ui?.confirmDialog
        ? await this.ui.confirmDialog(`确定回滚到 v${version} 吗？`, { title: '回滚确认', danger: true })
        : confirm(`确定回滚到 v${version} 吗？`);
      if (!ok) return;
      const res = await this.api.updateScript(scriptId, { rollback_to_version: version });
      if (res && res.success) {
        this.ui?.showMessage('版本回滚成功', 'success');
        this.loadScripts(this.pagination.page || 1);
        this.loadVersions(scriptId);
      } else {
        this.ui?.showMessage(res?.message || res?.error?.message || '回滚失败', 'error');
      }
    }

    async viewVersionCode(scriptId, version, options = {}) {
      const res = await this.api.getScript(scriptId, version);
      if (res && res.success) {
        const payload = res.data || {};
        const versions = payload.data || [];
        const target = versions.find(v => v.version === version) || versions[0];
        if (target && (target.code_base64 || target.code)) {
          const code = target.code_base64 ? decodeBase64ToString(target.code_base64) : target.code;
          this.ui?.showVersionPreview({
            scriptId,
            version: target.version,
            code,
            updated_at: target.updated_at || target.created_at || '',
          });
          if (!options.silent) {
            this.ui?.showMessage(`已载入 v${version} 代码`, 'info');
          }
        }
      } else {
        if (!options.silent) {
          this.ui?.showMessage(res?.message || res?.error?.message || '查看版本失败', 'error');
        }
      }
    }

    async applyScript(scriptId, description, version) {
      const res = await this.api.getScript(scriptId, version);
      if (res && res.success) {
        const payload = res.data || {};
        const versions = payload.data || [];
        const currentVersion = version || payload.current_version;
        const target = versions.find(v => v.version === currentVersion) || versions[0];
        if (target && target.code_base64) {
          const code = decodeBase64ToString(target.code_base64);
          this.onScriptApplied(code);
        }
        this.onScriptSelected(scriptId);
        this.ui?.hideModal();
        this.ui?.showMessage(`已选择脚本 ${description || scriptId}`, 'success');
      } else {
        this.ui?.showMessage(res?.message || res?.error?.message || '加载脚本失败', 'error');
      }
    }
  }

  global.ScriptManager = ScriptManager;
})(window);
