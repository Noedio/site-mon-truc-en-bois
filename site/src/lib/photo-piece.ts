// Photo envoyée par le client sur la fiche produit (reprend la logique de l'ancienne fiche) :
// - un aperçu réduit à 900 px (data URL), affiché dans le configurateur et gardé dans la ligne du panier ;
// - une version à 2400 px pour la fabrication, gardée dans IndexedDB sous une clé (photoCle de la ligne).
// Même base que l'ancien site (« mtb-photos », magasin « photos ») : le panier la retrouve à l'envoi.

function base(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    if (!("indexedDB" in window)) return ko(new Error("indisponible"));
    const r = indexedDB.open("mtb-photos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("photos");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

async function stocker(cle: string, blob: Blob) {
  try {
    const b = await base();
    await new Promise((ok, ko) => {
      const t = b.transaction("photos", "readwrite");
      t.objectStore("photos").put(blob, cle);
      t.oncomplete = ok;
      t.onerror = () => ko(t.error);
    });
    return true;
  } catch {
    return false;
  }
}

function reduire(img: HTMLImageElement, cote: number) {
  const r = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * r);
  c.height = Math.round(img.naturalHeight * r);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Prépare la photo choisie : aperçu réduit et clé de la version haute qualité (vide si le stockage a échoué). */
export function preparerPhoto(fichier: File): Promise<{ apercu: string; cle: string }> {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onerror = () => ko(new Error("illisible"));
    img.onload = async () => {
      const apercu = reduire(img, 900).toDataURL("image/jpeg", 0.8);
      const cle = "photo-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const blob = await new Promise<Blob | null>((r) => reduire(img, 2400).toBlob(r, "image/jpeg", 0.9));
      URL.revokeObjectURL(img.src);
      ok({ apercu, cle: blob && (await stocker(cle, blob)) ? cle : "" });
    };
    img.src = URL.createObjectURL(fichier);
  });
}
