const DEFAULT_NAVIGATION_TARGET =
  "com.theporter.android.driverapp.ui.notification_center.SelfHandledNotificationCenterActivity";

const DEFAULT_STATE = {
  preview: {
    senderName: "Porter Partner",
    appName: "Porter Partner",
    iconText: "PP",
    accentColor: "#c9ddb8",
    statusBarTime: "2:25",
    deviceDate: "Sat, Apr 25",
    receivedAgo: "now",
    sectionLabel: "General",
    inboxTime: "2:23 PM",
    unread: true
  },
  payload: {
    campaign_name: "",
    users: [
      {
        id: "{{UserAttribute['ID']}}",
        app: "DriverAppAndroid"
      }
    ],
    template: {
      template_type: "message",
      title: "",
      message: "",
      cta_buttons: []
    }
  }
};

const state = {
  viewMode: "tray",
  isInboxNotif: null,
  showImageInInbox: false,
  imageSourceMode: "url",
  imageUrl: "",
  imageObjectUrl: "",
  groupKey: "",
  expiry: "",
  preview: deepClone(DEFAULT_STATE.preview),
  payload: deepClone(DEFAULT_STATE.payload)
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("payload-form").addEventListener("submit", (event) => {
    event.preventDefault();
  });

  bindContentInputs();
  bindViewToggle();
  bindUtilityButtons();
  syncPreviewClock();
  window.setInterval(() => {
    syncPreviewClock();
    renderEverything({ skipControlSync: true });
  }, 30000);
  renderEverything();
});

function bindContentInputs() {
  document.querySelectorAll('input[name="delivery-mode"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      state.isInboxNotif = event.target.value === "inbox";
      renderEverything({ skipControlSync: true });
    });
  });

  document.getElementById("content-campaign-name").addEventListener("input", (event) => {
    state.payload.campaign_name = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-title").addEventListener("input", (event) => {
    state.payload.template.title = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-message").addEventListener("input", (event) => {
    state.payload.template.message = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-group-key").addEventListener("change", (event) => {
    state.groupKey = event.target.value;
    state.preview.sectionLabel = getGroupKeyLabel();
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-expiry").addEventListener("change", (event) => {
    state.expiry = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("include-primary-cta").addEventListener("change", (event) => {
    if (event.target.checked) {
      ensurePrimaryCta();
    } else {
      state.payload.template.cta_buttons = [];
      document.getElementById("include-second-cta").checked = false;
    }
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-cta-primary").addEventListener("input", (event) => {
    ensurePrimaryCta().content = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-cta-primary-type").addEventListener("change", (event) => {
    ensurePrimaryCta().button_action.button_action_type = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-cta-primary-link").addEventListener("input", (event) => {
    ensurePrimaryCta().button_action.link = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("include-second-cta").addEventListener("change", (event) => {
    if (event.target.checked) {
      ensureSecondaryCta();
    } else {
      state.payload.template.cta_buttons = getPrimaryCta() ? [getPrimaryCta()] : [];
    }
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-cta-secondary").addEventListener("input", (event) => {
    ensureSecondaryCta().content = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-cta-secondary-type").addEventListener("change", (event) => {
    ensureSecondaryCta().button_action.button_action_type = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-cta-secondary-link").addEventListener("input", (event) => {
    ensureSecondaryCta().button_action.link = event.target.value;
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("include-image").addEventListener("change", (event) => {
    state.showImageInInbox = event.target.checked;
    renderEverything({ skipControlSync: true });
  });

  document.querySelectorAll('input[name="image-source-mode"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      state.imageSourceMode = event.target.value;
      renderEverything({ skipControlSync: true });
    });
  });

  document.getElementById("content-image-url").addEventListener("input", (event) => {
    state.imageUrl = event.target.value.trim();
    if (state.imageUrl) {
      showStatus("Image URL added. Export will use the image template when the URL is valid.");
    }
    renderEverything({ skipControlSync: true });
  });

  document.getElementById("content-image").addEventListener("change", (event) => {
    const [file] = event.target.files || [];

    if (state.imageObjectUrl) {
      URL.revokeObjectURL(state.imageObjectUrl);
      state.imageObjectUrl = "";
    }

    if (!file) {
      showStatus("Image cleared from preview.");
      renderEverything({ skipControlSync: true });
      return;
    }

    state.imageObjectUrl = URL.createObjectURL(file);
    showStatus("Image attached for preview only. Use Image URL to export an image template.");
    renderEverything({ skipControlSync: true });
  });
}

function bindUtilityButtons() {
  document.getElementById("error-dialog-close").addEventListener("click", closeErrorDialog);
  document.getElementById("error-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeErrorDialog();
  });

  document.getElementById("copy-json-btn").addEventListener("click", async () => {
    const exportPayload = prepareExportPayload();
    if (!exportPayload) {
      return;
    }

    const payloadText = JSON.stringify(exportPayload, null, 2);

    try {
      await navigator.clipboard.writeText(payloadText);
      showStatus(getExportSuccessMessage("copied"));
      showCopySuccess();
    } catch (error) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = payloadText;
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          showStatus(getExportSuccessMessage("copied") + " (using fallback)");
          showCopySuccess();
        } else {
          showStatus("Clipboard access failed.", true);
        }
      } catch (fallbackError) {
        showStatus("Clipboard access is blocked here.", true);
      }
    }
  });

}

