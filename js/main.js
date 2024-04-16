// Declaring global variables and initializing cache variable
const APIKEY = `43140036-c2a0713736f73926e60741462`;
const BASEURL = `https://pixabay.com/api/`;
let cacheName = "saveImages";
let cacheRef = null;

//MediaPipe face detection
import {
  FaceDetector,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
let faceDetector = null;

let url = new URL(BASEURL);
url.searchParams.append(`key`, APIKEY);
url.searchParams.append(`image_type`, `photo`);
url.searchParams.append(`orientation`, `horizontal`);
url.searchParams.append(`category`, `people`);
url.searchParams.append(`order`, `popular`);
url.searchParams.append(`per_page`, `30`);

// Finding elements on the page
let dialog = document.querySelector("dialog");
let results = document.querySelector("#results");
let savedResults = document.getElementById("savedResults");
let formContainer = document.querySelector(".form-container");
let message = document.querySelector(".message");
let isDelete = false;
let isSave = false;

// Function that runs after DOMContentLoaded
function init() {
  addListeners();
  history.replaceState(null, null, "#");
  openCache();
  initializeFaceDetector();
}

// Open Cache
async function openCache() {
  return (cacheRef = await caches.open(cacheName));
}

function addListeners() {
  // Add event listeners for various interactions
  document.getElementById("btnRunSearch").addEventListener("click", runSearch);

  results.addEventListener("click", showPickedImage);
  savedResults.addEventListener("click", showPickedImage);
  // document.querySelector("dialog").addEventListener("click", handleDetection);

  let savedButton = document.getElementById("btnSaved");
  if (savedButton.dataset.listener == "true") {
    savedButton.addEventListener("click", showSavedImages);
    savedButton.dataset.listener = "false";
  }

  let searchPageButton = document.getElementById("btnSearch");
  searchPageButton.addEventListener("click", showSearchForm);

  window.addEventListener("popstate", popIn);
  document.querySelector("nav").addEventListener("click", handleNavClick);
}

function showSearchForm() {
  message.innerHTML = "";
  formContainer.classList.remove("hidden");
}

function handleNavClick(ev) {
  ev.preventDefault();
  let url = ev.target.closest("button").getAttribute("data-url");
  updateActiveButton(url);
  history.pushState(url, null, url);
  loadContent(url);
}

function loadContent(url) {
  if (url === "#search") {
    savedResults.innerHTML = "";
    showSearchForm();
    runSearch();
  } else if (url === "#saved") {
    results.innerHTML = "";
    savedResults.innerHTML = "";
    message.innerHTML = "";
    showSavedImages();
  } else {
    results.innerHTML = `Nothing is found`;
  }
}

function popIn(ev) {
  console.log(ev.state);
  if (ev.state) {
    updateActiveButton(ev.state);
    loadContent(ev.state);
  }
}

function updateActiveButton(url) {
  let buttons = document.querySelectorAll("nav button");
  buttons.forEach((button) => {
    button.classList.remove("active");
  });

  let activeButton = document.querySelector(`nav button[data-url="${url}"]`);
  if (activeButton) {
    activeButton.classList.add("active");
  }
}

// Search Functionality:

function runSearch() {
  results.innerHTML = "";
  // ev.preventDefault();
  let userInput = document.getElementById("keyword");
  let keyword = userInput.value;

  if (!keyword) {
    results.innerHTML = `
    <h3>Enter the key term</h3>`;
  } else {
    url.searchParams.append(`q`, keyword); //search query
    console.log(url.searchParams.toString());
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Fetch error", response.statusText);
        return response.json();
      })
      .then((data) => {
        console.log(data);
        displaySearchResults(data);
      })
      .catch((err) => {
        console.log(err.message);
      });
  }
}

