// Função para excluir um tweet
function deleteTweet(tweetId) {
  fetch(`/delete_tweet/${tweetId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin", // Envia cookies para manter a sessão do usuário
  })
    .then((response) => {
      if (response.ok) {
        return response.json(); // Retorna a resposta JSON se a exclusão for bem-sucedida
      } else {
        return response.json().then((data) => {
          throw new Error(data.message); // Lança um erro se a resposta não for OK
        });
      }
    })
    .then((data) => {
      if (data.success) {
        location.reload(); // Recarrega a página para atualizar o feed
      } else {
        alert("Erro ao excluir o tweet: " + data.message); // Exibe uma mensagem de erro
      }
    })
    .catch((error) => {
      console.error("Erro ao excluir o tweet:", error); // Registra o erro no console
      alert("Erro ao excluir o tweet."); // Exibe uma mensagem de erro
    });
}
function loadTweets() {
  fetch("/feed")
    .then(handleResponse)
    .then(renderTweets)
    .catch((error) => console.error("Erro ao carregar tweets:", error));
}
// Função auxiliar para manipular respostas do servidor
function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`Erro HTTP: ${response.status}`);
  }
  return response.json();
}
document.addEventListener("DOMContentLoaded", function () {
  // Seleção de elementos DOM
  const tweetForm = document.getElementById("tweetForm");
  const feedContainer = document.getElementById("feed");
  const profileModal = document.getElementById("profile-modal");
  const openProfileButton = document.querySelector(".edit-profile-button");
  const closeProfileButton = document.querySelector(".close-button");
  const profilePhoto = document.getElementById("profile-photo");
  const profilePictureInput = document.getElementById("profile-picture");
  const profileForm = document.getElementById("profileForm");
  const tweets = JSON.parse(document.getElementById("tweets-data").textContent);
  const currentUserId = JSON.parse(
    document.getElementById("current-user-id").textContent
  );

  let cropper; // Variável para o Cropper.js

  // Renderiza os tweets ao carregar a página
  renderTweets(tweets);

  // Evento para submissão do formulário de tweet
  tweetForm.addEventListener("submit", handleTweetSubmit);

  // Eventos para abrir e fechar o modal de edição de perfil
  openProfileButton.addEventListener("click", openProfileModal);
  closeProfileButton.addEventListener("click", closeProfileModal);
  window.addEventListener("click", handleOutsideClick);

  // Evento para inicializar o Cropper.js ao selecionar uma nova imagem
  profilePictureInput.addEventListener("change", handleImageSelection);

  // Evento para submissão do formulário de edição de perfil
  profileForm.addEventListener("submit", handleProfileFormSubmit);

  // Funções de renderização e manipulação de tweets

  // Função para carregar os tweets do servidor

  // Função para renderizar tweets no feed
  function renderTweets(tweets) {
    feedContainer.innerHTML = ""; // Limpa o feed
    tweets.forEach(createTweetElement);
  }

  // Função auxiliar para criar elementos de tweet
  function createTweetElement(tweet) {
    const tweetElement = document.createElement("div");
    tweetElement.classList.add("tweet");
    tweetElement.innerHTML = `
      <div class="tweet-header">
        <img src="${
          tweet.avatar
            ? `data:image/jpeg;base64,${tweet.avatar}`
            : "/static/img/default_avatar.jpg"
        }" alt="Avatar do usuário" class="avatar" />
        <strong>@${tweet.username}</strong>
      </div>
      <p>${tweet.conteudo}</p>
      ${
        tweet.user_id === currentUserId
          ? `<button class="delete-button">
    <span onclick="deleteTweet(${tweet.id})">CONFIRMAR EXCLUSÃO</span>
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
</button>`
          : ""
      }
    `;
    feedContainer.appendChild(tweetElement);
  }

  // Funções de manipulação do modal de perfil

  // Abre o modal de edição de perfil
  function openProfileModal(e) {
    e.preventDefault();
    fetch("/get_profile_info")
      .then((response) => response.json())
      .then(populateProfileModal)
      .catch((error) => {
        console.error("Erro:", error);
        alert("Erro ao carregar informações do perfil.");
      });
  }

  // Fecha o modal de edição de perfil
  function closeProfileModal() {
    profileModal.style.display = "none";
  }

  // Fecha o modal ao clicar fora dele
  function handleOutsideClick(e) {
    if (e.target === profileModal) {
      closeProfileModal();
    }
  }

  // Popula o modal de edição de perfil com dados do usuário
  function populateProfileModal(data) {
    if (data.username) {
      profilePhoto.src = data.photo
        ? `data:image/jpeg;base64,${data.photo}`
        : "/static/img/default_avatar.jpg";
      profileModal.style.display = "block";
    } else {
      alert("Erro ao carregar informações do perfil.");
    }
  }

  // Funções de manipulação da imagem do perfil

  // Inicializa o Cropper.js ao selecionar uma nova imagem
  function handleImageSelection(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        profilePhoto.src = event.target.result;
        if (cropper) cropper.destroy();
        cropper = new Cropper(profilePhoto, { aspectRatio: 1, viewMode: 1 });
      };
      reader.readAsDataURL(file);
    }
  }

  // Funções de envio de formulários

  // Lida com a submissão do formulário de tweet
  function handleTweetSubmit(e) {
    e.preventDefault();
    const tweetText = document.getElementById("tweet-text").value;

    if (tweetText.trim()) {
      const formData = new FormData(tweetForm);
      fetch("/post_tweet", { method: "POST", body: formData })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            location.reload(); // Recarrega a página
          } else {
            alert("Erro ao enviar tweet: " + data.message);
          }
        })
        .catch((error) => {
          console.error("Erro:", error);
          alert("Erro ao enviar tweet.");
        });

      tweetForm.reset();
    } else {
      alert("Por favor, escreva algo antes de tweetar!");
    }
  }

  // Lida com a submissão do formulário de edição de perfil
  function handleProfileFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(profileForm);

    // Verifica se a senha atual é necessária
    const requireCurrentPassword = checkIfCurrentPasswordRequired();
    const currentPassword = document.getElementById("current-password").value;

    if (requireCurrentPassword && !currentPassword) {
      alert("Por favor, insira a senha atual para alterar o perfil.");
      return;
    }

    // Adiciona a foto cortada ao formulário, se o cropper estiver ativo
    if (cropper) {
      cropper.getCroppedCanvas().toBlob((blob) => {
        formData.set("profile-picture", blob, "profile-picture.jpg");
        sendProfileUpdate(formData);
      }, "image/jpeg");
    } else {
      sendProfileUpdate(formData);
    }
  }

  // Verifica se a senha atual é necessária
  function checkIfCurrentPasswordRequired() {
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const newPassword = document.getElementById("new-password").value;

    // Retorna verdadeiro se qualquer campo, exceto a foto, for alterado
    return (
      username.trim() !== "" || email.trim() !== "" || newPassword.trim() !== ""
    );
  }

  // Envia a solicitação de atualização do perfil ao backend
  function sendProfileUpdate(formData) {
    fetch("/edit_profile", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Perfil atualizado com sucesso!");
          profileModal.style.display = "none"; // Fecha o modal após sucesso
        } else {
          alert("Erro ao atualizar perfil: " + data.message);
        }
      })
      .catch((error) => {
        console.error("Erro ao atualizar perfil:", error);
        alert("Erro ao atualizar perfil.");
      });
  }
});
