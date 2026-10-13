"use strict";

/* =====================================================
   SURATKERJA — PEMBUAT PAKET LAMARAN
   File: script.js
   ===================================================== */

/* ---------- MENGAMBIL ELEMEN HTML ---------- */

const form = document.getElementById("formLamaran");

const hasilSurat = document.getElementById("hasilSurat");
const hasilCV = document.getElementById("hasilCV");
const hasilLampiran = document.getElementById("hasilLampiran");

const statusHasil = document.getElementById("status");
const tombolPDF = document.getElementById("unduhPDF");
const tombolSalin = document.getElementById("salin");
const tombolCetak = document.getElementById("cetak");
const tombolReset = document.getElementById("resetForm");

const inputFoto = document.getElementById("foto");
const previewFoto = document.getElementById("previewFoto");

const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");

let fotoData = "";
let paketSudahDibuat = false;
let sedangMembuatPDF = false;

/* ---------- DAFTAR INPUT DOKUMEN ---------- */

const daftarInputFile = [
    {
        id: "ijazah",
        judul: "Ijazah / Surat Keterangan Lulus"
    },
    {
        id: "transkrip",
        judul: "Transkrip Nilai"
    },
    {
        id: "sertifikat",
        judul: "Sertifikat"
    },
    {
        id: "dokumenLain",
        judul: "Dokumen Pendukung Lainnya"
    }
];

const BATAS_FILE = 5 * 1024 * 1024;
const BATAS_FOTO = 3 * 1024 * 1024;

/* ---------- FUNGSI BANTU ---------- */

// Menampilkan pesan status kepada pengguna.
function tampilkanStatus(pesan) {
    statusHasil.textContent = pesan;
}

// Mengambil isi input dan membersihkan spasi di awal/akhir.
function ambilNilai(id) {
    return document.getElementById(id).value.trim();
}

// Membuat elemen dengan teks aman.
function buatElemen(tag, teks, className = "") {
    const elemen = document.createElement(tag);
    elemen.textContent = teks;

    if (className) {
        elemen.className = className;
    }

    return elemen;
}

// Memformat tanggal menjadi format Indonesia.
function formatTanggal(nilai) {
    if (!nilai) return "";

    const tanggal = new Date(nilai + "T12:00:00");

    return tanggal.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// Membuat paragraf yang mempertahankan baris baru.
function buatParagraf(teks) {
    const paragraf = document.createElement("p");
    paragraf.textContent = teks;
    return paragraf;
}

// Mengambil semua dokumen yang dipilih pengguna.
function ambilSemuaFile() {
    const semuaFile = [];

    daftarInputFile.forEach(function (item) {
        const input = document.getElementById(item.id);

        Array.from(input.files).forEach(function (file) {
            semuaFile.push({
                file: file,
                kategori: item.judul
            });
        });
    });

    return semuaFile;
}

/* ---------- VALIDASI DOKUMEN ---------- */

function validasiDokumen() {
    for (const item of daftarInputFile) {
        const input = document.getElementById(item.id);

        for (const file of Array.from(input.files)) {
            const ekstensi = file.name
                .split(".")
                .pop()
                .toLowerCase();

            const formatDiizinkan = [
                "pdf", "jpg", "jpeg", "png"
            ];

            if (!formatDiizinkan.includes(ekstensi)) {
                tampilkanStatus(
                    "Format tidak didukung: " + file.name
                );
                input.focus();
                return false;
            }

            if (file.size > BATAS_FILE) {
                tampilkanStatus(
                    "Ukuran file melebihi 5 MB: " + file.name
                );
                input.focus();
                return false;
            }

            if (file.size === 0) {
                tampilkanStatus(
                    "File kosong tidak bisa digunakan: " + file.name
                );
                input.focus();
                return false;
            }
        }
    }

    return true;
}

/* ---------- FOTO PELAMAR ---------- */

inputFoto.addEventListener("change", function () {
    const file = inputFoto.files[0];

    fotoData = "";
    previewFoto.hidden = true;
    previewFoto.removeAttribute("src");

    if (!file) return;

    const formatDiizinkan = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!formatDiizinkan.includes(file.type)) {
        tampilkanStatus("Foto harus berupa JPG, PNG, atau WebP.");
        inputFoto.value = "";
        return;
    }

    if (file.size > BATAS_FOTO) {
        tampilkanStatus("Ukuran foto maksimal 3 MB.");
        inputFoto.value = "";
        return;
    }

    const pembaca = new FileReader();

    pembaca.onload = function () {
        fotoData = pembaca.result;
        previewFoto.src = fotoData;
        previewFoto.hidden = false;

        tampilkanStatus("Foto berhasil dipilih.");
    };

    pembaca.onerror = function () {
        tampilkanStatus("Foto tidak dapat dibaca.");
    };

    pembaca.readAsDataURL(file);
});