function bindViewToggle() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.viewMode = button.dataset.view;
      renderEverything({ skipControlSync: true });
    });
  });
}

function renderEverything(options = {}) {
  if (!options.skipControlSync) {
    syncControlsFromPayload();
  }
  renderEditorState();
  renderViewToggle();
  renderTrayPreview();
  renderInboxPreview();
}

function syncControlsFromPayload() {
  document.getElementById("delivery-tray").checked = state.isInboxNotif === false;
  document.getElementById("delivery-inbox").checked = state.isInboxNotif === true;
  document.getElementById("content-campaign-name").value = state.payload.campaign_name || "";
  document.getElementById("content-title").value = state.payload.template.title || "";
  document.getElementById("content-message").value = state.payload.template.message || "";
  document.getElementById("content-group-key").value = state.groupKey || "";
  document.getElementById("include-primary-cta").checked = getPrimaryCta() != null;
  document.getElementById("content-cta-primary").value = getPrimaryCta()?.content || "";
  document.getElementById("content-cta-primary-type").value = normalizeActionType(getPrimaryCta()?.button_action.button_action_type);
  document.getElementById("content-cta-primary-link").value = getPrimaryCta()?.button_action.link || "";
  document.getElementById("include-second-cta").checked = getSecondaryCta() != null;
  document.getElementById("content-cta-secondary").value = getSecondaryCta()?.content || "";
  document.getElementById("content-cta-secondary-type").value = normalizeActionType(getSecondaryCta()?.button_action.button_action_type);
  document.getElementById("content-cta-secondary-link").value = getSecondaryCta()?.button_action.link || "";
  document.getElementById("include-image").checked = state.showImageInInbox;
  document.getElementById("image-source-url").checked = state.imageSourceMode === "url";
  document.getElementById("image-source-file").checked = state.imageSourceMode === "file";
  document.getElementById("content-image-url").value = state.imageUrl;
  document.getElementById("content-expiry").value = state.expiry;
}

function renderTrayPreview() {
  const { preview, payload } = state;
  const title = payload.template.title;
  const message = payload.template.message;

  setText("tray-status-time", preview.statusBarTime);
  setText("tray-status-date", preview.deviceDate);
  setText("tray-sender-name", preview.senderName);
  setText("tray-received-ago", preview.receivedAgo);
  setText("tray-title-preview", title);
  setText("tray-message-preview", message);

  document.documentElement.style.setProperty("--accent", preview.accentColor);
  document.documentElement.style.setProperty("--accent-rgb", hexToRgb(preview.accentColor));

  const appIcon = document.getElementById("tray-app-icon-image");
  if (appIcon) {
    appIcon.src = "./assets/porter-app-icon.png";
  }
  const cardIcon = document.getElementById("tray-card-icon-image");
  if (cardIcon) {
    cardIcon.src = "./assets/porter-app-icon.png";
  }
}

