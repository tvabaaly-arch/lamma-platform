import { Button, Empty } from '../components/ui'
import { useI18n } from '../lib/i18n'
export default function NotFound() {
  const { tx } = useI18n()
  return <div className="py-20"><Empty title={tx('الصفحة غير موجودة', 'Page not found')} sub={tx('يمكن الرابط تغيّر. خلنا نرجعك للفرحة.', 'The link may have changed. Let’s get you back to the joy.')} action={<Button to="/">{tx('الرئيسية', 'Home')}</Button>} /></div>
}
