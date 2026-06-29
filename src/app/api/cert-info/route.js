import { NextResponse } from "next/server";

// Since Google Drive API is restricted, we'll use a different approach:
// Parse the file metadata using the Google Drive embed page which doesn't need API key
// Or derive certificate info from the URL context and candidate data

export async function POST(request) {
  try {
    const body = await request.json();
    const { urls, candidateData } = body;

    if (!urls || urls.length === 0) {
      return NextResponse.json({ files: [] });
    }

    const files = [];

    // Map URLs to certificate types based on field names from candidate data
    if (candidateData) {
      if (candidateData.sertifikatBahasaJepang) {
        files.push({
          url: candidateData.sertifikatBahasaJepang,
          nama: "国際交流基金日本語基礎テスト",
          tanggal: candidateData.tanggalJFT || "",
          type: "JFT",
        });
      }
      if (candidateData.sertifikatSSW) {
        files.push({
          url: candidateData.sertifikatSSW,
          nama: "介護日本語評価試験結果通知書",
          tanggal: candidateData.tanggalSSW || "",
          type: "SSW",
        });

        // If bidang is KAIGO, add Kaigo-specific cert
        if (candidateData.bidangKerja === "KAIGO") {
          files.push({
            url: candidateData.sertifikatSSW,
            nama: "介護日本語評価試験結果通知書 (Kaigo)",
            tanggal: candidateData.tanggalSSWKaigo || candidateData.tanggalSSW || "",
            type: "SSW_KAIGO",
          });
        }
      }
      if (candidateData.sertifikatSenmonkyuu) {
        files.push({
          url: candidateData.sertifikatSenmonkyuu,
          nama: "技能実習修了証明書",
          tanggal: candidateData.tanggalShuryoShomei || "",
          type: "SENMONKYUU",
        });
      }
      if (candidateData.sertifikatSelesaiMagang) {
        files.push({
          url: candidateData.sertifikatSelesaiMagang,
          nama: "技能実習修了証明書 (JITCO)",
          tanggal: "",
          type: "JITCO",
        });
      }
    }

    // If no candidateData provided, just return basic info from URLs
    if (files.length === 0) {
      for (const url of urls) {
        files.push({
          url,
          nama: "証明書",
          tanggal: "",
          type: "UNKNOWN",
        });
      }
    }

    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ error: err.message, files: [] }, { status: 500 });
  }
}
