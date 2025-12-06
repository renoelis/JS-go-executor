(function(global) {
  class ScriptManagerUI {
    constructor(manager) {
      this.manager = manager;
      this.modal = document.getElementById('scriptManagerModal');
      this.listBody = document.getElementById('scriptListBody');
      this.pageInfo = document.querySelector('#scriptManagerModal .page-info');
      this.pageSummary = document.querySelector('#scriptManagerModal .page-summary');
      this.pageCurrent = document.querySelector('#scriptManagerModal .current-page');
      this.pageTotal = document.querySelector('#scriptManagerModal .total-pages');
      this.pageTotalCount = document.querySelector('#scriptManagerModal .total-count');
      this.pageRemaining = document.querySelector('#scriptManagerModal .remaining-count');
      this.pageMaxAllowed = document.querySelector('#scriptManagerModal .max-allowed');
      this.prevBtn = document.querySelector('#scriptManagerModal .btn-prev');
      this.nextBtn = document.querySelector('#scriptManagerModal .btn-next');
      this.searchInput = document.querySelector('#scriptManagerModal .search-input');
      this.pageSizeSelector = document.querySelector('#scriptManagerModal .page-size-selector');
      this.customPageSizeValue = document.getElementById('customPageSizeValue');
      this.versionPanel = document.getElementById('versionPanel');
      this.versionList = document.querySelector('#versionPanel .version-list');
      this.versionScriptEl = document.getElementById('versionPanelScriptId');
      this.versionPreviewMeta = document.getElementById('versionPreviewMeta');
      this.versionPreviewCode = document.getElementById('versionPreviewCode');
      this.loadToEditorBtn = document.querySelector('#scriptManagerModal .btn-load-to-editor');
      this.messageBox = document.getElementById('scriptManagerMessage');
      this.versionFullscreenOverlay = document.getElementById('versionFullscreenOverlay');
      this.versionFullscreenMeta = document.getElementById('versionFullscreenMeta');
      this.versionFullscreenCode = document.getElementById('versionFullscreenCode');
      this.confirmOverlay = document.getElementById('scriptConfirmOverlay');
      this.confirmTitle = document.getElementById('scriptConfirmTitle');
      this.confirmMessage = document.getElementById('scriptConfirmMessage');
      this.confirmCancelBtn = document.getElementById('scriptConfirmCancel');
      this.confirmOkBtn = document.getElementById('scriptConfirmOk');
      this.descriptionTitle = document.getElementById('descriptionDialogTitle');
      this.descriptionAlert = document.getElementById('descriptionDialogAlert');
      this.descriptionDialogContent = null;
      this.codeSourceSection = document.getElementById('codeSourceSection');
      this.customCodeWrapper = document.getElementById('customCodeEditorWrapper');
      this.customCodeFullscreenBtn = document.getElementById('customCodeFullscreenBtn');
      this.searchTimer = null;
      this.selectedScript = null;
      this.versionListHandler = null;
      this.currentPreviewVersion = null;
      this.currentVersionScriptId = null;
      this.currentPreviewCode = '';
      this.versionPreviewAce = null;
      this.versionFullscreenAce = null;
      this.confirmResolver = null;
      this.lastCustomPageSize = null;
      this.customCodeEditor = null;
      this.codeSourceChangeHandler = null;
      this.codeSourceEnabled = false;
      this.customCodeInitialValue = '';
      this.customCodeFullscreenHandler = null;
      this.descriptionAlertTimer = null;
      this.messageTimer = null;
      this.descriptionDialogMode = 'create';
    }

    init() {
      this.bindEvents();
      this.initVersionEditors();
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
            this.toggleCustomPageSize(true);
          } else {
            this.manager.updatePageSize(parseInt(val, 10));
            this.toggleCustomPageSize(false);
            const customInput = document.getElementById('customPageSizeInput');
            if (customInput) customInput.value = '';
            if (this.customPageSizeValue) this.customPageSizeValue.style.display = 'none';
            this.lastCustomPageSize = null;
          }
        });
      }

      const customApply = document.getElementById('customPageSizeApply');
      const customInput = document.getElementById('customPageSizeInput');
      if (customApply && customInput) {
        customApply.addEventListener('click', () => {
          const num = parseInt(customInput.value, 10);
          if (num >= 1 && num <= 100) {
            this.manager.updatePageSize(num);
            this.pageSizeSelector.value = 'custom';
            this.lastCustomPageSize = num;
            if (this.customPageSizeValue) {
              this.customPageSizeValue.textContent = `${num} 条/页`;
              this.customPageSizeValue.style.display = 'inline-flex';
            }
            this.toggleCustomPageSize(true);
          } else {
            customInput.focus();
            customInput.select();
          }
        });
        customInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            customApply.click();
          }
        });
        if (this.lastCustomPageSize) {
          customInput.value = this.lastCustomPageSize;
          if (this.customPageSizeValue) {
            this.customPageSizeValue.textContent = `${this.lastCustomPageSize} 条/页`;
            this.customPageSizeValue.style.display = 'inline-flex';
          }
        }
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
            case 'copy-id':
              this.copyId(scriptId);
              break;
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

      if (this.confirmCancelBtn) {
        this.confirmCancelBtn.addEventListener('click', () => this.resolveConfirm(false));
      }
      if (this.confirmOkBtn) {
        this.confirmOkBtn.addEventListener('click', () => this.resolveConfirm(true));
      }
      if (this.confirmOverlay) {
        this.confirmOverlay.addEventListener('click', (e) => {
          if (e.target === this.confirmOverlay) {
            this.resolveConfirm(false);
          }
        });
      }
    }

    showModal() {
      if (this.modal) {
        this.modal.classList.add('show');
        this.manager.loadScripts(1);
        if (this.searchInput) {
          setTimeout(() => this.searchInput.focus(), 50);
        }
        if (this.pageSizeSelector?.value === 'custom') {
          this.toggleCustomPageSize(true);
        } else {
          this.toggleCustomPageSize(false);
        }
      }
    }

    hideModal() {
      if (this.modal) {
        this.modal.classList.remove('show');
      }
      this.toggleVersionPanel(false);
      if (this.pageSizeSelector?.value !== 'custom') {
        this.toggleCustomPageSize(false);
      }
    }

    renderScriptList(scripts = [], pagination = {}) {
      if (!this.listBody) return;
      this.listBody.innerHTML = '';

      scripts.forEach((script) => {
        const tr = document.createElement('tr');
        tr.dataset.id = script.id || '';
        tr.dataset.desc = script.description || '';
        const desc = script.description || '未命名脚本';
        const shortId = script.id ? `${script.id.slice(0, 6)}...${script.id.slice(-4)}` : '-';
        tr.innerHTML = `
          <td>
            <div class="script-cell">
              <div class="script-name" title="${desc}">${this.truncateText(desc, 34)}</div>
              <div class="script-meta">
                <span class="script-id" title="${script.id || ''}">ID: ${shortId}</span>
                ${script.id ? `<button class="copy-id-btn" data-action="copy-id" data-id="${script.id}" title="复制脚本ID">复制</button>` : ''}
              </div>
            </div>
          </td>
          <td><span class="tag">v${script.version || 0}</span></td>
          <td><span class="time-text">${script.updated_at || '-'}</span></td>
          <td>
            <div class="action-buttons">
              <button data-action="load" data-id="${script.id}" data-desc="${script.description || ''}" title="填充到执行区">▶ 填充</button>
              <button data-action="edit" data-id="${script.id}" data-desc="${script.description || ''}" title="编辑脚本">✏️ 编辑</button>
              <button data-action="view-versions" data-id="${script.id}" title="查看版本并预览">🕒 版本</button>
              <button data-action="delete" data-id="${script.id}" title="删除脚本" class="action-danger">🗑️ 删除</button>
            </div>
          </td>`;
        this.listBody.appendChild(tr);
      });

      const current = Number(pagination.current_page) || 1;
      const totalPages = Number(pagination.total_pages) || 1;
      const totalCount = Number.isFinite(Number(pagination.total)) ? Number(pagination.total) : scripts.length || 0;
      const maxAllowed = pagination.max_allowed ?? '-';
      const remaining = pagination.remaining ?? '-';

      if (this.pageCurrent) this.pageCurrent.textContent = current;
      if (this.pageTotal) this.pageTotal.textContent = totalPages;
      if (this.pageTotalCount) this.pageTotalCount.textContent = totalCount;
      if (this.pageRemaining) this.pageRemaining.textContent = remaining;
      if (this.pageMaxAllowed) this.pageMaxAllowed.textContent = maxAllowed;

      if (!this.pageSummary && this.pageInfo) {
        this.pageInfo.textContent = `第 ${current}/${totalPages} 页 · 共 ${totalCount} 条 · 可再创建 ${remaining} / ${maxAllowed}`;
      }

      if (this.prevBtn) {
        this.prevBtn.disabled = current <= 1;
      }
      if (this.nextBtn) {
        this.nextBtn.disabled = current >= totalPages;
      }
    }

    renderVersionList(versions = [], currentVersion = 0, scriptId = '') {
      if (!this.versionPanel || !this.versionList) return;
      this.toggleVersionPanel(true);
      this.versionList.innerHTML = '';
      this.currentVersionScriptId = scriptId || '';
      if (this.versionScriptEl) {
        this.versionScriptEl.textContent = scriptId ? `脚本：${scriptId}` : '';
      }

      versions.forEach((item) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'version-item';
        wrapper.dataset.version = item.version;
        wrapper.dataset.id = scriptId;
        wrapper.innerHTML = `
          <div class="version-header">
            <div>
              <div class="version-number">v${item.version}</div>
              <div class="version-date">${item.updated_at || item.created_at || '-'}</div>
            </div>
            <span class="version-hash">${item.code_hash ? 'SHA: ' + item.code_hash.slice(0, 8) : ''}</span>
          </div>
          <div class="version-actions">
            <button data-action="version-load" data-id="${scriptId}" data-version="${item.version}">填充</button>
            <button data-action="version-rollback" data-id="${scriptId}" data-version="${item.version}" class="action-danger">回滚</button>
          </div>`;
        this.versionList.appendChild(wrapper);
      });

      if (this.versionListHandler) {
        this.versionList.removeEventListener('click', this.versionListHandler);
      }
      this.versionListHandler = (e) => {
        const btn = e.target.closest('button[data-action]');
        const card = e.target.closest('.version-item');
        if (card && card.dataset.id && card.dataset.version) {
          this.manager.viewVersionCode(card.dataset.id, parseInt(card.dataset.version, 10), { silent: true });
        }
        if (!btn) return;
        const action = btn.dataset.action;
        const vid = btn.dataset.id;
        const version = parseInt(btn.dataset.version, 10);
        if (action === 'version-rollback') {
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
      if (!show) {
        this.showVersionPreview(null);
      }
    }

    showVersionPreview(payload) {
      if (!this.versionPreviewMeta || !this.versionPreviewCode) return;
      if (!payload || !payload.code) {
        this.versionPreviewMeta.textContent = '选择左侧版本查看代码';
        if (this.versionPreviewAce) {
          this.versionPreviewAce.session.setValue('');
        } else {
          this.versionPreviewCode.textContent = '';
        }
        this.currentPreviewVersion = null;
        this.currentPreviewCode = '';
        this.highlightVersion(null);
        return;
      }
      this.versionPreviewMeta.textContent = `v${payload.version || '-'} · ${payload.updated_at || ''}`;
      this.currentPreviewCode = payload.code || '';
      if (this.versionPreviewAce) {
        this.versionPreviewAce.session.setValue(this.currentPreviewCode || '');
        this.versionPreviewAce.session.setScrollTop(0);
        this.versionPreviewAce.resize();
      } else {
        this.versionPreviewCode.textContent = this.currentPreviewCode || '';
      }
      this.currentPreviewVersion = payload.version;
      this.highlightVersion(payload.version);
      if (this.versionPreviewMeta?.scrollIntoView) {
        setTimeout(() => this.versionPreviewMeta.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    }

    highlightVersion(version) {
      if (!this.versionList) return;
      this.versionList.querySelectorAll('.version-item').forEach((item) => {
        if (parseInt(item.dataset.version, 10) === version) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
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
      if (this.messageTimer) {
        clearTimeout(this.messageTimer);
        this.messageTimer = null;
      }
      const prefix = type === 'success' ? '✅ ' : type === 'info' ? 'ℹ️ ' : '❌ ';
      this.messageBox.textContent = `${prefix}${message}`;
      this.messageBox.className = `script-manager-message ${type}`;
      this.messageBox.style.display = 'block';
      this.messageBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.messageTimer = setTimeout(() => this.hideMessage(), 5000);
    }

    setSelectedScript(script) {
      this.selectedScript = script;
      if (this.loadToEditorBtn) {
        this.loadToEditorBtn.disabled = !script;
      }
      if (this.listBody) {
        this.listBody.querySelectorAll('tr').forEach((row) => {
          row.classList.toggle('active', script && row.dataset.id === script.id);
        });
      }
    }

    hideMessage() {
      if (this.messageBox) {
        this.messageBox.style.display = 'none';
        this.messageBox.textContent = '';
      }
      if (this.messageTimer) {
        clearTimeout(this.messageTimer);
        this.messageTimer = null;
      }
    }

    showDescriptionAlert(message, type = 'error') {
      if (!this.descriptionAlert) return;
      if (this.descriptionAlertTimer) {
        clearTimeout(this.descriptionAlertTimer);
        this.descriptionAlertTimer = null;
      }
      const variant = type === 'success' ? 'success' : type === 'info' ? 'info' : '';
      this.descriptionAlert.className = variant ? `dialog-alert ${variant}` : 'dialog-alert';
      const prefix = variant === 'success' ? '✅ ' : variant === 'info' ? 'ℹ️ ' : '❌ ';
      this.descriptionAlert.textContent = `${prefix}${message}`;
      this.descriptionAlert.style.display = 'block';
      this.scrollToDescriptionAlert();
      this.descriptionAlertTimer = setTimeout(() => this.clearDescriptionAlert(), 5000);
    }

    clearDescriptionAlert() {
      if (!this.descriptionAlert) return;
      this.descriptionAlert.textContent = '';
      this.descriptionAlert.className = 'dialog-alert';
      this.descriptionAlert.style.display = 'none';
      if (this.descriptionAlertTimer) {
        clearTimeout(this.descriptionAlertTimer);
        this.descriptionAlertTimer = null;
      }
    }

    scrollToDescriptionAlert() {
      if (!this.descriptionAlert) return;
      const container = this.descriptionAlert.closest('.modal-content') || this.descriptionDialogContent;
      if (container && typeof container.scrollTo === 'function') {
        const targetTop = Math.max((this.descriptionAlert.offsetTop || 0) - 12, 0);
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
      if (this.descriptionAlert.scrollIntoView) {
        this.descriptionAlert.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }

    toggleCustomPageSize(show) {
      const box = document.getElementById('customPageSizeBox');
      const input = document.getElementById('customPageSizeInput');
      const valueChip = this.customPageSizeValue;
      const inputs = box ? box.querySelector('.custom-inputs') : null;
      if (!box || !input) return;
      if (show) {
        box.style.display = 'flex';
        box.classList.add('editing');
        if (valueChip) {
          if (this.lastCustomPageSize) {
            valueChip.textContent = `${this.lastCustomPageSize} 条/页`;
            valueChip.style.display = 'inline-flex';
          } else {
            valueChip.style.display = 'none';
          }
        }
        if (inputs) inputs.style.display = 'flex';
        if (this.lastCustomPageSize) input.value = this.lastCustomPageSize;
        input.focus();
      } else {
        input.value = '';
        box.classList.remove('editing');
        if (inputs) inputs.style.display = 'none';
        if (this.lastCustomPageSize) {
          box.style.display = 'flex';
          if (valueChip) {
            valueChip.textContent = `${this.lastCustomPageSize} 条/页`;
            valueChip.style.display = 'inline-flex';
          }
        } else {
          box.style.display = 'none';
          if (valueChip) valueChip.style.display = 'none';
        }
      }
    }

    confirmDialog(message, options = {}) {
      const title = options.title || '操作确认';
      const danger = !!options.danger;
      if (!this.confirmOverlay || !this.confirmMessage || !this.confirmTitle) {
        // 兜底使用原生 confirm
        return Promise.resolve(window.confirm(message || title));
      }
      this.confirmTitle.textContent = title;
      this.confirmMessage.textContent = message || '';
      if (this.confirmOkBtn) {
        this.confirmOkBtn.classList.toggle('danger', danger);
        this.confirmOkBtn.textContent = options.okText || '确定';
      }
      if (this.confirmCancelBtn) {
        this.confirmCancelBtn.textContent = options.cancelText || '取消';
      }
      this.confirmOverlay.classList.add('show');
      return new Promise((resolve) => {
        this.confirmResolver = resolve;
      });
    }

    resolveConfirm(result) {
      if (this.confirmOverlay) {
        this.confirmOverlay.classList.remove('show');
      }
      if (this.confirmResolver) {
        this.confirmResolver(result);
        this.confirmResolver = null;
      }
    }

    openVersionFullscreen() {
      if (!this.versionFullscreenOverlay || !this.versionFullscreenMeta || !this.versionFullscreenCode) return;
      this.initVersionEditors();
      const codeToShow = this.currentPreviewCode || '';
      if (!this.currentPreviewCode) {
        this.versionFullscreenMeta.textContent = '当前无可预览的代码';
        if (this.versionFullscreenAce) {
          this.versionFullscreenAce.session.setValue('');
        } else {
          this.versionFullscreenCode.textContent = '';
        }
      } else {
        const scriptId = this.currentVersionScriptId || '';
        const versionText = this.currentPreviewVersion ? `v${this.currentPreviewVersion}` : '';
        this.versionFullscreenMeta.textContent = `${scriptId ? `脚本：${scriptId} · ` : ''}${versionText}`;
        if (this.versionFullscreenAce) {
          this.versionFullscreenAce.session.setValue(codeToShow);
          this.versionFullscreenAce.session.setScrollTop(0);
        } else {
          this.versionFullscreenCode.textContent = codeToShow;
        }
      }
      this.versionFullscreenOverlay.classList.add('show');
      if (this.versionFullscreenAce) {
        setTimeout(() => {
          this.versionFullscreenAce.resize();
          this.versionFullscreenAce.session.setScrollTop(0);
        }, 30);
      }
    }

    closeVersionFullscreen() {
      if (this.versionFullscreenOverlay) {
        this.versionFullscreenOverlay.classList.remove('show');
      }
    }

    initVersionEditors() {
      if (typeof ace === 'undefined') return;
      if (this.versionPreviewCode && !this.versionPreviewAce) {
        this.versionPreviewAce = ace.edit(this.versionPreviewCode);
        this.versionPreviewAce.setTheme('ace/theme/monokai');
        this.versionPreviewAce.session.setMode('ace/mode/javascript');
        this.versionPreviewAce.setOptions({
          readOnly: true,
          highlightActiveLine: false,
          highlightGutterLine: false,
          showPrintMargin: false,
          fontSize: '12px',
        });
        this.versionPreviewAce.renderer.$cursorLayer.element.style.display = 'none';
      }
      if (this.versionFullscreenCode && !this.versionFullscreenAce) {
        this.versionFullscreenAce = ace.edit(this.versionFullscreenCode);
        this.versionFullscreenAce.setTheme('ace/theme/monokai');
        this.versionFullscreenAce.session.setMode('ace/mode/javascript');
        this.versionFullscreenAce.setOptions({
          readOnly: true,
          highlightActiveLine: false,
          highlightGutterLine: false,
          showPrintMargin: false,
          fontSize: '13px',
        });
        this.versionFullscreenAce.renderer.$cursorLayer.element.style.display = 'none';
      }
    }

    openDescriptionDialog(defaults = {}) {
      const overlay = document.getElementById('descriptionDialogOverlay');
      if (!overlay) return;
      this.descriptionDialogMode = defaults.mode || 'create';
      this.descriptionDialogContent = overlay.querySelector('.modal-content');
      overlay.classList.add('show');
      if (this.descriptionDialogContent) {
        this.descriptionDialogContent.scrollTo({ top: 0 });
      }
      this.clearDescriptionAlert();
      const descInput = document.getElementById('scriptDescription');
      const ipInput = document.getElementById('ipWhitelistInput');
      const title = defaults.title || (defaults.mode === 'update' ? '更新代码' : '脚本配置');
      if (this.descriptionTitle) {
        this.descriptionTitle.textContent = title;
      }
      if (descInput) descInput.value = defaults.description || '';
      if (ipInput) ipInput.value = (defaults.ip_whitelist || []).join('\n');
      this.codeSourceEnabled = !!defaults.enableCodeSource;
      const codeSection = this.codeSourceSection;
      if (codeSection) {
        codeSection.style.display = this.codeSourceEnabled ? 'block' : 'none';
      }
      if (this.codeSourceEnabled) {
        const sourceRadios = document.querySelectorAll('input[name="codeSource"]');
        const selected = defaults.code_source || defaults.codeSource || {};
        const selectedValue = typeof selected === 'string'
          ? selected
          : (selected.value || selected.selected || 'editor');
        const initialCustomCode = selected.customCode || defaults.custom_code || '';
        this.customCodeInitialValue = initialCustomCode;
        if (!this.codeSourceChangeHandler) {
          this.codeSourceChangeHandler = (e) => this.handleCodeSourceChange(e);
        }
        sourceRadios.forEach((radio) => {
          radio.checked = radio.value === selectedValue;
          radio.removeEventListener('change', this.codeSourceChangeHandler);
          radio.addEventListener('change', this.codeSourceChangeHandler);
        });
        this.ensureCustomCodeEditor(initialCustomCode);
        this.toggleCustomCodeEditor(selectedValue === 'custom');
        if (this.customCodeFullscreenBtn) {
          this.customCodeFullscreenBtn.disabled = selectedValue !== 'custom';
          this.customCodeFullscreenBtn.removeEventListener('click', this.customCodeFullscreenHandler);
          this.customCodeFullscreenHandler = () => this.openCustomCodeFullscreen();
          this.customCodeFullscreenBtn.addEventListener('click', this.customCodeFullscreenHandler);
        }
      }
      this.dialogResolver = defaults.onConfirm;
    }

    closeDescriptionDialog() {
      const overlay = document.getElementById('descriptionDialogOverlay');
      if (overlay) overlay.classList.remove('show');
      this.resolveConfirm(false);
      this.clearDescriptionAlert();
      this.dialogResolver = null;
      this.descriptionDialogMode = 'create';
    }

    async confirmDescriptionDialog() {
      if (!this.dialogResolver) {
        this.closeDescriptionDialog();
        return;
      }
      this.clearDescriptionAlert();
      const descInput = document.getElementById('scriptDescription');
      const ipInput = document.getElementById('ipWhitelistInput');
      const description = descInput ? descInput.value.trim() : '';
      const ipWhitelist = ipInput ? ipInput.value.split(/[\n,]/).map(v => v.trim()).filter(Boolean) : [];
      const codeSource = this.codeSourceEnabled ? this.getSelectedCodeSource() : 'editor';
      const customCode = this.codeSourceEnabled && this.customCodeEditor ? this.customCodeEditor.getValue() : '';
      if (this.codeSourceEnabled && codeSource === 'custom' && (!customCode || !customCode.trim())) {
        this.showDescriptionAlert('请输入自定义代码');
        if (this.customCodeEditor) {
          this.customCodeEditor.focus();
        }
        return;
      }
      let confirmContent = null;
      if (this.descriptionDialogMode === 'update') {
        confirmContent = this.getUpdateConfirmContent(codeSource);
      } else if (this.descriptionDialogMode === 'create') {
        confirmContent = this.getCreateConfirmContent();
      }
      if (confirmContent) {
        const ok = this.confirmDialog
          ? await this.confirmDialog(confirmContent.message, {
            title: confirmContent.title,
            okText: confirmContent.okText,
            cancelText: confirmContent.cancelText,
            danger: confirmContent.danger,
          })
          : window.confirm(confirmContent.message || confirmContent.title);
        if (!ok) return;
      }
      this.dialogResolver({ description, ipWhitelist, codeSource, customCode });
      this.closeDescriptionDialog();
    }

    getCreateConfirmContent() {
      return {
        title: '保存当前脚本',
        message: '将以当前编辑器中的代码创建新脚本，并同步保存描述/IP，确认保存？',
        okText: '确认保存',
      };
    }

    getUpdateConfirmContent(codeSource) {
      switch (codeSource) {
        case 'meta':
          return {
            title: '仅改描述/IP',
            message: '将仅更新脚本描述和 IP 白名单，代码保持不变，确认提交吗？',
            okText: '仅更新描述/IP',
          };
        case 'custom':
          return {
            title: '使用自定义代码',
            message: '将使用自定义区域的代码覆盖当前脚本，并同步更新描述/IP。请确认自定义代码已校验无误。',
            okText: '用自定义代码更新',
          };
        case 'editor':
        default:
          return {
            title: '使用编辑器代码',
            message: '将以当前编辑器中的代码覆盖脚本，并同步更新描述/IP。',
            okText: '用编辑器代码更新',
          };
      }
    }

    copyId(id) {
      if (!id) return;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(id).then(() => {
          this.showMessage('脚本ID已复制', 'success');
        }).catch(() => {
          this.showMessage('复制失败，请手动复制', 'error');
        });
      } else {
        const input = document.createElement('input');
        input.value = id;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        this.showMessage('脚本ID已复制', 'success');
      }
    }

    ensureCustomCodeEditor(initialCode = '') {
      if (typeof ace === 'undefined') return;
      if (!this.customCodeWrapper) return;
      if (!this.customCodeEditor) {
        this.customCodeEditor = ace.edit('customCodeEditor');
        this.customCodeEditor.setTheme('ace/theme/textmate');
        this.customCodeEditor.session.setMode('ace/mode/javascript');
        this.customCodeEditor.setOptions({
          fontSize: '14px',
          showPrintMargin: false,
          wrap: true,
          tabSize: 2,
          useSoftTabs: true,
          useWorker: true,
          highlightActiveLine: true,
          highlightSelectedWord: true,
        });
        this.customCodeEditor.session.setUseWorker(true);
        this.customCodeEditor.setHighlightGutterLine(true);
        this.customCodeEditor.setShowInvisibles(false);
      }
      this.customCodeEditor.setValue(initialCode || '', -1);
      this.customCodeEditor.session.setScrollTop(0);
      if (typeof setDialogCustomCodeEditor === 'function') {
        setDialogCustomCodeEditor(this.customCodeEditor);
      }
      setTimeout(() => {
        this.customCodeEditor?.resize();
      }, 30);
    }

    toggleCustomCodeEditor(show) {
      if (!this.customCodeWrapper) return;
      this.customCodeWrapper.style.display = show ? 'block' : 'none';
      const help = document.getElementById('customCodeHelp');
      if (help) {
        help.style.display = show ? 'block' : 'none';
      }
      if (this.customCodeFullscreenBtn) {
        this.customCodeFullscreenBtn.disabled = !show;
        this.customCodeFullscreenBtn.classList.toggle('disabled', !show);
      }
      if (show && this.customCodeEditor) {
        setTimeout(() => this.customCodeEditor?.resize(), 30);
      }
    }

    handleCodeSourceChange(e) {
      const value = e?.target?.value || 'editor';
      this.clearDescriptionAlert();
      this.toggleCustomCodeEditor(value === 'custom');
      if (this.customCodeFullscreenBtn) {
        this.customCodeFullscreenBtn.disabled = value !== 'custom';
        this.customCodeFullscreenBtn.classList.toggle('disabled', value !== 'custom');
      }
    }

    getSelectedCodeSource() {
      const checked = document.querySelector('input[name="codeSource"]:checked');
      return checked ? checked.value : 'editor';
    }

    openCustomCodeFullscreen() {
      if (!this.customCodeEditor) {
        this.ensureCustomCodeEditor(this.customCodeInitialValue || '');
      }
      if (typeof window.openCustomCodeFullscreen === 'function') {
        window.openCustomCodeFullscreen();
      }
    }
  }

  global.ScriptManagerUI = ScriptManagerUI;
})(window);
