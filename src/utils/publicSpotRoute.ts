export type PublicSpotReference =
  | { kind: 'slug'; value: string }
  | { kind: 'legacy'; value: string };

// QR codes atuais usam `spot` com um UUID público. Os demais parâmetros são
// mantidos somente para placas emitidas por versões anteriores do aplicativo.
export function getPublicSpotReference(search: string): PublicSpotReference | null {
  const params = new URLSearchParams(search);
  const slug = params.get('spot')?.trim();
  if (slug) return { kind: 'slug', value: slug };

  const legacyId = params.get('vagaId')?.trim();
  if (legacyId) return { kind: 'legacy', value: legacyId };

  const legacyNumber = params.get('vaga')?.trim();
  if (legacyNumber) return { kind: 'legacy', value: legacyNumber };

  return null;
}
