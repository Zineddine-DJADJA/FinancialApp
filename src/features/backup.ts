import { Capacitor } from '@capacitor/core';
import { buildBackup } from '../db/repo';
import { todayISO } from '../domain/periods';

/**
 * Export du fichier de sauvegarde, adapté à chaque plateforme :
 * - APK Android : fichier écrit dans le cache puis feuille de partage native ;
 * - iPhone / Android (PWA) : feuille de partage du système (« Enregistrer dans Fichiers », WhatsApp…) ;
 * - ordinateur : téléchargement classique.
 */
export async function exportBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const json = JSON.stringify(await buildBackup(), null, 2);
  const filename = `pousse-${todayISO()}.json`;

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: filename, files: [uri] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  const file = new File([json], filename, { type: 'application/json' });
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // Partage refusé par le navigateur : on retombe sur le téléchargement.
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
