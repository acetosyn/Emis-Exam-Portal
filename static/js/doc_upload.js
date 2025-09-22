// doc_upload.js - simple file upload display
(() => {
  const dropArea = document.querySelector(".drop_box");
  if (!dropArea) return;

  const button = dropArea.querySelector("button");
  const input = document.getElementById("fileID");
  const fileChosen = document.getElementById("fileChosen");

  // Ensure it's not treated as form submit
  button.addEventListener("click", (e) => {
    e.preventDefault();
    input.click();
  });

  // Show filename when file is chosen
  input.addEventListener("change", (e) => {
    if (!e.target.files.length) return;
    const fileName = e.target.files[0].name;
    fileChosen.textContent = `Selected file: ${fileName}`;
    fileChosen.classList.remove("hidden");
    console.log("[doc_upload] File selected:", fileName);
  });
})();
