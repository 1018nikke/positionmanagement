/* ============================================================
   仓位计算器 — JavaScript
   实时计算、校验、DOM 操作
   ============================================================ */

(function () {
  'use strict';

  // ── DOM References ──────────────────────────────────────
  const els = {
    directionLong:  document.getElementById('direction-long'),
    directionShort: document.getElementById('direction-short'),
    capital:        document.getElementById('capital'),
    riskPercent:    document.getElementById('risk-percent'),
    entryPrice:     document.getElementById('entry-price'),
    stopPrice:      document.getElementById('stop-price'),
    stopError:      document.getElementById('stop-error'),
    capitalError:   document.getElementById('capital-error'),
    riskError:      document.getElementById('risk-error'),
    entryError:     document.getElementById('entry-error'),
    resultsCard:    document.getElementById('results-card'),
    emptyState:     document.getElementById('empty-state'),
    resultsBody:    document.getElementById('results-body'),
    ringFill:       document.getElementById('ring-fill'),
    ringLabelVal:   document.getElementById('ring-label-val'),
    riskDesc:       document.getElementById('risk-desc'),
    historyList:    document.getElementById('history-list'),
    historyEmpty:   document.getElementById('history-empty'),
    historyBody:    document.getElementById('history-body'),
    clearHistory:   document.getElementById('btn-clear-history'),
    calculate:      document.getElementById('btn-calculate'),
  };

  // ── State ───────────────────────────────────────────────
  let direction = null; // null | 'long' | 'short'

  // ── Ring gauge constants ────────────────────────────────
  const RING_RADIUS = 28;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  // ── History ─────────────────────────────────────────────
  const HISTORY_KEY = 'pos_calc_history';
  const MAX_HISTORY = 50;

  // ── Validation helpers ──────────────────────────────────
  function getNumVal(id) {
    const raw = document.getElementById(id).value.trim();
    if (raw === '') return NaN;
    const n = Number(raw);
    return isFinite(n) ? n : NaN;
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
  }

  function clearError(el) {
    showError(el, '');
  }

  function markError(inputEl, flag) {
    inputEl.classList.toggle('error', flag);
  }

  // ── Main calculation & render ───────────────────────────
  function compute() {
    // 1) Parse inputs
    const capital   = getNumVal('capital');
    const riskStr   = els.riskPercent.value.trim();
    const riskPct   = riskStr === '' ? NaN : Number(riskStr);
    const entry     = getNumVal('entry-price');
    const stopRaw   = els.stopPrice.value.trim();
    const stop      = stopRaw === '' ? NaN : Number(stopRaw);

    // 2) Validate step by step — short-circuit on first field failure
    let hasDirErr = direction === null;
    let hasCapitalErr = !isFinite(capital) || capital <= 0;
    let hasRiskErr = !isFinite(riskPct) || riskPct <= 0 || riskPct > 100;
    let hasEntryErr = !isFinite(entry) || entry <= 0;

    // Stop validation depends on direction + entry
    let hasStopErr = false;
    let stopMsg = '';
    if (hasDirErr || hasCapitalErr || hasRiskErr || hasEntryErr) {
      // Don't validate stop yet — field errors are shown individually
      // But if stop field has non-numeric, still show that
      if (!hasDirErr && !hasCapitalErr && !hasRiskErr && !hasEntryErr) {
        // all prior fields OK, proceed with stop
      }
    }

    // Direction error
    const dirErrEl = document.getElementById('direction-error');
    if (hasDirErr) {
      dirErrEl.textContent = '请选择交易方向';
      dirErrEl.classList.add('visible');
    } else {
      dirErrEl.textContent = '';
      dirErrEl.classList.remove('visible');
    }

    // Capital error
    if (stopRaw !== '' && !hasDirErr && !hasCapitalErr && !hasRiskErr && !hasEntryErr) {
      // only validate stop when we have direction + entry
      if (!isFinite(stop) || stop <= 0) {
        hasStopErr = true;
        stopMsg = '止损价格必须为正数';
      } else if (direction === 'long' && stop >= entry) {
        hasStopErr = true;
        stopMsg = '做多场景下，止损价必须严格小于入场价';
      } else if (direction === 'short' && stop <= entry) {
        hasStopErr = true;
        stopMsg = '做空场景下，止损价必须严格大于入场价';
      }
    }

    showError(els.capitalError, hasCapitalErr && capital !== '' ? (capital <= 0 ? '账户总资金必须为正数' : '请输入有效数字') : '');
    showError(els.riskError, hasRiskErr && riskStr !== '' ? (riskPct <= 0 ? '风险比例必须为正数' : riskPct > 100 ? '风险比例不能超过 100%' : '请输入有效数字') : '');
    showError(els.entryError, hasEntryErr ? (entry <= 0 ? '入场价格必须为正数' : '请输入有效数字') : '');
    showError(els.stopError, stopMsg);

    markError(els.capital, hasCapitalErr && capital !== '');
    markError(els.riskPercent, hasRiskErr && riskStr !== '');
    markError(els.entryPrice, hasEntryErr);
    markError(els.stopPrice, hasStopErr);

    // 3) If any error, hide results and signal invalid (no history)
    if (hasDirErr || hasCapitalErr || hasRiskErr || hasEntryErr || hasStopErr) {
      hideResults();
      return null;
    }

    // 4) Compute
    const stopDistance = Math.abs(entry - stop);
    const maxLoss = capital * (riskPct / 100);
    const positionSize = maxLoss / stopDistance;
    const notionalValue = positionSize * entry;
    const riskExposureRatio = (notionalValue / capital) * 100;

    // 5) Render
    const data = {
      stopDistance,
      maxLoss,
      positionSize,
      notionalValue,
      riskExposureRatio,
    };
    renderResults(direction, data);
    return data;
  }

  // ── Render results ──────────────────────────────────────
  function renderResults(dir, data) {
    els.emptyState.classList.add('hidden');
    els.emptyState.style.display = 'none';
    els.resultsBody.classList.remove('hidden');
    els.resultsBody.style.display = '';
    els.resultsCard.classList.add('has-data');
    els.resultsCard.classList.remove('long-theme', 'short-theme');
    els.resultsCard.classList.add(dir === 'long' ? 'long-theme' : 'short-theme');

    const valueClass = dir === 'long' ? 'long-value' : 'short-value';

    // Only update the results-grid, keep risk gauge intact
    const grid = document.getElementById('results-grid');
    grid.innerHTML = `
      <div class="metric-card">
        <div class="metric-label">交易方向</div>
        <div class="metric-value ${valueClass}">${dir === 'long' ? '做多' : '做空'}</div>
        <div class="metric-unit">LONG / SHORT</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">停车距离</div>
        <div class="metric-value">${data.stopDistance.toFixed(2)}</div>
        <div class="metric-unit">USDT</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">单笔最大亏损</div>
        <div class="metric-value">${data.maxLoss.toFixed(2)}</div>
        <div class="metric-unit">USDT</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">可开仓位数量</div>
        <div class="metric-value">${data.positionSize.toFixed(4)}</div>
        <div class="metric-unit">标的本位</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">持仓名义价值</div>
        <div class="metric-value">${data.notionalValue.toFixed(2)}</div>
        <div class="metric-unit">USDT</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">风险敞口占比</div>
        <div class="metric-value">${data.riskExposureRatio.toFixed(2)}</div>
        <div class="metric-unit">%</div>
      </div>
    `;

    // Re-trigger animation
    var metricCards = grid.querySelectorAll('.metric-card');
    metricCards.forEach(function (el, i) {
      el.style.animation = 'none';
      el.offsetHeight; // force reflow
      el.style.animation = 'fadeSlideUp 0.35s ease forwards';
      el.style.animationDelay = (0.02 + i * 0.04) + 's';
    });

    // Update ring gauge — elements are safe (no longer destroyed by innerHTML)
    var pct = Math.min(data.riskExposureRatio, 100);
    var offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
    els.ringFill.setAttribute('stroke-dasharray', '' + RING_CIRCUMFERENCE);
    els.ringFill.setAttribute('stroke-dashoffset', '' + offset);

    // Color
    var color;
    if (pct < 25) color = getComputedStyle(document.documentElement).getPropertyValue('--color-long').trim() || '#00f0a0';
    else if (pct < 50) color = '#f0a000';
    else if (pct < 75) color = '#f07000';
    else color = '#ff4444';
    els.ringFill.setAttribute('stroke', color);

    els.ringLabelVal.textContent = data.riskExposureRatio.toFixed(1);

    // Risk description
    var desc;
    if (data.riskExposureRatio < 10) desc = '低风险敞口，资金使用率偏低，可考虑适当提高风险比例。';
    else if (data.riskExposureRatio < 30) desc = '中等风险敞口，仓位处于合理范围。';
    else if (data.riskExposureRatio < 50) desc = '较高风险敞口，注意控制单笔风险。';
    else if (data.riskExposureRatio < 75) desc = '高风险敞口，建议降低风险比例或缩小仓位。';
    else desc = '极高风险敞口！请立即检查仓位大小，风险敞口过大。';
    els.riskDesc.textContent = desc;
  }

  function hideResults() {
    els.emptyState.classList.remove('hidden');
    els.emptyState.style.display = '';
    els.resultsBody.classList.add('hidden');
    els.resultsBody.style.display = 'none';
    els.resultsCard.classList.remove('has-data', 'long-theme', 'short-theme');
  }

  // ── History management ──────────────────────────────────
  function getHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(records) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
    } catch (e) {
      // storage full — silently ignore
    }
  }

  // Format timestamp as YYYY-MM-DD HH:mm
  function formatDateTime(ts) {
    var d = new Date(ts);
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function saveRecord(dir, inputs, results) {
    var records = getHistory();
    var now = Date.now();

    var record = {
      id: now.toString(36) + Math.random().toString(36).slice(2, 6),
      createTime: formatDateTime(now),
      direction: dir === 'long' ? '做多' : '做空',
      params: {
        '账户总资金': inputs.capital,
        '风险比例(%)': inputs.riskPercent,
        '入场价格': inputs.entryPrice,
        '止损价格': inputs.stopPrice
      },
      result: {
        '停车距离': results.stopDistance,
        '单笔最大亏损': results.maxLoss,
        '可开仓位数量': results.positionSize,
        '持仓名义价值': results.notionalValue,
        '风险敞口占比(%)': results.riskExposureRatio
      }
    };

    records.unshift(record);

    // Sort by createTime desc (newest first), timestamp id as tiebreak
    records.sort(function (a, b) {
      var ta = a.timestamp || new Date(a.createTime).getTime() || 0;
      var tb = b.timestamp || new Date(b.createTime).getTime() || 0;
      return tb - ta;
    });

    // Keep max, drop oldest
    if (records.length > MAX_HISTORY) {
      records = records.slice(0, MAX_HISTORY);
    }

    saveHistory(records);
    renderHistory(true); // scroll to top on new record
  }

  function clearAllHistory() {
    if (confirm('确定清空全部历史记录吗？')) {
      saveHistory([]);
      renderHistory();
    }
  }

  function renderHistory(scrollToTop) {
    var records = getHistory();

    if (records.length === 0) {
      els.historyEmpty.classList.remove('hidden');
      els.historyEmpty.style.display = '';
      els.historyBody.classList.add('hidden');
      els.historyBody.style.display = 'none';
      return;
    }

    els.historyEmpty.classList.add('hidden');
    els.historyEmpty.style.display = 'none';
    els.historyBody.classList.remove('hidden');
    els.historyBody.style.display = '';

    var html = '';
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var dirClass = r.direction === '做多' ? 'long' : 'short';
      html += '<div class="history-row" data-id="' + r.id + '">';
      html += '  <span class="h-time">' + r.createTime + '</span>';
      html += '  <span class="h-dir ' + dirClass + '">' + r.direction + '</span>';
      html += '  <span>' + Number(r.params['入场价格']).toFixed(2) + '</span>';
      html += '  <span>' + Number(r.params['止损价格']).toFixed(2) + '</span>';
      html += '  <span>' + Number(r.result['可开仓位数量']).toFixed(4) + '</span>';
      html += '  <span>' + Number(r.result['风险敞口占比(%)']).toFixed(2) + '%</span>';
      html += '  <button class="h-delete" type="button">删除</button>';
      html += '</div>';
    }

    els.historyList.innerHTML = html;

    if (scrollToTop) {
      els.historyList.scrollTop = 0;
    }
  }

  function deleteRecord(id) {
    var records = getHistory().filter(function (r) { return r.id !== id; });
    saveHistory(records);
    renderHistory();
  }

  // ── Single-row delete (event delegation) ────────────────
  els.historyList.addEventListener('click', function (e) {
    var btn = e.target.closest('.h-delete');
    if (!btn) return;
    var row = btn.closest('.history-row');
    if (row) {
      deleteRecord(row.getAttribute('data-id'));
    }
  });

  // ── Clear all handler ───────────────────────────────────
  els.clearHistory.addEventListener('click', function () {
    if (getHistory().length > 0) {
      clearAllHistory();
    }
  });

  // ── Direction selection ─────────────────────────────────
  function setDirection(dir) {
    direction = dir;
    els.directionLong.classList.toggle('active', dir === 'long');
    els.directionShort.classList.toggle('active', dir === 'short');

    // Clear direction + stop errors (computed on button click)
    document.getElementById('direction-error').textContent = '';
    document.getElementById('direction-error').classList.remove('visible');
    showError(els.stopError, '');
    markError(els.stopPrice, false);
  }

  els.directionLong.addEventListener('click', function () { setDirection('long'); });
  els.directionShort.addEventListener('click', function () { setDirection('short'); });

  // ── Calculate button: validate → compute → render → save ─
  els.calculate.addEventListener('click', function () {
    var data = compute(); // validates + renders; returns null if invalid
    if (data) {
      saveRecord(direction, {
        capital: els.capital.value.trim(),
        riskPercent: els.riskPercent.value.trim(),
        entryPrice: els.entryPrice.value.trim(),
        stopPrice: els.stopPrice.value.trim()
      }, data);
    }
  });

  // ── Input events: only clear error styling, no history / compute ─
  [els.capital, els.riskPercent, els.entryPrice, els.stopPrice].forEach(function (el) {
    el.addEventListener('blur', function () {
      // Remove error styling on blur if value is now valid
      if (el.value.trim() !== '') {
        markError(el, false);
      }
    });
  });

  // ── Init ────────────────────────────────────────────────
  // Set ring circumference
  els.ringFill.setAttribute('stroke-dasharray', RING_CIRCUMFERENCE);
  els.ringFill.setAttribute('stroke-dashoffset', RING_CIRCUMFERENCE);
  els.ringLabelVal.textContent = '--';

  // Initial empty state
  hideResults();

  // Load history
  renderHistory();

})();