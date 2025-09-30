import { buildTitle } from '@/lib/seo/title';
export async function generateMetadata({ params }: { params: { batchId: string } }) {
	return { title: buildTitle(['Ruleta Lote', params.batchId]) };
}
export default function BatchPlaceholder(){return null;}