function displaySearchResults(data) {
  isDelete = false;
  isSave = true;
  results.className = "search-results";
  let h2 = document.createElement("h2");
  h2.textContent = "Search results";
  results.append(h2);
  // Create a document fragment to store the generated HTML
  let fragment = document.createDocumentFragment();

  if (data.hits.length === 0) {
    results.innerHTML =
      "<h3>There are no search results for this key term</h3>";
    return;
  }

  // Iterate through the data.hits array and generate HTML for each result
  data.hits.forEach(
    ({ previewURL, id, tags, previewWidth, previewHeight, largeImageURL }) => {
      let card = document.createElement("button");
      card.classList.add("card");
      card.setAttribute("data-ref", id);
      card.setAttribute("data-full", largeImageURL);
      card.ariaLabel = `Photo of ${tags}. Click to open dialog window`;
      let img = document.createElement("img");
      img.src = previewURL;
      img.alt = `${tags} photo`;
      img.width = previewWidth;
      img.height = previewHeight;

      card.appendChild(img);
      fragment.appendChild(card);
    }
  );

  // Clear the existing content and append the document fragment
  results.appendChild(fragment);
}

// Image Display and Dialog Handling:

function showPickedImage(ev) {
  //once user click on an image handle here
  ev.preventDefault();
  let pickedImage = ev.target.closest(".card").getAttribute("data-ref");
  console.log(pickedImage);
  let urlPickedImage = new URL(url);
  urlPickedImage.searchParams.append("id", pickedImage);
  fetch(urlPickedImage)
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
      let imagesData = data.hits.map((item) => {
        return {
          url: item.largeImageURL,
          alt: `Photo with ${item.tags}`,
          id: item.id,
        };
      });
      console.log(imagesData);
      displayDialog(imagesData);
    })
    .catch((err) => {
      console.log(err);
    });
}

//   Function that opens dialog window with chosen image

function displayDialog(imagesData) {
  imagesData.forEach((item) => {
    fetch(item.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.blob();
      })
      .then((blob) => {
        let imgUrl = URL.createObjectURL(blob);
        dialog.innerHTML = `
        <div class=detectImage>
        <img src="${imgUrl}" alt="${item.alt}" data-full="${
          item.url
        }" data-ref="${item.id}"/>
        </div>
        <div class='buttons'>
        <button id="close" class="btn" aria-label="Click to close dialog">Close</button>
        <button aria-label="Click to detect faces on image" id="detect" class="btn ${
          isSave ? "hidden" : ""
        }">Find Face</button>
        <button aria-label="Click to delete image" id="delete" class="btn  ${
          isSave ? "hidden" : ""
        }">Delete</button>
        <button aria-label="Click to save image" id ="save" class="btn  ${
          isDelete ? "hidden" : ""
        }">Save</button>
        </div>
        <p tabindex="0" class=detectionMessage></p>`;
        dialog.showModal();

        // Adding event listener to created button "close"
        let closeButton = document.getElementById("close");
        closeButton.addEventListener("click", closeDialog);

        // Function that closes dialog window
        function closeDialog(ev) {
          dialog.close();
        }

        // Adding event listener to detect face
        let detectFace = document.getElementById("detect");
        detectFace.addEventListener("click", handleDetection);

        // Adding event listener to created button "save"
        let saveButton = document.getElementById("save");
        saveButton.addEventListener("click", saveImage);

        // Function that save image to the cache

        function saveImage() {
          let urlInfoImage = new URL(url);
          urlInfoImage.searchParams.append("id", item.id);

          cacheRef
            .add(urlInfoImage)
            .then(() => {
              console.log("saved");
            })
            .catch((err) => {
              console.log(err);
            });
        }

        let deleteButton = document.getElementById("delete");
        deleteButton.addEventListener("click", deleteImage);

        function deleteImage() {
          let img = dialog.querySelector("img");
          let dataRef = img.getAttribute("data-ref");
          console.log(dataRef);

          cacheRef.keys().then((keys) => {
            keys.forEach((req) => {
              let url = new URL(req.url);
              if (url.searchParams.get("id") === dataRef) {
                cacheRef.delete(req).then(() => {
                  // After deleting the image from cache, display saved images again
                  showSavedImages();
                  // Close the modal
                  dialog.close();
                });
              }
            });
          });
        }
      });
  });
}