/* ---------- TANDA TANGAN DIGITAL ---------- */

// Atur ukuran canvas agar tetap tajam di layar.
function aturUkuranCanvas() {
    const rasio = window.devicePixelRatio || 1;
    const ukuran = canvas.getBoundingClientRect();

    if (!ukuran.width || !ukuran.height) return;

    // Simpan tanda tangan sementara saat ukuran berubah.
    let tandaTanganSementara = "";

    try {
        tandaTanganSementara = canvas.toDataURL("image/png");
    } catch (error) {
        tandaTanganSementara = "";
    }

    canvas.width = Math.round(ukuran.width * rasio);
    canvas.height = Math.round(ukuran.height * rasio);

    ctx.setTransform(rasio, 0, 0, rasio, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#222222";

    // Gambar kembali tanda tangan jika sebelumnya ada.
    if (tandaTanganSementara && tandaTanganSementara.length > 100) {
        const gambar = new Image();

        gambar.onload = function () {
            ctx.drawImage(
                gambar,
                0,
                0,
                ukuran.width,
                ukuran.height
            );
        };

        gambar.src = tandaTanganSementara;
    }
}

aturUkuranCanvas();

window.addEventListener("resize", aturUkuranCanvas);

let sedangMenggambar = false;

function posisiPointer(event) {
    const ukuran = canvas.getBoundingClientRect();

    return {
        x: event.clientX - ukuran.left,
        y: event.clientY - ukuran.top
    };
}

canvas.addEventListener("pointerdown", function (event) {
    event.preventDefault();

    sedangMenggambar = true;
    canvas.setPointerCapture(event.pointerId);

    const posisi = posisiPointer(event);

    ctx.beginPath();
    ctx.moveTo(posisi.x, posisi.y);
    ctx.lineTo(posisi.x + 0.1, posisi.y + 0.1);
    ctx.stroke();
});

canvas.addEventListener("pointermove", function (event) {
    if (!sedangMenggambar) return;

    event.preventDefault();

    const posisi = posisiPointer(event);

    ctx.lineTo(posisi.x, posisi.y);
    ctx.stroke();
});

function akhiriGambar() {
    sedangMenggambar = false;
}

canvas.addEventListener("pointerup", akhiriGambar);
canvas.addEventListener("pointercancel", akhiriGambar);
canvas.addEventListener("lostpointercapture", akhiriGambar);

function hapusTandaTangan() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

document.getElementById("hapusTtd").addEventListener(
    "click",
    hapusTandaTangan
);

function adaTandaTangan() {
    const gambar = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    for (let i = 3; i < gambar.data.length; i += 4) {
        if (gambar.data[i] !== 0) return true;
    }

    return false;
}

/* ---------- MEMBUAT SURAT LAMARAN ---------- */

function buatSurat(data) {
    hasilSurat.replaceChildren();
    hasilSurat.hidden = false;

    const tanggalLengkap =
        data.kota + ", " + formatTanggal(data.tanggal);

    hasilSurat.appendChild(
        buatParagraf(tanggalLengkap)
    );

    hasilSurat.appendChild(
        buatParagraf("Perihal: Lamaran Pekerjaan sebagai " + data.posisi)
    );

    hasilSurat.appendChild(
        buatParagraf(
            "Lampiran: " +
            (ambilSemuaFile().length > 0
                ? ambilSemuaFile().length + " dokumen pendukung"
                : "Dokumen pendukung sesuai persyaratan")
        )
    );

    hasilSurat.appendChild(
        buatParagraf(
            "Yth. Tim Rekrutmen " + data.perusahaan +
            (data.alamatPerusahaan
                ? "\n" + data.alamatPerusahaan
                : "")
        )
    );

    hasilSurat.appendChild(
        buatParagraf("Dengan hormat,")
    );

    const sumber = data.sumber
        ? "Saya memperoleh informasi lowongan pekerjaan ini melalui " +
          data.sumber + ". "
        : "";

    hasilSurat.appendChild(
        buatParagraf(
            sumber +
            "Melalui surat ini, saya bermaksud mengajukan lamaran " +
            "untuk posisi " + data.posisi +
            " di " + data.perusahaan + "."
        )
    );

    hasilSurat.appendChild(
        buatParagraf(
            "Saya bernama " + data.nama +
            (data.lahir ? ", lahir di " + data.lahir : "") +
            ", dan berdomisili di " + data.alamat +
            ". Saya memiliki latar belakang pendidikan " +
            data.pendidikan.replace(/\n/g, ", ") +
            ". Saya tertarik untuk mengembangkan kemampuan saya " +
            "serta berkontribusi sesuai kebutuhan perusahaan."
        )
    );

    hasilSurat.appendChild(
        buatParagraf(
            "Saya memiliki keahlian dalam " +
            data.keahlian.replace(/\n/g, ", ") +
            ". " +
            (data.pengalaman
                ? "Pengalaman atau proyek yang pernah saya kerjakan meliputi " +
                  data.pengalaman.replace(/\n/g, ", ") + ". "
                : "") +
            "Saya bersedia mempelajari hal-hal baru dan mengikuti " +
            "proses seleksi yang ditetapkan perusahaan."
        )
    );

    hasilSurat.appendChild(
        buatParagraf(
            "Sebagai bahan pertimbangan, saya menyertakan CV dan " +
            "dokumen pendukung yang tersedia serta relevan dengan " +
            "persyaratan lowongan. Saya berharap mendapat kesempatan " +
            "untuk menjelaskan kualifikasi saya lebih lanjut."
        )
    );

    hasilSurat.appendChild(
        buatParagraf(
            "Demikian surat lamaran ini saya sampaikan. Terima kasih " +
            "atas waktu dan perhatian Bapak/Ibu."
        )
    );

    hasilSurat.appendChild(
        buatParagraf("Hormat saya,")
    );

    if (adaTandaTangan()) {
        const tandaTangan = document.createElement("img");
        tandaTangan.src = canvas.toDataURL("image/png");
        tandaTangan.alt = "Tanda tangan pelamar";
        tandaTangan.className = "signature-image";
        hasilSurat.appendChild(tandaTangan);
    } else {
        hasilSurat.appendChild(
            buatParagraf("\n\n")
        );
    }

    hasilSurat.appendChild(
        buatElemen("p", data.nama)
    );
}

/* ---------- MEMBUAT CV ---------- */

function tambahBagianCV(judul, isi) {
    if (!isi) return;

    hasilCV.appendChild(
        buatElemen("h3", judul, "cv-section")
    );

    hasilCV.appendChild(
        buatParagraf(isi)
    );
}

function buatCV(data) {
    hasilCV.replaceChildren();
    hasilCV.hidden = false;

    hasilCV.appendChild(
        buatElemen("h2", "DAFTAR RIWAYAT HIDUP")
    );

    if (fotoData) {
        const foto = document.createElement("img");
        foto.src = fotoData;
        foto.alt = "Foto pelamar";
        foto.className = "cv-photo";
        hasilCV.appendChild(foto);
    }

    hasilCV.appendChild(
        buatElemen("h3", data.nama, "cv-name")
    );

    hasilCV.appendChild(
        buatParagraf(
            "Email: " + data.email +
            "\nNomor HP: " + data.telepon +
            "\nAlamat: " + data.alamat
        )
    );

    if (data.lahir) {
        hasilCV.appendChild(
            buatParagraf("Tempat, tanggal lahir: " + data.lahir)
        );
    }

    tambahBagianCV("PROFIL", 
        "Pelamar kerja yang ingin mengembangkan kemampuan dan " +
        "memberikan kontribusi sesuai posisi yang dilamar, yaitu " +
        data.posisi + "."
    );

    tambahBagianCV("PENDIDIKAN", data.pendidikan);
    tambahBagianCV("KEAHLIAN", data.keahlian);
    tambahBagianCV(
        "PENGALAMAN / ORGANISASI / PROYEK",
        data.pengalaman || "Belum dicantumkan."
    );

    hasilCV.appendChild(
        buatElemen("p", "CV ini dibuat berdasarkan data yang diisi pelamar.")
    );
}

/* ---------- DAFTAR LAMPIRAN ---------- */

function buatDaftarLampiran() {
    hasilLampiran.replaceChildren();
    hasilLampiran.hidden = false;

    hasilLampiran.appendChild(
        buatElemen("h2", "DAFTAR DOKUMEN PENDUKUNG")
    );

    hasilLampiran.appendChild(
        buatParagraf(
            "Dokumen berikut disertakan dalam paket lamaran jika file berhasil diproses."
        )
    );

    const file = ambilSemuaFile();

    if (file.length === 0) {
        hasilLampiran.appendChild(
            buatParagraf(
                "Belum ada dokumen pendukung yang diunggah."
            )
        );
        return;
    }

    file.forEach(function (item, index) {
        const baris = document.createElement("div");
        baris.className = "attachment-item";

        baris.appendChild(
            buatElemen(
                "strong",
                (index + 1) + ". " + item.kategori
            )
        );

        baris.appendChild(
            buatParagraf(item.file.name)
        );

        hasilLampiran.appendChild(baris);
    });
}

/* ---------- MEMBUAT PAKET DOKUMEN ---------- */

form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!form.reportValidity()) return;

    if (!validasiDokumen()) return;

    const data = {
        kota: ambilNilai("kotaSurat"),
        tanggal: ambilNilai("tanggalSurat"),
        sumber: ambilNilai("sumberLowongan"),
        nama: ambilNilai("nama"),
        lahir: ambilNilai("lahir"),
        alamat: ambilNilai("alamat"),
        email: ambilNilai("email"),
        telepon: ambilNilai("telepon"),
        perusahaan: ambilNilai("perusahaan"),
        alamatPerusahaan: ambilNilai("alamatPerusahaan"),
        posisi: ambilNilai("posisi"),
        pendidikan: ambilNilai("pendidikan"),
        keahlian: ambilNilai("keahlian"),
        pengalaman: ambilNilai("pengalaman")
    };

    buatSurat(data);
    buatCV(data);
    buatDaftarLampiran();

    paketSudahDibuat = true;

    tombolPDF.disabled = false;
    tombolSalin.disabled = false;
    tombolCetak.disabled = false;

    tampilkanStatus(
        "Paket berhasil dibuat. Periksa surat, CV, dan dokumen sebelum mengunduh."
    );

    hasilSurat.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});

