
// (() => {
//   if (window.__DOC_UPLOAD_INIT__) return;
//   window.__DOC_UPLOAD_INIT__ = true;

//   const ready = (cb) =>
//     document.readyState !== "loading"
//       ? cb()
//       : document.addEventListener("DOMContentLoaded", cb);

//   ready(() => {
//     const input = document.getElementById("fileID");
//     const chooseBtn = document.getElementById("chooseFileBtn");
//     const clearBtn = document.getElementById("clearFileBtn");
//     const fileChosen = document.getElementById("fileChosen");
//     const previewCard = document.getElementById("filePreviewCard");
//     const previewFileName = document.getElementById("previewFileName");
//     const previewFileType = document.getElementById("previewFileType");
//     const previewFrame = document.getElementById("previewFrame");
//     const uploadSummary = document.getElementById("uploadSummary");

//     if (!input || !chooseBtn || !clearBtn || !fileChosen) {
//       console.warn("[doc_upload] Missing elements in DOM");
//       return;
//     }

//     // Open file chooser
//     chooseBtn.addEventListener("click", (e) => {
//       e.preventDefault();
//       input.click();
//     });

//     // Clear file selection
//     clearBtn.addEventListener("click", (e) => {
//       e.preventDefault();
//       input.value = "";
//       fileChosen.textContent = "";
//       fileChosen.classList.add("hidden");
//       previewCard.classList.add("hidden");
//       clearBtn.classList.add("hidden");
//       previewFrame.src = "";
//       previewFrame.classList.add("hidden");
//       if (uploadSummary) uploadSummary.innerHTML = "";
//       console.log("[doc_upload] Cleared file selection");
//     });

//     // Handle file selection
//     input.addEventListener("change", () => {
//       if (input.files && input.files.length > 0) {
//         const file = input.files[0];
//         const fileName = file.name;
//         const fileType = file.type || "unknown";

//         // Show basic filename
//         fileChosen.textContent = `Selected: ${fileName}`;
//         fileChosen.classList.remove("hidden");

//         // Show preview card info
//         previewFileName.textContent = fileName;
//         previewFileType.textContent = `Type: ${fileType}`;
//         previewCard.classList.remove("hidden");
//         clearBtn.classList.remove("hidden");

//         // Reset preview frame
//         previewFrame.src = "";
//         previewFrame.classList.add("hidden");

//         // PDF inline preview
//         if (file.type === "application/pdf") {
//           const reader = new FileReader();
//           reader.onload = (e) => {
//             previewFrame.src = e.target.result;
//             previewFrame.classList.remove("hidden");
//           };
//           reader.readAsDataURL(file);
//         }

//         // Build Upload Summary card
//         let summaryHTML = `
//           <div class="border rounded-lg p-3 bg-gray-50 shadow-sm">
//             <p class="font-medium text-navy">${fileName}</p>
//             <p class="text-xs text-gray-500">${fileType}</p>
//         `;

//         if (file.type === "application/pdf") {
//           summaryHTML += `<iframe class="w-full h-32 border rounded mt-2" src="${URL.createObjectURL(
//             file
//           )}"></iframe>`;
//         } else if (
//           file.type ===
//             "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
//           fileName.endsWith(".doc") ||
//           fileName.endsWith(".docx")
//         ) {
//           summaryHTML += `<div class="mt-2 text-sm text-blue-600">📄 Word document selected</div>`;
//         } else if (
//           file.type ===
//             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
//           fileName.endsWith(".xls") ||
//           fileName.endsWith(".xlsx")
//         ) {
//           summaryHTML += `<div class="mt-2 text-sm text-green-600">📊 Excel spreadsheet selected</div>`;
//         } else {
//           summaryHTML += `<div class="mt-2 text-sm text-gray-600">📎 Preview not available</div>`;
//         }

//         summaryHTML += `</div>`;

//         if (uploadSummary) uploadSummary.innerHTML = summaryHTML;

//         console.log("[doc_upload] File selected:", fileName, fileType);
//       } else {
//         // No file selected
//         fileChosen.textContent = "";
//         fileChosen.classList.add("hidden");
//         previewCard.classList.add("hidden");
//         clearBtn.classList.add("hidden");
//         previewFrame.src = "";
//         previewFrame.classList.add("hidden");
//         if (uploadSummary) uploadSummary.innerHTML = "";
//       }
//     });

//     console.log("[doc_upload] Upload initialized");
//   });
// })();
