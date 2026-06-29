// Helper functions for CV generation

export function formatDateJP(dateStr) {
  if (!dateStr) return "";
  let d;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      let [a, b, c] = parts;
      // Determine format: M/D/YY or D/M/YY or YYYY/MM/DD
      if (a.length === 4) {
        // YYYY/MM/DD
        d = new Date(parseInt(a), parseInt(b) - 1, parseInt(c));
      } else {
        // M/D/YY format (US style from Google Sheets)
        let year = parseInt(c);
        if (year < 100) year = year > 30 ? 1900 + year : 2000 + year;
        d = new Date(year, parseInt(a) - 1, parseInt(b));
      }
    }
  } else if (dateStr.includes("-")) {
    d = new Date(dateStr);
  } else {
    d = new Date(dateStr);
  }
  if (!d || isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日`;
}

export function formatDateShortJP(dateStr) {
  if (!dateStr) return "";
  let d;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      let [a, b, c] = parts;
      if (a.length === 4) {
        d = new Date(parseInt(a), parseInt(b) - 1, parseInt(c));
      } else {
        let year = parseInt(c);
        if (year < 100) year = year > 30 ? 1900 + year : 2000 + year;
        d = new Date(year, parseInt(a) - 1, parseInt(b));
      }
    }
  } else if (dateStr.includes("-")) {
    d = new Date(dateStr);
  } else {
    d = new Date(dateStr);
  }
  if (!d || isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月`;
}

export function calculateAge(birthDate) {
  if (!birthDate) return "";
  let birth;
  if (birthDate.includes("/")) {
    const parts = birthDate.split("/");
    if (parts.length === 3) {
      let [a, b, c] = parts;
      if (a.length === 4) {
        birth = new Date(parseInt(a), parseInt(b) - 1, parseInt(c));
      } else {
        let year = parseInt(c);
        if (year < 100) year = year > 30 ? 1900 + year : 2000 + year;
        birth = new Date(year, parseInt(a) - 1, parseInt(b));
      }
    }
  } else {
    birth = new Date(birthDate);
  }
  
  if (!birth || isNaN(birth.getTime())) return "";
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function genderToJP(gender) {
  if (!gender) return "";
  if (gender === "LAKI-LAKI") return "男";
  if (gender === "PEREMPUAN") return "女";
  return gender;
}

export function maritalStatusToJP(status) {
  if (!status) return "";
  if (status === "BELUM MENIKAH") return "未婚";
  if (status === "SUDAH MENIKAH") return "既婚";
  if (status === "CERAI") return "離婚";
  return status;
}

export function religionToJP(religion) {
  const map = {
    ISLAM: "イスラム教",
    KRISTEN: "キリスト教",
    KATOLIK: "カトリック",
    HINDU: "ヒンドゥー教",
    BUDHA: "仏教",
    KONGHUCU: "儒教",
  };
  return map[religion] || religion || "";
}

export function relationToJP(relation) {
  const map = {
    AYAH: "父",
    IBU: "母",
    "KAKAK LAKI-LAKI": "兄",
    "KAKAK PEREMPUAN": "姉",
    "ADIK LAKI-LAKI": "弟",
    "ADIK PEREMPUAN": "妹",
    SUAMI: "主人",
    ISTRI: "妻",
    "ANAK LAKI-LAKI": "息子",
    "ANAK PEREMPUAN": "娘",
    KAKEK: "祖父",
    NENEK: "祖母",
    PAMAN: "叔父",
    BIBI: "叔母",
  };
  return map[relation] || relation || "";
}

export function boolToJP(val) {
  if (val === "YA") return "有";
  if (val === "TIDAK") return "無";
  return val || "";
}

export function livingToJP(val) {
  if (val === "TINGGAL BERSAMA") return "〇";
  if (val === "TINGGAL TERPISAH") return "×";
  return "";
}

export function jobStatusToJP(status) {
  const map = {
    "Pegawai Tetap": "正社員",
    "Pegawai Kontrak": "契約社員",
    "Magang/Internship": "インターンシップ",
    "Ginou jisshuusei": "技能実習生",
    "Membantu Orang Tua": "家族手伝い",
    "Usaha Pribadi": "自営業",
  };
  return map[status] || status || "";
}
