/**
 * 智慧搜尋代理 - 前端模組
 *
 * 在使用者上傳檔案後，自動推斷最可能的目標格式
 * 並模擬使用者在搜尋欄輸入 token (prefix matching)
 *
 * UI 行為完全等同真人輸入
 */

// @ts-check

/**
 * @typedef {Object} FormatPrediction
 * @property {string} search_token - 預測的搜尋 token (用於 prefix matching)
 * @property {number} confidence - 預測信心度 (0-1)
 * @property {Array<{token: string, score: number}>} top_k - Top-K 候選 token
 * @property {string[]} reason_codes - 預測原因碼
 */

/**
 * @typedef {Object} EnginePrediction
 * @property {string} engine - 預測的引擎名稱
 * @property {number} confidence - 預測信心度 (0-1)
 * @property {boolean} should_warmup - 是否應該預調用
 * @property {number} cold_start_cost - 預估冷啟動成本 (毫秒)
 * @property {string} reason - 預測原因
 */

/**
 * @typedef {Object} InferenceResult
 * @property {FormatPrediction|null} format - 格式推斷結果
 * @property {EnginePrediction|null} engine - 引擎推斷結果
 * @property {boolean} should_auto_fill - 是否應自動填入
 */

// 取得 webroot
const inferenceWebrootMeta = document.querySelector("meta[name='webroot']");
const inferenceWebroot = inferenceWebrootMeta
  ? inferenceWebrootMeta.getAttribute("content") || ""
  : "";

// 狀態追蹤
let inferenceEnabled = true;
/** @type {string|null} */
let lastInferredToken = null;
/** @type {string|null} */
let lastInferredEngine = null;
let isInferredValue = false;

/**
 * 請求格式推斷
 * @param {string} ext - 檔案副檔名
 * @param {number} [fileSizeKb] - 檔案大小 (KB)
 * @returns {Promise<InferenceResult|null>}
 */
async function requestFormatInference(ext, fileSizeKb) {
  if (!inferenceEnabled) {
    return null;
  }

  try {
    const response = await fetch(`${inferenceWebroot}/inference/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ext: ext,
        file_size_kb: fileSizeKb,
      }),
    });

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    }

    return null;
  } catch (error) {
    console.warn("Format inference request failed:", error);
    return null;
  }
}

/**
 * 記錄推薦被拒絕
 * @param {string} inputExt - 輸入副檔名
 * @param {string} dismissedFormat - 被拒絕的格式
 * @param {string} [dismissedEngine] - 被拒絕的引擎
 */
async function logDismissEvent(inputExt, dismissedFormat, dismissedEngine) {
  try {
    await fetch(`${inferenceWebroot}/inference/dismiss`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_ext: inputExt,
        dismissed_format: dismissedFormat,
        dismissed_engine: dismissedEngine,
      }),
    });
  } catch (error) {
    console.warn("Failed to log dismiss event:", error);
  }
}

/**
 * 取消預調用
 */
async function cancelWarmup() {
  try {
    await fetch(`${inferenceWebroot}/inference/cancel-warmup`, {
      method: "POST",
    });
  } catch (error) {
    console.warn("Failed to cancel warmup:", error);
  }
}

/**
 * 自動填入推斷的格式
 * UI 行為完全等同使用者手動輸入
 * @param {string} token - 推斷的 search token
 * @param {string} [engine] - 推斷的引擎
 */
function autoFillInferredFormat(token, engine) {
  /** @type {HTMLInputElement|null} */
  const searchInput = document.querySelector("input[name='convert_to_search']");
  const convertToPopup = document.querySelector(".convert_to_popup");

  if (!searchInput || !convertToPopup) {
    console.warn("Search input or popup not found");
    return;
  }

  // 儲存推斷值
  lastInferredToken = token;
  lastInferredEngine = engine || null;
  isInferredValue = true;

  // 填入搜尋欄 - UI 行為完全等同使用者輸入
  searchInput.value = token;

  // 觸發 input 事件以過濾結果
  const inputEvent = new Event("input", { bubbles: true });
  searchInput.dispatchEvent(inputEvent);

  // 不修改任何 UI 樣式 - 純粹模擬使用者輸入

  console.log(`🎯 Auto-filled search token: ${token}${engine ? ` (engine: ${engine})` : ""}`);
}

/**
 * 處理搜尋欄清除事件 (使用者點擊 X)
 * @param {string} inputExt - 輸入副檔名
 */
function handleSearchClear(inputExt) {
  if (isInferredValue && lastInferredToken) {
    // 記錄為負樣本
    logDismissEvent(inputExt, lastInferredToken, lastInferredEngine || undefined);

    // 取消預調用
    cancelWarmup();

    console.log(`❌ User dismissed inference: ${lastInferredToken}`);
  }

  // 重置狀態
  isInferredValue = false;
  lastInferredToken = null;
  lastInferredEngine = null;
}

/**
 * 處理使用者手動輸入
 */
function handleManualInput() {
  if (isInferredValue) {
    // 使用者手動修改，取消預調用
    cancelWarmup();
    isInferredValue = false;
  }
}

/**
 * 初始化推斷模組
 * 需要在頁面載入後呼叫
 */
function initInferenceModule() {
  // 監聽搜尋欄的 search 事件 (當使用者點擊 X 時觸發)
  /** @type {HTMLInputElement|null} */
  const searchInput = document.querySelector("input[name='convert_to_search']");

  if (searchInput) {
    // 監聯清除事件
    searchInput.addEventListener("search", () => {
      // @ts-expect-error - fileType is set by script.js
      const fileType = window.fileType || "";
      handleSearchClear(fileType);
    });

    // 監聽手動輸入
    searchInput.addEventListener("input", (e) => {
      // 如果是程式設定的值，不處理
      if (e.isTrusted && isInferredValue) {
        const currentValue = searchInput.value;
        if (currentValue !== lastInferredToken) {
          handleManualInput();
        }
      }
    });
  }

  console.log("✅ Inference module initialized");
}

/**
 * 啟用/停用推斷功能
 * @param {boolean} enabled
 */
function setInferenceEnabled(enabled) {
  inferenceEnabled = enabled;
  console.log(`Inference ${enabled ? "enabled" : "disabled"}`);
}

// 導出到全域
// @ts-expect-error - Define on window object
window.inferenceModule = {
  requestFormatInference,
  autoFillInferredFormat,
  handleSearchClear,
  handleManualInput,
  setInferenceEnabled,
  initInferenceModule,
  logDismissEvent,
  cancelWarmup,
};

// 頁面載入後初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInferenceModule);
} else {
  initInferenceModule();
}
