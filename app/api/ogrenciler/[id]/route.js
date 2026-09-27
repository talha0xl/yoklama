import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";
import { denetimKaydet } from "../../../../lib/denetim";
import { kitapTakipOgrenciSil, kitapTakipOgrenciGuncelle } from "../../../../lib/kitapTakipSenkron";

export async function PATCH(req, { params }) {
  const body = await req.json();
  const supabase = supabaseServer();

  // Kitap Takip'teki karşılığını doğru eşleştirebilmek için güncellemeden
  // ÖNCEKİ isim/grup bilgisini alıyoruz.
  const { data: eskiKayit } = await supabase.from("ogrenciler").select("ad_soyad, grup_id").eq("id", params.id).maybeSingle();

  const { data, error } = await supabase
    .from("ogrenciler")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await denetimKaydet(supabase, { islem: "guncelleme", hedefTablo: "ogrenciler", hedefId: data.id, aciklama: `${data.ad_soyad} güncellendi` });

  // İsim ve/veya grup (sınıf) değiştiyse Kitap Takip'teki kaydı da eşitle.
  if (eskiKayit && (eskiKayit.ad_soyad !== data.ad_soyad || eskiKayit.grup_id !== data.grup_id)) {
    const [{ data: eskiGrup }, { data: yeniGrup }] = await Promise.all([
      eskiKayit.grup_id ? supabase.from("gruplar").select("isim").eq("id", eskiKayit.grup_id).maybeSingle() : Promise.resolve({ data: null }),
      data.grup_id ? supabase.from("gruplar").select("isim").eq("id", data.grup_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    await kitapTakipOgrenciGuncelle(supabase, {
      eskiGrupIsim: eskiGrup?.isim,
      eskiAdSoyad: eskiKayit.ad_soyad,
      yeniGrupIsim: yeniGrup?.isim,
      yeniAdSoyad: data.ad_soyad,
    });
  }

  return NextResponse.json({ ogrenci: data });
}

export async function DELETE(req, { params }) {
  const supabase = supabaseServer();
  // Kalıcı silmek yerine pasif işaretliyoruz, geçmiş yoklama kayıtları bozulmasın diye
  const { data, error } = await supabase.from("ogrenciler").update({ aktif: false }).eq("id", params.id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await denetimKaydet(supabase, { islem: "silme", hedefTablo: "ogrenciler", hedefId: params.id, aciklama: `${data?.ad_soyad || params.id} kaldırıldı` });

  // Kitap Takip'teki eşini de kaldır (o öğrencinin kitap/okuma kayıtları da
  // Kitap Takip'in kendi mantığıyla birlikte silinir).
  if (data?.grup_id) {
    const { data: grup } = await supabase.from("gruplar").select("isim").eq("id", data.grup_id).maybeSingle();
    await kitapTakipOgrenciSil(supabase, { grupIsim: grup?.isim, adSoyad: data?.ad_soyad });
  }

  return NextResponse.json({ ok: true });
}