function renderInboxPreview() {
  const { preview, payload } = state;
  const title = payload.template.title;
  const message = payload.template.message;
  const groupKey = getGroupKeyLabel();
  const primaryCta = getPrimaryCta();
  const secondaryCta = getSecondaryCta();
  const renderableCtas = [primaryCta, secondaryCta].filter((button) => Boolean((button?.content || "").trim()));

  setText("inbox-status-time", preview.statusBarTime);
  setText("section-tab", groupKey);
  setText("inbox-group-label", groupKey);
  setText("inbox-card-time", preview.inboxTime);
  setText("inbox-title-preview", title);
  setText("inbox-message-preview", message);
  setText("inbox-cta-primary-preview", renderableCtas[0]?.content || "");
  setText("inbox-cta-secondary-preview", renderableCtas[1]?.content || "");
  renderInboxCtas(renderableCtas.length);
  renderInboxImage();
}

function renderViewToggle() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.viewMode);
  });

  document.querySelector(".device--tray").classList.toggle("is-hidden", state.viewMode !== "tray");
  document.querySelector(".device--inbox").classList.toggle("is-hidden", state.viewMode !== "inbox");
}

function showCopySuccess() {
  const toast = document.getElementById("copy-toast");
  if (!toast) return;
  toast.classList.remove("is-hidden");
  toast.classList.add("is-visible");
  clearTimeout(showCopySuccess._timer);
  showCopySuccess._timer = setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.classList.add("is-hidden");
  }, 3000);
}

function showStatus(message, isError = false) {
  if (isError && message) {
    showErrorDialog(message);
    return;
  }
  const status = document.getElementById("payload-status");
  if (!status) return;
  status.textContent = message;
}

function showErrorDialog(message) {
  const overlay = document.getElementById("error-overlay");
  const msg = document.getElementById("error-dialog-msg");
  if (!overlay || !msg) return;
  msg.textContent = message;
  overlay.classList.remove("is-hidden");
}

function closeErrorDialog() {
  const overlay = document.getElementById("error-overlay");
  if (overlay) overlay.classList.add("is-hidden");
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value ?? "";
  }
}

function renderEditorState() {
  const trayOption = document.getElementById("delivery-tray-option");
  const inboxOption = document.getElementById("delivery-inbox-option");
  const primaryFields = document.getElementById("primary-cta-fields");
  const imageField = document.getElementById("image-upload-field");
  const secondaryFields = document.getElementById("secondary-cta-fields");
  const imageUrlField = document.getElementById("image-url-field");
  const imageFileField = document.getElementById("image-file-field");
  const urlOption = document.getElementById("image-source-url-option");
  const fileOption = document.getElementById("image-source-file-option");

  if (trayOption) {
    trayOption.classList.toggle("is-active", state.isInboxNotif === false);
  }

  if (inboxOption) {
    inboxOption.classList.toggle("is-active", state.isInboxNotif === true);
  }

  if (primaryFields) {
    primaryFields.classList.toggle("is-hidden", getPrimaryCta() == null);
  }

  if (imageField) {
    imageField.classList.toggle("is-hidden", !state.showImageInInbox);
  }

  if (secondaryFields) {
    secondaryFields.classList.toggle("is-hidden", getPrimaryCta() == null || getSecondaryCta() == null);
  }

  if (imageUrlField) {
    imageUrlField.classList.toggle("is-hidden", state.imageSourceMode !== "url");
  }

  if (imageFileField) {
    imageFileField.classList.toggle("is-hidden", state.imageSourceMode !== "file");
  }

  if (urlOption) {
    urlOption.classList.toggle("is-active", state.imageSourceMode === "url");
  }

  if (fileOption) {
    fileOption.classList.toggle("is-active", state.imageSourceMode === "file");
  }
}

function renderInboxImage() {
  const image = document.getElementById("inbox-image-preview");
  const emptyState = document.getElementById("inbox-image-empty");
  const container = document.getElementById("inbox-card-media");
  const imageSource = state.imageSourceMode === "file" ? state.imageObjectUrl : state.imageUrl;

  if (!image || !emptyState || !container) {
    return;
  }

  if (!state.showImageInInbox) {
    container.classList.add("is-hidden");
    return;
  }

  container.classList.remove("is-hidden");

  if (!imageSource) {
    image.removeAttribute("src");
    image.style.display = "none";
    emptyState.style.display = "grid";
    emptyState.textContent =
      state.imageSourceMode === "file"
        ? "Attach an image to preview a promotional inbox card."
        : "Add an image URL to preview a promotional inbox card.";
    container.classList.add("is-empty");
    return;
  }

  image.onload = () => {
    image.style.display = "block";
    emptyState.style.display = "none";
    container.classList.remove("is-empty");
  };

  image.onerror = () => {
    image.style.display = "none";
    emptyState.style.display = "grid";
    emptyState.textContent = "This image could not be loaded. Check the file or image URL and try again.";
    container.classList.add("is-empty");
  };

  image.src = imageSource;
  image.style.display = "none";
  emptyState.style.display = "grid";
  emptyState.textContent = "Loading image preview...";
  container.classList.remove("is-empty");
}

