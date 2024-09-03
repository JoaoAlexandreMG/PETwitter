// Script para abrir e fechar os popups
const modalLogin = document.getElementById("modalLogin");
const modalCreateAccount = document.getElementById("modalCreateAccount");
const loginBtn = document.getElementById("loginBtn");
const createAccountBtn = document.getElementById("createAccountBtn");
const closeLogin = document.getElementById("closeLogin");
const closeCreateAccount = document.getElementById("closeCreateAccount");
const photoInput = document.getElementById("photo");
const imageModal = document.getElementById("image-modal");
const closeImageModal = document.getElementById("closeImageModal");
const imageToCrop = document.getElementById("image-to-crop");
const cropImageButton = document.getElementById("crop-image");

let cropper;

// Abrir e fechar modais
loginBtn.onclick = function () {
  modalLogin.style.display = "flex";
};

createAccountBtn.onclick = function () {
  modalCreateAccount.style.display = "flex";
};

closeLogin.onclick = function () {
  modalLogin.style.display = "none";
};

closeCreateAccount.onclick = function () {
  modalCreateAccount.style.display = "none";
};

closeImageModal.onclick = function () {
  imageModal.style.display = "none";
  cropper?.destroy();
};

// Fechar modal ao clicar fora dele
window.onclick = function (event) {
  if (event.target === modalLogin) {
    modalLogin.style.display = "none";
  }
  if (event.target === modalCreateAccount) {
    modalCreateAccount.style.display = "none";
  }
  if (event.target === imageModal) {
    imageModal.style.display = "none";
    cropper?.destroy();
  }
};

// Inicializar Cropper.js quando uma nova imagem é selecionada
photoInput.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imageToCrop.src = e.target.result;
      imageModal.style.display = "flex";
      setTimeout(() => {
        cropper = new Cropper(imageToCrop, {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 1,
        });
      }, 0);
    };
    reader.readAsDataURL(file);
  }
});

// Aplicar corte da imagem e ocultar o modal
cropImageButton.addEventListener("click", function () {
  if (cropper) {
    const canvas = cropper.getCroppedCanvas();
    canvas.toBlob(function (blob) {
      const file = new File([blob], "cropped-image.jpg", {
        type: "image/jpeg",
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      photoInput.files = dataTransfer.files;
      imageModal.style.display = "none";
      cropper.destroy();
    }, "image/jpeg");
  }
});
document.addEventListener("DOMContentLoaded", function () {
  // Preenche o seletor de dias (1 a 31)
  const diaSelect = document.getElementById("dia");
  for (let i = 1; i <= 31; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.text = i;
    diaSelect.appendChild(option);
  }

  // Preenche o seletor de anos (1904 a 2024)
  const anoSelect = document.getElementById("ano");
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= 1904; i--) {
    const option = document.createElement("option");
    option.value = i;
    option.text = i;
    anoSelect.appendChild(option);
  }
});