// Saved Images Functionality:
async function showSavedImages() {
  isDelete = true;
  isSave = false;
  formContainer.classList.add("hidden");
  results.innerHTML = "";
  savedResults.innerHTML = "";
  let h2 = document.createElement("h2");
  h2.textContent = "Saved Images";
  savedResults.append(h2);

  try {
    const keysArray = await cacheRef.keys();

    const promises = keysArray.map(async (req) => {
      const response = await cacheRef.match(req);
      if (response) {
        const data = await response.json();
        const df = new DocumentFragment();
        data.hits.forEach((item) => {
          const img = document.createElement("img");
          img.src = item.previewURL;
          img.alt = `${item.tags} photo`;

          const card = document.createElement("button");
          card.classList.add("card");
          card.setAttribute("data-ref", item.id);
          card.setAttribute("data-full", item.largeImageURL);
          card.ariaLabel = `Photo of ${item.tags}. Click to open dialog window`;
          card.appendChild(img);
          df.appendChild(card);
        });
        return df;
      }
    });

    const results = await Promise.allSettled(promises);
    let imagesFound = false;
    results.forEach((item) => {
      if (item.status === "fulfilled") {
        savedResults.appendChild(item.value);
        imagesFound = true;
      }
    });

    if (!imagesFound) {
      savedResults.innerHTML = `
        <h3>There are no saved images</h3>
      `;
    }
  } catch (err) {
    console.log(err);
  }
}

/* Section for image detecting API */

function handleDetection() {
  let img = document.querySelector("dialog img");
  console.log(img);
  const detections = faceDetector.detect(img);
  console.log(detections);

  if (detections.detections.length === 0) {
    let message = document.querySelector(".detectionMessage");
    message.innerHTML = "No faces are detected";
  } else {
    displayImageDetections(detections.detections, img);
  }
}

function displayImageDetections(detections, resultElement) {
  const ratio = resultElement.height / resultElement.naturalHeight;
  console.log(ratio);

  for (let detection of detections) {
    // Description text
    const p = document.createElement("p");
    p.setAttribute("class", "info");
    p.innerText =
      "Confidence: " +
      Math.round(parseFloat(detection.categories[0].score) * 100) +
      "% .";
    p.style =
      "left: " +
      detection.boundingBox.originX * ratio +
      "px;" +
      "top: " +
      (detection.boundingBox.originY * ratio - 30) +
      "px; " +
      "width: " +
      (detection.boundingBox.width * ratio - 10) +
      "px;" +
      "hight: " +
      20 +
      "px;";
    const highlighter = document.createElement("div");
    highlighter.setAttribute("class", "highlighter");
    highlighter.style =
      "left: " +
      detection.boundingBox.originX * ratio +
      "px;" +
      "top: " +
      detection.boundingBox.originY * ratio +
      "px;" +
      "width: " +
      detection.boundingBox.width * ratio +
      "px;" +
      "height: " +
      detection.boundingBox.height * ratio +
      "px;";

    resultElement.parentNode.appendChild(highlighter);
    resultElement.parentNode.appendChild(p);
    for (let keypoint of detection.keypoints) {
      const keypointEl = document.createElement("spam");
      keypointEl.className = "key-point";
      keypointEl.style.top = `${keypoint.y * resultElement.height - 3}px`;
      keypointEl.style.left = `${keypoint.x * resultElement.width - 3}px`;
      resultElement.parentNode.appendChild(keypointEl);
    }
  }
}

async function initializeFaceDetector() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
      scoreThreshold: 0.3,
      runningMode: "IMAGE",
    },
  });
}

window.addEventListener("DOMContentLoaded", init);
