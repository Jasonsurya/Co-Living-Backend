const namaHari = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const namaBulan = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatTanggalSurat(tanggal) {
  console.log("=== FORMAT TANGGAL ===");
  console.log("nilai:", tanggal);
  console.log("typeof:", typeof tanggal);
  console.log("toISOString:", typeof tanggal?.toISOString);

  if (!tanggal) {
    return {
      hari: "",
      tanggal: "",
      bulan: "",
      tahun: "",
    };
  }

  let tanggalString;

  if (tanggal && typeof tanggal.toISOString === "function") {
    tanggalString = tanggal.toISOString().slice(0, 10);
  } else {
    tanggalString = String(tanggal).slice(0, 10);
  }

  console.log("tanggalString:", tanggalString);

  const [tahun, bulan, hari] =
    tanggalString.split("-").map(Number);

  console.log("tahun:", tahun);
  console.log("bulan:", bulan);
  console.log("hari:", hari);

  if (
    Number.isNaN(tahun) ||
    Number.isNaN(bulan) ||
    Number.isNaN(hari)
  ) {
    return {
      hari: "",
      tanggal: "",
      bulan: "",
      tahun: "",
    };
  }

  const date = new Date(
    tahun,
    bulan - 1,
    hari
  );

  console.log("date:", date);

  return {
    hari: namaHari[date.getDay()],
    tanggal: date.getDate(),
    bulan: namaBulan[date.getMonth()],
    tahun: date.getFullYear(),
  };
}

module.exports = {
  formatTanggalSurat,
};