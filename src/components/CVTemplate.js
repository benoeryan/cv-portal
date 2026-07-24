"use client";
import {
  formatDateJP,
  formatDateShortJP,
  calculateAge,
  genderToJP,
  maritalStatusToJP,
  religionToJP,
  relationToJP,
  boolToJP,
  livingToJP,
  jobStatusToJP,
} from "@/lib/cvHelpers";
import { getDriveImageUrl } from "@/components/DriveImage";

export default function CVTemplate({ data }) {
  if (!data) return null;

  const age = calculateAge(data.tanggalLahir);
  const photoUrl = getDriveImageUrl(data.pasPhoto);

  return (
    <div className="cv-container bg-white p-6 max-w-[210mm] mx-auto" id="cv-print-area">
      {/* Header */}
      <h2 className="text-center text-lg font-bold mb-4 border-b-2 border-black pb-2">
        履歴書 (CV)
      </h2>

      {/* Photo + Basic Info */}
      <div className="flex gap-4 mb-4">
        {/* Photo */}
        <div className="flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt="Pas Photo" className="w-[100px] h-[130px] object-cover border border-gray-300" />
          ) : (
            <div className="w-[100px] h-[130px] border border-gray-300 flex items-center justify-center bg-[#FFF2CC] text-gray-400 text-xs text-center">
              Pas Photo<br/>3x4
            </div>
          )}
        </div>

        {/* Basic Info Table */}
        <div className="flex-grow">
          <table className="cv-table">
            <tbody>
              <tr>
                <td className="font-bold bg-[#FFF2CC] w-[14%] text-xs">フリガナ</td>
                <td colSpan="5" className={`h-[45px] bg-white text-center align-middle select-none ${data.namaTangan ? "text-base font-bold" : "text-gray-300 text-[10px] italic"}`}>
                  {data.namaTangan || "(Tulis nama lengkap dengan tangan di sini setelah dicetak / Please write your full name here by hand after printing)"}
                </td>
              </tr>
              <tr>
                <td className="font-bold bg-[#FFF2CC] w-[14%]">氏名</td>
                <td colSpan="3" className="text-base font-bold">{data.namaLengkap}</td>
                <td className="font-bold bg-[#FFF2CC] w-[10%]">呼び名</td>
                <td>{data.namaPanggilan}</td>
              </tr>
              <tr>
                <td className="font-bold bg-[#FFF2CC]">出身地</td>
                <td>{data.translations?.tempatLahir || data.tempatLahir}</td>
                <td className="font-bold bg-[#FFF2CC] w-[12%]">生年月日</td>
                <td>{formatDateJP(data.tanggalLahir)}</td>
                <td className="font-bold bg-[#FFF2CC]">年齢</td>
                <td>{age || "-"} 歳</td>
              </tr>
              <tr>
                <td className="font-bold bg-[#FFF2CC]">性別</td>
                <td>{genderToJP(data.jenisKelamin)}</td>
                <td className="font-bold bg-[#FFF2CC]">婚姻状況</td>
                <td>{maritalStatusToJP(data.statusPernikahan)}</td>
                <td className="font-bold bg-[#FFF2CC]">血液型</td>
                <td>{data.golonganDarah}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* More Info */}
      <table className="cv-table mb-4">
        <tbody>
          <tr>
            <td className="font-bold bg-[#FFF2CC] w-[14%]">宗教</td>
            <td className="w-[14%]">{religionToJP(data.agama)}</td>
            <td className="font-bold bg-[#FFF2CC] w-[10%]">身長</td>
            <td className="w-[14%]">{data.tinggiBadan} cm</td>
            <td className="font-bold bg-[#FFF2CC] w-[10%]">体重</td>
            <td>{data.beratBadan} kg</td>
          </tr>
          <tr>
            <td className="font-bold bg-[#FFF2CC]">電話番号</td>
            <td colSpan="2">{data.noHp}</td>
            <td className="font-bold bg-[#FFF2CC]">メールアドレス</td>
            <td colSpan="2" className="text-xs">{data.email}</td>
          </tr>
          <tr>
            <td className="font-bold bg-[#FFF2CC]">住所</td>
            <td colSpan="5" className="text-xs">{data.translations?.alamatLengkap || data.alamatLengkap}</td>
          </tr>
          <tr>
            <td className="font-bold bg-[#FFF2CC]">パスポート</td>
            <td>{data.memilikiPaspor === "YA" || data.nomorPaspor ? `有 (${data.nomorPaspor || ""})` : "無"}</td>
            <td className="font-bold bg-[#FFF2CC]">入国歴</td>
            <td>{data.pernahKeJepang === "YA" ? "有" : "無"}</td>
            <td className="font-bold bg-[#FFF2CC]">利き手</td>
            <td>{data.dominanTangan === "KANAN" ? "右" : data.dominanTangan === "KIRI" ? "左" : "-"}</td>
          </tr>
        </tbody>
      </table>

      {/* Health */}
      <table className="cv-table mb-4">
        <tbody>
          <tr>
            <td className="font-bold bg-[#FFF2CC] w-[12%]">喫煙</td>
            <td className="w-[13%]">{boolToJP(data.merokok)}{data.merokok === "YA" && data.jumlahRokok ? ` (${data.jumlahRokok}本)` : ""}</td>
            <td className="font-bold bg-[#FFF2CC] w-[10%]">飲酒</td>
            <td className="w-[10%]">{boolToJP(data.minumAlkohol)}</td>
            <td className="font-bold bg-[#FFF2CC] w-[12%]">タトゥー</td>
            <td className="w-[10%]">{boolToJP(data.tato)}</td>
            <td className="font-bold bg-[#FFF2CC] w-[10%]">重病</td>
            <td>{boolToJP(data.penyakitBerat)}{data.penyakitBerat === "YA" ? ` (${data.namaPenyakit})` : ""}</td>
          </tr>
          <tr>
            <td className="font-bold bg-[#FFF2CC]">アレルギー</td>
            <td colSpan="3">{boolToJP(data.alergi)}{data.alergi === "YA" ? ` (${data.namaAlergi})` : ""}</td>
            <td className="font-bold bg-[#FFF2CC]">趣味</td>
            <td colSpan="3">{data.translations?.hobi || data.hobi}</td>
          </tr>
        </tbody>
      </table>

      {/* Education */}
      <h3 className="font-bold text-sm mb-2">学歴 (Riwayat Pendidikan)</h3>
      <table className="cv-table mb-4">
        <thead>
          <tr className="bg-[#FFF2CC]">
            <th className="w-[5%]">No</th>
            <th>学校名</th>
            <th className="w-[12%]">入学</th>
            <th className="w-[12%]">卒業</th>
            <th className="w-[15%]">専攻</th>
          </tr>
        </thead>
        <tbody>
          {data.sdNama && (
            <tr>
              <td>1</td>
              <td>{data.sdNama}</td>
              <td>{formatDateShortJP(data.sdMasuk)}</td>
              <td>{formatDateShortJP(data.sdLulus)}</td>
              <td>-</td>
            </tr>
          )}
          {data.smpNama && (
            <tr>
              <td>2</td>
              <td>{data.smpNama}</td>
              <td>{formatDateShortJP(data.smpMasuk)}</td>
              <td>{formatDateShortJP(data.smpLulus)}</td>
              <td>-</td>
            </tr>
          )}
          {data.smaNama && (
            <tr>
              <td>3</td>
              <td>{data.smaNama}</td>
              <td>{formatDateShortJP(data.smaMasuk)}</td>
              <td>{formatDateShortJP(data.smaLulus)}</td>
              <td>{data.smaJurusan || "-"}</td>
            </tr>
          )}
          {data.univNama && (
            <tr>
              <td>4</td>
              <td>{data.univNama}</td>
              <td>{formatDateShortJP(data.univMasuk)}</td>
              <td>{formatDateShortJP(data.univLulus)}</td>
              <td>{data.univJurusan || "-"}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Work History */}
      <h3 className="font-bold text-sm mb-2">職歴 (Riwayat Pekerjaan)</h3>
      <table className="cv-table mb-4">
        <thead>
          <tr className="bg-[#FFF2CC]">
            <th className="w-[5%]">No</th>
            <th>会社名</th>
            <th className="w-[14%]">入社</th>
            <th className="w-[14%]">退社</th>
            <th className="w-[11%]">雇用形態</th>
            <th className="w-[20%]">職類</th>
          </tr>
        </thead>
        <tbody>
          {data.pekerjaan?.filter((p) => p.perusahaan).map((p, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td className="text-xs">{p.perusahaan}</td>
              <td className="text-xs">{formatDateShortJP(p.masuk)}</td>
              <td className="text-xs">{formatDateShortJP(p.keluar)}</td>
              <td className="text-xs">{jobStatusToJP(p.status)}</td>
              <td className="text-xs">{p.bidang || "-"}</td>
            </tr>
          ))}
          {(!data.pekerjaan || data.pekerjaan.filter((p) => p.perusahaan).length === 0) && (
            <tr><td colSpan="6" className="text-center text-gray-400">なし</td></tr>
          )}
        </tbody>
      </table>

      {/* Family */}
      <h3 className="font-bold text-sm mb-2">家族構成 (Data Keluarga)</h3>
      <table className="cv-table mb-4">
        <thead>
          <tr className="bg-[#FFF2CC]">
            <th className="w-[12%]">続柄</th>
            <th>氏名</th>
            <th className="w-[8%]">年齢</th>
            <th className="w-[18%]">職業</th>
            <th className="w-[12%]">月収</th>
            <th className="w-[8%]">同居</th>
          </tr>
        </thead>
        <tbody>
          {data.keluarga?.filter((k) => k.nama).map((k, idx) => (
            <tr key={idx}>
              <td className="text-xs">{relationToJP(k.hubungan)}</td>
              <td className="text-xs">{k.nama}</td>
              <td className="text-xs">{k.usia} 歳</td>
              <td className="text-xs">{data.translations?.[`keluarga_${idx}_pekerjaan`] || k.pekerjaan}</td>
              <td className="text-xs">{k.gaji}</td>
              <td className="text-center text-xs">{livingToJP(k.tinggalBersama)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Motivation - Use Japanese translations if available */}
      <h3 className="font-bold text-sm mb-2">志望理由・自己PR</h3>
      <table className="cv-table mb-4">
        <tbody>
          <tr>
            <td className="font-bold bg-[#FFF2CC] w-[18%] align-top">長所 (kelebihan)</td>
            <td className="whitespace-pre-wrap text-xs">{data.translations?.kelebihan || data.kelebihan}</td>
          </tr>
          <tr>
            <td className="font-bold bg-[#FFF2CC] align-top">短所 (kekurangan)</td>
            <td className="whitespace-pre-wrap text-xs">{data.translations?.kekurangan || data.kekurangan}</td>
          </tr>
          <tr>
            <td className="font-bold bg-[#FFF2CC] align-top">来日理由</td>
            <td className="whitespace-pre-wrap text-xs">{data.translations?.alasanKeJepang || data.alasanKeJepang}</td>
          </tr>
          <tr>
            <td className="font-bold bg-[#FFF2CC] align-top">職業希望理由</td>
            <td className="whitespace-pre-wrap text-xs">{data.translations?.alasanMelamarBidang || data.alasanMelamarBidang}</td>
          </tr>
          {(data.alasanKaigofukushishi || data.translations?.alasanKaigofukushishi) && (
            <tr>
              <td className="font-bold bg-[#FFF2CC] align-top">介護福祉士志望理由</td>
              <td className="whitespace-pre-wrap text-xs">{data.translations?.alasanKaigofukushishi || data.alasanKaigofukushishi}</td>
            </tr>
          )}
          {(data.promosiDiri || data.translations?.promosiDiri) && (
            <tr>
              <td className="font-bold bg-[#FFF2CC] align-top">自己PR (Promosi Diri)</td>
              <td className="whitespace-pre-wrap text-xs">{data.translations?.promosiDiri || data.promosiDiri}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Certificates Section - 免許・資格・受験日 */}
      <h3 className="font-bold text-sm mb-2">免許・資格・受験日</h3>
      <table className="cv-table">
        <tbody>
          {/* 1. Language Certificates (All Categories) */}
          {data.tanggalJFT && (
            <tr><td className="text-xs py-1">国際交流基金日本語基礎テスト - 受験日: {data.tanggalJFT}</td></tr>
          )}
          {data.tanggalJLPT && (
            <tr><td className="text-xs py-1">日本語能力試験 (JLPT) - 受験日: {data.tanggalJLPT}</td></tr>
          )}

          {/* 2. Category-Specific Certificates */}
          {data.kategoriKandidat?.toUpperCase() === "NEW COMER" ? (
            <>
              {/* SSW Mapping for New Comer */}
              {data.bidangKerja === "KAIGO" ? (
                <>
                  {data.tanggalSSW && (
                    <tr><td className="text-xs py-1">介護技能評価試験 - 受験日: {data.tanggalSSW}</td></tr>
                  )}
                  {data.tanggalSSWKaigo && (
                    <tr><td className="text-xs py-1">介護日本語評価試験 - 受験日: {data.tanggalSSWKaigo}</td></tr>
                  )}
                </>
              ) : (
                <>
                  {data.tanggalSSW && (
                    <tr>
                      <td className="text-xs py-1">
                        {data.bidangKerja === "PM" ? "品製造業技能測定試験" :
                         data.bidangKerja === "RESTORAN" ? "外食業技能測定試験" :
                         data.bidangKerja === "HOTEL" ? "宿泊業技能測定試験" :
                         data.bidangKerja === "BUILD CLEANING" ? "ルクリーニング分野特定技能評価試験" :
                         data.bidangKerja === "PERTANIAN" ? "農業技能測定試験結果通知書" :
                         "特定技能評価試験"} - 受験日: {data.tanggalSSW}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </>
          ) : data.kategoriKandidat?.toUpperCase() === "EX-MAGANG/EX-TRAINEER" ? (
            <>
              {/* Apprenticeship Certificates for Ex-Magang */}
              {data.tanggalShuryoShomei && (
                <tr><td className="text-xs py-1">技能実習修了証明書 - 受験日: {data.tanggalShuryoShomei}</td></tr>
              )}
            </>
          ) : null}

          {/* 3. SIM A (All Categories) */}
          {data.simA === "YA" && (
            <tr><td className="text-xs py-1">インドネシアの普通自動車免許</td></tr>
          )}

          {/* 4. Custom Certificates */}
          {data.sertifikat && data.sertifikat.length > 0 && data.sertifikat.map((s, idx) => (
            s.nama && s.tanggal ? (
              <tr key={`sert-${idx}`}>
                <td className="text-xs py-1">{s.nama} - 受験日: {s.tanggal}</td>
              </tr>
            ) : null
          ))}

          {/* Fallback */}
          {!data.tanggalJFT && !data.tanggalJLPT && !data.tanggalSSW && !data.tanggalSSWKaigo && !data.tanggalShuryoShomei && data.simA !== "YA" && !(data.sertifikat && data.sertifikat.some(s => s.nama && s.tanggal)) && (
            <tr><td className="text-xs py-1 text-gray-400">-</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
