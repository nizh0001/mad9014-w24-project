// Declaring global variables and initializing cache variable

const APIKEY = `43140036-c2a0713736f73926e60741462`;
const BASEURL = `https://pixabay.com/api/`;
let cacheName = "saveImages";
let cacheRef = null;
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

//MediaPipe face detection

import {
  FaceDetector,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
let faceDetector = null;

// Function that runs after DOMContentLoaded

function init() {
  addListeners();
  history.replaceState(null, null, "#");
  openCache();
  initializeFaceDetector();
}

// Function tha opens cache

async function openCache() {
  return (cacheRef = await caches.open(cacheName));
}

function addListeners() {
  // Add event listeners for various interactions
  document.getElementById("btnRunSearch").addEventListener("click", runSearch);

  results.addEventListener("click", showPickedImage);
  savedResults.addEventListener("click", showPickedImage);

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

// Below are all the functions that run after events are fired:

//Displaying search form after navigation to the search page

function showSearchForm() {
  message.innerHTML = "";
  formContainer.classList.remove("hidden");
}

//Handling navigation click with pushing new state to the history API

function handleNavClick(ev) {
  ev.preventDefault();
  let url = ev.target.closest("button").getAttribute("data-url");
  updateActiveButton(url);
  history.pushState(url, null, url);
  loadContent(url);
}

// Displaying the different content on search page and saved page

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

// Function that runs when history state is changing

function popIn(ev) {
  console.log(ev.state);
  if (ev.state) {
    updateActiveButton(ev.state);
    loadContent(ev.state);
  }
}

// Updating the button state to 'active' to indicate to users the current page they are on

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

// The search function initiates a fetch request to retrieve data based on the keyword entered by the user
function runSearch() {
  results.innerHTML = "";
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

// Displaying the results of search on the page

function displaySearchResults(data) {
  isDelete = false;
  isSave = true;
  let userInput = document.getElementById("keyword");
  let keyword = userInput.value;
  results.className = "search-results";
  let h2 = document.createElement("h2");
  h2.textContent = "Search results";
  results.append(h2);

  // Create a document fragment to store the generated HTML
  let fragment = document.createDocumentFragment();

  if (data.hits.length === 0) {
    results.innerHTML = `<h3>There are no search results for "${keyword}" key term</h3>`;
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
  /* When a user clicks on an image, the function initializes another fetch request to retrieve the data 
  of that particular image. */

  ev.preventDefault();

  // Retrieving the ID of the image that is saved in the data-ref attribute
  let pickedImage = ev.target.closest(".card").getAttribute("data-ref");
  console.log(pickedImage);

  // Constructing the URL for the fetch request by appending the ID of the picked
  // image to the base URL as search parameters
  let urlPickedImage = new URL(url);
  urlPickedImage.searchParams.append("id", pickedImage);

  /* Performing the fetch request to retrieve the data of the image from the JSON response
and storing it in an object called "ImageData" for further use. This function is going to be reused
to display image after a user's click on the saved images page and initialize face detector. */
  fetch(urlPickedImage)
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
      let imageData = data.hits.map((item) => {
        return {
          url: item.largeImageURL,
          alt: `Photo with ${item.tags}`,
          id: item.id,
        };
      });
      console.log(imageData);
      // Displaying the dialog window after user's click
      displayDialog(imageData);
    })
    .catch((err) => {
      console.log(err);
    });
}

/* Function that opens the dialog window with the chosen image. The imageData object is passed as an argument,
which contains necessary values for another fetch with a blob response, adding alt text to the image,
saving and deleting image from the cache. */

function displayDialog(imageData) {
  imageData.forEach((item) => {
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
        <p class=detectionMessage></p>
        <div class='buttons'>
        <button id="close" class="btn" aria-label="Click to close dialog">Close</button>
        <button aria-label="Click to delete image" id="delete" class="btn  ${
          isSave ? "hidden" : ""
        }">Delete</button>
        <button aria-label="Click to save image" id ="save" class="btn  ${
          isDelete ? "hidden" : ""
        }">Save</button>
        </div>
        `;

        dialog.showModal();

        //Adding face detection when image is ready
        if (isDelete) {
          let imageReady = document.querySelector("dialog img");
          imageReady.addEventListener("load", () => {
            handleDetection();
          });
        }

        // Adding event listener to created button "close"
        let closeButton = document.getElementById("close");
        closeButton.addEventListener("click", closeDialog);

        // Function that closes dialog window
        function closeDialog(ev) {
          dialog.close();
        }

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
        // Adding event listener to created delete button
        let deleteButton = document.getElementById("delete");
        deleteButton.addEventListener("click", deleteImage);

        // Function tha deletes the image from the cache
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
  // Setting flags for save and delete actions
  isDelete = true;
  isSave = false;

  // Hiding form container and clear existing content
  formContainer.classList.add("hidden");
  results.innerHTML = "";
  savedResults.innerHTML = "";

  // Creating heading for saved images
  let h2 = document.createElement("h2");
  h2.textContent = "Saved Images";
  savedResults.append(h2);

  try {
    // Retrieving keys from cache
    const keysArray = await cacheRef.keys();

    // Mapping over keys array and create promises for each cache match
    const promises = keysArray.map(async (req) => {
      // Attempting to match cache request
      const response = await cacheRef.match(req);
      if (response) {
        // Extracting JSON data from cache response
        const data = await response.json();
        // Creating a document fragment to store image cards
        const df = new DocumentFragment();
        // Iterating over each item in the data.hits array
        data.hits.forEach((item) => {
          // Creating image element
          const img = document.createElement("img");
          img.src = item.previewURL;
          img.alt = `${item.tags} photo`;

          /* /Creating a button element to serve as an image card. The decision to use a button as a container 
          for the image is made to ensure accessibility, 
          allowing users to interact with the application using only keyboard navigation. */
          const card = document.createElement("button");
          card.classList.add("card");
          card.setAttribute("data-ref", item.id);
          card.setAttribute("data-full", item.largeImageURL);
          card.ariaLabel = `Photo of ${item.tags}. Click to open dialog window`;
          card.appendChild(img);
          df.appendChild(card);
        });
        // Returning document fragment with image cards
        return df;
      }
    });

    // Waiting for all promises to settle and retrieve results
    const results = await Promise.allSettled(promises);
    let imagesFound = false;
    // Iterating over settled promises
    results.forEach((item) => {
      if (item.status === "fulfilled") {
        // Appending document fragment with image cards to savedResults
        savedResults.appendChild(item.value);
        imagesFound = true;
      }
    });

    // If no images found, displaying message
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
