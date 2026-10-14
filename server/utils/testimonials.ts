export function testimonialFields(body: any) {
  const clean = (v: any, max = 190) => String(v ?? '').trim().slice(0, max) || null
  const rating = Math.round(Number(body?.rating))
  return {
    quote: clean(body?.quote, 2000),
    quote_en: clean(body?.quoteEn, 2000),
    name: clean(body?.name, 128),
    role: clean(body?.role),
    audience: ['bautraeger', 'makler', 'privat'].includes(body?.audience) ? body.audience : 'alle',
    rating: rating >= 1 && rating <= 5 ? rating : null,
    visible: body?.visible ? 1 : 0,
    sort_order: Math.round(Number(body?.sortOrder) || 0),
    note: clean(body?.note, 2000)
  }
}
export function mapTestimonial(r: any) {
  return {
    id: Number(r.id), quote: r.quote, quoteEn: r.quote_en || null, name: r.name, role: r.role || null,
    audience: r.audience, rating: r.rating ? Number(r.rating) : null, visible: !!r.visible,
    sortOrder: Number(r.sort_order) || 0, note: r.note || null
  }
}
