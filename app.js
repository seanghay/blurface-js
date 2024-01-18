let containerScale = 1
let currentStage = null;
let currentSceneWidth = null;
let currentSceneHeight = null;
let currentFile = null;

await faceapi.nets.ssdMobilenetv1.load("/");

const $toggleVisibility = document.getElementById("toggle-visibility");
const $download = document.getElementById("download")
const $file = document.querySelector("#file");
const $msgWelcome = document.querySelector("#welcome-msg");
const $msgInfo = document.querySelector("#info-msg");

window.addEventListener('dragover', dragOverHandler);
window.addEventListener('drop', dropHandler);

function dragOverHandler(ev) {
  ev.preventDefault();
}

function dropHandler(ev) {
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    [...ev.dataTransfer.items].forEach((item, i) => {
      if (item.kind === "file") {
        const file = item.getAsFile();
        loadFile(file);
      }
    });
  } else {
    loadFile(ev.dataTransfer.files[0]);

  }
}

$file.addEventListener("change", async e => {
  const file = e.target.files[0]
  if (!file) return;
  await loadFile(file);
})


async function loadFile(file) {
  currentFile = file;
  const dataURL = await createDataURLFromFile(file);
  const image = await loadImage(dataURL);
  renderImage(image)
}


async function createDataURLFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image;
    image.crossOrigin = '';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}


async function renderImage(image) {
  const sceneWidth = image.width;
  const sceneHeight = image.height;

  const stage = new Konva.Stage({
    container: 'imageviewer',
    width: sceneWidth,
    height: sceneHeight,
  });

  currentStage = stage
  currentSceneWidth = sceneWidth;
  currentSceneHeight = sceneHeight;

  const layer = new Konva.Layer();
  stage.add(layer);

  const img = new Konva.Image({
    x: 0,
    y: 0,
    image,
    width: stage.width(),
    height: stage.height(),
  });

  layer.add(img);
  fitStageIntoParentContainer();

  // render
  setTimeout(async () => {
    processImage(image, layer);
    $download.classList.remove("hidden")
    $msgInfo.classList.remove("hidden")
  })

  $toggleVisibility.classList.add("hidden");  
  $msgWelcome.classList.add("hidden")
}

async function processImage(image, layer) {
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 })
  const results = await faceapi.detectAllFaces(image, options);

  const rects = [];
  for (const result of results) {
    const box = result.box;
    const rect = new Konva.Image({
      x: box.x,
      y: box.y + box.height * 0.1,
      pixelSize: Math.ceil(box.height * 0.2),
      width: box.width,
      height: box.height / 2,
      image: image,
      crop: {
        x: box.x,
        y: box.y + box.height * 0.1,
        width: box.width,
        height: box.height / 2,
      }
    });

    function toggle() {
      if (this.opacity()) this.opacity(0);
      else this.opacity(1);
    }

    rect.on('mouseup', toggle);
    rect.on('touchend', toggle);

    rect.cache();
    rect.filters([Konva.Filters.Pixelate]);
    layer.add(rect);
    rects.push(rect);
  }

  $toggleVisibility.classList.remove("hidden");
  let isVisible = true;

  $toggleVisibility.onclick = () => {
    for (const rect of rects) {
      if (isVisible) {
        rect.opacity(0);
      } else {
        rect.opacity(1);
      }
    }
    isVisible = !isVisible;
  }
}


function fitStageIntoParentContainer() {
  const stage = currentStage;
  if (stage == null) return;

  const sceneHeight = currentSceneHeight;
  const sceneWidth = currentSceneWidth;

  const container = document.querySelector('#stage-parent');
  const containerWidth = container.offsetWidth;
  const scale = containerWidth / sceneWidth;
  stage.width(sceneWidth * scale);
  stage.height(sceneHeight * scale);
  stage.scale({ x: scale, y: scale });
  containerScale = scale
}

window.addEventListener('resize', fitStageIntoParentContainer);
$download.addEventListener("click", () => {
  if (currentStage == null) return;
  const dataURL = currentStage.toDataURL({ pixelRatio: 1 / containerScale, mimeType: "image/jpeg" });

  const name = currentFile == null ? "image.jpg" :
    currentFile.name.toLowerCase().endsWith(".jpg") || currentFile.name.toLowerCase().endsWith(".jpeg")
      ? currentFile.name :
      currentFile.name + ".jpg";

  downloadURI(dataURL, "censored-" + name);

})

function downloadURI(uri, name) {
  const link = document.createElement('a');
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}