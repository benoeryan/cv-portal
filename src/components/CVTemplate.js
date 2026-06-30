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
    <div className="cv-container bg-white p-6 max-w-[297mm] mx-auto" id="cv-print-area">
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
            <div className="w-[100px] h-[130px] border border-gray-300 flex items-center justify-center bg-gray-100 text-gray-400 text-xs text-center">
              Pas Photo<br/>3x4
            </div>
          )}
        </div>

        {/* Basic Info Table */}
        <div className="flex-grow">
          <table className="cv-table">
            <tbody>
              <tr>
                <td className="font-bold bg-gray-100 w-[120px]">氏名</td>
                <td colSpan="3" className="text-base font-bold">{data.namaLengkap}</td>
                <td className="font-bold bg-gray-100 w-[60px]">読み方</td>
                <td>{data.namaPanggilan}</td>
              </tr>
              <tr>
                <td className="font-bold bg-gray-100">出身地</td>
                <td>{data.tempatLahir}</td>
                <td className="font-bold bg-gray-100">生年月日</td>
                <td>{formatDateJP(data.tanggalLahir)}</td>
                <td className="font-bold bg-gray-100">年齢</td>
                <td>{age || "-"} 歳</td>
              </tr>
              <tr>
                <td className="font-bold bg-gray-100">性別</td>
                <td>{genderToJP(data.jenisKelamin)}</td>
                <td className="font-bold bg-gray-100">婚姻</td>
                <td>{maritalStatusToJP(data.statusPernikahan)}</td>
                <td className="font-bold bg-gray-100">血液型</td>
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
            <td className="font-bold bg-gray-100 w-[120px]">宗教</td>
            <td>{religionToJP(data.agama)}</td>
            <td className="font-bold bg-gray-100">身長</td>
            <td>{data.tinggiBadan} cm</td>
            <td className="font-bold bg-gray-100">体重</td>
            <td>{data.beratBadan} kg</td>
          </tr>
          <tr>
            <td className="font-bold bg-gray-100">電話番号</td>
            <td colSpan="2">{data.noHp}</td>
            <td className="font-bold bg-gray-100">メールアドレス</td>
            <td colSpan="2" className="text-xs">{data.email}</td>
          </tr>
          <tr>
            <td className="font-bold bg-gray-100">住所</td>
            <td colSpan="5" className="text-xs">{data.alamatLengkap}</td>
          </tr>
          <tr>
            <td className="font-bold bg-gray-100">パスポート</td>
            <td>{data.memilikiPaspor === "YA" || data.nomorPaspor ? `有 (${data.nomorPaspor || ""})` : "無"}</td>
            <td className="font-bold bg-gray-100">有効期限</td>
            <td>{data.masaBerlakuPaspor ? formatDateJP(data.masaBerlakuPaspor) : "-"}</td>
            <td className="font-bold bg-gray-100">利き手</td>
            <td>{data.dominanTangan === "KANAN" ? "右" : data.dominanTangan === "KIRI" ? "左" : "-"}</td>
          </tr>
        </tbody>
      </table>

      {/* Health */}
      <table className="cv-table mb-4">
        <tbody>
          <tr>
            <td className="font-bold bg-gray-100 w-[80px]">喫煙</td>
            <td className="w-[70px]">{boolToJP(data.merokok)}{data.merokok === "YA" && data.jumlahRokok ? ` (${data.jumlahRokok}本)` : ""}</td>
            <td className="font-bold bg-gray-100 w-[60px]">飲酒</td>
            <td className="w-[50px]">{boolToJP(data.minumAlkohol)}</td>
            <td className="font-bold bg-gray-100 w-[70px]">タトゥー</td>
            <td className="w-[50px]">{boolToJP(data.tato)}</td>
            <td className="font-bold bg-gray-100 w-[60px]">重病</td>
            <td>{boolToJP(data.penyakitBerat)}{data.penyakitBerat === "YA" ? ` (${data.namaPenyakit})` : ""}</td>
          </tr>
          <tr>
            <td className="font-bold bg-gray-100">アレルギー</td>
            <td colSpan="7">{boolToJP(data.alergi)}{data.alergi === "YA" ? ` (${data.namaAlergi})` : ""}</td>
          </tr>
        </tbody>
      </table>

      {/* Education */}
      <h3 className="font-bold text-sm mb-2">学歴 (Riwayat Pendidikan)</h3>
      <table className="cv-table mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="w-[30px]">No</th>
            <th>学校名</th>
            <th className="w-[90px]">入学</th>
            <th className="w-[90px]">卒業</th>
            <th className="w-[110px]">専攻</th>
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
          <tr className="bg-gray-100">
            <th className="w-[30px]">No</th>
            <th>会社名</th>
            <th className="w-[80px]">入社</th>
            <th className="w-[80px]">退社</th>
            <th className="w-[70px]">雇用形態</th>
            <th>業務内容</th>
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
              <td className="text-xs">{p.uraian}</td>
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
          <tr className="bg-gray-100">
            <th>続柄</th>
            <th>氏名</th>
            <th className="w-[40px]">年齢</th>
            <th>職業</th>
            <th className="w-[80px]">月収</th>
            <th className="w-[40px]">同居</th>
          </tr>
        </thead>
        <tbody>
          {data.keluarga?.filter((k) => k.nama).map((k, idx) => (
            <tr key={idx}>
              <td className="text-xs">{relationToJP(k.hubungan)}</td>
              <td className="text-xs">{k.nama}</td>
              <td className="text-xs">{k.usia}</td>
              <td className="text-xs">{k.pekerjaan}</td>
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
            <td className="font-bold bg-gray-100 w-[150px] align-top">長所 (kelebihan)</td>
            <td className="whitespace-pre-wrap text-xs">{data.translations?.kelebihan || data.kelebihan}</td>
          </tr>
          <tr>
            <td className="font-bold bg-gray-100 align-top">短所 (kekurangan)</td>
            <td className="whitespace-pre-wrap text-xs">{data.translations?.kekurangan || data.kekurangan}</td>
          </tr>
          <tr>
            <td className="font-bold bg-gray-100 align-top">来日理由</td>
            <td className="whitespace-pre-wrap text-xs">{data.translations?.alasanKeJepang || data.alasanKeJepang}</td>
          </tr>
          <tr>
            <td className="font-bold bg-gray-100 align-top">職業希望理由</td>
            <td className="whitespace-pre-wrap text-xs">{data.translations?.alasanMelamarBidang || data.alasanMelamarBidang}</td>
          </tr>
          {(data.alasanKaigofukushishi || data.translations?.alasanKaigofukushishi) && (
            <tr>
              <td className="font-bold bg-gray-100 align-top">介護福祉士志望理由</td>
              <td className="whitespace-pre-wrap text-xs">{data.translations?.alasanKaigofukushishi || data.alasanKaigofukushishi}</td>
            </tr>
          )}
          <tr>
            <td className="font-bold bg-gray-100 align-top">将来の夢</td>
            <td className="whitespace-pre-wrap text-xs">{data.translations?.impianMasaDepan || data.impianMasaDepan}</td>
          </tr>
        </tbody>
      </table>

      {/* Additional */}
      <table className="cv-table mb-4">
        <tbody>
          <tr>
            <td className="font-bold bg-gray-100 w-[150px]">渡航歴</td>
            <td>{data.pernahKeJepang === "YA" ? `有 (${data.keperluanApa || ""})` : "無"}</td>
            <td className="font-bold bg-gray-100 w-[150px]">趣味</td>
            <td>{data.hobi}</td>
          </tr>
        </tbody>
      </table>

      {/* Emergency Contact */}
      <table className="cv-table mb-4">
        <tbody>
          <tr>
            <td className="font-bold bg-gray-100 w-[150px]">緊急連絡先</td>
            <td>{data.nomorDarurat}</td>
            <td className="font-bold bg-gray-100">氏名</td>
            <td>{data.namaPemilikDarurat}</td>
            <td className="font-bold bg-gray-100">続柄</td>
            <td>{data.hubunganDarurat}</td>
          </tr>
        </tbody>
      </table>

      {/* Certificates Section - 免許・資格・受験日 */}
      <h3 className="font-bold text-sm mb-2">免許・資格・受験日</h3>
      <table className="cv-table">
        <tbody>
          {/* Always show individual date fields as primary entries */}
          {data.tanggalJFT && (
            <tr><td className="text-xs py-1">国際交流基金日本語基礎テスト - 受験日: {data.tanggalJFT}</td></tr>
          )}
          {data.tanggalSSW && (
            <tr><td className="text-xs py-1">介護日本語評価試験結果通知書 - 受験日: {data.tanggalSSW}</td></tr>
          )}
          {data.tanggalSSWKaigo && (
            <tr><td className="text-xs py-1">介護日本語評価試験結果通知書 (Kaigo) - 受験日: {data.tanggalSSWKaigo}</td></tr>
          )}
          {data.tanggalJLPT && (
            <tr><td className="text-xs py-1">日本語能力試験 (JLPT) - 受験日: {data.tanggalJLPT}</td></tr>
          )}
          {data.tanggalShuryoShomei && (
            <tr><td className="text-xs py-1">技能実習修了証明書 - 受験日: {data.tanggalShuryoShomei}</td></tr>
          )}
          {/* Show custom sertifikat entries as additional rows */}
          {data.sertifikat && data.sertifikat.length > 0 && data.sertifikat.map((s, idx) => (
            s.nama && s.tanggal ? (
              <tr key={`sert-${idx}`}>
                <td className="text-xs py-1">{s.nama} - 受験日: {s.tanggal}</td>
              </tr>
            ) : null
          ))}
          {/* Show placeholder if nothing is available */}
          {!data.tanggalJFT && !data.tanggalSSW && !data.tanggalSSWKaigo && !data.tanggalJLPT && !data.tanggalShuryoShomei && !(data.sertifikat && data.sertifikat.some(s => s.nama && s.tanggal)) && (
            <tr><td className="text-xs py-1 text-gray-400">-</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
