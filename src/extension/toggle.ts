import { AUTO_UPLOAD_STORAGE_KEY } from "../storage";

(async () => {
  const toggle = document.getElementById("auto-upload") as HTMLInputElement;
  const { [AUTO_UPLOAD_STORAGE_KEY]: value } = await chrome.storage.local.get(
    AUTO_UPLOAD_STORAGE_KEY,
  );
  console.log({ value });
  toggle.checked = value;
  toggle.addEventListener("change", async (event) => {
    await chrome.storage.local.set({
      [AUTO_UPLOAD_STORAGE_KEY]: (event.currentTarget as HTMLInputElement)
        .checked,
    });
  });
})();
