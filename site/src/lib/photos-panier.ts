// Photos des clients en haute qualité, gardées dans le navigateur jusqu'à l'envoi de la commande.
// Même base que l'ancien site (js/main.js) : base « mtb-photos », magasin « photos », clé = photoCle de la ligne.
// La fiche produit y range la photo (stockerPhoto), le panier la lit pour l'envoyer au serveur.

function base(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    if (!("indexedDB" in window)) return ko(new Error("indisponible"));
    const r = indexedDB.open("mtb-photos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("photos");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

export async function stockerPhoto(cle: string, photo: Blob) {
  try {
    const b = await base();
    await new Promise((ok, ko) => {
      const t = b.transaction("photos", "readwrite");
      t.objectStore("photos").put(photo, cle);
      t.oncomplete = ok;
      t.onerror = () => ko(t.error);
    });
    return true;
  } catch {
    return false;
  }
}

export async function lirePhoto(cle: string): Promise<Blob | null> {
  try {
    const b = await base();
    return await new Promise((ok) => {
      const r = b.transaction("photos").objectStore("photos").get(cle);
      r.onsuccess = () => ok(r.result || null);
      r.onerror = () => ok(null);
    });
  } catch {
    return null;
  }
}

export async function supprimerPhoto(cle: string) {
  try {
    const b = await base();
    b.transaction("photos", "readwrite").objectStore("photos").delete(cle);
  } catch {
    // Rien à faire : la photo restera dans le navigateur.
  }
}
