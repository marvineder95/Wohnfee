// Versteckte Ordnung im Mietshop (Sortierung „Relevanz“):
// Große, wertvolle Stücke zuerst, Deko & Kleinteile ans Ende – innerhalb jeder Stufe bunt gemischt.
// Die Mischung hängt vom Tag ab (gleiche Reihenfolge den ganzen Tag, kein Springen beim Neuladen).

/** Stufe je Kategorie: 1 = vorne, 3 = hinten. Nicht gelistete Kategorien landen in Stufe 2. */
export const SHOP_CATEGORY_TIER: Record<string, 1 | 2 | 3> = {
  bett: 1, sofa: 1, tische: 1, schrank: 1, // Betten, Sofas & Sessel, Tische, Kommoden & Schränke
  stuehle: 2, spiegel: 2, lampen: 2, teppiche: 2,
  deko: 3, textilien: 3, pflanzen: 3, kueche: 3, bad: 3, technik: 3, buero: 3, sonstiges: 3
}

export const shopTier = (category: string | null | undefined) => SHOP_CATEGORY_TIER[category || ''] ?? 2

// kleiner deterministischer Zufallsgenerator (mulberry32)
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function daySeed(d = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/**
 * Sortiert nach Stufe; innerhalb einer Stufe werden die Kategorien reihum gemischt
 * (z. B. Sofa, Bett, Tisch, Kommode, Sofa …), die Stücke je Kategorie zufällig.
 */
export function hiddenShopOrder<T extends { id: number; category: string | null }>(list: T[], seed = daySeed()): T[] {
  const rand = rng(seed)
  const shuffle = <U>(a: U[]) => {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
    return a
  }
  const out: T[] = []
  for (const tier of [1, 2, 3]) {
    const byCat = new Map<string, T[]>()
    for (const it of list) {
      if (shopTier(it.category) !== tier) continue
      const k = it.category || '-'
      if (!byCat.has(k)) byCat.set(k, [])
      byCat.get(k)!.push(it)
    }
    const queues = shuffle([...byCat.values()].map(q => shuffle(q.slice().sort((a, b) => a.id - b.id))))
    while (queues.some(q => q.length)) {
      for (const q of queues) { const it = q.shift(); if (it) out.push(it) }
    }
  }
  return out
}
