const $ = (selector) => document.querySelector(selector);
const DRUGS = [
  { id: "sildenafil", name: "威而鋼" },
  { id: "tadalafil", name: "犀利士" },
];
const EXERCISES = [
  { id: "squat", name: "深蹲", shortLabel: "SQ" },
  { id: "deadlift", name: "硬舉", shortLabel: "DL" },
  { id: "hip_thrust", name: "臀推", shortLabel: "HT" },
  { id: "hiit", name: "HIIT", shortLabel: "HI" },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function currentMonthEvents(items, now) {
  return (items || [])
    .filter((item) => {
      const date = parseDate(item.next_date);
      return date && date.year === now.getFullYear() && date.month === now.getMonth() + 1;
    })
    .sort((a, b) => a.next_date.localeCompare(b.next_date));
}

function minuteValue(value) {
  if (value === null || value === undefined || value === "") return "尚未紀錄";
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? `${count} 分鐘` : "尚未紀錄";
}

function sideEffectStartValue(value) {
  const timing = minuteValue(value);
  return timing === "尚未紀錄" ? timing : `${timing}開始`;
}

function dosageValue(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? `${count} mg` : "— mg";
}

function textValue(value, fallback = "尚未紀錄") {
  const text = String(value || "").trim();
  return text || fallback;
}

function renderSchedule(events, now) {
  const uniquePartners = new Set(events.map((event) => event.name.trim()).filter(Boolean));
  $("#month-label").textContent = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`;
  $("#schedule-month").textContent = `${now.getMonth() + 1} 月`;
  $("#month-partner-count").textContent = uniquePartners.size;
  $("#month-event-count").textContent = events.length;

  $("#month-schedule").innerHTML = events.length
    ? events
        .map((event) => {
          const date = parseDate(event.next_date);
          return `
            <article class="schedule-item">
              <time datetime="${escapeHtml(event.next_date)}">
                <strong>${date.month}/${date.day}</strong>
                <span>${["日", "一", "二", "三", "四", "五", "六"][new Date(date.year, date.month - 1, date.day).getDay()]}</span>
              </time>
              <div><span>合作對象</span><h3>${escapeHtml(event.name)}</h3></div>
            </article>`;
        })
        .join("")
    : '<div class="empty-state"><strong>本月尚無合作排程</strong><span>新增日期與合作對象後會顯示在這裡。</span></div>';
}

function renderMedications(logs) {
  $("#medication-grid").innerHTML = DRUGS.map((drug) => {
    const items = (logs || []).filter((item) => item.drug === drug.id);
    const latest = items[0];
    if (!latest) {
      return `
      <article class="medication-card">
        <div class="card-title-row">
          <div><span>藥物使用紀錄</span><h3>${escapeHtml(drug.name)}</h3></div>
          <strong class="dose">0 次</strong>
        </div>
        <div class="empty-state compact"><strong>尚無使用紀錄</strong><span>從本地管理頁新增後顯示。</span></div>
      </article>`;
    }
    const history = items.map((item) => `
      <li>
        <time>${escapeHtml(item.use_date)} ${escapeHtml(item.taken_time || "")}</time>
        <strong>${escapeHtml(dosageValue(item.dosage_mg))}</strong>
        <span>開始 ${escapeHtml(minuteValue(item.onset_min))} · 頂峰 ${escapeHtml(minuteValue(item.peak_min))} · 結束 ${escapeHtml(minuteValue(item.end_min))}</span>
        <span>效果 ${item.effectiveness_score ?? "—"}/10${item.note ? ` · ${escapeHtml(item.note)}` : ""}</span>
      </li>`).join("");
    return `
      <article class="medication-card">
        <div class="card-title-row">
          <div><span>最新個人紀錄</span><h3>${escapeHtml(drug.name)}</h3></div>
          <strong class="dose">${escapeHtml(dosageValue(latest.dosage_mg))}</strong>
        </div>
        <div class="timeline">
          <div><span>開始</span><strong>${escapeHtml(minuteValue(latest.onset_min))}</strong></div>
          <div><span>頂峰</span><strong>${escapeHtml(minuteValue(latest.peak_min))}</strong></div>
          <div><span>結束</span><strong>${escapeHtml(minuteValue(latest.end_min))}</strong></div>
        </div>
        <div class="side-effect">
          <span>副作用</span>
          <strong>${escapeHtml(sideEffectStartValue(latest.side_effect_onset_min))}</strong>
          <p>${escapeHtml(textValue(latest.side_effects, "目前無紀錄"))}</p>
        </div>
        <details class="history-details">
          <summary>全部紀錄（${items.length}）</summary>
          <ul class="record-history">${history}</ul>
        </details>
      </article>`;
  }).join("");
}

function fitnessSummary(item) {
  const parts = [];
  if (item.weight_kg != null) parts.push(`${item.weight_kg} kg`);
  if (item.sets != null || item.reps != null) parts.push(`${item.sets ?? "—"} 組 × ${item.reps ?? "—"} 次`);
  if (item.duration_min != null) parts.push(`${item.duration_min} 分鐘`);
  if (item.rounds != null) parts.push(`${item.rounds} 回合`);
  if (item.interval_pattern) parts.push(`間歇 ${item.interval_pattern}`);
  if (item.avg_hr != null || item.max_hr != null) parts.push(`心率 ${item.avg_hr ?? "—"}/${item.max_hr ?? "—"}`);
  return parts.join(" · ") || "尚未紀錄數值";
}

function renderFitness(logs) {
  $("#fitness-grid").innerHTML = EXERCISES.map((exercise) => {
    const items = (logs || []).filter((item) => item.exercise === exercise.id);
    const latest = items[0];
    const history = items.map((item) => `
      <li><time>${escapeHtml(item.session_date)}</time><strong>${escapeHtml(fitnessSummary(item))}</strong>${item.note ? `<span>${escapeHtml(item.note)}</span>` : ""}</li>`).join("");
    return `
      <article class="fitness-card">
        <div class="fitness-index">${escapeHtml(exercise.shortLabel)}</div>
        <div>
          <span>${latest ? escapeHtml(latest.session_date) : "尚未更新"}</span>
          <h3>${escapeHtml(exercise.name)}</h3>
          <strong>${escapeHtml(latest ? fitnessSummary(latest) : "尚未紀錄")}</strong>
          <p>${escapeHtml(latest ? textValue(latest.note, "無備註") : "等待第一次訓練紀錄")}</p>
          ${items.length ? `<details class="history-details"><summary>全部紀錄（${items.length}）</summary><ul class="record-history">${history}</ul></details>` : ""}
        </div>
      </article>`;
  }).join("");
}

function renderMedical(item) {
  $("#urology-card").innerHTML = `
    <div class="medical-title">
      <span>泌尿科</span>
      <h3>醫師追蹤建議</h3>
    </div>
    <dl class="medical-dates">
      <div><dt>上次回診</dt><dd>${escapeHtml(textValue(item?.last_visit, "尚未紀錄"))}</dd></div>
      <div><dt>下次追蹤</dt><dd>${escapeHtml(textValue(item?.next_visit, "尚未安排"))}</dd></div>
    </dl>
    <div class="recommendation">
      <span>醫師建議</span>
      <p>${escapeHtml(textValue(item?.recommendation, "等待泌尿科醫師評估後更新。"))}</p>
    </div>`;
}

function render(data) {
  const now = new Date();
  renderSchedule(currentMonthEvents(data.collaborations, now), now);
  renderMedications(data.medication_logs);
  renderFitness(data.fitness_logs);
  renderMedical(data.urology);
}

const dataNode = $("#site-data");
render(dataNode ? JSON.parse(dataNode.textContent) : {});
