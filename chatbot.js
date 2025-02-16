const dbName = "ChatDB";
const storeName = "messages";
let username = localStorage.getItem("username") || "Anda";

document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem("username")) {
        document.getElementById("loginScreen").style.display = "none";
    }
    renderChat();
});

function saveUsername() {
    let input = document.getElementById("usernameInput").value.trim();
    if (input === "") {
        alert("Nama tidak boleh kosong!");
        return;
    }
    localStorage.setItem("username", input);
    username = input;
    document.getElementById("loginScreen").style.display = "none";
}

function changeUsername() {
    localStorage.removeItem("username");
    location.reload();
}

async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function saveMessage(role, text) {
    const db = await openDatabase();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.add({ role, text, timestamp: new Date().toISOString() });
}

async function getMessages() {
    return new Promise(async (resolve, reject) => {
        const db = await openDatabase();
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function sendMessage() {
    const inputElement = document.getElementById("userInput");
    const inputText = inputElement.value.trim();
    inputElement.value = "";

    if (!inputText) return;

    await saveMessage("user", inputText);  // Simpan chat user
    renderChat();

    // Tampilkan teks loading
    const botTyping = document.getElementById("botTyping");
    botTyping.classList.remove("hidden");

    setTimeout(async () => {
        const botReply = await getBotResponse(inputText); // Tunggu hasilnya dulu!
        await saveMessage("bot", botReply);  // Baru simpan ke IndexedDB

        // Sembunyikan teks loading setelah jawaban bot muncul
        botTyping.classList.add("hidden");
        renderChat();
    }, 1500); // Delay 1.5 detik sebelum bot menjawab
}



async function renderChat() {
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = "";
    const messages = await getMessages();
    
    messages.forEach(msg => {
        addMessage(msg.role === "user" ? username : "DeepTok", msg.text, msg.role);
    });
}

function addMessage(sender, message, role) {
    let chatBox = document.getElementById("chatBox");
    let messageContainer = document.createElement("div");
    messageContainer.classList.add("mb-2", "flex", "items-start", "gap-2", "w-full");

    let avatarSrc = role === "user" ? "https://i.pravatar.cc/40?img=5" : "https://i.pravatar.cc/40?img=3";
    let avatar = document.createElement("img");
    avatar.src = avatarSrc;
    avatar.classList.add("w-8", "h-8", "rounded-full");

    let messageWrapper = document.createElement("div");
    messageWrapper.classList.add("flex", "flex-col", "max-w-[70%]");
    let senderLabel = document.createElement("div");
    senderLabel.classList.add("text-sm", "font-semibold", "mb-1");
    senderLabel.innerText = sender;
    let messageElement = document.createElement("div");
    messageElement.classList.add("p-2", "rounded-lg", "w-fit", "max-w-xs");
    
    if (role === "user") {
        messageContainer.classList.add("justify-end");
        messageWrapper.classList.add("items-end");
        messageElement.classList.add("bg-blue-500", "text-white");
        avatar.classList.add("self-end");
    } else {
        messageContainer.classList.add("justify-start");
        messageElement.classList.add("bg-gray-200", "text-black");
    }

    messageElement.innerText = message;
    messageWrapper.appendChild(senderLabel);
    messageWrapper.appendChild(messageElement);
    messageContainer.appendChild(avatar);
    messageContainer.appendChild(messageWrapper);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function getBotResponse(input) {
    input = input.toLowerCase();
    const responses = {
        "halo": "Halo! Ada yang bisa saya bantu?",
        "siapa kamu": "Saya adalah DeepTok yang siap membantu!",
        "apa kabar": "Saya baik, bagaimana dengan Anda?",
        "baik": "Senang mendengarnya, ada yang bisa dibantu?",
        "terima kasih": "Sama-sama! Senang bisa membantu.",
        "bye": "Sampai jumpa! 😊",
    };
    for (let keyword in responses) {
        if (input.includes(keyword)) {
            return responses[keyword];
        }
    }
    // Jika tidak ada jawaban, kembalikan HTML sebagai string
    return "Saya tidak tahu jawabannya. Coba kamu WhatsApp langsung aja ya!";
}

document.getElementById("userInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

document.getElementById("clearChat").addEventListener("click", function () {
    Swal.fire({
        title: "Yakin ingin hapus chat?",
        text: "Chat yang dihapus tidak bisa dikembalikan! Anda juga harus login kembali.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, hapus semuanya!",
        cancelButtonText: "Batal",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6"
    }).then((result) => {
        if (result.isConfirmed) {
            // Hapus riwayat chat dan username dari localStorage
            localStorage.removeItem("chatHistory");
            localStorage.removeItem("username");

            // Hapus database IndexedDB
            let deleteDBRequest = indexedDB.deleteDatabase("ChatDB");
            deleteDBRequest.onsuccess = function () {
                console.log("Database IndexedDB berhasil dihapus.");
            };
            deleteDBRequest.onerror = function () {
                console.error("Gagal menghapus database IndexedDB.");
            };

            // Bersihkan tampilan chat
            document.getElementById("chatBox").innerHTML = "";

            Swal.fire("Dihapus!", "Semua data telah dihapus. Anda harus login kembali.", "success").then(() => {
                location.reload(); // Reload untuk kembali ke login screen
            });
        }
    });
});

// Fungsi untuk mengambil jadwal sholat berdasarkan kota
async function getPrayerTimes(city) {
    try {
        const response = await fetch(`https://api.myquran.com/v1/sholat/jadwal/${city}/today`);
        const data = await response.json();
        
        if (data.status && data.data) {
            const jadwal = data.data.jadwal;
            return `Jadwal Sholat di ${city.toUpperCase()} hari ini:\n📌 Subuh: ${jadwal.subuh}\n📌 Dzuhur: ${jadwal.dzuhur}\n📌 Ashar: ${jadwal.ashar}\n📌 Maghrib: ${jadwal.maghrib}\n📌 Isya: ${jadwal.isya}`;
        } else {
            return "Maaf, tidak bisa mendapatkan jadwal sholat saat ini.";
        }
    } catch (error) {
        return "Terjadi kesalahan saat mengambil data jadwal sholat.";
    }
}