/* ---------- SALIN SURAT ---------- */

tombolSalin.addEventListener("click", async function () {
    if (!paketSudahDibuat) return;

    try {
        await navigator.clipboard.writeText(
            hasilSurat.innerText
        );

        tampilkanStatus("Teks surat berhasil disalin.");
    } catch (error) {
        tampilkanStatus(
            "Penyalinan otomatis tidak tersedia. Pilih dan salin teks surat secara manual."
        );
    }
});

/* ---------- CETAK MELALUI BROWSER ---------- */

tombolCetak.addEventListener("click", function () {
    if (!paketSudahDibuat) return;

    window.print();
});

/* ---------- MEMBACA FILE SEBAGAI ARRAY BUFFER ---------- */

function bacaFile(file) {
    return new Promise(function (resolve, reject) {
        const pembaca = new FileReader();

        pembaca.onload = function () {
            resolve(pembaca.result);
        };

        pembaca.onerror = function () {
            reject(new Error("Gagal membaca " + file.name));
        };

        pembaca.readAsArrayBuffer(file);
    });
}

/* ---------- MEMASUKKAN GAMBAR KE PDF ---------- */

async function masukkanGambarKePDF(pdfTujuan, file, bytes) {
    const { PDFDocument } = PDFLib;
    const ekstensi = file.name
        .split(".")
        .pop()
        .toLowerCase();

    let gambar;

    if (ekstensi === "jpg" || ekstensi === "jpeg") {
        gambar = await pdfTujuan.embedJpg(bytes);
    } else if (ekstensi === "png") {
        gambar = await pdfTujuan.embedPng(bytes);
    } else {
        throw new Error(
            "Gambar " + file.name +
            " tidak dapat dimasukkan. Gunakan JPG atau PNG."
        );
    }

    const ukuranHalaman = {
        width: 595.28,
        height: 841.89
    };

    const halaman = pdfTujuan.addPage([
        ukuranHalaman.width,
        ukuranHalaman.height
    ]);

    const margin = 35;
    const areaLebar = ukuranHalaman.width - margin * 2;
    const areaTinggi = ukuranHalaman.height - margin * 2;

    const skala = Math.min(
        areaLebar / gambar.width,
        areaTinggi / gambar.height,
        1
    );

    const lebar = gambar.width * skala;
    const tinggi = gambar.height * skala;

    halaman.drawImage(gambar, {
        x: (ukuranHalaman.width - lebar) / 2,
        y: (ukuranHalaman.height - tinggi) / 2,
        width: lebar,
        height: tinggi
    });
}