function renderInboxCtas(ctaCount) {
  const actions = document.getElementById("inbox-cta-actions");
  const primary = document.getElementById("inbox-cta-primary-preview");
  const secondary = document.getElementById("inbox-cta-secondary-preview");

  if (!actions || !primary || !secondary) {
    return;
  }

  actions.classList.toggle("is-hidden", ctaCount === 0);
  actions.classList.toggle("inbox-card__actions--single", ctaCount <= 1);
  primary.classList.toggle("is-hidden", ctaCount === 0);
  secondary.classList.toggle("is-hidden", ctaCount <= 1);
}

function getPrimaryCta() {
  return getCtaButtons()[0] || null;
}

function getSecondaryCta() {
  return getCtaButtons()[1] || null;
}

function ensurePrimaryCta() {
  const ctaButtons = getCtaButtons();

  if (!ctaButtons[0]) {
    ctaButtons[0] = createEmptyCta("Open App");
  }

  state.payload.template.cta_buttons = ctaButtons.filter(Boolean);
  return ctaButtons[0];
}

function ensureSecondaryCta() {
  const ctaButtons = getCtaButtons();

  if (!ctaButtons[0]) {
    ctaButtons[0] = createEmptyCta("Open App");
  }

  if (!ctaButtons[1]) {
    ctaButtons[1] = createEmptyCta("Secondary CTA");
  }

  state.payload.template.cta_buttons = ctaButtons.filter(Boolean);
  return ctaButtons[1];
}

function getCtaButtons() {
  if (!Array.isArray(state.payload.template.cta_buttons)) {
    state.payload.template.cta_buttons = [];
  }

  return [...state.payload.template.cta_buttons];
}

function createEmptyCta(label) {
  return {
    content: label,
    button_action: {
      button_action_type: "navigation",
      link: DEFAULT_NAVIGATION_TARGET
    }
  };
}

function syncPreviewClock() {
  const now = new Date();
  state.preview.statusBarTime = formatStatusBarTime(now);
  state.preview.deviceDate = formatDeviceDate(now);
  state.preview.inboxTime = formatInboxCardTime(now);
  state.preview.receivedAgo = formatTrayReceivedTime();
  state.preview.sectionLabel = getGroupKeyLabel();
}

function getGroupKeyLabel() {
  const rawValue = state.groupKey;
  return typeof rawValue === "string" ? rawValue.trim() : "";
}

function prepareExportPayload() {
  const validationError = getExportValidationError();

  if (validationError) {
    showStatus(validationError, true);
    return null;
  }

  return buildExportPayload();
}

function buildExportPayload() {
  const template = shouldUseImageTemplate() ? buildImageTemplate() : buildMessageTemplate();

  const payload = {
    campaign_name: getCampaignName(),
    users: deepClone(state.payload.users),
    category: getGroupKeyLabel(),
    is_inbox_notif: state.isInboxNotif,
    template
  };

  if (state.expiry) {
    payload.request_ttl = Math.floor(new Date(state.expiry).getTime() / 1000);
  }

  return payload;
}

function buildMessageTemplate() {
  const template = {
    template_type: "message",
    title: state.payload.template.title.trim(),
    message: state.payload.template.message.trim()
  };
  const ctaButtons = getExportCtaButtons();

  if (ctaButtons.length) {
    template.cta_buttons = ctaButtons;
  }

  return template;
}

function buildImageTemplate() {
  const template = {
    template_type: "image",
    title: state.payload.template.title.trim(),
    asset_link: state.imageUrl.trim()
  };
  const message = state.payload.template.message.trim();
  const ctaButtons = getExportCtaButtons();

  if (message) {
    template.message = message;
  }

  if (ctaButtons.length) {
    template.cta_buttons = ctaButtons;
  }

  return template;
}

