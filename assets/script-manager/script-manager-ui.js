(function(global) {
  class ScriptManagerUI {
    constructor(manager) {
      this.manager = manager;
      this.modal = document.getElementById('scriptManagerModal');
      this.listBody = document.getElementById('scriptListBody');
      this.pageInfo = document.querySelector('#scriptManagerModal .page-info');
      this.prevBtn = document.querySelector('#scriptManagerModal .btn-prev');
      this.nextBtn = document.querySelector('#scriptManagerModal .btn-next');
      this.searchInput = document.querySelector('#scriptManagerModal .search-input');
      this.pageSizeSelector = document.querySelector('#scriptManagerModal .page-size-selector');
      this.versionPanel = document.getElementById('versionPanel');
      this.versionList = document.querySelector('#versionPanel .version-list');
      this.loadToEditorBtn = document.querySelector('#scriptManagerModal .btn-load-to-editor');
      this.messageBox = document.getElementById('scriptManagerMessage');
      this.searchTimer = null;
      this.selectedScript = null;
      this.versionListHandler = null;
    }

    init() {
      this.bindEvents();
    }

    bindEvents() {
      if (this.searchInput) {
        this.searchInput.addEventListener('input', () => {
          clearTimeout(this.searchTimer);
          this.searchTimer = setTimeout(() => {
            this.manager.loadScripts(1, { keyword: this.searchInput.value });
          }, 300);
        });
      }

      if (this.pageSizeSelector) {
        this.pageSizeSelector.addEventListener('change', () => {
          const val = this.pageSizeSelector.value;
          if (val === 'custom') {
            const custom = prompt('请输入每页显示条数（1-100）：');
            const num = parseInt(custom, 10);
            if (num >= 1 && num <= 100) {
              this.manager.updatePageSize(num);
            }
          } else {
            this.manager.updatePageSize(parseInt(val, 10));
          }
        });
      }

      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => this.manager.changePage(-1));
      }

      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => this.manager.changePage(1));
      }

      if (this.modal) {
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal());
      }

      if (this.loadToEditorBtn) {
        this.loadToEditorBtn.addEventListener('click', () => {
          if (this.selectedScript) {
            this.manager.applyScript(this.selectedScript.id, this.selectedScript.description);
          }
        });
        this.setSelectedScript(null);
      }

      if (this.listBody) {
        this.listBody.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-action]');
          const row = e.target.closest('tr[data-id]');
          if (row) {
            this.setSelectedScript({ id: row.dataset.id, description: row.dataset.desc });
          }
          if (!btn) return;
          const action = btn.dataset.action;
          const scriptId = btn.dataset.id;
          const desc = btn.dataset.desc || '';
          this.setSelectedScript({ id: scriptId, description: desc });

          switch (action) {
            case 'view-versions':
              this.manager.loadVersions(scriptId);
              break;
            case 'edit':
              this.manager.prepareUpdate(scriptId);
              break;
            case 'delete':
              this.manager.deleteScript(scriptId);
              break;
            case 'load':
              this.manager.applyScript(scriptId, desc);
              break;
            default:
              break;
          }
        });
      }

      const overlay = document.getElementById('descriptionDialogOverlay');
      if (overlay) {
        const cancelBtn = overlay.querySelector('[data-dialog-action="cancel"]');
        const confirmBtn = overlay.querySelector('[data-dialog-action="confirm"]');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeDescriptionDialog());
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.confirmDescriptionDialog());
      }
    }

    showModal() {
      if (this.modal) {
        this.modal.classList.add('show');
        this.manager.loadScripts(1);
      }
    }

    hideModal() {
      if (this.modal) {
        this.modal.classList.remove('show');
      }
      this.toggleVersionPanel(false);
    }

    renderScriptList(scripts = [], pagination = {}) {
      if (!this.listBody) return;
      this.listBody.innerHTML = '';

      scripts.forEach((script) => {
        const tr = document.createElement('tr');
        tr.dataset.id = script.id || '';
        tr.dataset.desc = script.description || '';
        tr.innerHTML = `
          <td title="${script.id}">${script.id ? script.id.substring(0, 10) + '...' : '-'}</td>
          <td title="${script.description || ''}">${script.description ? this.truncateText(script.description, 30) : '-'}</td>
          <td>v${script.version || 0}</td>
          <td>${script.updated_at || '-'}</td>
          <td>
            <div class="action-buttons">
              <button data-action="view-versions" data-id="${script.id}" title="查看版本">📜</button>
              <button data-action="edit" data-id="${script.id}" data-desc="${script.description || ''}" title="编辑脚本">✏️</button>
              <button data-action="delete" data-id="${script.id}" title="删除脚本">🗑️</button>
              <button data-action="load" data-id="${script.id}" data-desc="${script.description || ''}" class="btn-primary" title="填充到执行区">▶️</button>
            </div>
          </td>`;
        this.listBody.appendChild(tr);
      });

      if (this.pageInfo) {
        const current = pagination.current_page || 1;
        const totalPages = pagination.total_pages || 1;
        const totalCount = pagination.total || 0;
        const maxAllowed = pagination.max_allowed ?? '-';
        const remaining = pagination.remaining ?? '-';
        this.pageInfo.textContent = `第 ${current}/${totalPages} 页 · 共 ${totalCount} 条 · 可再创建 ${remaining} / ${maxAllowed}`;
      }
    }

    renderVersionList(versions = [], currentVersion = 0, scriptId = '') {
      if (!this.versionPanel || !this.versionList) return;
      this.toggleVersionPanel(true);
      this.versionList.innerHTML = '';

      versions.forEach((item) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'version-item';
        wrapper.innerHTML = `
          <div class="version-header">
            <span class="version-number">v${item.version}</span>
            <span class="version-date">${item.updated_at || item.created_at || '-'}</span>
            <span class="version-hash">${item.code_hash ? 'SHA: ' + item.code_hash.slice(0, 8) : ''}</span>
          </div>
          <div class="version-actions">
            <button data-action="version-view" data-id="${scriptId}" data-version="${item.version}">查看代码</button>
            <button data-action="version-rollback" data-id="${scriptId}" data-version="${item.version}">回滚</button>
            <button data-action="version-load" data-id="${scriptId}" data-version="${item.version}">加载到编辑器</button>
          </div>`;
        this.versionList.appendChild(wrapper);
      });

      if (this.versionListHandler) {
        this.versionList.removeEventListener('click', this.versionListHandler);
      }
      this.versionListHandler = (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const vid = btn.dataset.id;
        const version = parseInt(btn.dataset.version, 10);
        if (action === 'version-view') {
          this.manager.viewVersionCode(vid, version);
        } else if (action === 'version-rollback') {
          this.manager.rollbackToVersion(vid, version);
        } else if (action === 'version-load') {
          this.manager.applyScript(vid, '', version);
        }
      };
      this.versionList.addEventListener('click', this.versionListHandler);
    }

    toggleVersionPanel(show) {
      if (!this.versionPanel) return;
      this.versionPanel.style.display = show ? 'block' : 'none';
    }

    setLoading(isLoading) {
      if (!this.modal) return;
      this.modal.classList.toggle('loading', isLoading);
    }

    truncateText(text, maxLength) {
      if (!text) return '';
      return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    }

    showMessage(message, type = 'info') {
      if (!this.messageBox) return;
      this.messageBox.textContent = message;
      this.messageBox.className = `script-manager-message ${type}`;
      this.messageBox.style.display = 'block';
    }

    setSelectedScript(script) {
      this.selectedScript = script;
      if (this.loadToEditorBtn) {
        this.loadToEditorBtn.disabled = !script;
      }
    }

    hideMessage() {
      if (this.messageBox) {
        this.messageBox.style.display = 'none';
      }
    }

    openDescriptionDialog(defaults = {}) {
      const overlay = document.getElementById('descriptionDialogOverlay');
      if (!overlay) return;
      overlay.classList.add('show');
      const descInput = document.getElementById('scriptDescription');
      const ipInput = document.getElementById('ipWhitelistInput');
      if (descInput) descInput.value = defaults.description || '';
      if (ipInput) ipInput.value = (defaults.ip_whitelist || []).join('\n');
      this.dialogResolver = defaults.onConfirm;
    }

    closeDescriptionDialog() {
      const overlay = document.getElementById('descriptionDialogOverlay');
      if (overlay) overlay.classList.remove('show');
      this.dialogResolver = null;
    }

    confirmDescriptionDialog() {
      if (!this.dialogResolver) {
        this.closeDescriptionDialog();
        return;
      }
      const descInput = document.getElementById('scriptDescription');
      const ipInput = document.getElementById('ipWhitelistInput');
      const description = descInput ? descInput.value.trim() : '';
      const ipWhitelist = ipInput ? ipInput.value.split(/[\n,]/).map(v => v.trim()).filter(Boolean) : [];
      this.dialogResolver({ description, ipWhitelist });
      this.closeDescriptionDialog();
    }
  }

  global.ScriptManagerUI = ScriptManagerUI;
})(window);
