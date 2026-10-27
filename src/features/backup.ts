import { Capacitor } from '@capacitor/core';
import { buildBackup } from '../db/repo';
import { db } from '../db/db';
import { expensesToCsv, type CsvOptions } from '../domain/csv';
import { todayISO } from '../domain/periods';

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/**
 * Remet un fichier à l'utilisateur, selon la plateforme :
 * - APK Android : fichier écrit dans le cache puis feuille de partage native ;
 * - iPhone / Android (PWA) : feuille de partage du système (« Enregistrer dans Fichiers », WhatsApp…) ;
 * - ordinateur : téléchargement classique.
 */
async function shareFile(content: string, filename: string, mime: string): Promise<ShareResult> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: filename, files: [uri] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  const file = new File([content], filename, { type: mime });
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

/** Sauvegarde complète (JSON), réimportable et fusionnable. */
export async function exportBackup(): Promise<ShareResult> {
  const json = JSON.stringify(await buildBackup(), null, 2);
  return shareFile(json, `pousse-${todayISO()}.json`, 'application/json');
}

/** Tableau des dépenses (CSV) pour Excel, Numbers ou Google Sheets. Non réimportable. */
export async function exportCsv(options: CsvOptions): Promise<ShareResult> {
  const csv = expensesToCsv(await db.expenses.toArray(), options);
  return shareFile(csv, `pousse-${todayISO()}.csv`, 'text/csv');
}