/* ---------- MEMBUAT SATU PDF GABUNGAN ---------- */

tombolPDF.addEventListener("click", async function () {
    if (!paketSudahDibuat || sedangMembuatPDF) return;

    if (typeof html2pdf === "undefined" ||
        typeof PDFLib === "undefined") {
        tampilkanStatus(
            "Library PDF belum tersedia. Periksa koneksi internet, lalu muat ulang halaman."
        );
        return;
    }

    sedangMembuatPDF = true;
    tombolPDF.disabled = true;

    try {
        tampilkanStatus("Sedang membuat PDF surat dan CV...");

        const opsiPDF = {
            margin: [10, 10, 10, 10],
            image: {
                type: "jpeg",
                quality: 0.95
            },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false
            },
            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait"
            },
            pagebreak: {
                mode: ["css", "legacy"],
                before: [".document:nth-child(2)", ".document:nth-child(3)"]
            }
        };

        // Buat PDF awal dari surat, CV, dan daftar dokumen.
        const blobAwal = await html2pdf()
            .set(opsiPDF)
            .from(document.getElementById("paketDokumen"))
            .outputPdf("blob");

        const { PDFDocument } = PDFLib;

        const pdfGabungan = await PDFDocument.load(
            await blobAwal.arrayBuffer()
        );

        // Masukkan setiap dokumen yang diunggah.
        const semuaFile = ambilSemuaFile();
        const fileGagal = [];

        for (const item of semuaFile) {
            const file = item.file;

            try {
                const bytes = await bacaFile(file);
                const ekstensi = file.name
                    .split(".")
                    .pop()
                    .toLowerCase();

                if (ekstensi === "pdf") {
                    const pdfSumber = await PDFDocument.load(bytes);

                    const halamanSalinan = await pdfGabungan.copyPages(
                        pdfSumber,
                        pdfSumber.getPageIndices()
                    );

                    halamanSalinan.forEach(function (halaman) {
                        pdfGabungan.addPage(halaman);
                    });
                } else {
                    await masukkanGambarKePDF(
                        pdfGabungan,
                        file,
                        bytes
                    );
                }
            } catch (error) {
                console.error(
                    "Tidak bisa memproses " + file.name,
                    error
                );

                fileGagal.push(file.name);
            }
        }

        tampilkanStatus("Sedang menyimpan paket PDF...");

        const hasilBytes = await pdfGabungan.save();

        const pdfAkhir = new Blob(
            [hasilBytes],
            { type: "application/pdf" }
        );

        const urlPDF = URL.createObjectURL(pdfAkhir);
        const tautan = document.createElement("a");

        tautan.href = urlPDF;
        tautan.download = "Paket-Lamaran-" +
            ambilNilai("nama")
                .replace(/[^a-z0-9_-]/gi, "-") +
            ".pdf";

        document.body.appendChild(tautan);
        tautan.click();
        tautan.remove();

        setTimeout(function () {
            URL.revokeObjectURL(urlPDF);
        }, 30000);

        if (fileGagal.length > 0) {
            tampilkanStatus(
                "PDF berhasil dibuat, tetapi beberapa file gagal digabung: " +
                fileGagal.join(", ") +
                ". Periksa file tersebut dan coba lagi."
            );
        } else {
            tampilkanStatus(
                "Berhasil! PDF berisi surat, CV, daftar lampiran, dan seluruh file pendukung yang diproses."
            );
        }
    } catch (error) {
        console.error(error);

        tampilkanStatus(
            "PDF gagal dibuat. Periksa koneksi internet dan pastikan file PDF tidak rusak atau terkunci."
        );
    } finally {
        sedangMembuatPDF = false;
        tombolPDF.disabled = !paketSudahDibuat;
    }
});

/* ---------- RESET SEMUA FORM ---------- */

tombolReset.addEventListener("click", function () {
    const setuju = confirm(
        "Yakin ingin menghapus semua data dan membuat formulir kosong?"
    );

    if (!setuju) return;

    form.reset();

    fotoData = "";
    previewFoto.hidden = true;
    previewFoto.removeAttribute("src");

    hapusTandaTangan();

    hasilSurat.replaceChildren(
        buatElemen(
            "p",
            "Isi formulir untuk membuat surat lamaran."
        )
    );

    hasilCV.replaceChildren();
    hasilLampiran.replaceChildren();

    hasilCV.hidden = true;
    hasilLampiran.hidden = true;

    paketSudahDibuat = false;

    tombolPDF.disabled = true;
    tombolSalin.disabled = true;
    tombolCetak.disabled = true;

    // Isi tanggal hari ini.
    document.getElementById("tanggalSurat").value =
        new Date().toLocaleDateString("en-CA");

    tampilkanStatus("Formulir berhasil direset.");
});

/* ---------- TANGGAL OTOMATIS ---------- */

document.getElementById("tanggalSurat").value =
    new Date().toLocaleDateString("en-CA");