function getExportCtaButtons() {
  return [getPrimaryCta(), getSecondaryCta()]
    .filter(Boolean)
    .map((button) => serializeCtaButton(button))
    .filter(Boolean);
}

function serializeCtaButton(button) {
  const content = (button.content || "").trim();
  const actionType = normalizeActionType(button.button_action?.button_action_type);
  const rawValue = (button.button_action?.link || "").trim();
  const actionValue =
    actionType === "navigation"
      ? rawValue || DEFAULT_NAVIGATION_TARGET
      : rawValue;

  if (!content) {
    return null;
  }

  const serializedButton = { content };

  if (actionValue) {
    serializedButton.button_action = {
      button_action_type: actionType,
      link: actionValue
    };
  }

  return serializedButton;
}

function getExportValidationError() {
  if (state.isInboxNotif === null) {
    return "Please select a delivery target.";
  }

  if (!getGroupKeyLabel()) {
    return "Please select a group key category.";
  }

  if ((state.payload.campaign_name || "").trim().length < 5) {
    return "Campaign name must be at least 5 characters.";
  }

  if (!state.payload.template.title.trim()) {
    return "Title is required.";
  }

  if (!shouldUseImageTemplate() && !state.payload.template.message.trim()) {
    return "Message is required for a message template.";
  }

  if (state.showImageInInbox && state.imageSourceMode === "url" && state.imageUrl && !isValidUrl(state.imageUrl)) {
    return "Use a valid image URL to export an image template.";
  }

  const ctaError = getCtaValidationError();
  if (ctaError) {
    return ctaError;
  }

  return "";
}

function getCtaValidationError() {
  const buttons = [
    { label: "Primary CTA", button: getPrimaryCta() },
    { label: "Secondary CTA", button: getSecondaryCta() }
  ];

  for (const item of buttons) {
    if (!item.button) {
      continue;
    }

    const content = (item.button.content || "").trim();
    const link = (item.button.button_action?.link || "").trim();
    const actionType = normalizeActionType(item.button.button_action?.button_action_type);

    if (!content || actionType !== "web_link") {
      continue;
    }

    if (!link || !isValidUrl(link)) {
      return `${item.label} needs a valid web link URL.`;
    }
  }

  return "";
}

function getCampaignName() {
  const campaignName = (state.payload.campaign_name || "").trim();
  if (!campaignName) return "";
  return `${campaignName} - {{UserAttribute['Campaign Name']}}`;
}

function shouldUseImageTemplate() {
  return state.showImageInInbox && state.imageSourceMode === "url" && isValidUrl(state.imageUrl);
}

function getExportSuccessMessage(action) {
  const baseMessage =
    action === "copied" ? "Final JSON copied to clipboard." : "Final JSON download started.";

  if (state.showImageInInbox && state.imageSourceMode === "file") {
    return `${baseMessage} Attached image stayed preview-only, so export used the message template.`;
  }

  return baseMessage;
}

function normalizeActionType(actionType) {
  if (actionType === "web_link" || actionType === "url") {
    return "web_link";
  }

  if (actionType === "deep_link") {
    return "deep_link";
  }

  return "navigation";
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function formatStatusBarTime(date) {
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatInboxCardTime(date) {
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = date.getHours() >= 12 ? "PM" : "AM";
  return `${hours}:${minutes} ${meridiem}`;
}

function formatTrayReceivedTime() {
  return "now";
}

function formatDeviceDate(date) {
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const month = date.toLocaleDateString(undefined, { month: "short" });
  return `${weekday}, ${month} ${date.getDate()}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hexToRgb(hex) {
  const safeHex = normalizeHex(hex);
  const red = parseInt(safeHex.slice(1, 3), 16);
  const green = parseInt(safeHex.slice(3, 5), 16);
  const blue = parseInt(safeHex.slice(5, 7), 16);
  return `${red}, ${green}, ${blue}`;
}

function normalizeHex(hex) {
  if (typeof hex !== "string") {
    return "#c9ddb8";
  }

  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return hex;
  }

  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  return "#c9ddb8";
}
