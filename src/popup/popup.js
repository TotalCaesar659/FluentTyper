import { getDomain, isEnabledForDomain, blockUnBlockDomain } from "../utils.js";
import { Store } from "../third_party/fancier-settings/lib/store.js";
import { SUPPORTED_LANGUAGES } from "../lang.js";

const settings = new Store("settings");

function init() {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    async function (tabs) {
      if (tabs.length === 1) {
        const currentTab = tabs[0];
        const urlNode = document.getElementById("checkboxDomainLabel");
        const checkboxNode = document.getElementById("checkboxDomainInput");
        const checkboxEnableNode = document.getElementById(
          "checkboxEnableInput"
        );
        const domainURL = getDomain(currentTab.url);
        if (domainURL && domainURL !== "null") {
          const enabled = await isEnabledForDomain(settings, domainURL);

          checkboxNode.checked = enabled;
          urlNode.innerHTML = "<span>Enable autocomplete on:<br> " + domainURL;

          window.document
            .getElementById("checkboxDomainInput")
            .addEventListener(
              "click",
              addRemoveDomain.bind(null, currentTab.id, domainURL)
            );
        }

        checkboxEnableNode.checked = await settings.get("enable");
      }
      const language = await settings.get("language");
      const select = window.document.getElementById("languageSelect");
      for (const [langCode, lang] of Object.entries({
        ...{ auto_detect: "Auto detect" },
        ...SUPPORTED_LANGUAGES,
      })) {
        const opt = window.document.createElement("option");
        opt.value = langCode;
        opt.innerHTML = lang;
        select.appendChild(opt);
      }
      select.value = language;
    }
  );
  window.document
    .getElementById("checkboxEnableInput")
    .addEventListener("click", toggleOnOff);
  window.document
    .getElementById("languageSelect")
    .addEventListener("change", languageChangeEvent);
  document.getElementById("runOptions").onclick = function () {
    chrome.runtime.openOptionsPage();
  };
}

async function addRemoveDomain(tabId, domainURL) {
  const urlNode = document.getElementById("checkboxDomainLabel");
  const checkboxNode = document.getElementById("checkboxDomainInput");
  const message = {
    command: checkboxNode.checked ? "popupPageEnable" : "popupPageDisable",
    context: {},
  };

  urlNode.innerHTML = "<span>Enable autocomplete on: " + domainURL;

  blockUnBlockDomain(settings, domainURL, !checkboxNode.checked);

  chrome.tabs.sendMessage(tabId, message);
}

async function languageChangeEvent() {
  const select = window.document.getElementById("languageSelect");
  settings.set("language", select.value);
  const message = {
    command: "optionsPageConfigChange",
    context: {},
  };
  chrome.runtime.sendMessage(message);
}

async function toggleOnOff() {
  const newMode = !(await settings.get("enable"));
  settings.set("enable", newMode);

  chrome.tabs.query({}, function (tabs) {
    for (let i = 0; i < tabs.length; i++) {
      const message = {
        command: null,
        context: {},
      };

      if (newMode) {
        message.command = "popupPageEnable";
      } else {
        message.command = "popupPageDisable";
      }

      chrome.tabs.sendMessage(tabs[i].id, message);
    }
  });
}

window.document.addEventListener("DOMContentLoaded", function () {
  init();
});
