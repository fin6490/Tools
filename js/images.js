// images.js — manage per-slice images. Uploads are downscaled and stored
// as data URLs on the active wheel (localStorage), so nothing leaves the browser.
const MAX_DIM = 160; // px; keeps localStorage small

// Read a File, shrink its longest side to MAX_DIM, return a PNG data URL.
function downscale(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function initImages(root, { getLabels, getMap, persist, onChange, toast }) {
  const modal = root.querySelector("#imagesModal");
  const list = root.querySelector("#imagesList");
  const fileInput = root.querySelector("#sliceImageFile");
  let pendingLabel = null;

  function open() { render(); modal.hidden = false; }
  function close() { modal.hidden = true; }

  root.querySelector("#imagesBtn").addEventListener("click", open);
  root.querySelector("#imagesClose").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  function uniqueLabels() {
    const seen = new Set();
    return getLabels().filter((l) => (seen.has(l) ? false : seen.add(l)));
  }

  function render() {
    const labels = uniqueLabels();
    const map = getMap();
    list.innerHTML = "";
    if (!labels.length) {
      list.innerHTML = '<p class="muted">Add some names first, then come back to give them images.</p>';
      return;
    }
    labels.forEach((label) => {
      const row = document.createElement("div");
      row.className = "image-row";

      const thumb = document.createElement("div");
      thumb.className = "image-thumb";
      if (map[label]) {
        const im = document.createElement("img");
        im.src = map[label];
        im.alt = "";
        thumb.appendChild(im);
      } else {
        thumb.textContent = "🖼";
      }

      const name = document.createElement("span");
      name.className = "image-name";
      name.textContent = label;

      const upload = document.createElement("button");
      upload.className = "mini-btn";
      upload.textContent = map[label] ? "Replace" : "Upload";
      upload.addEventListener("click", () => { pendingLabel = label; fileInput.click(); });

      const remove = document.createElement("button");
      remove.className = "mini-btn";
      remove.textContent = "✕";
      remove.title = "Remove image";
      remove.disabled = !map[label];
      remove.addEventListener("click", () => {
        delete getMap()[label];
        persist(); onChange(); render();
      });

      row.append(thumb, name, upload, remove);
      list.appendChild(row);
    });
  }

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    fileInput.value = "";
    if (!file || !pendingLabel) return;
    try {
      const dataURL = await downscale(file);
      getMap()[pendingLabel] = dataURL;
      persist();
      onChange();
      render();
    } catch {
      toast && toast("Couldn't read that image");
    }
    pendingLabel = null;
  });

  return { open, close };
}
