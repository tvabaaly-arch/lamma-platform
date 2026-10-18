import { generateBundles, parseBrief } from '../src/lib/ai'
import { productById } from '../src/data/catalog'
const cases: any[] = [
  { name: "Child (7) birthday, 600", occasion: 'birthday', recipient: 'child', age: 'kids', budget: 600, city: 'riyadh' },
  { name: "Wife birthday, beauty+fragrance, 900", occasion: 'birthday', recipient: 'wife', interests: ['beauty', 'fragrance'], budget: 900, city: 'riyadh' },
  { name: "Husband birthday, no interests, 900", occasion: 'birthday', recipient: 'husband', budget: 900, city: 'riyadh' },
  { name: "Husband who loves beauty/selfcare (no gender lock)", occasion: 'birthday', recipient: 'husband', interests: ['selfcare'], budget: 700, city: 'riyadh' },
  { name: "New baby, 700", occasion: 'newborn', recipient: 'baby', budget: 700, city: 'riyadh' },
  { name: "Colleague promotion, 400", occasion: 'promotion', recipient: 'colleague', budget: 400, city: 'jeddah' },
  { name: "Toddler (2) eid, 300", occasion: 'eid', recipient: 'child', age: 'toddler', budget: 300, city: 'dammam' },
]
let problems = 0
for (const c of cases) {
  const { bundles, poolNotes } = generateBundles({ text: '', ...c } as any, {})
  console.log('\n## ' + c.name)
  for (const b of bundles) {
    const total = b.items.reduce((a, it) => { const p = productById(it.productId)!; return a + p.price + p.variants.reduce((s, g) => s + (g.options.find(o => o.id === it.variant[g.key])?.delta ?? 0), 0) }, 0)
    const ages = b.items.map(it => productById(it.productId)!.ages)
    const age = c.age ?? (c.recipient === 'baby' ? 'baby' : c.recipient === 'child' ? 'kids' : 'adult')
    const ageBad = ages.some(a => a && !a.includes(age))
    if (ageBad || total > c.budget && !b.notes.length) problems++
    console.log(`  ${b.title.en}: ${b.items.map(it => productById(it.productId)!.name.en + ` [${productById(it.productId)!.cat}]`).join(' + ')} = ${total}/${c.budget}${ageBad ? '  AGE-VIOLATION' : ''}${b.notes.length ? '  notes:' + b.notes.map(n => n.en).join(' | ') : ''}`)
  }
}
console.log('\nparse:', JSON.stringify(parseBrief('عيد ميلاد ولدي عمره 7 سنوات في جدة، ميزانيتي 500 ريال، يحب العلوم والرسم')))
console.log('PROBLEMS', problems)
